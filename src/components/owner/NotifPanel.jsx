// لوحتا الإحصائيات والإشعارات لصاحب الصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";
import { getTodayDateInRiyadh, to12h, getCustomerClassification, getSlotsForSalon } from "../../utils.js";
import { IconCalendar, IconScissors, IconTrash, IconUser, NotifIcon, LabelWithIcon } from "../shared/Icons.jsx";
import { sb, supabase } from "../../api.js";
import { ntxt } from "../../notifications.js";


export function NotifPanel({salon,onUpdate,customers=[],refreshSalonBookings,defaultFilter="approved",dateFilter}){
  const{t}=useTranslation();
  const[showWaiting,setShowWaiting]=useState(false);
  const[showAddForm,setShowAddForm]=useState(false);
  const[filter,setFilter]=useState(defaultFilter);
  const[localAtt,setLocalAtt]=useState({});
  const[mForm,setMForm]=useState({name:"",phone:"",date:getTodayDateInRiyadh(),slot:""});
  const KEY=`dork_waiting_${salon.id}`;
  const[waitingList,setWaitingList]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});
  const[processingWait,setProcessingWait]=useState(()=>new Set());
  const processingWaitLockRef=useRef(new Set());

  const loadWaiting=useCallback(async()=>{
    try{
      const data=await sb("waiting_list","GET",null,`?salon_id=eq.${salon.id}&select=id,name,phone,created_at,slot_date,slot_time,status&order=created_at.asc&limit=50`);
      if(Array.isArray(data)){
        const now=new Date();
        const expired=data.filter(w=>{
          if(w.status!=="waiting"||!w.slot_date||!w.slot_time)return false;
          const slotMs=new Date(`${w.slot_date}T${w.slot_time}:00`).getTime();
          return now.getTime()>slotMs+30*60*1000; // بعد 30 دقيقة من الوقت المحدد
        });
        for(const w of expired){
          sb("waiting_list","DELETE",null,`?id=eq.${w.id}`).catch(()=>{});
        }
        const active=data.filter(w=>!expired.find(e=>e.id===w.id)&&w.status==="waiting");
        const converted=active.map(w=>{const ts=w.created_at||"";const d=new Date(ts.includes("+")||ts.endsWith("Z")?ts:ts+"Z");return{id:w.id,name:w.name,phone:w.phone||"",addedAt:d.toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),slotDate:w.slot_date||"",slotTime:w.slot_time||"",status:w.status||"waiting"};});
        setWaitingList(converted);
        try{localStorage.setItem(KEY,JSON.stringify(converted));}catch{}
      }
    }catch{}
  },[salon.id,KEY]);

  useEffect(()=>{loadWaiting();},[loadWaiting]);

  // تحقق كل دقيقة لإزالة المنتهية
  useEffect(()=>{
    const t=setInterval(()=>{loadWaiting();},60*1000);
    return()=>clearInterval(t);
  },[loadWaiting]);

  // Realtime لقائمة الانتظار
  useEffect(()=>{
    const channel=supabase.channel(`waiting-${salon.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'waiting_list',filter:`salon_id=eq.${salon.id}`},()=>{loadWaiting();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadWaiting]);

  const addToWaiting=async(name,phone,slotDate,slotTime)=>{
    try{
      if(slotDate&&slotTime&&phone){
        const existing=await sb("waiting_list","GET",null,`?select=id&salon_id=eq.${salon.id}&slot_date=eq.${slotDate}&slot_time=eq.${slotTime}&phone=eq.${encodeURIComponent(phone)}&status=eq.waiting&limit=1`).catch(()=>[]);
        if(Array.isArray(existing)&&existing.length){alert(i18n.t('ui.customer_in_waiting'));return;}
      }
      await sb("waiting_list","POST",{salon_id:salon.id,name,phone,slot_date:slotDate||null,slot_time:slotTime||null});
      await loadWaiting();
    }catch{
      const item={id:Date.now(),name,phone,addedAt:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),slotDate:slotDate||"",slotTime:slotTime||""};
      const newList=[...waitingList,item];
      setWaitingList(newList);
      try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
    }
  };

  const acceptFromWaiting=async(w)=>{
    if(!w.slotDate||!w.slotTime){alert(i18n.t('ui.no_slot_set'));return;}
    if(processingWaitLockRef.current.has(w.id))return;
    processingWaitLockRef.current.add(w.id);
    setProcessingWait(prev=>new Set(prev).add(w.id));
    try{
      // إنشاء حجز مقبول مباشرة — status pending ثم نحوّله approved لتجاوز أي trigger يمنع الإدراج المباشر
      const inserted=await sb("bookings","POST",{salon_id:String(salon.id),customer_name:w.name,customer_phone:w.phone,date:w.slotDate,time:w.slotTime,status:"pending",service:"[]",barber_id:"any",barber_name:"",total:0});
      const newId=(inserted&&inserted[0])?inserted[0].id:null;
      if(newId)await sb("bookings","PATCH",{status:"approved"},`?id=eq.${newId}`).catch(()=>{});
      // تغيير الحالة لـ accepted
      await sb("waiting_list","PATCH",{status:"accepted"},"?id=eq."+w.id);
      // إشعار للمقبول
      {const _wa=ntxt(customers.find(c=>c.id===w.customer_id)?.lang||'ar').waitlist_approved(w.slotDate,w.slotTime,salon.name);
      if(w.customer_id){
        sb("notifications","POST",{target_type:"customer",target_id:w.customer_id,title:_wa.title,body:_wa.body,icon:"✅"}).catch(()=>{});
        supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:w.customer_id,user_type:"customer",title:_wa.title,body:_wa.body,data:{type:"waitlist_approved",salon_id:String(salon.id)}}}).catch(()=>{});
      }}
      // رفض المنتظرين للنفس الوقت
      const others=waitingList.filter(x=>x.id!==w.id&&x.slotDate===w.slotDate&&x.slotTime===w.slotTime);
      for(const o of others){
        await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+o.id).catch(()=>{});
        {const _wf=ntxt(customers.find(c=>c.id===o.customer_id)?.lang||'ar').waitlist_full(w.slotDate,w.slotTime,salon.name);
        if(o.customer_id){
          sb("notifications","POST",{target_type:"customer",target_id:o.customer_id,title:_wf.title,body:_wf.body,icon:"❌"}).catch(()=>{});
          supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:o.customer_id,user_type:"customer",title:_wf.title,body:_wf.body,data:{type:"waitlist_full",salon_id:String(salon.id)}}}).catch(()=>{});
        }}
      }
      await loadWaiting();
      if(refreshSalonBookings)refreshSalonBookings(salon.id);
    }catch(e){
      if(e.message&&(e.message.includes("booking_overlap")||e.message.includes("prevent_double_booking")||e.message.includes("23505"))){
        alert(i18n.t('ui.slot_still_booked'));
      }else{
        alert(i18n.t('ui.error_icon_prefix')+e.message);
      }
    }
    finally{processingWaitLockRef.current.delete(w.id);setProcessingWait(prev=>{const n=new Set(prev);n.delete(w.id);return n;});}
  };

  const rejectFromWaiting=async(w)=>{
    if(processingWaitLockRef.current.has(w.id))return;
    processingWaitLockRef.current.add(w.id);
    setProcessingWait(prev=>new Set(prev).add(w.id));
    try{
      await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+w.id);
      {const _wfl=ntxt(customers.find(c=>c.id===w.customer_id)?.lang||'ar').waitlist_failed(salon.name,w.slotDate,w.slotTime);
      if(w.customer_id){
        sb("notifications","POST",{target_type:"customer",target_id:w.customer_id,title:_wfl.title,body:_wfl.body,icon:"❌"}).catch(()=>{});
        supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:w.customer_id,user_type:"customer",title:_wfl.title,body:_wfl.body,data:{type:"waitlist_failed",salon_id:String(salon.id)}}}).catch(()=>{});
      }}
      await loadWaiting();
    }catch(e){alert(i18n.t('ui.error_icon_prefix')+e.message);}
    finally{processingWaitLockRef.current.delete(w.id);setProcessingWait(prev=>{const n=new Set(prev);n.delete(w.id);return n;});}
  };

  const removeFromWaiting=async(id)=>{
    try{
      await sb("waiting_list","DELETE",null,`?id=eq.${id}&salon_id=eq.${salon.id}`);
      await loadWaiting();
    }catch{
      const newList=waitingList.filter(w=>w.id!==id);
      setWaitingList(newList);
      try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
    }
  };

  const allBks=[...salon.bookings.filter(b=>!dateFilter||b.date===dateFilter)].sort((a,b)=>{
    const order={pending:0,approved:1,rejected:2};
    const so=(order[a.status]??1)-(order[b.status]??1);
    if(so!==0)return so;
    return `${a.date||""} ${a.time||""}`.localeCompare(`${b.date||""} ${b.time||""}`);
  });
  const counts={pending:allBks.filter(b=>b.status==="pending").length,approved:allBks.filter(b=>b.status==="approved").length,rejected:allBks.filter(b=>b.status==="rejected").length};
  const bks=filter==="all"?allBks:allBks.filter(b=>b.status===filter);

  return(
    <div style={{paddingTop:4}}>

      {/* قسم الانتظار - يظهر فقط عند فلتر "انتظار" */}
      {filter==="pending"&&(()=>{
        const allSlots=getSlotsForSalon(salon);
        const bookedSlots=new Set(salon.bookings.filter(b=>b.date===mForm.date&&b.status!=="rejected"&&b.status!=="cancelled").map(b=>b.time));
        const inp2={padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
        return(<>
          {/* زر إضافة عميل - في الأعلى مع toggle */}
          <div style={{background:"var(--bg-input)",borderRadius:10,border:"1px solid var(--border-ui)",marginBottom:10,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer"}} onClick={()=>setShowAddForm(v=>!v)}>
              <button style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid var(--p)",background:showAddForm?"var(--p)":"transparent",color:showAddForm?"#000":"var(--p)",fontSize:18,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>
                {showAddForm?"×":"+"}
              </button>
              <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>{t("notif.add_waiting")}</div>
            </div>
            {showAddForm&&<div style={{borderTop:"1px solid var(--border-ui)",padding:"12px 14px"}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={mForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))} style={{...inp2,direction:"rtl"}} placeholder={t("notif.name_ph")}/>
                <input value={mForm.phone} onChange={e=>setMForm(p=>({...p,phone:e.target.value}))} style={{...inp2,direction:"ltr"}} placeholder={t("notif.phone_ph")}/>
              </div>
              <input type="date" value={mForm.date} min={getTodayDateInRiyadh()} onChange={e=>setMForm(p=>({...p,date:e.target.value,slot:""}))} style={{...inp2,marginBottom:8}}/>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("notif.time_optional")}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {allSlots.map(sl=>{const sel=mForm.slot===sl;const booked=bookedSlots.has(sl);return(
                  <button key={sl} onClick={()=>setMForm(p=>({...p,slot:p.slot===sl?"":sl}))}
                    style={{width:64,padding:"5px 4px",borderRadius:8,border:`1.5px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa25)":booked?"var(--border-ui)":"var(--surface-1)",color:sel?"var(--p)":"var(--text-muted)",opacity:booked&&!sel?0.6:1,fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:sel?700:400,textAlign:"center",flexShrink:0}} title={booked?t("notif.slot_booked"):""}>
                    {to12h(sl)}
                  </button>
                );})}
              </div>
              {mForm.slot&&<div style={{background:"rgba(243,156,18,.08)",border:"1px solid #f39c1244",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:11,color:"#f39c12",textAlign:"center"}}>{t("notif.selected_time")} <strong>{mForm.date} - {mForm.slot}</strong></div>}
              <button onClick={()=>{
                const n=mForm.name.trim();const p=mForm.phone.trim();
                if(!n||!p){alert(t("notif.err_name_phone"));return;}
                addToWaiting(n,p,mForm.date,mForm.slot);
                setMForm({name:"",phone:"",date:getTodayDateInRiyadh(),slot:""});
                setShowAddForm(false);
              }} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#f39c12,#e67e22)",color:"#fff",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
                {t("notif.add_btn")}
              </button>
            </div>}
          </div>

          {/* قائمة الانتظار */}
          {waitingList.length>0&&(
            <div style={{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--pa25)",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>{t("notif.waiting_title")} ({waitingList.length})</div>
                <button onClick={()=>setShowWaiting(w=>!w)} style={{fontSize:10,color:"var(--text-muted)",background:"transparent",border:"none",cursor:"pointer"}}>{showWaiting?t("notif.hide"):t("notif.show")}</button>
              </div>
              {showWaiting&&waitingList.map((w,idx)=>{
                const cust=customers.find(c=>c.phone&&w.phone&&c.phone.replace(/\D/g,"").slice(-9)===w.phone.replace(/\D/g,"").slice(-9));
                const cl=cust?getCustomerClassification(cust):null;
                return(
                <div key={w.id} style={{padding:"8px 0",borderTop:"1px solid var(--border-ui)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:12,color:"var(--text-primary)",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:"var(--border-ui)",color:"var(--p)",borderRadius:10,padding:"1px 6px",fontSize:10}}>#{idx+1}</span>
                        {w.name}
                        {cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}><LabelWithIcon label={cl.label} size={9}/></span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="📞" size={11}/> {w.phone}</div>
                      {w.slotTime&&<div style={{fontSize:11,color:"var(--p)",fontWeight:700}}>⏰ {w.slotDate} - {w.slotTime}</div>}
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>{t("notif.added_at")} {w.addedAt}</div>
                    </div>
                    <button style={G.xBtn} onClick={()=>removeFromWaiting(w.id)}><IconTrash size={14}/></button>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    {w.slotTime&&<button disabled={processingWait.has(w.id)} style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:processingWait.has(w.id)?"not-allowed":"pointer",opacity:processingWait.has(w.id)?0.5:1,fontFamily:"inherit",fontWeight:700}} onClick={()=>acceptFromWaiting(w)}>{processingWait.has(w.id)?"⏳":t("notif.accept_btn")}</button>}
                    <button disabled={processingWait.has(w.id)} style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:processingWait.has(w.id)?"not-allowed":"pointer",opacity:processingWait.has(w.id)?0.5:1,fontFamily:"inherit",fontWeight:700}} onClick={()=>rejectFromWaiting(w)}>{processingWait.has(w.id)?"⏳":t("notif.reject_btn")}</button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </>);
      })()}

      {/* الحجوزات */}
      {!bks.length?<div style={G.empty}>{t("notif.no_bookings")}</div>:
      <div style={{display:"flex",flexDirection:"column",gap:8}}>{bks.map(b=>(
        <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
            {(()=>{const cust=customers.find(c=>c.phone&&b.phone&&c.phone.replace(/\D/g,"").slice(-9)===b.phone.replace(/\D/g,"").slice(-9));const cl=cust?getCustomerClassification(cust):null;return(<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><IconUser size={12}/>{b.name||t("owner_dash.customer_fallback")}{cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}><LabelWithIcon label={cl.label} size={9}/></span>}</div><div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="📞" size={11}/> {b.phone}</div><div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><IconScissors size={11}/>{Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div><div style={{fontSize:11,color:"var(--p)",display:"flex",alignItems:"center",gap:4}}><IconCalendar size={11}/>{b.date} {to12h(b.time)} - {b.total||0} ر</div></div>);})()}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?t("notif.status_approved"):b.status==="rejected"?t("notif.status_rejected"):t("notif.status_pending")}</span>
          </div>
          {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
          {b.status==="approved"&&(()=>{const att=localAtt[b.id]||b.attendance;return(<div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}><span style={{fontSize:10,color:"#666"}}>{t("notif.attendance")}</span>{att?(<span style={{fontSize:11,fontWeight:700,color:att==="attended"?"#27ae60":"#e74c3c"}}>{att==="attended"?t("notif.attended"):t("notif.no_show")}</span>):(<><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"attended"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"attended"}));}catch{}}}>{t("notif.attended")}</button><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"no_show"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"no_show"}));}catch{}}}>{t("notif.no_show")}</button></>)}</div>);})()}
        </div>
      ))}</div>}
    </div>
  );
}

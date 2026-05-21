import React, { useState, useEffect, useCallback } from "react";
import { G } from "../styles";
import { supabase, sb } from "../../core/supabase";
import {
  makeSlots,
  getSlotsForSalon,
  todayStr,
  calcTotal,
  normPhone
} from "../../utils/formatters";
import { openMaps } from "../../utils/locationUtils";
import { getCustomerClassification } from "../../data/transformers";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const SLOT_MIN = 40;

function normalizeBgId(id) {
  return (id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function NotifPanel({salon,onUpdate,customers=[],refreshSalonBookings,defaultFilter="approved"}){
  const[showWaiting,setShowWaiting]=useState(false);
  const[showAddForm,setShowAddForm]=useState(false);
  const[filter,setFilter]=useState(defaultFilter);
  const[localAtt,setLocalAtt]=useState({});
  const[mForm,setMForm]=useState({name:"",phone:"",date:new Date().toISOString().slice(0,10),slot:""});
  const KEY=`dork_waiting_${salon.id}`;
  const[waitingList,setWaitingList]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});

  const loadWaiting=useCallback(async()=>{
    try{
      const data=await sb("waiting_list","GET",null,`?salon_id=eq.${salon.id}&select=id,name,phone,created_at,slot_date,slot_time,status&order=created_at.asc`);
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
        const converted=active.map(w=>{const ts=w.created_at||"";const d=new Date(ts.includes("+")||ts.endsWith("Z")?ts:ts+"Z");return{id:w.id,name:w.name,phone:w.phone||"",addedAt:d.toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),slotDate:w.slot_date||"",slotTime:w.slot_time||"",status:w.status||"waiting"};});
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
      .on('postgres_changes',{event:'*',schema:'public',table:'waiting_list',filter:`salon_id=eq.${salon.id}`},()=>{
        loadWaiting();
      })
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadWaiting]);

  const addToWaiting=async(name,phone,slotDate,slotTime)=>{
    try{
      await sb("waiting_list","POST",{salon_id:salon.id,name,phone,slot_date:slotDate||null,slot_time:slotTime||null});
      await loadWaiting();
    }catch{
      const item={id:Date.now(),name,phone,addedAt:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),slotDate:slotDate||"",slotTime:slotTime||""};
      const newList=[...waitingList,item];
      setWaitingList(newList);
      try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
    }
  };

  const acceptFromWaiting=async(w)=>{
    if(!w.slotDate||!w.slotTime){alert("لا يوجد وقت محدد لهذا العميل");return;}
    try{
      // إنشاء حجز مقبول مباشرة
      await sb("bookings","POST",{salon_id:String(salon.id),customer_name:w.name,customer_phone:w.phone,date:w.slotDate,time:w.slotTime,status:"approved",service:"[]",barber_id:"any",barber_name:"",total:0});
      // تغيير الحالة لـ accepted
      await sb("waiting_list","PATCH",{status:"accepted"},"?id=eq."+w.id);
      // إشعار للمقبول
      sb("notifications","POST",{target_type:"all",title:"✅ تم قبولك في الموعد",body:`تم حجزك في ${w.slotDate} - ${w.slotTime} في ${salon.name}. تواصل مع الصالون لتأكيد الخدمة.`,icon:"✅"}).catch(()=>{});
      // رفض المنتظرين للنفس الوقت
      const others=waitingList.filter(x=>x.id!==w.id&&x.slotDate===w.slotDate&&x.slotTime===w.slotTime);
      for(const o of others){
        await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+o.id).catch(()=>{});
        sb("notifications","POST",{target_type:"all",title:"❌ عذراً، الوقت امتلأ",body:`الوقت ${w.slotDate} - ${w.slotTime} في ${salon.name} تم أخذه من شخص آخر.`,icon:"❌"}).catch(()=>{});
      }
      await loadWaiting();
      if(refreshSalonBookings)refreshSalonBookings(salon.id);
    }catch(e){alert("❌ خطأ: "+e.message);}
  };

  const rejectFromWaiting=async(w)=>{
    try{
      await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+w.id);
      sb("notifications","POST",{target_type:"all",title:"❌ عذراً، تعذّر الحجز",body:`نأسف، لم نتمكن من تأكيد حجزك في ${salon.name}${w.slotDate?` (${w.slotDate} - ${w.slotTime})`:""}. يمكنك المحاولة مرة أخرى.`,icon:"❌"}).catch(()=>{});
      await loadWaiting();
    }catch(e){alert("❌ خطأ: "+e.message);}
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

  const allBks=[...salon.bookings].sort((a,b)=>{
    const order={pending:0,approved:1,rejected:2};
    const so=(order[a.status]??1)-(order[b.status]??1);
    if(so!==0)return so;
    return `${a.date||""} ${a.time||""}`.localeCompare(`${b.date||""} ${b.time||""}`);
  });
  const counts={pending:allBks.filter(b=>b.status==="pending").length,approved:allBks.filter(b=>b.status==="approved").length,rejected:allBks.filter(b=>b.status==="rejected").length};
  const bks=filter==="all"?allBks:allBks.filter(b=>b.status===filter);

  return(
    <div style={{paddingTop:4}}>
      {/* فلتر الحجوزات - مقبول / مرفوض / انتظار */}
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {[["approved","✅ مقبول",counts.approved],["rejected","❌ مرفوض",counts.rejected],["pending","⏳ انتظار",counts.pending]].map(([val,label,count])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${filter===val?"var(--p)":"#2a2a3a"}`,background:filter===val?"var(--pa25)":"transparent",color:filter===val?"var(--p)":"#888",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:filter===val?700:400}}>
            {label}{count>0&&<span style={{background:filter===val?"var(--p)":"#333",color:filter===val?"#000":"#aaa",borderRadius:10,padding:"1px 6px",fontSize:10,marginRight:3}}>{count}</span>}
          </button>
        ))}
      </div>

      {/* قسم الانتظار - يظهر فقط عند فلتر "انتظار" */}
      {filter==="pending"&&(()=>{
        const allSlots=getSlotsForSalon(salon);
        const inp2={padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#13131f",color:"#fff",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
        return(<>
          {/* زر إضافة عميل - في الأعلى مع toggle */}
          <div style={{background:"#0d0d1a",borderRadius:10,border:"1px solid #2a2a3a",marginBottom:10,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer"}} onClick={()=>setShowAddForm(v=>!v)}>
              <button style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid var(--p)",background:showAddForm?"var(--p)":"transparent",color:showAddForm?"#000":"var(--p)",fontSize:18,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>
                {showAddForm?"×":"+"}
              </button>
              <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>إضافة عميل لقائمة الانتظار</div>
            </div>
            {showAddForm&&<div style={{borderTop:"1px solid #2a2a3a",padding:"12px 14px"}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={mForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))} style={{...inp2,direction:"rtl"}} placeholder="الاسم"/>
                <input value={mForm.phone} onChange={e=>setMForm(p=>({...p,phone:e.target.value}))} style={{...inp2,direction:"ltr"}} placeholder="الجوال"/>
              </div>
              <input type="date" value={mForm.date} min={new Date().toISOString().slice(0,10)} onChange={e=>setMForm(p=>({...p,date:e.target.value,slot:""}))} style={{...inp2,marginBottom:8}}/>
              <div style={{fontSize:11,color:"#888",marginBottom:6}}>اختر وقتاً (اختياري)</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {allSlots.map(sl=>{const sel=mForm.slot===sl;return(
                  <button key={sl} onClick={()=>setMForm(p=>({...p,slot:p.slot===sl?"":sl}))}
                    style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${sel?"var(--p)":"#2a2a3a"}`,background:sel?"var(--pa25)":"#13131f",color:sel?"var(--p)":"#888",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:sel?700:400}}>
                    {sl}
                  </button>
                );})}
              </div>
              {mForm.slot&&<div style={{background:"rgba(243,156,18,.08)",border:"1px solid #f39c1244",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:11,color:"#f39c12",textAlign:"center"}}>⏳ الوقت المختار: <strong>{mForm.date} - {mForm.slot}</strong></div>}
              <button onClick={()=>{
                const n=mForm.name.trim();const p=mForm.phone.trim();
                if(!n||!p){alert("أدخل الاسم والجوال");return;}
                addToWaiting(n,p,mForm.date,mForm.slot);
                setMForm({name:"",phone:"",date:new Date().toISOString().slice(0,10),slot:""});
                setShowAddForm(false);
              }} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#f39c12,#e67e22)",color:"#fff",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
                ➕ إضافة للانتظار
              </button>
            </div>}
          </div>

          {/* قائمة الانتظار */}
          {waitingList.length>0&&(
            <div style={{background:"#13131f",borderRadius:10,padding:"10px 12px",border:"1px solid var(--pa25)",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>⏳ قائمة الانتظار ({waitingList.length})</div>
                <button onClick={()=>setShowWaiting(w=>!w)} style={{fontSize:10,color:"#888",background:"transparent",border:"none",cursor:"pointer"}}>{showWaiting?"▲ إخفاء":"▼ عرض"}</button>
              </div>
              {showWaiting&&waitingList.map((w,idx)=>{
                const cust=customers.find(c=>c.phone&&w.phone&&c.phone.replace(/\D/g,"").slice(-9)===w.phone.replace(/\D/g,"").slice(-9));
                const cl=cust?getCustomerClassification(cust):null;
                return(
                <div key={w.id} style={{padding:"8px 0",borderTop:"1px solid #2a2a3a"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:12,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:"#2a2a3a",color:"var(--p)",borderRadius:10,padding:"1px 6px",fontSize:10}}>#{idx+1}</span>
                        {w.name}
                        {cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}>{cl.label}</span>}
                      </div>
                      <div style={{fontSize:11,color:"#888"}}>📞 {w.phone}</div>
                      {w.slotTime&&<div style={{fontSize:11,color:"var(--p)",fontWeight:700}}>⏰ {w.slotDate} - {w.slotTime}</div>}
                      <div style={{fontSize:10,color:"#555"}}>أضيف: {w.addedAt}</div>
                    </div>
                    <button style={G.xBtn} onClick={()=>removeFromWaiting(w.id)}>✕</button>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    {w.slotTime&&<button style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit",fontWeight:700}} onClick={()=>acceptFromWaiting(w)}>✅ قبول للموعد</button>}
                    <button style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit",fontWeight:700}} onClick={()=>rejectFromWaiting(w)}>❌ رفض</button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </>);
      })()}

      {/* الحجوزات */}
      {!bks.length?<div style={G.empty}>لا توجد حجوزات</div>:
      <div style={{display:"flex",flexDirection:"column",gap:8}}>{bks.map(b=>(
        <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
            {(()=>{const cust=customers.find(c=>c.phone&&b.phone&&c.phone.replace(/\D/g,"").slice(-9)===b.phone.replace(/\D/g,"").slice(-9));const cl=cust?getCustomerClassification(cust):null;return(<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>👤 {b.name}{cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}>{cl.label}</span>}</div><div style={{fontSize:11,color:"#aaa"}}>📞 {b.phone}</div><div style={{fontSize:11,color:"#aaa"}}>✂ {Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div><div style={{fontSize:11,color:"var(--p)"}}>📅 {b.date} {b.time} - {b.total||0} ر</div></div>);})()}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?"✅ مقبول":b.status==="rejected"?"❌ مرفوض":"⏳ انتظار"}</span>
          </div>
          {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>✅ قبول</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>❌ رفض</button></div>}
          {b.status==="approved"&&(()=>{const att=localAtt[b.id]||b.attendance;return(<div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}><span style={{fontSize:10,color:"#666"}}>الحضور:</span>{att?(<span style={{fontSize:11,fontWeight:700,color:att==="attended"?"#27ae60":"#e74c3c"}}>{att==="attended"?"✅ حضر":"❌ لم يحضر"}</span>):(<><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"attended"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"attended"}));}catch{}}}>✅ حضر</button><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"no_show"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"no_show"}));}catch{}}}>❌ لم يحضر</button></>)}</div>);})()}
        </div>
      ))}</div>}
    </div>
  );
}


export { NotifPanel };

// لوحة تحكم العميل الرئيسية — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { hashPin, to12h, buildICS, downloadICS, getCustomerClassification } from "../utils.js";
import { AttendanceView } from "./AttendanceSettings.jsx";
import { CustomerSalonChat } from "./Chat.jsx";
import { InlineStarRating } from "./misc.jsx";
import {
  IconArrowRight, IconBell, IconBlocked, IconCalendar, IconChat, IconHeart, IconLock,
  IconPencil, IconPin, IconRefresh, IconScissors, IconStar, IconSuccess, IconTrash,
  IconWarning, NotifIcon, LabelWithIcon
} from "./icons.jsx";
import { sb, supabase } from "../../App.jsx";

export function CustomerDash({customer,salons,setSalons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers,reviews,setReviews,setRescheduleId,loadData,refreshSalonBookings,toast$,initTab="settings",initSection=false,setShowDrawer}){
  const{t}=useTranslation();
  const[tab,setTab]=useState(initTab);
  const[sectionMode,setSectionMode]=useState(initSection);
  const[editMode,setEditMode]=useState(false);
  const[custNotifs,setCustNotifs]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}
  });
  useEffect(()=>{
    const handler=(e)=>setCustNotifs(prev=>[e.detail,...prev].slice(0,50));
    window.addEventListener("dork-customer-notif",handler);
    return()=>window.removeEventListener("dork-customer-notif",handler);
  },[]);
  // جلب حجوزات صالونات العميل عند فتح الصفحة لتفعيل أزرار التعديل والإلغاء
  useEffect(()=>{
    if(!refreshSalonBookings)return;
    const ids=[...new Set((customer.history||[]).map(h=>h.salonId).filter(Boolean))];
    ids.slice(0,5).forEach(sid=>refreshSalonBookings(sid,customer.id));
  },[customer.id]);
  const[editName,setEditName]=useState(customer?.name||"");
  const[editPhone,setEditPhone]=useState(customer?.phone||"");
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[editEmail,setEditEmail]=useState(customer?.email||"");
  const[reminderMins,setReminderMins]=useState(()=>parseInt(localStorage.getItem("dork_reminder")||"60"));
  useEffect(()=>{localStorage.setItem("dork_reminder",String(reminderMins));},[reminderMins]);
  const[myWaiting,setMyWaiting]=useState([]);
  const[openChatBookingId,setOpenChatBookingId]=useState(()=>{try{const v=sessionStorage.getItem("dork_chat_bid");return v?JSON.parse(v):null;}catch{return null;}});
  const[cancellingId,setCancellingId]=useState(null);
  const cancellingLockRef=useRef(null);
  useEffect(()=>{if(openChatBookingId!=null)sessionStorage.setItem("dork_chat_bid",JSON.stringify(openChatBookingId));else sessionStorage.removeItem("dork_chat_bid");},[openChatBookingId]);
  const[chatUnread,setChatUnread]=useState({});
  const _prevChatTotalRef=useRef(-1);
  const _openChatBidRef=useRef(openChatBookingId);
  useEffect(()=>{_openChatBidRef.current=openChatBookingId;},[openChatBookingId]);
  useEffect(()=>{
    if(!customer?.id)return;
    _prevChatTotalRef.current=-1;
    const fetchUnread=async()=>{
      try{
        const res=await fetch(`/api/customer-messages?customerId=${customer.id}&unreadByBooking=1`);
        const data=await res.json();
        if(data&&typeof data==="object"&&!Array.isArray(data)){
          setChatUnread(data);
          const total=Object.values(data).reduce((a,b)=>a+(b||0),0);
          if(_prevChatTotalRef.current>=0&&total>_prevChatTotalRef.current&&_openChatBidRef.current==null){
            toast$&&toast$("💬 رسالة جديدة من الصالون","info");
          }
          _prevChatTotalRef.current=total;
        }
      }catch{}
    };
    fetchUnread();
    const id=setInterval(fetchUnread,15000);
    return()=>clearInterval(id);
  },[customer?.id]);
  useEffect(()=>{
    if(!customer?.phone)return;
    sb("waiting_list","GET",null,`?phone=eq.${encodeURIComponent(customer.phone)}&select=id,salon_id,slot_date,slot_time,status,created_at&order=created_at.desc&limit=50`)
      .then(data=>{if(Array.isArray(data))setMyWaiting(data.filter(w=>w.status==="waiting"));})
      .catch(()=>{});
  },[customer?.phone]);
  const[editPinStep,setEditPinStep]=useState(null);
  const[editPinLength,setEditPinLength]=useState(4);
  const[editTempPin,setEditTempPin]=useState("");
  const[editPinConfirm,setEditPinConfirm]=useState("");
  const[editPinErr,setEditPinErr]=useState("");
  const[showLocPrompt,setShowLocPrompt]=useState(()=>!customer?.locationLat);
  const saveEditPin=async()=>{
    if(editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm)return;
    try{
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:customer.id,pin:editTempPin})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok){setEditPinErr(d.error||i18n.t('cust_drawer.pin_mismatch'));if(d.code==="err_same_pin"){setEditPinStep("enter");setEditTempPin("");}return;}
      const customerIdStr=String(customer.id);
      localStorage.setItem(`dork_customer_pin_${customerIdStr}`,await hashPin(editTempPin));
      localStorage.setItem(`dork_customer_pin_length_${customerIdStr}`,String(editPinLength));
      setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");
      toast$&&toast$(i18n.t('ui.pin_updated'));
    }catch(e){setEditPinErr(""+e.message);}
  };
  if(!customer)return null;

  // حفظ موقع العميل
  const saveCustomerLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
        setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession({...customer,locationLat:lat,locationLng:lng});
        setShowLocPrompt(false);
        toast$&&toast$(i18n.t('ui.location_saved'));
      }catch{toast$&&toast$(i18n.t('ui.location_save_failed'),"err");}
    },()=>{toast$&&toast$(i18n.t('ui.location_detect_failed'),"err");},{enableHighAccuracy:true,timeout:15000});
  };

  // حذف موقع العميل
  const clearCustomerLocation=async()=>{
    try{
      await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));
      setCustomerSession({...customer,locationLat:null,locationLng:null});
      toast$&&toast$(i18n.t('ui.location_deleted'));
    }catch{toast$&&toast$(i18n.t('ui.location_delete_failed'),"err");}
  };

  const favSalons=salons.filter(s=>favSet.has(s.id)&&s.status==="approved");
  const history=customer.history||[];
  const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
  const classification=getCustomerClassification(customer);
  const badge=classification.label;

  // avatar بالحرف الأول
  const initials=(customer.name||"?")[0];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

  const lastSalon=history.length>0?salons.find(s=>s.id===history[history.length-1].salonId||s.id===Number(history[history.length-1].salonId)):null;

  const saveEdit=async()=>{
    if(!editName.trim()){return;}
    try{
      await sb("customers","PATCH",{name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()}:c));
      setEditMode(false);
    }catch(e){alert(i18n.t('ui.error_prefix')+e.message);}
  };

  const confirmDeleteAccount=async()=>{
    try{
      const res=await fetch("/api/delete-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:customer.id})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(d.error||"فشل حذف الحساب");
      await supabase.auth.signOut().catch(()=>{});
      setCustomerSession(null);setView("entry");
    }catch(e){alert(i18n.t('ui.error_prefix')+e.message);}
    setShowDeleteConfirm(false);
  };

  const deleteAccount=()=>{
    setShowDeleteConfirm(true);
  };

  const scheduleReminder=(h)=>{
    const dt=new Date(`${h.date}T${h.time}`);
    dt.setMinutes(dt.getMinutes()-reminderMins);
    const now=new Date();
    const diff=dt-now;
    if(diff<=0){alert(i18n.t('ui.appt_too_close'));return;}
    setTimeout(()=>{
      if(Notification.permission==="granted"){
        new Notification(i18n.t('ui.reminder_notif_title'),{body:i18n.t('ui.reminder_notif_body',{salon:h.salonName||"",time:to12h(h.time)}),icon:"/favicon.ico"});
      }else{alert(i18n.t('ui.reminder_alert_body',{salon:h.salonName||"",time:to12h(h.time)}));}
    },diff);
    Notification.requestPermission();
    const timeStr=reminderMins>=60?`${reminderMins/60} ${i18n.t('ui.hour_unit')}`:`${reminderMins} ${i18n.t('ui.min_unit')}`;
    alert(i18n.t('ui.reminder_set_for',{time:timeStr}));
  };

  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};

  const sectionTitle=tab==="notif"?t("cust_dash.section_notif"):tab==="hist"?t("cust_dash.section_hist"):tab==="favs"?t("cust_dash.section_favs"):tab==="remind"?t("cust_dash.section_remind"):tab==="attend"?t("cust_dash.section_attend"):t("cust_dash.section_settings");

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setView("home");setShowDrawer(true);}}><IconArrowRight size={20}/></button><h2 style={{...G.ft,flex:1}}>{sectionMode?sectionTitle:t("cust_dash.title")}</h2>{!sectionMode&&<button style={{...G.delBtn,border:"1.5px solid #888",color:"var(--text-muted)",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("entry");}}>{t("cust_dash.exit")}</button>}</div>

      {/* نافذة طلب الموقع — تظهر مرة واحدة لمن ليس عنده موقع */}
      {!sectionMode&&showLocPrompt&&!customer?.locationLat&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:340,width:"100%",border:"1.5px solid rgba(var(--gold-rgb),.3)",textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconPin size={40}/></div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--p)",marginBottom:10}}>{t("cust_dash.loc_title")}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>{t("cust_dash.loc_body")}</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:13,borderRadius:12,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}} onClick={saveCustomerLocation}>{t("cust_dash.loc_yes")}</button>
              <button style={{flex:1,padding:13,borderRadius:12,border:"1px solid #444",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}} onClick={()=>setShowLocPrompt(false)}>{t("cust_dash.loc_later")}</button>
            </div>
          </div>
        </div>
      )}

      {/* بروفايل العميل - Premium */}
      {!sectionMode&&(!editMode?(
        <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1.5px solid var(--gold)",marginBottom:12,position:"relative",boxShadow:"0 4px 16px rgba(var(--gold-rgb),.1)"}}>
          {/* البادج في الزاوية اليسرى */}
          <div style={{position:"absolute",top:12,left:12,background:`${classification.color}22`,border:`1px solid ${classification.color}`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:classification.color}}><LabelWithIcon label={badge} size={10}/></div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.name")} <span style={{color:"var(--p)"}}>{customer.name}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.phone")} <span style={{color:"var(--p)"}}>{customer.phone}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.bookings_count")} <span style={{color:"var(--p)"}}>{history.length} {t("cust_dash.bookings_unit")}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.joined")} <span style={{color:"var(--p)"}}>{new Date(customer.createdAt).toLocaleDateString("ar")}</span></div>
          </div>
        </div>
      ):(
        <div style={{background:"var(--surface-1)",borderRadius:16,padding:16,border:"1px solid var(--pa25)",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>{t("cust_dash.edit_title")}</div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t("cust_dash.name_label")}</label><input style={inp2} value={editName} onChange={e=>setEditName(e.target.value)}/></div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t("cust_dash.phone_label")}</label><input style={inp2} inputMode="numeric" type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t("cust_dash.email_label")}</label><input style={inp2} type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)}/></div>
          {/* الموقع */}
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t('ui.location_label')}</label>
            {customer?.locationLat&&customer?.locationLng?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:9,border:"1.5px solid rgba(var(--pr),.4)",background:"rgba(var(--pr),.06)"}}>
                <span style={{fontSize:11,color:"var(--p)"}}>{t("cust_dash.loc_saved")}</span>
                <button style={{background:"transparent",border:"none",color:"#e74c3c",fontSize:11,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={clearCustomerLocation}>{t("cust_dash.loc_delete")}</button>
              </div>
            ):(
              <button style={{...inp2,background:"rgba(var(--pr),.06)",border:"1.5px dashed rgba(var(--pr),.4)",color:"var(--p)",cursor:"pointer",textAlign:"center",fontWeight:700,fontSize:12,padding:"11px"}} onClick={saveCustomerLocation}>{t("cust_dash.loc_add")}</button>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={G.sub} onClick={saveEdit}>{t("cust_dash.save")}</button>
            <button style={{...G.delBtn,padding:"12px 14px"}} onClick={()=>setEditMode(false)}>{t("cust_dash.cancel")}</button>
          </div>
        </div>
      ))}

      {!sectionMode&&<div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>{t("cust_dash.tab_favs")} {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>{t("cust_dash.tab_hist")}</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>{t("cust_dash.tab_settings")}</button>
      </div>}

      {/* المفضلة */}
      {tab==="favs"&&<>
        {favSalons.length===0?<div style={{...G.empty,display:"flex",flexDirection:"column",gap:16,alignItems:"center",padding:"36px 14px"}}>
          <div>{t("cust_dash.favs_empty")}</div>
          <button style={{...G.sub,marginTop:0}} onClick={()=>setView("home")}>{t("cust_dash.browse_btn")}</button>
        </div>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {favSalons.map(s=>(
              <div key={s.id} style={G.bItem}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-block",fontSize:13,fontWeight:800,color:"var(--p)",fontFamily:"'Cairo',sans-serif",marginBottom:4}}>{s.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:3}}><IconPin size={10}/>{s.gov||s.region}{s.village?` - ${s.village}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)",display:"flex",alignItems:"center",gap:3}}><IconStar size={10}/>{s.rating}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={G.bookBtn} onClick={()=>{setSelSalon(s);setView("book");}}>{t("cust_dash.book_btn")}</button>
                    <button style={{...G.favBtn,color:"#e74c3c",display:"inline-flex",alignItems:"center",justifyContent:"center"}} onClick={()=>toggleFav(s.id)}><IconHeart size={18} filled/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
      </>}

      {/* الحجوزات */}
      {tab==="hist"&&<>
        {/* قائمة انتظاري */}
        {myWaiting.length>0&&(
          <div style={{background:"rgba(243,156,18,.07)",borderRadius:10,padding:"10px 12px",marginBottom:12,border:"1px solid #f39c1244"}}>
            <div style={{fontSize:12,color:"#f39c12",fontWeight:700,marginBottom:8}}>{t("cust_dash.waiting_title")} ({myWaiting.length})</div>
            {myWaiting.map(w=>{
              const s=salons.find(x=>String(x.id)===String(w.salon_id));
              return(
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:"1px solid #f39c1222"}}>
                  <div>
                    <div style={{fontSize:12,color:"var(--text-primary)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><IconScissors size={12} color="var(--p)"/>{s?.name||"صالون"}</div>
                    <div style={{fontSize:11,color:"#f39c12"}}>⏰ {w.slot_date} - {w.slot_time}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>{t("cust_dash.waiting_confirm")}</div>
                  </div>
                  <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}
                    onClick={async()=>{
                      if(!window.confirm(i18n.t('ui.confirm_cancel_wait')))return;
                      await sb("waiting_list","DELETE",null,"?id=eq."+w.id).catch(()=>{});
                      setMyWaiting(p=>p.filter(x=>x.id!==w.id));
                    }}>{t("cust_dash.cancel_wait")}</button>
                </div>
              );
            })}
          </div>
        )}
        {history.length===0?<div style={G.empty}>{t("cust_dash.hist_empty")}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {[...history].reverse().map((h,i)=>{
              const s=salons.find(x=>x.id===h.salonId||x.id===Number(h.salonId));
              // نجيب الحالة الحقيقية من بيانات الصالون بمقارنة مرنة
              const realBooking=
                (h.bookingId?s?.bookings?.find(b=>Number(b.id)===Number(h.bookingId)):null)||
                s?.bookings?.find(b=>b.date===h.date&&b.time===h.time&&(b.phone===h.phone||b.name===customer.name))||
                s?.bookings?.find(b=>b.date===h.date&&b.time===h.time);
              const status=realBooking?.status||h.status||"pending";
              const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":status==="cancelled"?"#888":"#f39c12";
              const stLabel=status==="approved"?t("cust_dash.status_approved"):status==="rejected"?t("cust_dash.status_rejected"):status==="cancelled"?t("cust_dash.status_cancelled"):t("cust_dash.status_pending");
              const _pb_barber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));
              const _pb_dur=realBooking?.slotDuration||h.slotDuration||(Array.isArray(h.services)?h.services.reduce((a,svc)=>a+((_pb_barber?.durations?.[svc])||s?.prices?.__durations?.[svc]||0),0):0)||(s?.slotMin||40);
              const _pb_end=new Date(new Date(`${h.date}T${(h.time||"00:00")}:00`).getTime()+_pb_dur*60000);
              const isPast=new Date()>=_pb_end;
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-block",fontSize:13,fontWeight:800,color:"var(--p)",fontFamily:"'Cairo',sans-serif",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s?.name||h.salonName||"صالون"}</span>
                        <span style={{fontSize:12,color:"var(--text-muted)",display:"inline-flex",alignItems:"center",gap:4}}><IconCalendar size={11}/><span style={{fontWeight:700,color:"var(--p)"}}>{h.date}</span></span>
                      </div>
                      <div style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.service_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</span></div>
                      <div style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.price_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{h.total||0} {t("cust_dash.sar")}</span></div>
                      {(()=>{const bBarber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));const svcDur=Array.isArray(h.services)?h.services.reduce((a,svc)=>a+((bBarber?.durations?.[svc])||s?.prices?.__durations?.[svc]||0),0):0;const dur=realBooking?.slotDuration||h.slotDuration||svcDur||(s?.slotMin||40);const[hh,mm]=(h.time||"00:00").split(":").map(Number);const endM=hh*60+mm+dur;const eH=Math.floor(endM/60)%24;const eM=endM%60;const endStr=`${eH%12||12}:${String(eM).padStart(2,"0")} ${eH<12?"ص":"م"}`;return<div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{i18n.t('ui.time_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{to12h(h.time)} – {endStr} ({dur} {i18n.t('ui.min_unit')})</span></div>;})()}
                      {(()=>{const bBarber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));const barberLabel=realBooking?.barberName||h.barberName||bBarber?.name||"";return barberLabel?<div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{i18n.t('ui.barber_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{barberLabel}</span></div>:null;})()}                      <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><IconStar key={n} size={12} color={n<=h.rating?"var(--p)":"#333"}/>)}</div>}
                      {!isPast&&<button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>{t("cust_dash.remind_btn")}</button>}
                      {!isPast&&status==="approved"&&<button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{
                        const title=i18n.t('ui.ics_booking_title',{salon:s?.name||h.salonName||""});
                        const desc=i18n.t('ui.service_label')+' '+(Array.isArray(h.services)?h.services.join(" + "):h.service||"");
                        downloadICS(buildICS({title,date:h.date,time:h.time,durationMins:_pb_dur,location:s?.address||"",description:desc}),`booking-${h.date}.ics`);
                      }}>{t("cust_dash.add_calendar")}</button>}
                      {!isPast&&(status==="pending"||status==="approved")&&realBooking?.id&&(<>
                        <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>{if(window.confirm(i18n.t('ui.confirm_edit_booking'))){setRescheduleId(realBooking.id);setSelSalon(s);setView("book");}}}><IconPencil size={10}/>{t('ui.edit')}</button>
                        <button disabled={cancellingId===realBooking.id} style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:cancellingId===realBooking.id?"not-allowed":"pointer",opacity:cancellingId===realBooking.id?0.6:1,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}} onClick={async()=>{
                          if(cancellingLockRef.current===realBooking.id)return;
                          if(!window.confirm(i18n.t('ui.confirm_cancel_booking')))return;
                          if(cancellingLockRef.current===realBooking.id)return;
                          cancellingLockRef.current=realBooking.id;
                          setCancellingId(realBooking.id);
                          try{
                            const bookDT=new Date(`${h.date}T${h.time}`);
                            const hoursUntil=(bookDT-new Date())/(1000*60*60);
                            const window_h=s?.cancellationWindow||2;
                            const lateCancel=hoursUntil>=0&&hoursUntil<window_h;
                            await sb("bookings","PATCH",{status:"cancelled",...(lateCancel?{attendance:"no_show"}:{})},"?id=eq."+realBooking.id);
                            {const _bc=ntxt(s?.lang||'ar').booking_cancelled(customer?.name||"",h.date,to12h(h.time),lateCancel);sb("notifications","POST",{target_type:"all",title:_bc.title,body:_bc.body,icon:"🚫"}).catch(()=>{});}
                            await loadData({silent:true});
                          }catch(e){toast$(i18n.t('ui.cancel_error'),"err");}
                          finally{cancellingLockRef.current=null;setCancellingId(null);}
                        }}><IconBlocked size={13}/> {cancellingId===realBooking.id?"...":"إلغاء"}</button>
                      </>)}
                      {!isPast&&h.bookingId&&s&&<button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>setOpenChatBookingId(openChatBookingId===h.bookingId?null:h.bookingId)}><IconChat size={10}/>{t('ui.contact')}{(chatUnread[h.salonId]||0)>0&&<span style={{background:"#e74c3c",color:"#fff",borderRadius:999,fontSize:9,fontWeight:900,minWidth:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 3px",marginLeft:2}}>{chatUnread[h.salonId]>9?"9+":chatUnread[h.salonId]}</span>}</button>}
                    </div>
                  </div>
                  {/* التقييم فقط بعد انتهاء وقت الحجز */}
                  {status==="approved"&&(()=>{const _bBarber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));const _svcDur=Array.isArray(h.services)?h.services.reduce((a,svc)=>a+((_bBarber?.durations?.[svc])||s?.prices?.__durations?.[svc]||0),0):0;const _dur=realBooking?.slotDuration||h.slotDuration||_svcDur||(s?.slotMin||40);const _start=new Date(`${h.date}T${(h.time||"00:00")}:00`);const _end=new Date(_start.getTime()+_dur*60000);if(new Date()<_end)return null;return<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                    // تحديث history العميل محلياً (لعرضه في "حجوزاتي")
                    const rev=[...history].reverse();
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated}:c));
                    try{await sb("customers","PATCH",{history:updated},`?id=eq.${customer.id}`);}catch{}
                    // كتابة التقييم في جدول reviews المستقل عبر السيرفر (يتحقق من وجود حجز معتمد فعلي)
                    try{
                      const salonId=Number(h.salonId);
                      const existing=(reviews||[]).find(rv=>Number(rv.salon_id)===salonId&&Number(rv.customer_id)===Number(customer.id)&&rv.booking_date===h.date);
                      const apiRes=await fetch("/api/submit-review",{
                        method:"POST",headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({salonId,customerId:Number(customer.id),customerName:customer.name,rating:r,comment,bookingDate:h.date}),
                      });
                      const data=await apiRes.json();
                      if(!apiRes.ok)throw new Error(data.error||"submit-review failed");
                      if(data.review){
                        if(existing)setReviews(p=>p.map(rv=>rv.id===existing.id?data.review:rv));
                        else setReviews(p=>[...p,data.review]);
                      }
                      setSalons(p=>p.map(s=>Number(s.id)===salonId?{...s,rating:data.rating}:s));
                    }catch(e){console.error(e);}
                  }}/>;})()}
                  {!isPast&&openChatBookingId===h.bookingId&&h.bookingId&&<CustomerSalonChat salonId={Number(h.salonId)} customerId={customer.id} bookingId={Number(h.bookingId)} salonName={s?.name||h.salonName} onClose={()=>setOpenChatBookingId(null)} toast$={toast$}/>}
                </div>
              );
            })}
          </div>}
      </>}

      {/* إشعارات العميل */}
      {tab==="notif"&&(()=>{
        const notifs=custNotifs;
        const clearAll=()=>{setCustNotifs([]);localStorage.setItem("dork_notifs","[]");localStorage.setItem("dork_notif_count","0");};
        return(
          <div>
            {notifs.length>0&&<button style={{...G.pageBtn,width:"100%",marginBottom:10,color:"#e74c3c",border:"1px solid #e74c3c"}} onClick={clearAll}>{t('ui.clear_all')}</button>}
            {notifs.length===0
              ?<div style={{...G.empty,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><IconBell size={14} dot={false}/>{t('ui.no_notifs')}</div>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {notifs.map(n=>(
                  <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"var(--border-ui)":"var(--p)"}`}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{display:"flex"}}><NotifIcon icon={n.icon} size={20}/></span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{n.title}</div>
                        <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{n.body}</div>
                        <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        );
      })()}

      {/* التذكيرات */}
      {tab==="remind"&&(
        <div style={{background:"var(--surface-1)",borderRadius:10,padding:"14px 14px",border:"1px solid var(--border-ui)"}}>
          <div style={{fontSize:13,color:"var(--p)",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:5}}><IconBell size={13}/>{t('ui.reminder_time')}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {[{v:30,l:"30 د"},{v:60,l:"ساعة"},{v:120,l:"ساعتين"},{v:1440,l:"يوم"}].map(({v,l})=>(
              <button key={v} onClick={()=>setReminderMins(v)}
                style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${reminderMins===v?"var(--p)":"var(--border-ui)"}`,background:reminderMins===v?"var(--pa12)":"var(--surface-2)",color:reminderMins===v?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"var(--text-muted)",flexShrink:0}}>{t('ui.or_enter_mins')}</span>
            <input type="number" min="1" max="10080"
              style={{width:90,padding:"8px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--p)",fontSize:14,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
              value={reminderMins} onChange={e=>setReminderMins(Math.max(1,+e.target.value))}/>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{reminderMins>=1440?"يوم":reminderMins>=60?(reminderMins%60===0?`${reminderMins/60} ساعة`:`${Math.floor(reminderMins/60)} ساعة و${reminderMins%60} دقيقة`):"دقيقة"}</span>
          </div>
        </div>
      )}

      {tab==="attend"&&<AttendanceView customer={customer} salons={salons}/>}

      {/* إعدادات الحساب */}
      {tab==="settings"&&(
        <div style={{background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid var(--border-ui)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid var(--border-ui)",display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="⚙" size={16}/> إعدادات الحساب</div>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>{setTab("settings");setEditMode(true);}}><IconPencil size={13}/>{t('ui.edit_data')}</button>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>setEditPinStep("select")}><IconLock size={13}/>{t('ui.change_pin')}</button>

          {/* قسم الموقع */}
          <div style={{background:"rgba(var(--gold-rgb),.06)",borderRadius:10,padding:12,border:"1px solid rgba(var(--gold-rgb),.2)",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={12}/>{t('ui.my_location')}</div>
            {customer?.locationLat&&customer?.locationLng?(
              <>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.loc_saved_offers')}</div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveCustomerLocation}><IconRefresh size={11}/>{t('ui.update_location')}</button>
                  <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={clearCustomerLocation}>{t('ui.delete_location')}</button>
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>{t('ui.no_location_long')}</div>
                <button style={{...G.sub,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveCustomerLocation}><IconPin size={12}/>{t('ui.save_location')}</button>
              </>
            )}
          </div>

          <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>{t('ui.delete_account_btn')}</button>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:8,textAlign:"center"}}>{t('ui.delete_warning')}</div>
        </div>
      )}

      {/* حوار تغيير PIN */}
      {editPinStep&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
            {editPinStep==="select"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><IconLock size={15}/>{t('ui.change_pin')}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",marginBottom:20}}>{t('ui.select_pin_digits')}</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <button onClick={()=>{setEditPinLength(4);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===4?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  4 أرقام
                </button>
                <button onClick={()=>{setEditPinLength(6);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===6?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  6 أرقام
                </button>
              </div>
            </>:editPinStep==="enter"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t('ui.enter_new_pin',{length:editPinLength})}</div>
              <input type="password" maxLength={editPinLength} value={editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditTempPin(val);setEditPinErr("");if(val.length===editPinLength)setTimeout(()=>setEditPinStep("confirm"),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editTempPin.length===editPinLength)setEditPinStep("confirm");}} />
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
            </>:editPinStep==="confirm"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t('ui.confirm_pin')}</div>
              <input type="password" maxLength={editPinLength} value={editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditPinConfirm(val);if(val.length===editPinLength&&editTempPin!==val){setEditPinErr(i18n.t('cust_drawer.pin_mismatch'));}else{setEditPinErr("");}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm)saveEditPin();}} />
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={saveEditPin} disabled={editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"var(--p)":"var(--border-ui)",color:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"#000":"#555",cursor:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  حفظ
                </button>
                <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  إلغاء
                </button>
              </div>
            </>:null}
          </div>
        </div>
      )}

      {/* حذف الحساب - Dialog */}
      {showDeleteConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowDeleteConfirm(false)}>
          <div style={{width:"100%",background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--gold)",borderBottom:"none",boxShadow:"0 -8px 32px rgba(var(--gold-rgb),.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconWarning size={36}/></div>
              <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:6}}>{t('ui.delete_account')}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>{t('ui.delete_confirm_msg')}</div>
            </div>
            <div style={{background:"rgba(var(--gold-rgb),.08)",border:"1px solid rgba(var(--gold-rgb),.2)",borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:"#ddd",lineHeight:1.8}}>
              <div style={{marginBottom:6,fontWeight:700,color:"var(--gold)"}}>{t('ui.will_delete')}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="✗" size={11}/> حسابك بشكل نهائي</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="✗" size={11}/> جميع معلوماتك الشخصية</div>
            </div>
            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:10,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700,display:"flex",justifyContent:"center"}}>
              <LabelWithIcon label="⚡ تنبيه: لا يمكن استرجاع البيانات بعد الحذف" size={11}/></div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={()=>setShowDeleteConfirm(false)}><NotifIcon icon="↩️" size={13}/> إلغاء</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={confirmDeleteAccount}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconTrash size={14} color="#fff"/>{t('ui.delete_final')}</span></button>
            </div>
          </div>
        </div>
      )}

    </div></div>
  );
}

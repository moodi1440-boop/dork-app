// صفحة الصالون وسير عملية الحجز — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { SLOT_STEP, SLOT_MIN, BUFFER_MIN } from "../constants.js";
import {
  todayStr, to12h, toM, calcTotal, openMaps, optimizeImageUrl,
  getSlotsForSalon, getSlotsForBarber,
} from "../utils.js";
import { F, fi, ShareBtn } from "./ui.jsx";
import { NotifPanel, StatsPanel } from "./OwnerPanels.jsx";
import {
  IconArrowRight, IconBarberPole, IconHeart, IconScissors, IconStar, IconUser, NotifIcon
} from "./icons.jsx";
import { sb } from "../../App.jsx";

export function SalonPage({salon,favSet,toggleFav,setView,addBooking,updateBookingStatus,ownerSession,customers,reviews,refreshSalonBookings,rescheduleId,customer}){
  const{t}=useTranslation();
  const[tab,setTab]=useState("book");
  const fav=favSet.has(salon.id);
  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const canManage=ownerSession===salon.id;

  const salonReviews=(reviews||[]).filter(r=>Number(r.salon_id)===Number(salon.id));
  const avgRating=salonReviews.length?Math.round(salonReviews.reduce((a,r)=>a+r.rating,0)/salonReviews.length*10)/10:salon.rating||0;

  return(
    <div style={G.page}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,flex:1}}>{salon.name}</h2>
          <button style={{...G.favBtn,...(fav?G.favOn:{}),display:"inline-flex",alignItems:"center",justifyContent:"center"}} onClick={()=>toggleFav(salon.id)}><IconHeart size={20} filled={fav}/></button>
          <ShareBtn salon={salon}/>
        </div>
        <div style={G.salonBadge}>
          <IconScissors size={20} color="var(--p)"/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{salon.name}</div>
            <div style={{fontSize:11,color:"var(--text-muted)"}}>{salon.gov||salon.region}{salon.village?` > ${salon.village}`:""}</div>
            <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><IconUser size={10}/>{salon.owner} - <NotifIcon icon="📞" size={10}/> {salon.phone}</div>
            {salon.social?.enabled&&(salon.social.whatsapp||salon.social.twitter||salon.social.telegramUser||salon.social.email)&&(
              <div style={{display:"flex",gap:10,marginTop:4}}>
                {salon.social.whatsapp&&<a href={`https://wa.me/966${salon.social.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{fontSize:15,textDecoration:"none"}} title="واتساب الصالون" aria-label="واتساب الصالون"><NotifIcon icon="💬" size={15}/></a>}
                {salon.social.twitter&&<a href={`https://twitter.com/${salon.social.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{fontSize:15,textDecoration:"none"}} title="تويتر/X الصالون" aria-label="تويتر/X الصالون"><NotifIcon icon="🐦" size={15}/></a>}
                {salon.social.telegramUser&&<a href={`https://t.me/${salon.social.telegramUser.replace("@","")}`} target="_blank" rel="noreferrer" style={{fontSize:15,textDecoration:"none"}} title="تيليجرام الصالون" aria-label="تيليجرام الصالون"><NotifIcon icon="✈" size={15}/></a>}
                {salon.social.email&&<a href={`mailto:${salon.social.email}`} style={{fontSize:15,textDecoration:"none"}} title="بريد الصالون" aria-label="بريد الصالون"><NotifIcon icon="✉️" size={15}/></a>}
              </div>
            )}
            {salonReviews.length>0&&<>
              <div style={{fontSize:12,color:"#e8c04a",marginTop:2,display:"flex",alignItems:"center",gap:4}}><IconStar size={11} color="#e8c04a"/>{avgRating} ({salonReviews.length} {t("salon_page.reviews_count")})</div>
              <div style={{fontSize:9,color:"var(--text-muted)",marginTop:2}}>{t("salon_page.reviews_note")}</div>
            </>}
          </div>
          <button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title={t('ui.location_label')} aria-label="فتح موقع الصالون في الخريطة">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
          </button>
        </div>
        <div style={G.tabRow}>
          <button style={{...G.tabBtn,...(tab==="book"?G.tabOn:{})}} onClick={()=>setTab("book")}>{t("salon_page.book_tab")}</button>
          {canManage&&<button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>{setTab("notif");refreshSalonBookings(salon.id);}} aria-label="الإشعارات والحجوزات المعلقة">🔔{pending>0&&<span style={G.notifDot}>{pending}</span>}</button>}
          {canManage&&<button style={{...G.tabBtn,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")} aria-label="إحصائيات الصالون"><NotifIcon icon="📊" size={16}/></button>}
        </div>
        {tab==="book"&&<BookView salon={salon} addBooking={addBooking} onBack={null} inline setView={setView} rescheduleId={rescheduleId} customer={customer}/>}
        {tab==="notif"&&canManage&&<NotifPanel salon={salon} onUpdate={updateBookingStatus} customers={customers} refreshSalonBookings={refreshSalonBookings}/>}
        {tab==="stats"&&canManage&&<StatsPanel salon={salon}/>}
      </div>
    </div>
  );
}

export function BookView({salon,addBooking,onBack,inline,setView,customer,rescheduleId,quickBookSeed,setQuickBookSeed,toast$}){
  const{t}=useTranslation();
  const quickSeedRef=useRef(quickBookSeed);
  const seed=quickSeedRef.current;
  const seedServices=seed?(seed.services||[]).filter(s=>(salon.services||[]).includes(s)):[];
  const seedBarberValid=!!(seed&&seed.barberId&&seed.barberId!=="any"&&(salon.barbers||[]).some(b=>b.id===seed.barberId&&b.active!==false));
  const quickBookActive=!!seed&&seedServices.length>0;
  const[step,setStep]=useState(quickBookActive?4:1);
  const[quickSearching,setQuickSearching]=useState(quickBookActive);
  const[booking,setBooking]=useState(false);
  const[reminderMins,setReminderMins]=useState(()=>parseInt(localStorage.getItem("dork_reminder")||"60"));
  const[form,setForm]=useState(()=>quickBookActive?{name:customer?.name||"",phone:customer?.phone||"",email:customer?.email||"",services:seedServices,barberId:seedBarberValid?seed.barberId:"",date:todayStr(),time:"",waitSlot:""}:{name:customer?.name||"",phone:customer?.phone||"",email:customer?.email||"",services:[],barberId:"",date:todayStr(),time:"",waitSlot:""});
  const[errors,setErrors]=useState({});
  const[liveBookings,setLiveBookings]=useState([]);
  const[loadingBookings,setLoadingBookings]=useState(true);
  const[waitingSlots,setWaitingSlots]=useState(new Set());
  const activeBarbers=(salon.barbers||[]).filter(b=>b.active!==false);
  const bc=activeBarbers.length||1;
  const barber=salon.barbers?.find(b=>b.id===form.barberId);
  const salonDurations=salon.prices?.__durations||{};
  const getDur=(svc)=>barber?.durations?.[svc]||salonDurations[svc]||null;
  useEffect(()=>{
    if(!form.date)return;
    setLoadingBookings(true);
    sb("bookings","GET",null,`?salon_id=eq.${salon.id}&date=eq.${form.date}&status=neq.rejected&select=id,barber_id,service,time,status,slot_duration_minutes&limit=100`)
      .then(rows=>{if(Array.isArray(rows))setLiveBookings(rows.map(b=>({id:b.id,barberId:b.barber_id||"any",date:b.date||form.date,time:b.time||"",status:b.status||"pending",slotDuration:b.slot_duration_minutes||null,services:(()=>{try{return JSON.parse(b.service||"[]");}catch{return b.service?[b.service]:[]}})()})));})
      .catch(()=>{})
      .finally(()=>setLoadingBookings(false));
  },[form.date,form.barberId]);
  useEffect(()=>{
    if(!form.date)return;
    sb("waiting_list","GET",null,`?salon_id=eq.${salon.id}&slot_date=eq.${form.date}&status=eq.waiting&select=slot_time&limit=50`)
      .then(rows=>{if(Array.isArray(rows))setWaitingSlots(new Set(rows.map(r=>r.slot_time)));})
      .catch(()=>{});
  },[form.date]);
  const totalDuration=form.services.reduce((a,s)=>a+(getDur(s)||0),0);
  const allSlots=[...new Set(barber?getSlotsForBarber(salon,barber):getSlotsForSalon(salon))];
  const slots=form.date===todayStr()?allSlots.filter(sl=>{const[h,m]=sl.split(":").map(Number);const now=new Date();return h*60+m>now.getHours()*60+now.getMinutes();}):allSlots;
  const BMIN=salon.bufferMin??BUFFER_MIN;
  const getExistingDur=b=>{if(b.slotDuration||b.slot_duration_minutes)return b.slotDuration||b.slot_duration_minutes;const svcs=Array.isArray(b.services)?b.services:(()=>{try{return JSON.parse(b.service||"[]");}catch{return b.service?[b.service]:[]}})();const bBarber=salon.barbers?.find(x=>x.id===(b.barberId||b.barber_id));const dur=svcs.reduce((a,s)=>a+((bBarber?.durations?.[s])||salonDurations[s]||0),0);return dur||(salon.slotMin||SLOT_MIN);};
  const checkConflict=(slM,newDur,bookings,barberId)=>bookings.filter(b=>{if(["rejected","cancelled"].includes(b.status))return false;const bId=b.barberId||b.barber_id;if(barberId&&barberId!=="any"&&bId!==barberId&&bId!=="any")return false;const bM=toM(b.time||"00:00");return bM<slM+newDur&&slM<bM+getExistingDur(b);}).length;
  const slotStatus=sl=>{if(loadingBookings)return"loading";const slM=toM(sl);const dayBks=liveBookings.filter(b=>b.date===form.date&&!["rejected","cancelled"].includes(b.status));const bIdOf=b=>b.barberId||b.barber_id;const matches=dayBks.filter(b=>{if(form.barberId&&form.barberId!=="any"&&bIdOf(b)!==form.barberId&&bIdOf(b)!=="any")return false;const bM=toM(b.time||"00:00");return bM<=slM&&slM<bM+getExistingDur(b);});return matches.length<(form.barberId?1:bc)?"free":"booked";};
  const total=calcTotal(form.services,salon.prices);
  const toggle=s=>setForm(p=>({...p,time:"",services:p.services.includes(s)?p.services.filter(x=>x!==s):[...p.services,s]}));
  const DAYS=t("book.days",{returnObjects:true});
  const days7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);const dateStr=new Date(d).toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"});const dow=new Date(dateStr+"T12:00:00+03:00").getDay();return{dateStr,dayName:DAYS[dow],dayNum:Number(dateStr.slice(8)),isClosed:salon.closedDays?.includes(dow),isToday:i===0};});
  const toM=(tt)=>{const[h,m]=(tt||"").split(":").map(Number);return(h||0)*60+(m||0);};
  const closingM=(()=>{if(barber?.shiftEnd)return toM(barber.shiftEnd);if(salon.shiftEnabled)return toM(salon.shift2End||salon.shift1End||"22:00");return toM(salon.workEnd||"22:00");})();
  const slotsVisible=slots.filter(sl=>toM(sl)+(totalDuration||(salon.slotMin||SLOT_MIN))<=closingM);
  useEffect(()=>{
    if(!quickSearching||loadingBookings)return;
    const found=slotsVisible.find(sl=>slotStatus(sl)==="free");
    if(found)setForm(p=>({...p,time:found}));
    setQuickSearching(false);
    setQuickBookSeed?.(null);
    if(!found)toast$?.(i18n.t('ui.all_slots_taken'),"warn");else setStep(5);
  },[quickSearching,loadingBookings]);
  const getBarberNextSlot=(b,date)=>{const bSlots=getSlotsForBarber(salon,b);const dSlots=date===todayStr()?bSlots.filter(sl=>{const[h,m]=sl.split(":").map(Number);const now=new Date();return h*60+m>now.getHours()*60+now.getMinutes();}):bSlots;const bkDef=salon.slotMin||SLOT_MIN;const bMin2=salon.bufferMin??BUFFER_MIN;const newDur2=totalDuration||bkDef;const todayBks=liveBookings.filter(bk=>bk.date===date&&!["rejected","cancelled"].includes(bk.status)&&(bk.barberId===b.id||bk.barberId==="any"));for(const sl of dSlots){const slM=toM(sl);const busy=todayBks.some(bk=>{const bkM=toM(bk.time||"00:00");const bkDur=getExistingDur(bk);return bkM<slM+newDur2&&slM<bkM+bkDur;});if(!busy)return sl;}return null;};
  const v1=()=>{const e={};if(!form.name.trim())e.name=t("book.err_required");if(!form.phone.trim())e.phone=t("book.err_required");setErrors(e);return!Object.keys(e).length;};
  const v2=()=>{const e={};if(activeBarbers.length&&!form.barberId)e.barberId=t("book.err_barber");setErrors(e);return!Object.keys(e).length;};
  const v3=()=>{const e={};if(!form.services.length)e.services=t("book.err_service");setErrors(e);return!Object.keys(e).length;};
  const v4=()=>{const e={};if(!form.time&&!form.waitSlot){e.time=t("book.err_time");}setErrors(e);return!Object.keys(e).length;};
  const BtnBack=({toStep})=><button style={{background:"var(--surface-2)",color:"var(--text-muted)",border:"none",padding:"12px 16px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",flexShrink:0}} onClick={()=>setStep(toStep)}>{t("salon_page.back")}</button>;
  const inner=(
    <>
      {!inline&&<div style={G.salonBadge}><IconScissors size={20} color="var(--p)"/><div style={{flex:1}}><div style={{fontWeight:700,color:"var(--text-primary)"}}>{salon.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{salon.gov||salon.region}</div></div><button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg></button></div>}
      <div style={{...G.steps,gap:2}}>{[t("book.step1"),t("book.step2"),t("book.step3"),t("book.step4"),t("book.step5")].map((l,i)=><div key={i} style={{...G.si,...(step>=i+1?{opacity:1}:{})}}><div style={G.sd}>{i+1}</div><span style={{fontSize:10,color:"var(--p)",textAlign:"center",lineHeight:1.1}}>{l}</span></div>)}</div>
      {/* ── الخطوة 1: البيانات ── */}
      {step===1&&<div style={G.fc}>
        <F label={t("book.name_label")} error={errors.name}><input style={fi(errors.name)} placeholder={t("book.name_ph")} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label={t("book.phone_label")} error={errors.phone}><input style={fi(errors.phone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
        <button style={G.sub} onClick={()=>{if(v1())setStep(2);}}>{t("book.next")}</button>
      </div>}
      {/* ── الخطوة 2: الحلاق ── */}
      {step===2&&<div style={G.fc}>
        {activeBarbers.length>0&&<F label={t("book.barber_label")} error={errors.barberId}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {activeBarbers.map(b=>{
              const active=form.barberId===b.id;
              const ns=getBarberNextSlot(b,form.date);
              const nM=ns?toM(ns):null;
              const nowM_=new Date().getHours()*60+new Date().getMinutes();
              const isAvailNow=nM!==null&&nM<=nowM_+SLOT_STEP;
              return(
                <div key={b.id}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 10px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"var(--surface-2)",cursor:"pointer",minWidth:60}}
                  onClick={()=>setForm(p=>({...p,barberId:b.id,time:""}))}>
                  {b.photo?<img src={optimizeImageUrl(b.photo,36,36)} alt={b.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`}}/>:<div style={{width:36,height:36,borderRadius:"50%",background:"var(--surface-2)",border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}><IconBarberPole size={16}/></div>}
                  <span style={{fontSize:11,color:active?"var(--p)":"var(--text-muted)",fontWeight:active?700:400,textAlign:"center"}}>{b.name}</span>
                  <span style={{fontSize:9,color:ns?(isAvailNow?"#27ae60":"#f39c12"):"#e74c3c",textAlign:"center"}}>{ns?(isAvailNow?"متاح الآن":to12h(ns)):"مشغول"}</span>
                </div>
              );
            })}
          </div>
        </F>}
        <div style={{display:"flex",gap:8,marginTop:8}}><BtnBack toStep={1}/><button style={{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}} onClick={()=>{if(v2())setStep(3);}}>{t("book.next")}</button></div>
      </div>}
      {/* ── الخطوة 3: الخدمات ── */}
      {step===3&&<div style={G.fc}>
        <F label={t("book.services_label")} error={errors.services}>
          <div style={{borderRadius:12,overflow:"hidden",border:`1.5px solid ${errors.services?"#e74c3c":"var(--border-ui)"}`}}>
            {/* رأس الأعمدة */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 66px 66px",padding:"8px 14px",gap:6,background:"var(--surface-2)",borderBottom:"1px solid var(--border-ui)"}}>
              <div style={{padding:"7px 8px",borderRadius:7,border:"1px solid var(--border-ui)",background:"rgba(255,255,255,.04)",fontSize:9,color:"var(--text-muted)",fontWeight:700}}>{t('ui.service_col')}</div>
              <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                <div style={{padding:"7px 8px",borderRadius:7,border:"1px solid var(--border-ui)",background:"rgba(255,255,255,.04)",fontSize:12,color:"var(--text-muted)",fontWeight:700,minWidth:46,textAlign:"center"}}>{t('ui.time_col')}</div>
              </div>
              <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                <div style={{padding:"7px 8px",borderRadius:7,border:"1px solid var(--border-ui)",background:"rgba(255,255,255,.04)",fontSize:12,color:"var(--text-muted)",fontWeight:700,minWidth:46,textAlign:"center"}}>{t('ui.price_col')}</div>
              </div>
            </div>
            {(salon.services||[]).map((svc,idx)=>{
              const sel=form.services.includes(svc);
              const price=salon.prices?.[svc]||0;
              const dur=getDur(svc);
              return(
                <div key={svc}
                  style={{display:"grid",gridTemplateColumns:"1fr 66px 66px",alignItems:"center",padding:"11px 14px",cursor:"pointer",background:sel?"rgba(var(--pr),.1)":"transparent",borderBottom:idx<(salon.services||[]).length-1?"1px solid var(--border-ui)":"none"}}
                  onClick={()=>toggle(svc)}>
                  <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--p)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {sel&&<span style={{color:"var(--p-text)",fontSize:10,fontWeight:900,lineHeight:1}}>✓</span>}
                    </div>
                    <span style={{fontWeight:sel?700:400,color:sel?"var(--p)":"var(--text-primary)",fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                    {dur?<div style={{padding:"7px 8px",borderRadius:7,border:"1px solid var(--border-ui)",background:"var(--surface-2)",fontSize:12,color:"var(--text-muted)",minWidth:46,textAlign:"center"}}>{dur}</div>:<span style={{fontSize:10,color:"#444"}}>—</span>}
                  </div>
                  <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                    <div style={{padding:"7px 8px",borderRadius:7,border:`1px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa07)":"var(--surface-2)",fontSize:12,fontWeight:700,color:sel?"var(--p)":"var(--text-primary)",minWidth:46,textAlign:"center"}}>{price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </F>
        {form.services.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 66px 66px",background:"var(--pa07)",borderRadius:10,padding:"8px 14px",marginTop:-4,gap:6}}>
          <div style={{padding:"7px 6px",borderRadius:8,border:"1px solid rgba(var(--pr),.25)",background:"rgba(255,255,255,.04)",textAlign:"center"}}>
            <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:600}}>{form.services.length} خدمة</span>
          </div>
          {totalDuration>0?<div style={{padding:"7px 4px",borderRadius:8,border:"1px solid rgba(var(--pr),.35)",background:"rgba(255,255,255,.04)",textAlign:"center"}}>
            <span style={{fontSize:11,color:"var(--p)",fontWeight:700}}>{totalDuration} دقيقة</span>
          </div>:<div/>}
          <div style={{padding:"7px 4px",borderRadius:8,border:"1px solid rgba(var(--pr),.35)",background:"rgba(255,255,255,.04)",textAlign:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>{total} {t("book.sar")}</span>
          </div>
        </div>}
        <div style={{display:"flex",gap:8,marginTop:8}}><BtnBack toStep={2}/><button style={{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}} onClick={()=>{if(v3())setStep(4);}}>{t("book.next")}</button></div>
      </div>}
      {/* ── الخطوة 4: التاريخ والوقت ── */}
      {step===4&&<div style={G.fc}>
        <div style={{display:"flex",gap:4,marginBottom:10}}>
          {days7.map(({dateStr,dayName,dayNum,isClosed,isToday},idx)=>{
            const sel=form.date===dateStr;
            const label=isToday?t("book.today"):idx===1?t("book.tomorrow"):dayName;
            return(
              <div key={dateStr}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 4px",borderRadius:12,border:`1.5px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa12)":"transparent",cursor:isClosed?"not-allowed":"pointer",opacity:isClosed?0.3:1}}
                onClick={()=>{if(!isClosed)setForm(p=>({...p,date:dateStr,time:"",waitSlot:""}));}}>
                <span style={{fontSize:9,color:sel?"var(--p)":"var(--text-muted)",fontWeight:sel?700:400,textAlign:"center"}}>{label}</span>
                <span style={{fontSize:15,fontWeight:700,color:sel?"var(--p)":"var(--text-primary)"}}>{dayNum}</span>
              </div>
            );
          })}
        </div>
        {salon.shiftEnabled&&<div style={{fontSize:11,color:"var(--p)",background:"var(--pa07)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>⏰ {to12h(salon.shift1Start)}-{to12h(salon.shift1End)} | {to12h(salon.shift2Start)}-{to12h(salon.shift2End)}</div>}
        {salon.closedDays?.length>0&&<div style={{fontSize:10,color:"var(--text-muted)",marginBottom:6}}>{t("book.closed_days_prefix")} {DAYS.filter((_,i)=>salon.closedDays.includes(i)).join(" - ")}</div>}
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:7}}>{t("book.time_hint")}{barber?` - ${barber.name}`:""}</div>
        {errors.time&&<div style={G.err}>{errors.time}</div>}
        {loadingBookings?<div style={{textAlign:"center",padding:"18px 0",color:"var(--text-muted)",fontSize:13}}>{t('ui.checking_slots')}</div>:<div style={G.timeGrid}>{slotsVisible.map(sl=>{const st=slotStatus(sl);const full=st!=="free";const sel=form.time===sl;const waiting=form.waitSlot===sl;return(<div key={sl} style={{display:"flex",flexDirection:"column",gap:2}}><button disabled={loadingBookings||(full&&!waiting)} onClick={()=>!full&&setForm(p=>({...p,time:p.time===sl?"":sl,waitSlot:""}))} style={{...G.ts,...(st==="booked"?G.tsF:{}),...(sel&&!full?G.tsS:{})}}><div>{to12h(sl)}</div>{st==="booked"&&<div style={{fontSize:9,marginTop:1,color:"var(--text-muted)"}}>{t("book.booked")}</div>}</button>{full&&(waitingSlots.has(sl)?<div style={{fontSize:9,padding:"3px 4px",borderRadius:6,textAlign:"center",color:"var(--text-muted)",opacity:.7}}>{t('ui.full')}</div>:<button onClick={()=>setForm(p=>({...p,waitSlot:p.waitSlot===sl?"":sl,time:""}))} style={{fontSize:9,padding:"3px 4px",borderRadius:6,border:`1.5px solid ${waiting?"var(--p)":"#f39c1266"}`,background:waiting?"var(--pa12)":"rgba(243,156,18,.06)",color:waiting?"var(--p)":"#f39c12",cursor:"pointer",fontFamily:"inherit",fontWeight:waiting?700:400}}>⏳{waiting?" ✓":""}</button>)}</div>);})}</div>}
        {form.waitSlot&&<div style={{background:"rgba(243,156,18,.08)",border:"1px solid #f39c1244",borderRadius:8,padding:"8px 12px",marginBottom:4,fontSize:11,color:"#f39c12",textAlign:"center"}}>{t("book.wait_msg")} <strong>{to12h(form.waitSlot)}</strong> {t("book.wait_notify")}</div>}
        <div style={{display:"flex",gap:8,marginTop:8}}><BtnBack toStep={3}/><button style={{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}} onClick={()=>{if(v4())setStep(5);}}>{form.waitSlot?t("book.next_wait"):t("book.next")}</button></div>
      </div>}
      {/* ── الخطوة 5: التأكيد ── */}
      {step===5&&<div style={G.fc}>
        <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:36}}>{form.waitSlot?"⏳":"🗓️"}</div><h3 style={{color:"var(--text-primary)",marginTop:4,fontSize:16}}>{form.waitSlot?t("book.confirm_wait_title"):"مراجعة تفاصيل الحجز"}</h3></div>
        {[[t("book.field_name"),form.name],[t("book.field_phone"),form.phone],[t("book.field_email"),form.email||"-"],[t("book.field_services"),form.services.join(" + ")],[t("book.field_barber"),barber?.name||t("book.any_barber")],[t("book.field_date"),form.date],[t("book.field_time"),form.waitSlot?`⏳ ${to12h(form.waitSlot)}`:to12h(form.time)],...(totalDuration>0?[[t("book.field_duration"),`${totalDuration} ${t("book.min_label")}`]]:[[]]),[t("book.field_total"),`${total} ${t("book.sar")}`]].map(([l,v])=>l?<div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border-ui)"}}><span style={{color:"var(--text-muted)",fontSize:12}}>{l}</span><span style={{color:"var(--text-primary)",fontWeight:600,fontSize:12}}>{v}</span></div>:null)}
        <button style={{...G.mapsBtn,width:"100%",marginTop:10,justifyContent:"center",display:"flex",padding:10}} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>{t("book.open_map")}</button>
        {form.waitSlot&&<div style={{background:"rgba(243,156,18,.1)",border:"1px solid #f39c1255",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#f39c12"}}>{t("book.wait_msg")} {to12h(form.waitSlot)} {t("book.wait_notify")}</div>}
        {!form.waitSlot&&customer&&<div style={{margin:"10px 0 4px"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6,textAlign:"center"}}>{t('ui.reminder_before')}</div>
          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
            {[{v:30,l:"30 د"},{v:60,l:"ساعة"},{v:120,l:"ساعتين"},{v:0,l:"بدون"}].map(({v,l})=>(
              <button key={v} onClick={()=>setReminderMins(v)}
                style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${reminderMins===v?"var(--p)":"var(--border-ui)"}`,background:reminderMins===v?"var(--pa12)":"transparent",color:reminderMins===v?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                {l}
              </button>
            ))}
          </div>
        </div>}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <BtnBack toStep={4}/>
          <button disabled={booking} style={{flex:1,border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:booking?"not-allowed":"pointer",fontFamily:"'Cairo',sans-serif",background:form.waitSlot?"linear-gradient(135deg,#f39c12,#e67e22)":rescheduleId?"linear-gradient(135deg,#8e44ad,#9b59b6)":"linear-gradient(135deg,#27ae60,#2ecc71)",color:"#fff",opacity:booking?0.6:1}} onClick={async()=>{
            if(booking)return;
            setBooking(true);
            if(form.waitSlot){
              if(!form.name||!form.phone){alert(t("book.err_name_phone"));setBooking(false);return;}
              try{
                const existing=await sb("waiting_list","GET",null,`?select=id,phone&salon_id=eq.${salon.id}&slot_date=eq.${form.date}&slot_time=eq.${form.waitSlot}&status=eq.waiting&limit=1`).catch(()=>[]);
                if(Array.isArray(existing)&&existing.length){alert(existing[0].phone===form.phone?i18n.t('ui.already_in_waiting'):i18n.t('ui.waiting_full_alert'));setBooking(false);return;}
                await sb("waiting_list","POST",{salon_id:salon.id,name:form.name,phone:form.phone,slot_date:form.date,slot_time:form.waitSlot,customer_id:null,status:"waiting"});
                alert(t("book.success_wait"));
                if(setView)setView("home");
              }catch(e){alert(i18n.t('ui.err_try_again'));setBooking(false);}
            }else{
              const slM=toM(form.time);
              const newDur=totalDuration||(salon.slotMin||SLOT_MIN);
              const freshBks=await sb("bookings","GET",null,`?salon_id=eq.${salon.id}&date=eq.${form.date}&status=not.in.(rejected,cancelled)&select=id,barber_id,service,time,slot_duration_minutes&limit=100`).catch(()=>[]);
              const conflict=checkConflict(slM,newDur,Array.isArray(freshBks)?freshBks:[],form.barberId);
              if(conflict>=(form.barberId?1:bc)){alert(i18n.t('ui.service_conflict'));setBooking(false);return;}
              try{await addBooking(salon.id,{...form,barberId:form.barberId||"any",barberName:barber?.name||"",total,reminderMins,totalDuration},rescheduleId||null);}catch(e){setBooking(false);}
            }
          }}>{booking?"⏳...":form.waitSlot?t("book.confirm_wait_btn"):rescheduleId?t("book.reschedule_btn"):t("book.confirm_btn")}</button>
        </div>
      </div>}
    </>
  );
  if(inline)return <div>{inner}</div>;
  return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>onBack?onBack():setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("salon_page.book_tab")}</h2></div>{inner}</div></div>;
}

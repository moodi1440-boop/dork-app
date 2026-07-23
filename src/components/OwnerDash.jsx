// لوحة تحكم صاحب الصالون الرئيسية — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { getTodayDateInRiyadh, to12h } from "../utils.js";
import { BookingCalendar, OwnerReviewsPanel } from "./OwnerReviewsCalendar.jsx";
import { MessagesPanel } from "./Chat.jsx";
import { NotifPanel, StatsPanel } from "./OwnerPanels.jsx";
import { PromoPanel } from "./PromoPanel.jsx";
import {
  IconArrowRight, IconCalendar, IconCheck, IconClose, IconFire, IconPin, IconStar, NotifIcon
} from "./icons.jsx";

export function OwnerDash({salon,setView,setOwnerSession,updateBookingStatus,setSalons,toast$,refreshSalonBookings,reviews,setReviews,customers=[],socialLinks,setSocialLinks,ownerTab,setOwnerTab,showSalonDrawer,setShowSalonDrawer}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[activeCard,setActiveCard]=useState(null);
  const[showTomorrow,setShowTomorrow]=useState(false);
  const[ownerNotifs,setOwnerNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}});
  const[dashCashEntries,setDashCashEntries]=useState(()=>{try{return JSON.parse(localStorage.getItem(`dork_cash_${salon?.id}`)||"[]");}catch{return[];}});
  const[showDashCash,setShowDashCash]=useState(false);
  const[dashCashAmt,setDashCashAmt]=useState("");
  const[dashCashBarber,setDashCashBarber]=useState("");
  useEffect(()=>{if(salon?.id)refreshSalonBookings(salon.id);},[salon?.id]);
  const _shownAdminRef=useRef(null);if(!_shownAdminRef.current){try{_shownAdminRef.current=new Set(JSON.parse(localStorage.getItem("dork_shown_admin")||"[]"));}catch{_shownAdminRef.current=new Set();}}
  useEffect(()=>{
    const adminNotifs=ownerNotifs.filter(n=>n.title&&(n.title.includes("إدارة")||n.title.includes("اشتراك")||n.title.includes("تحذير")||n.title.includes("إعلان")));
    for(const n of adminNotifs){
      if(_shownAdminRef.current.has(String(n.id)))continue;
      _shownAdminRef.current.add(String(n.id));
      try{localStorage.setItem("dork_shown_admin",JSON.stringify([..._shownAdminRef.current]));}catch{}
      toast$&&toast$(`${n.icon||"📢"} ${n.title}: ${n.body||""}`.trim(),"info",5000);
    }
  },[ownerNotifs]);
  const _oPtStartY=useRef(0);const _oPtActive=useRef(false);const _oPtYRef=useRef(0);
  const[_oPtY,_setOPtY]=useState(0);const[_oPtRefreshing,_setOPtRefreshing]=useState(false);const _OPT=65;
  useEffect(()=>{
    const onTS=(e)=>{if(window.scrollY>2)return;_oPtStartY.current=e.touches[0].clientY;_oPtActive.current=true;_oPtYRef.current=0;};
    const onTM=(e)=>{if(!_oPtActive.current)return;const dy=e.touches[0].clientY-_oPtStartY.current;if(dy>0){const y=Math.min(dy*.45,80);_oPtYRef.current=y;_setOPtY(y);}else{_oPtActive.current=false;_oPtYRef.current=0;_setOPtY(0);}};
    const onTE=async()=>{if(_oPtActive.current&&_oPtYRef.current>=_OPT&&!_oPtRefreshing){_setOPtRefreshing(true);if(salon?.id)await refreshSalonBookings(salon.id).catch(()=>{});setTimeout(()=>_setOPtRefreshing(false),800);}_oPtActive.current=false;_oPtYRef.current=0;_setOPtY(0);};
    window.addEventListener('touchstart',onTS,{passive:true});
    window.addEventListener('touchmove',onTM,{passive:true});
    window.addEventListener('touchend',onTE,{passive:true});
    return()=>{window.removeEventListener('touchstart',onTS);window.removeEventListener('touchmove',onTM);window.removeEventListener('touchend',onTE);};
  },[salon?.id,_oPtRefreshing,refreshSalonBookings]);
  if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("owner_dash.page_title")}</h2></div><div style={G.empty}>{t("owner_dash.not_found")}</div></div></div>;

  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const statusColor=salon.status==="approved"?"#27ae60":salon.status==="rejected"?"#e74c3c":"var(--pl)";
  const statusLabel=salon.status==="approved"?t("owner_dash.status_active"):salon.status==="rejected"?t("owner_dash.status_rejected"):t("owner_dash.status_pending");

  const approvedBookings=salon.bookings.filter(b=>b.status==="approved");
  const totalEarned=approvedBookings.length;
  const totalPaid=salon.totalPaid||0;
  const balance=totalEarned-totalPaid;


  // ── حسابات ملخص اليوم (بتوقيت السعودية AST/GMT+3) ──
  const _td=getTodayDateInRiyadh();
  const _tdBks=salon.bookings.filter(b=>b.date===_td&&b.status!=="cancelled");
  const _tdApproved=_tdBks.filter(b=>b.status==="approved");
  const _tdPending=_tdBks.filter(b=>b.status==="pending");
  const _tdRejected=_tdBks.filter(b=>b.status==="rejected");
  const _tdRevenue=_tdApproved.reduce((s,b)=>s+(b.total||0),0);
  const _tdCash=dashCashEntries.filter(e=>e.date===_td).reduce((s,e)=>s+(e.amount||0),0);
  const _tdTotal=_tdRevenue+_tdCash;
  const addDashCash=()=>{
    const amt=parseFloat(dashCashAmt);
    if(!amt||amt<=0)return;
    const selB=salon.barbers?.find(b=>b.id===dashCashBarber);
    const updated=[...dashCashEntries,{id:Date.now(),amount:amt,note:"",date:_td,barberId:dashCashBarber||null,barberName:selB?.name||""}];
    setDashCashEntries(updated);
    try{localStorage.setItem(`dork_cash_${salon.id}`,JSON.stringify(updated));}catch{}
    setDashCashAmt("");setDashCashBarber("");setShowDashCash(false);
  };
  const _now=new Date();
  const _nowMins=_now.getHours()*60+_now.getMinutes();
  const _nextBk=_tdApproved
    .filter(b=>{const[h,m]=(b.time||"0:0").split(":").map(Number);return h*60+m>_nowMins;})
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""))[0];
  const _allSlots=getSlotsForSalon(salon);
  const _bookedSlotCount=new Set(_tdApproved.map(b=>b.time)).size;
  const _occ=Math.min(100,Math.round(_bookedSlotCount/Math.max(_allSlots.length,1)*100));
  const _dNames=t("owner_dash.days",{returnObjects:true});
  const _mNames=t("owner_dash.months",{returnObjects:true});
  const _dayLabel=`${_dNames[_now.getDay()]}، ${_now.getDate()} ${_mNames[_now.getMonth()]}`;

  // ── حسابات حجوزات غداً ──
  const _tmrDate=new Date(_now);_tmrDate.setDate(_tmrDate.getDate()+1);
  const _tmr=_tmrDate.toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"});
  const _tmrBks=salon.bookings.filter(b=>b.date===_tmr&&b.status!=="cancelled");
  const _tmrApproved=_tmrBks.filter(b=>b.status==="approved");
  const _tmrPending=_tmrBks.filter(b=>b.status==="pending");

  return(
    <div style={{...G.page,direction:dir}}>
      <style>{`
        @keyframes fadeInUp {from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideInFromRight {from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
        @keyframes scaleIn {from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        @keyframes growBar {from{transform:scaleX(0);}to{transform:scaleX(1);}}
        @keyframes pulse {0%,100%{opacity:1;}50%{opacity:.6;}}
        .stat-card{animation:fadeInUp .45s ease-out both;transition:all .25s ease;}
        .stat-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(var(--gold-rgb),.18);}
        .tab-button{transition:all .2s ease;}
        .balance-tab{animation:slideInFromRight .4s cubic-bezier(0.4,0,0.2,1);}
        .notif-banner{animation:fadeInUp .4s ease-out;transition:all .3s ease;}
        .today-card{animation:scaleIn .4s ease-out;}
        .occ-bar{animation:growBar 1.2s cubic-bezier(0.4,0,0.2,1);}
        .pending-pulse{animation:pulse 2s infinite;}
      `}</style>
      <div style={G.fp}>
      {(_oPtY>8||_oPtRefreshing)&&<div style={{position:"fixed",top:64,left:"50%",transform:`translate(-50%,${_oPtRefreshing?10:Math.max(_oPtY-16,0)}px)`,zIndex:100,transition:_oPtRefreshing?"transform .2s":"none",width:34,height:34,borderRadius:"50%",background:"var(--p)",color:"var(--p-text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 2px 10px rgba(0,0,0,.35)",pointerEvents:"none"}}>{_oPtRefreshing?<span style={{animation:"spin .7s linear infinite",display:"inline-block"}}><NotifIcon icon="↻" size={17}/></span>:<NotifIcon icon={_oPtY>=_OPT?"↑":"↓"} size={17}/>}</div>}

      {/* ── الواجهة الرئيسية (لوحتي) ── */}
      {ownerTab===null&&(
        <>

      {/* ── بادج الصالون المحسّن (ثابت في لوحتي فقط) ── */}
      <div style={{background:"var(--surface-1)",borderRadius:16,padding:16,border:"1px solid var(--border-ui)",marginBottom:18}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* صف 1: اسم الصالون + التقييم */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <div style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-flex",alignItems:"center",maxWidth:"65%",overflow:"hidden"}}>
              <span style={{fontSize:14,fontWeight:800,color:"var(--p)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{salon.name}</span>
            </div>
            <div style={{background:"var(--pa08)",border:"1.5px solid rgba(var(--gold-rgb),.4)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0,minWidth:74}}>
              <span style={{fontSize:14,fontWeight:900,color:"var(--gold)",display:"inline-flex",alignItems:"center",gap:4}}><IconStar size={13}/>{(salon.rating||0).toFixed(1)}</span>
            </div>
          </div>
          {/* الجوال */}
          <div style={{fontSize:15,color:"var(--p)",fontWeight:800,display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="📞" size={15}/> {salon.phone||t("owner_dash.not_available")}</div>
          {/* الموقع */}
          <div style={{fontSize:14,color:"var(--p)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><IconPin size={13}/>{salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div>
          {/* صف أخير: تاريخ الانضمام + نشط */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,color:"var(--p)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><IconCalendar size={13}/>{salon.createdAt?new Date(salon.createdAt).toLocaleDateString("ar-SA"):t("owner_dash.not_available")}</div>
            {salon.status==="approved"&&<div style={{background:"rgba(39,174,96,.10)",border:"1.5px solid rgba(39,174,96,.4)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0,fontSize:14,fontWeight:900,color:"#27ae60",minWidth:74}}>{t("owner_dash.salon_active")}</div>}
          </div>
        </div>
      </div>

      {salon.status!=="approved"&&(
        <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.25)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12,color:"var(--pl)"}}>
          {t("owner_dash.pending_notice")}
        </div>
      )}

      {/* ── بطاقة ملخص اليوم ── */}
      <div className="today-card" style={{background:"rgba(var(--pr),.20)",borderRadius:18,padding:"16px",marginBottom:18,border:"1.5px solid rgba(var(--pr),.60)",boxShadow:"0 4px 20px rgba(var(--pr),.12)"}}>

        {/* التاريخ */}
        <div style={{fontSize:14,fontWeight:800,color:"var(--p)",marginBottom:14,display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="🌅" size={14}/> {_dayLabel}</div>

        {/* الإجمالي - الرقم الأهم، بارز فوق التفاصيل */}
        <div style={{background:"rgba(241,196,15,.10)",borderRadius:12,padding:"14px 8px",border:"1.5px solid rgba(241,196,15,.4)",textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:32,fontWeight:900,color:"#f1c40f",lineHeight:1}}>{_tdTotal}</div>
          <div style={{fontSize:11,color:"#f1c40f",marginTop:5,fontWeight:700}}>{t('ui.total_today')}</div>
        </div>

        {/* إيرادات التطبيق + الكاش */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div style={{background:"rgba(var(--pr),.12)",borderRadius:12,padding:"9px 8px",border:"1px solid rgba(var(--pr),.3)",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:"var(--p)",lineHeight:1}}>{_tdRevenue}</div>
            <div style={{fontSize:9,color:"var(--p)",marginTop:4,opacity:.8,fontWeight:700}}>{t('ui.app_revenue')}</div>
          </div>
          <div style={{background:"rgba(39,174,96,.10)",borderRadius:12,padding:"9px 8px",border:"1px solid rgba(39,174,96,.3)",textAlign:"center",position:"relative"}}>
            <button onClick={()=>setShowDashCash(v=>!v)} style={{position:"absolute",top:4,left:4,background:"rgba(39,174,96,.2)",border:"1px solid rgba(39,174,96,.4)",color:"#27ae60",borderRadius:6,fontSize:10,fontWeight:800,padding:"1px 5px",cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>+</button>
            <div style={{fontSize:16,fontWeight:800,color:"#27ae60",lineHeight:1}}>{_tdCash}</div>
            <div style={{fontSize:9,color:"#27ae60",marginTop:4,fontWeight:700}}>{t('ui.cash_revenue')}</div>
          </div>
        </div>

        {/* نموذج إضافة الكاش */}
        {showDashCash&&(
          <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:10}}>
            <div style={{flex:"0 0 90px",position:"relative"}}>
              <input type="number" value={dashCashAmt} onChange={e=>setDashCashAmt(e.target.value)} placeholder="0" onKeyDown={e=>e.key==="Enter"&&addDashCash()}
                style={{width:"100%",padding:"9px 28px 9px 8px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",fontSize:14,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",direction:"ltr",textAlign:"right",fontWeight:700}}/>
              <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--text-muted)",pointerEvents:"none",fontWeight:600}}>{t('ui.sar_short')}</span>
            </div>
            {salon.barbers?.length>0&&(
              <div style={{flex:1,position:"relative"}}>
                <select value={dashCashBarber} onChange={e=>setDashCashBarber(e.target.value)}
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${dashCashBarber?"var(--p)":"var(--border-ui)"}`,background:"var(--surface-2)",color:dashCashBarber?"var(--p)":"var(--text-muted)",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl",appearance:"none",WebkitAppearance:"none",cursor:"pointer",boxSizing:"border-box"}}>
                  <option value="">{t('ui.no_barber')}</option>
                  {salon.barbers.map(b=><option key={b.id} value={b.id}>{b.name||t('ui.barber_unit')}</option>)}
                </select>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--text-muted)",pointerEvents:"none"}}>▼</span>
              </div>
            )}
            <button onClick={addDashCash}
              style={{flex:"0 0 auto",padding:"9px 14px",borderRadius:9,border:"none",background:"var(--grad)",color:"var(--p-text,#000)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}><IconCheck size={12} color="var(--p-text,#000)"/>{t('ui.save')}</button>
            <button onClick={()=>{setShowDashCash(false);setDashCashBarber("");setDashCashAmt("");}}
              style={{flex:"0 0 auto",padding:"9px 10px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}}><IconClose size={14}/></button>
          </div>
        )}

        {/* الحجز القادم */}
        {_nextBk&&(
          <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(var(--pr),.15)",borderRadius:11,padding:"10px 12px",border:"1px solid rgba(var(--pr),.3)"}}>
            <div style={{width:32,height:32,borderRadius:9,background:"rgba(var(--pr),.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>⏰</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:"var(--p)",opacity:.7,marginBottom:2}}>{t("owner_dash.next_booking")}</div>
              <div style={{fontSize:13,fontWeight:800,color:"var(--p)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {_nextBk.name||t("owner_dash.customer")} — {to12h(_nextBk.time)}
              </div>
            </div>
            <div style={{fontSize:11,fontWeight:800,color:"var(--p)",background:"rgba(var(--pr),.2)",padding:"4px 9px",borderRadius:8,flexShrink:0,whiteSpace:"nowrap"}}>
              {(()=>{
                const[h,m]=(_nextBk.time||"0:0").split(":").map(Number);
                const diff=h*60+m-_nowMins;
                if(diff<=0)return t("owner_dash.now");
                if(diff>=60)return`${Math.floor(diff/60)}${t("owner_dash.time_hour")} ${diff%60}${t("owner_dash.time_min")}`;
                return`${diff} ${t("owner_dash.time_mins")}`;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* نسبة حجز اليوم + حجوزات غداً - جنب بعض */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18,alignItems:"start"}}>
        <div style={{background:`rgba(${_occ>=80?"231,76,60":_occ>=50?"var(--pr)":"39,174,96"},.08)`,border:`1px solid rgba(${_occ>=80?"231,76,60":_occ>=50?"var(--pr)":"39,174,96"},.25)`,borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:900,color:_occ>=80?"#e74c3c":_occ>=50?"var(--p)":"#27ae60"}}>{_occ}%</span>
          <span style={{flex:1,fontSize:11,color:"var(--text-muted)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t('ui.today_occupancy')}</span>
          <div style={{width:40,height:7,background:"rgba(var(--pr),.12)",borderRadius:10,overflow:"hidden"}}>
            <div className="occ-bar" style={{height:"100%",width:`${_occ}%`,background:_occ>=80?"linear-gradient(90deg,#c0392b,#e74c3c)":_occ>=50?"linear-gradient(90deg,var(--pd),var(--pl))":"linear-gradient(90deg,#1e8449,#27ae60)",borderRadius:10,transformOrigin:"right center"}}/>
          </div>
        </div>
        <div onClick={()=>setShowTomorrow(v=>!v)} style={{background:"var(--surface-2)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span style={{display:"flex"}}><IconCalendar size={14}/></span>
          <span style={{flex:1,fontSize:11,color:"var(--text-primary)",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t('ui.tomorrow_bookings',{count:_tmrBks.length})}</span>
          <span style={{fontSize:9,color:"var(--text-muted)"}}>{showTomorrow?"▲":"▼"}</span>
        </div>
      </div>

      {/* تفاصيل حجوزات غداً */}
      {showTomorrow&&(
        <div style={{border:"1px solid var(--border-ui)",borderRadius:12,marginBottom:18,overflow:"hidden",padding:_tmrBks.length?"6px 0":"12px 14px"}}>
          {_tmrBks.length===0?
            <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>{t('ui.no_tomorrow')}</div>
          :_tmrBks.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map((b,i)=>(
            <div key={b.id||i} style={{padding:"7px 14px",borderBottom:i<_tmrBks.length-1?"1px solid var(--border-ui)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:800,color:"var(--p)",minWidth:48}}>{to12h(b.time)}</span>
                <span style={{flex:1,fontSize:12,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name||t("owner_dash.customer")}</span>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8,background:b.status==="approved"?"rgba(39,174,96,.15)":b.status==="rejected"?"rgba(231,76,60,.15)":"rgba(243,156,18,.15)",color:b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"#f39c12"}}>{b.status==="approved"?t("owner_dash.filter_approved"):b.status==="rejected"?t("owner_dash.filter_rejected"):t("owner_dash.filter_pending")}</span>
              </div>
              {b.status==="pending"&&<div style={{display:"flex",gap:6,marginTop:6}}><button style={{...G.accBtn,padding:"3px 8px",fontSize:10,borderRadius:8}} onClick={()=>updateBookingStatus(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={{...G.rejBtn,padding:"3px 8px",fontSize:10,borderRadius:8}} onClick={()=>updateBookingStatus(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
            </div>
          ))}
        </div>
      )}

      {/* ── الـ 4 مربعات ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:activeCard?0:14}}>
            {[
              {label:t("owner_dash.filter_all"),value:_tdBks.length,color:"var(--gold)",filter:"all",delay:0},
              {label:t("owner_dash.filter_pending"),value:_tdPending.length,color:"#f39c12",filter:"pending",delay:80},
              {label:t("owner_dash.filter_approved"),value:_tdApproved.length,color:"#27ae60",filter:"approved",delay:160},
              {label:t("owner_dash.filter_rejected"),value:_tdRejected.length,color:"#e74c3c",filter:"rejected",delay:240}
            ].map(({label,value,color,filter,delay})=>{
              const isOpen=activeCard===filter;
              return(
                <div key={label} className="stat-card"
                  onClick={()=>{setActiveCard(c=>c===filter?null:filter);if(filter==="all"||filter==="approved")refreshSalonBookings(salon.id);}}
                  style={{background:isOpen?`${color}18`:`${color}0f`,borderRadius:isOpen?"13px 13px 0 0":13,padding:"11px 6px",height:68,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:`1.5px solid ${isOpen?`${color}55`:`${color}1a`}`,borderBottom:isOpen?`1.5px solid ${color}55`:"",textAlign:"center",animationDelay:`${delay}ms`,cursor:"pointer",transition:"all .22s ease",boxShadow:isOpen?`0 0 14px ${color}1a`:"none"}}>
                  <div style={{fontSize:22,fontWeight:900,color,marginBottom:2,lineHeight:1}}>{value}</div>
                  <div style={{fontSize:10,color:isOpen?color:"#666",fontWeight:600,marginBottom:3}}>{label}</div>
                  <div style={{fontSize:8,color:isOpen?color:"var(--text-muted)",lineHeight:1,display:"flex",alignItems:"center",gap:2}}>
                    {isOpen?"إخفاء":"التفاصيل"}
                    <span style={{transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* قائمة الحجوزات المنسدلة */}
          {activeCard&&(
            <div style={{animation:"fadeInUp .3s ease-out",marginBottom:14,border:`1.5px solid ${activeCard==="all"?"var(--gold)":activeCard==="pending"?"#f39c12":activeCard==="approved"?"#27ae60":"#e74c3c"}33`,borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden",background:"rgba(255,255,255,.02)"}}>
              <NotifPanel key={activeCard} salon={salon} onUpdate={updateBookingStatus} customers={customers} defaultFilter={activeCard} refreshSalonBookings={refreshSalonBookings} dateFilter={_td}/>
            </div>
          )}
        </>
      )}
      {ownerTab!==null&&(
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setShowSalonDrawer(true)}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,...(ownerTab==="calendar"||ownerTab==="messages"||ownerTab==="reviews"||ownerTab==="stats"?{}:{display:"flex",alignItems:"center",gap:6})}}>{ownerTab==="calendar"?t("salon_drawer.bookings"):ownerTab==="messages"?t("salon_drawer.messages"):ownerTab==="reviews"?t("salon_drawer.reviews"):ownerTab==="stats"?t("salon_drawer.stats"):<><IconFire size={16}/>{t('ui.send_offer')}</>}</h2>
        </div>
      )}
      {ownerTab==="messages"&&(
        <MessagesPanel salon={salon} toast$={toast$}/>
      )}
      {ownerTab==="calendar"&&<BookingCalendar salon={salon} onUpdate={updateBookingStatus}/>}
      {ownerTab==="reviews"&&<OwnerReviewsPanel salon={salon} reviews={reviews} setReviews={setReviews} toast$={toast$}/>}
      {ownerTab==="stats"&&<StatsPanel salon={salon} onUpdate={updateBookingStatus} customers={customers} refreshSalonBookings={refreshSalonBookings} totalEarned={totalEarned} totalPaid={totalPaid}/>}
      {ownerTab==="promo"&&<PromoPanel salon={salon} customers={customers} toast$={toast$}/>}
    </div></div>
  );
}

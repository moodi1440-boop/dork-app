// لوحة مراجعات صاحب الصالون وتقويم الحجوزات — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { G } from "../../styles.js";
import { to12h } from "../../utils.js";
import { IconCalendar, IconClipboard, IconScissors, IconUser, NotifIcon } from "../shared/Icons.jsx";
import { sb } from "../../api.js";


export function BookingCalendar({salon,onUpdate}){
  const{t}=useTranslation();
  const todayDateStr=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"});

  const[expandedDate,setExpandedDate]=useState(null);
  const[localAttendance,setLocalAttendance]=useState({});
  const[viewMonth,setViewMonth]=useState(()=>new Date().getMonth());
  const[viewYear,setViewYear]=useState(()=>new Date().getFullYear());

  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const bks=salon?.bookings||[];

  const bookingsForDate=useCallback((d)=>{
    const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return bks.filter(b=>b.date===dateStr);
  },[viewYear,viewMonth,bks]);

  const selBks=useMemo(()=>expandedDate?bks.filter(b=>b.date===expandedDate):[],[expandedDate,bks]);

  const toggleDate=useCallback((dateStr)=>{
    setExpandedDate(prev=>prev===dateStr?null:dateStr);
  },[]);

  return(
    <div style={{paddingTop:4}}>
      {/* header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <button style={{...G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}}>{"<"}</button>
        <span style={{fontSize:14,fontWeight:700,color:"var(--p)"}}>{t("owner_dash.months",{returnObjects:true})[viewMonth]} {viewYear}</span>
        <button style={{...G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}}>{">"}</button>
      </div>
      {/* days header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["أح","إث","ثل","أر","خم","جم","سب"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"var(--text-muted)",padding:"4px 0"}}>{d}</div>)}
      </div>
      {/* calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12}}>
        {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{
          const d=i+1;
          const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayBks=bookingsForDate(d);
          const isToday=dateStr===todayDateStr;
          const isExp=dateStr===expandedDate;
          const hasBks=dayBks.length>0;
          return(
            <button key={d} onClick={()=>toggleDate(dateStr)}
              style={{position:"relative",padding:"6px 0",borderRadius:8,border:`1.5px solid ${isExp?"var(--p)":isToday?"var(--pd)":"var(--border-ui)"}`,background:isExp?"var(--pa12)":isToday?"var(--pa05)":"transparent",color:isExp?"var(--p)":isToday?"var(--pl)":"#aaa",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:isExp||isToday?700:400,textAlign:"center"}}>
              {d}
              {hasBks&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"var(--p)"}}/>}
            </button>
          );
        })}
      </div>
      {/* bookings for selected date */}
      {expandedDate&&(
        <>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:5}}><IconClipboard size={11}/>{expandedDate} • {selBks.length} {t("owner_dash.booking_unit")}</div>
          {selBks.length===0
            ?<div style={G.empty}>{t("owner_dash.calendar_no_bookings")}</div>
            :selBks.map(b=>(
              <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><IconUser size={12}/>{b.name||t("owner_dash.customer_fallback")}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="📞" size={11}/> {b.phone}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><IconScissors size={11}/>{Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)",display:"flex",alignItems:"center",gap:4}}><IconCalendar size={10}/>{b.date} {to12h(b.time)} - {b.total||0} ر</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?t("notif.status_approved"):b.status==="rejected"?t("notif.status_rejected"):t("notif.status_pending")}</span>
                </div>
                {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
                {b.status==="approved"&&!localAttendance[b.id]&&!b.attendance&&(
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"attended"},"?id=eq."+b.id);setLocalAttendance(p=>({...p,[b.id]:"attended"}));}catch{}}}>{t("notif.attended")}</button>
                    <button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"no_show"},"?id=eq."+b.id);setLocalAttendance(p=>({...p,[b.id]:"no_show"}));}catch{}}}>{t("notif.no_show")}</button>
                  </div>
                )}
                {b.status==="approved"&&(localAttendance[b.id]||b.attendance)&&(
                  <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#666"}}>{t("notif.attendance")}</span>
                    <span style={{fontSize:11,fontWeight:700,color:(localAttendance[b.id]||b.attendance)==="attended"?"#27ae60":"#e74c3c"}}>
                      {(localAttendance[b.id]||b.attendance)==="attended"?t("notif.attended"):t("notif.no_show")}
                    </span>
                  </div>
                )}
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}

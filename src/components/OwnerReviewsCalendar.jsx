// لوحة مراجعات صاحب الصالون وتقويم الحجوزات — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { to12h } from "../utils.js";
import {
  IconCalendar, IconClipboard, IconScissors, IconStar, IconUser, NotifIcon
} from "./icons.jsx";
import { sb } from "../../App.jsx";

export function OwnerReviewsPanel({salon,reviews,setReviews,toast$}){
  const{t}=useTranslation();
  const gold="var(--p)";
  const goldStar="var(--gold)";
  const[replyDraft,setReplyDraft]=useState({});
  const[saving,setSaving]=useState(null);

  const salonReviews=useMemo(()=>{
    if(!reviews||!salon)return[];
    return (reviews||[])
      .filter(r=>Number(r.salon_id)===Number(salon.id))
      .sort((a,b)=>(b.booking_date||b.created_at||"").localeCompare(a.booking_date||a.created_at||""));
  },[reviews,salon]);

  const avg=salonReviews.length
    ?Math.round(salonReviews.reduce((s,r)=>s+r.rating,0)/salonReviews.length*10)/10:0;

  const saveReply=async(reviewId)=>{
    const text=(replyDraft[reviewId]||"").trim();
    if(!text)return;
    setSaving(reviewId);
    try{
      await sb("reviews","PATCH",{owner_reply:text},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:text}:r));
      setReplyDraft(p=>({...p,[reviewId]:""}));
      toast$(t("owner_dash.reply_saved"));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    finally{setSaving(null);}
  };

  const deleteReply=async(reviewId)=>{
    try{
      await sb("reviews","PATCH",{owner_reply:null},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:null}:r));
      toast$(t("owner_dash.reply_deleted"));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };

  return(
    <div style={{paddingTop:8}}>
      {/* ملخص */}
      <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:900,color:goldStar,lineHeight:1}}>{avg||"—"}</div>
          <div style={{display:"flex",gap:1,justifyContent:"center",margin:"4px 0"}}>
            {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=Math.round(avg)?goldStar:"rgba(var(--gold-rgb),.2)"}/>)}
          </div>
          <div style={{fontSize:10,color:"var(--text-muted)"}}>{salonReviews.length} {t("salon_page.reviews_count")}</div>
        </div>
        <div style={{flex:1}}>
          {[5,4,3,2,1].map(s=>{
            const cnt=salonReviews.filter(r=>r.rating===s).length;
            const pct=salonReviews.length?Math.round(cnt/salonReviews.length*100):0;
            return(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:10,color:goldStar,width:8}}>{s}</span>
                <div style={{flex:1,height:5,background:"rgba(var(--gold-rgb),.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:gold,borderRadius:3,transition:"width .4s"}}/>
                </div>
                <span style={{fontSize:9,color:"#666",width:24,textAlign:"left"}}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {salonReviews.length===0&&<div style={G.empty}>{t("owner_dash.reviews_empty")}</div>}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {salonReviews.map(r=>{
          const hasReply=r.owner_reply&&r.owner_reply.trim();
          const draft=replyDraft[r.id]??r.owner_reply??"";
          return(
            <div key={r.id} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              {/* العميل */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><IconUser size={11}/>{r.customer_name||t("owner_dash.customer_fallback")}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=r.rating?goldStar:"rgba(var(--gold-rgb),.18)"}/>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:4}}>«{r.comment}»</div>}
              <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.booking_date||r.created_at?.split("T")[0]||"—"}</div>

              {/* رد موجود */}
              {hasReply&&!(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply)&&(
                <div style={{padding:"8px 10px",background:"rgba(var(--pr),.07)",borderRight:"3px solid var(--p)",borderRadius:"0 8px 8px 0",marginBottom:6}}>
                  <div style={{fontSize:10,color:gold,fontWeight:700,marginBottom:2}}>{t("owner_dash.reply_label")}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{r.owner_reply}</div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>setReplyDraft(p=>({...p,[r.id]:r.owner_reply}))} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit"}}>{t("owner_dash.reply_edit")}</button>
                    <button onClick={()=>deleteReply(r.id)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid #e74c3c55",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}>{t("owner_dash.reply_delete")}</button>
                  </div>
                </div>
              )}

              {/* حقل الرد */}
              {(!hasReply||(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply))&&(
                <div>
                  <textarea
                    value={draft}
                    onChange={e=>setReplyDraft(p=>({...p,[r.id]:e.target.value}))}
                    placeholder={t("owner_dash.reply_ph")}
                    rows={2}
                    style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--pa25)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"'Cairo',sans-serif",resize:"none",outline:"none",direction:"rtl"}}
                  />
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button
                      onClick={()=>saveReply(r.id)}
                      disabled={saving===r.id||!draft.trim()}
                      style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:draft.trim()?"linear-gradient(135deg,var(--p),var(--pl))":"var(--border-ui)",color:draft.trim()?"#000":"#555",fontWeight:700,cursor:draft.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12}}>
                      {saving===r.id?t("owner_dash.reply_sending"):t("owner_dash.reply_send")}
                    </button>
                    {hasReply&&<button onClick={()=>setReplyDraft(p=>{const n={...p};delete n[r.id];return n;})} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{t("owner_dash.reply_cancel")}</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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


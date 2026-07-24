// صفحة الصالون وسير عملية الحجز — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../styles.js";
import { openMaps } from "../../utils.js";
import { ShareBtn } from "./Ui.jsx";
import { BookView } from "./BookView.jsx";
import { NotifPanel } from "../owner/NotifPanel.jsx";
import { StatsPanel } from "../owner/StatsPanel.jsx";
import {
  IconArrowRight, IconHeart, IconScissors, IconStar, IconUser, NotifIcon
} from "./Icons.jsx";


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

import React, { useState } from "react";
import { G } from "../styles";

function SalonPage({salon,favSet,toggleFav,setView,addBooking,updateBookingStatus,ownerSession,customers,reviews,refreshSalonBookings,rescheduleId,customer}){
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
          <button style={G.bb} onClick={()=>setView("home")}>{">"}</button>
          <h2 style={{...G.ft,flex:1}}>{salon.name}</h2>
          <button style={{...G.favBtn,...(fav?G.favOn:{}),fontSize:20}} onClick={()=>toggleFav(salon.id)}>{fav?"♥":"♡"}</button>
          <ShareBtn salon={salon}/>
        </div>
        <div style={G.salonBadge}>
          <span style={{fontSize:20,color:"var(--p)"}}>✂</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{salon.name}</div>
            <div style={{fontSize:11,color:"#888"}}>{salon.gov||salon.region}{salon.village?` > ${salon.village}`:""}</div>
            <div style={{fontSize:11,color:"#888"}}>👤 {salon.owner} - 📞 {salon.phone}</div>
            {salonReviews.length>0&&<>
              <div style={{fontSize:12,color:"#e8c04a",marginTop:2}}>⭐ {avgRating} ({salonReviews.length} تقييم)</div>
              <div style={{fontSize:9,color:"#666",marginTop:2}}>آراء العملاء تظهر في الصفحة الرئيسية</div>
            </>}
          </div>
          <button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title="الموقع">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
          </button>
        </div>
        <div style={G.tabRow}>
          <button style={{...G.tabBtn,...(tab==="book"?G.tabOn:{})}} onClick={()=>setTab("book")}>📅 حجز</button>
          {canManage&&<button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>{setTab("notif");refreshSalonBookings(salon.id);}}>🔔{pending>0&&<span style={G.notifDot}>{pending}</span>}</button>}
          {canManage&&<button style={{...G.tabBtn,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")}>📊</button>}
        </div>
        {tab==="book"&&<BookView salon={salon} addBooking={addBooking} onBack={null} inline setView={setView} rescheduleId={rescheduleId} customer={customer}/>}
        {tab==="notif"&&canManage&&<NotifPanel salon={salon} onUpdate={updateBookingStatus} customers={customers} refreshSalonBookings={refreshSalonBookings}/>}
        {tab==="stats"&&canManage&&<StatsPanel salon={salon}/>}
      </div>
    </div>
  );
}


export { SalonPage };

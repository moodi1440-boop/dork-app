import React, { useMemo } from "react";
import { G } from "../styles.js";

function SalonReviewsView({salon,reviews,setView}){
  const gold="#d4a017";
  const goldStar="#e8c04a";
  const salonReviews=useMemo(()=>{
    if(!reviews||!salon)return[];
    const id=Number(salon.id);
    return (reviews||[])
      .filter(r=>Number(r.salon_id)===id)
      .map(r=>({id:r.id,name:r.customer_name||"عميل",rating:r.rating,comment:r.comment||"",ownerReply:r.owner_reply||"",date:r.booking_date||r.created_at?.split("T")[0]||""}))
      .sort((a,b)=>b.date.localeCompare(a.date));
  },[reviews,salon]);
  const avg=salonReviews.length?Math.round(salonReviews.reduce((s,r)=>s+r.rating,0)/salonReviews.length*10)/10:0;
  return(
    <div style={G.page}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setView("home")}>{">"}</button>
          <h2 style={{...G.ft,flex:1}}>آراء العملاء</h2>
        </div>
        {/* ملخص الصالون */}
        <div style={{background:"rgba(212,160,23,.07)",border:"1px solid rgba(212,160,23,.18)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:6}}>✂ {salon?.name}</div>
          {salonReviews.length>0?(
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28,fontWeight:900,color:goldStar,lineHeight:1}}>{avg}</span>
              <div>
                <div style={{display:"flex",gap:2,marginBottom:2}}>
                  {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:16,color:n<=Math.round(avg)?goldStar:"rgba(212,160,23,.2)"}}>★</span>)}
                </div>
                <div style={{fontSize:10,color:"#888"}}>{salonReviews.length} تقييم</div>
              </div>
            </div>
          ):(
            <div style={{fontSize:12,color:"#555"}}>لا توجد تقييمات بعد</div>
          )}
        </div>
        {/* قائمة التقييمات */}
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {salonReviews.map((r,i)=>(
            <div key={i} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:r.comment?6:0}}>
                <span style={{fontSize:12,color:"#c0c0d0",fontWeight:700}}>👤 {r.name}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:"rgba(212,160,23,.18)"}}>★</span>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:12,color:"#a8a8bc",fontStyle:"italic",lineHeight:1.5,marginBottom:5}}>«{r.comment}»</div>}
              {r.date&&<div style={{fontSize:9,color:"#444",marginBottom:r.ownerReply?8:0}}>📅 {r.date}</div>}
              {r.ownerReply&&(
                <div style={{marginTop:6,padding:"8px 10px",background:"rgba(212,160,23,.07)",borderRight:"3px solid #d4a017",borderRadius:"0 8px 8px 0"}}>
                  <div style={{fontSize:10,color:"#d4a017",fontWeight:700,marginBottom:3}}>✂ رد الصالون</div>
                  <div style={{fontSize:11,color:"#c8c8a8",lineHeight:1.5}}>{r.ownerReply}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        {salonReviews.length===0&&<div style={G.empty}>لا توجد تقييمات لهذا الصالون بعد</div>}
      </div>
    </div>
  );
}


export { SalonReviewsView };

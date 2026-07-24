// عرض تقييمات الصالون وبطاقة الصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../styles.js";
import {
  IconArrowRight, IconCalendar, IconScissors, IconStar, IconUser
} from "./Icons.jsx";


export function SalonReviewsView({salon,reviews,setView}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const salonReviews=useMemo(()=>{
    if(!reviews||!salon)return[];
    const id=Number(salon.id);
    return (reviews||[])
      .filter(r=>Number(r.salon_id)===id)
      .map(r=>({id:r.id,name:r.customer_name||t("salon_reviews.customer_fallback"),rating:r.rating,comment:r.comment||"",ownerReply:r.owner_reply||"",date:r.booking_date||r.created_at?.split("T")[0]||""}))
      .sort((a,b)=>b.date.localeCompare(a.date));
  },[reviews,salon,t]);
  const avg=salonReviews.length?Math.round(salonReviews.reduce((s,r)=>s+r.rating,0)/salonReviews.length*10)/10:0;
  return(
    <div style={{...G.page,direction:dir}}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,flex:1}}>{t("salon_reviews.title")}</h2>
        </div>
        <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:6,display:"flex",alignItems:"center",gap:5}}><IconScissors size={13} color="var(--p)"/>{salon?.name}</div>
          {salonReviews.length>0?(
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28,fontWeight:900,color:"var(--gold)",lineHeight:1}}>{avg}</span>
              <div>
                <div style={{display:"flex",gap:2,marginBottom:2}}>
                  {[1,2,3,4,5].map(n=><IconStar key={n} size={16} color={n<=Math.round(avg)?"var(--gold)":"rgba(var(--gold-rgb),.2)"}/>)}
                </div>
                <div style={{fontSize:10,color:"var(--text-muted)"}}>{salonReviews.length} {t("salon_reviews.rating_unit")}</div>
              </div>
            </div>
          ):(
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("salon_reviews.no_reviews")}</div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {salonReviews.map((r,i)=>(
            <div key={i} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:r.comment?6:0}}>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><IconUser size={11}/>{r.name}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=r.rating?"var(--gold)":"rgba(var(--gold-rgb),.18)"}/>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:5}}>«{r.comment}»</div>}
              {r.date&&<div style={{fontSize:9,color:"var(--text-muted)",marginBottom:r.ownerReply?8:0,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.date}</div>}
              {r.ownerReply&&(
                <div style={{marginTop:6,padding:"8px 10px",background:"rgba(var(--gold-rgb),.07)",borderRight:"3px solid #d4a017",borderRadius:"0 8px 8px 0"}}>
                  <div style={{fontSize:10,color:"var(--gold)",fontWeight:700,marginBottom:3}}>{t("salon_reviews.owner_reply_label")}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{r.ownerReply}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        {salonReviews.length===0&&<div style={G.empty}>{t("salon_reviews.no_reviews_salon")}</div>}
      </div>
    </div>
  );
}

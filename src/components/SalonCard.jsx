// عرض تقييمات الصالون وبطاقة الصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../styles.js";
import { to12h, openMaps } from "../utils.js";
import {
  IconArrowRight, IconCalendar, IconChevronDown, IconFire, IconHeart, IconPin,
  IconScale, IconScissors, IconShare, IconStar, IconUser, NotifIcon
} from "./icons.jsx";

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

export function SalonCard({salon,fav,onFav,onBook,onViewReviews,realRating,reviewCount,userLoc,getSalonCoords,haversine,isOpenNow,inCompare,onCompare,activePromo,distKm}){
  const{t}=useTranslation();
  const[showPromoPopup,setShowPromoPopup]=useState(false);
  const[codeCopied,setCodeCopied]=useState(false);
  const[promoCountdown,setPromoCountdown]=useState(null);
  useEffect(()=>{
    if(!showPromoPopup||!activePromo?.ends_at){setPromoCountdown(null);return;}
    const calc=()=>{
      const ms=Math.max(0,new Date(activePromo.ends_at)-Date.now());
      setPromoCountdown({d:Math.floor(ms/86400000),h:Math.floor((ms%86400000)/3600000),m:Math.floor((ms%3600000)/60000),s:Math.floor((ms%60000)/1000)});
    };
    calc();
    const id=setInterval(calc,1000);
    return()=>clearInterval(id);
  },[showPromoPopup,activePromo?.ends_at]);
  const displayRating=realRating||salon.rating||"5.0";

  let distance=null;
  if(userLoc&&getSalonCoords&&haversine){
    const coords=getSalonCoords(salon);
    if(coords)distance=haversine(userLoc.lat,userLoc.lng,coords.lat,coords.lng).toFixed(1);
  }

  if(salon.frozen)return(
    <div style={{...G.card,opacity:.5,position:"relative"}}>
      <div style={{position:"absolute",top:8,left:8,background:"#e74c3c",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{t("salon_card.frozen_tag")}</div>
      <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:4,display:"flex",alignItems:"center",gap:5}}><IconScissors size={13} color="var(--p)"/>{salon.name}</div>
      <div style={{fontSize:11,color:"var(--text-muted)"}}>{t("salon_card.frozen_msg")}</div>
    </div>
  );

  const promoBorder=activePromo?(inCompare?"2px solid var(--p)":"2px solid #e74c3c"):inCompare?"2px solid var(--p)":"1px solid var(--border-ui)";
  const promoShadow=activePromo?"0 4px 20px rgba(231,76,60,.2)":"0 4px 16px rgba(0,0,0,.3)";

  return(
    <>
    <div style={{...G.card,border:promoBorder,padding:"16px",display:"flex",flexDirection:"column",gap:"12px",boxShadow:promoShadow}}>
      {/* Header Row: الاسم يسار + التقييم يمين */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
          <button style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-flex",alignItems:"center",cursor:"default",fontFamily:"'Cairo',sans-serif",maxWidth:"100%",overflow:"hidden"}}>
            <span style={{fontSize:13,fontWeight:800,color:"var(--p)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{salon.name}</span>
          </button>
          {activePromo&&(
            <button onClick={()=>setShowPromoPopup(true)} className="promo-badge-anim" style={{background:"rgba(231,76,60,.15)",border:"1.5px solid rgba(231,76,60,.55)",color:"#e74c3c",borderRadius:16,padding:"4px 10px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"'Cairo',sans-serif",flexShrink:0,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4}}>
              <IconFire size={11}/>{t('ui.promo_badge')}
            </button>
          )}
        </div>
        <button onClick={onViewReviews} style={{border:"1.5px solid rgba(var(--gold-rgb),.4)",borderRadius:10,padding:"6px 10px",flex:"0 0 auto",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{fontSize:15,fontWeight:900,color:"var(--gold)",display:"flex",alignItems:"center",gap:5}}><IconStar size={14}/>{displayRating}<span style={{fontSize:10,fontWeight:700,color:"var(--gold)"}}>({reviewCount})</span></div>
          <IconChevronDown size={11} color="var(--gold)"/>
        </button>
      </div>

      {/* Location Row */}
      <div style={{fontSize:10,color:"var(--text-muted)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3}}><IconPin size={10}/>{salon.gov||salon.region}{salon.village?` - ${salon.village}`:""}</span>
        {distKm!==null&&<span style={{fontSize:11,fontWeight:700,color:"var(--p)",background:"rgba(var(--pr),.12)",padding:"2px 8px",borderRadius:10,display:"inline-flex",alignItems:"center",gap:3}}><IconPin size={10}/>{distKm} كم</span>}
      </div>

      {/* Hours & Wait Time */}
      <div style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,color:"var(--text-muted)"}}>
        <div>
          ⏰ {salon.shiftEnabled?(salon.shift1Start&&salon.shift1End?`${to12h(salon.shift1Start.slice(0,5))}-${to12h(salon.shift1End.slice(0,5))}`:"--:-- - --:--"):(salon.workStart&&salon.workEnd?`${to12h(salon.workStart.slice(0,5))}-${to12h(salon.workEnd.slice(0,5))}`:"--:-- - --:--")}
        </div>
        <div>
          <NotifIcon icon="👥" size={12}/> {salon.barbers?.length||1} {t("salon_card.barber_unit")}
        </div>
      </div>

      {/* Services Tags - Below Barbers */}
      {salon.services.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {salon.services.slice(0,4).map(s=>(
            <span key={s} style={{fontSize:9,background:"rgba(var(--gold-rgb),.12)",color:"var(--gold)",padding:"4px 10px",borderRadius:8,fontWeight:600}}>
              {s}
            </span>
          ))}
          {salon.services.length>4&&<span style={{fontSize:9,background:"rgba(var(--gold-rgb),.12)",color:"var(--gold)",padding:"4px 10px",borderRadius:8,fontWeight:600}}>+{salon.services.length-4}</span>}
        </div>
      )}

      {/* Divider */}
      <div style={{height:1,background:"rgba(var(--gold-rgb),.1)"}}/>

      {/* Book Button + Action Buttons - Reordered */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={async()=>{
          const shareUrl=`${window.location.origin}${window.location.pathname}?salon=${salon.id}`;
          const shareText=`✂ ${salon.name}\n📍 ${salon.gov||salon.region}\n⭐ ${salon.rating||5}\n\n${shareUrl}`;
          if(navigator.share){try{await navigator.share({title:salon.name,text:shareText,url:shareUrl});}catch{}}
          else{try{await navigator.clipboard.writeText(shareUrl);alert(t("share.copied"));}catch{alert(shareUrl);}}
        }} title={t("share.btn")} style={{background:"transparent",border:"1.5px solid #3a3a4a",color:"var(--text-muted)",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          <IconShare size={16}/>
        </button>
        <button onClick={()=>onFav?.()} title="المفضلة" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:fav?"var(--gold)":"#aaa",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          <IconHeart size={16} filled={fav}/>
        </button>
        <button onClick={onCompare} title="مقارنة" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:"var(--text-muted)",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          <IconScale size={16}/>
        </button>
        <button onClick={onBook} style={{background:"var(--pa12)",color:"var(--p)",border:"1.5px solid rgba(var(--pr),.4)",borderRadius:10,padding:"12px 16px",fontSize:12,fontWeight:700,cursor:"pointer",flex:1,fontFamily:"'Cairo',sans-serif"}}>
          {t("salon_card.book_btn")}
        </button>
      </div>
    </div>

    {/* popup العرض - كوبون */}
    {showPromoPopup&&activePromo&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 18px"}} onClick={()=>setShowPromoPopup(false)}>
        <div style={{width:"100%",maxWidth:400,direction:"rtl"}} onClick={e=>e.stopPropagation()}>
          {/* جزء علوي البطاقة */}
          <div style={{background:"linear-gradient(145deg,var(--surface-2),rgba(var(--pr),.07))",borderRadius:"22px 22px 0 0",padding:"26px 20px 18px",border:"1.5px solid rgba(var(--pr),.4)",borderBottom:"none",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-50,right:-50,width:130,height:130,background:"radial-gradient(circle,rgba(var(--pr),.18) 0%,transparent 70%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:-50,left:-50,width:130,height:130,background:"radial-gradient(circle,rgba(var(--pr),.18) 0%,transparent 70%)",pointerEvents:"none"}}/>
            {/* 🔥 bounce */}
            <div className="promo-fire-anim" style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconFire size={56}/></div>
            {/* اسم الصالون */}
            <div style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginBottom:3}}>{t('ui.special_from')}</div>
            <div style={{textAlign:"center",fontSize:21,fontWeight:900,color:"var(--p)",marginBottom:14,letterSpacing:.3}}>{salon.name}</div>
            {/* نص العرض */}
            <div style={{background:"rgba(var(--pr),.22)",border:"2px solid rgba(var(--pr),.55)",borderRadius:12,padding:"14px 16px",textAlign:"center",fontSize:15,fontWeight:700,color:"var(--p)",lineHeight:1.9,marginBottom:14,letterSpacing:.2}}>{activePromo.promo_text}</div>
            {/* عداد تنازلي */}
            {promoCountdown&&(
              <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                {[{v:promoCountdown.s,l:"ثانية"},{v:promoCountdown.m,l:"دقيقة"},{v:promoCountdown.h,l:"ساعة"},{v:promoCountdown.d,l:"يوم"}].map(({v,l})=>(
                  <div key={l} style={{flex:1,textAlign:"center",background:"var(--surface-1)",borderRadius:10,padding:"8px 4px",border:"1.5px solid rgba(var(--pr),.3)"}}>
                    <div style={{fontSize:20,fontWeight:900,color:"var(--p)",lineHeight:1}}>{String(v).padStart(2,"0")}</div>
                    <div style={{fontSize:9,color:"var(--text-muted)",marginTop:3}}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* خط مقطع - ticket style */}
          <div style={{position:"relative",height:20,background:"linear-gradient(145deg,var(--surface-2),rgba(var(--pr),.07))",borderLeft:"1.5px solid rgba(var(--pr),.4)",borderRight:"1.5px solid rgba(var(--pr),.4)"}}>
            <div style={{position:"absolute",left:-12,top:"50%",transform:"translateY(-50%)",width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,.88)"}}/>
            <div style={{position:"absolute",right:-12,top:"50%",transform:"translateY(-50%)",width:24,height:24,borderRadius:"50%",background:"rgba(0,0,0,.88)"}}/>
            <div style={{position:"absolute",top:"50%",right:20,left:20,height:0,borderTop:"1.5px dashed rgba(var(--pr),.3)"}}/>
          </div>
          {/* جزء سفلي الأزرار */}
          <div style={{background:"linear-gradient(145deg,var(--surface-2),rgba(var(--pr),.07))",borderRadius:"0 0 22px 22px",padding:"16px 20px 22px",border:"1.5px solid rgba(var(--pr),.4)",borderTop:"none"}}>
            <button className="promo-book-glow" style={{width:"100%",background:"var(--grad)",color:"#000",padding:"14px",borderRadius:14,fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit",border:"none",marginBottom:10}} onClick={()=>{setShowPromoPopup(false);onBook();}}>{t('ui.book_now')}</button>
            <button style={{width:"100%",background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"11px",borderRadius:14,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setShowPromoPopup(false)}>{t('ui.close')}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { buildDorkBgStyle, buildHomeReviewsFeed } from "../utils/ui.js";

function HomeReviewsSection({customers,approvedSalons,setSelSalon,setView}){
  const reviews=buildHomeReviewsFeed(customers,approvedSalons);
  const [activeIdx,setActiveIdx]=useState(0);
  const scrollRef=useRef(null);
  const timerRef=useRef(null);
  const gold="#d4a017";
  const goldStar="#e8c04a";
  const dimStar="rgba(212,160,23,.18)";
  const shown=reviews.slice(0,16);

  const scrollTo=idx=>{
    if(!scrollRef.current)return;
    const el=scrollRef.current.children[idx];
    if(el)el.scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});
    setActiveIdx(idx);
  };

  // auto-scroll every 4 s, pause on user hover
  const startTimer=()=>{
    clearInterval(timerRef.current);
    if(shown.length<2)return;
    timerRef.current=setInterval(()=>{
      setActiveIdx(prev=>{
        const next=(prev+1)%shown.length;
        if(scrollRef.current&&scrollRef.current.children[next])
          scrollRef.current.children[next].scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});
        return next;
      });
    },4000);
  };
  useEffect(()=>{startTimer();return()=>clearInterval(timerRef.current);},[shown.length]);

  const openSalon=sid=>{
    const s=approvedSalons.find(x=>Number(x.id)===Number(sid));
    if(s){setSelSalon(s);setView("salon");}
  };

  const globalAvg=reviews.length
    ?Math.round(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length*10)/10
    :0;

  return(
    <div style={{padding:"16px 0 8px",borderTop:"1px solid rgba(212,160,23,.1)"}}>
      {/* ── Header row ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",marginBottom:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#f0f0f0",letterSpacing:.4}}>آراء العملاء</div>
          <div style={{fontSize:10,color:gold,opacity:.85}}>تجارب حقيقية من زوار الصالونات</div>
        </div>
        {reviews.length>0&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 10px",borderRadius:10,background:"rgba(212,160,23,.07)",border:"1px solid rgba(212,160,23,.18)"}}>
            <span style={{fontSize:14,fontWeight:900,color:goldStar,lineHeight:1}}>{globalAvg}</span>
            <span style={{fontSize:8,color:"#666",marginTop:1}}>{reviews.length} تقييم</span>
          </div>
        )}
      </div>

      {/* ── Carousel track ── */}
      {reviews.length===0?(
        <div style={{margin:"0 16px",padding:"18px 14px",borderRadius:14,background:"#0b0f1c",border:"1px dashed rgba(212,160,23,.2)",textAlign:"center"}}>
          <div style={{fontSize:12,color:"#555"}}>لا توجد تقييمات بعد. قيّم زيارتك من حسابك.</div>
        </div>
      ):(
        <>
          <div
            ref={scrollRef}
            onMouseEnter={()=>clearInterval(timerRef.current)}
            onMouseLeave={startTimer}
            onTouchStart={()=>clearInterval(timerRef.current)}
            onTouchEnd={startTimer}
            onScroll={e=>{
              const c=e.currentTarget;
              const cardW=(c.children[0]?.offsetWidth||260)+10;
              setActiveIdx(Math.round(c.scrollLeft/cardW));
            }}
            style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6,paddingLeft:16,paddingRight:8,scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            {shown.map((r,i)=>(
              <div
                key={r.key}
                style={{
                  scrollSnapAlign:"start",
                  flex:"0 0 calc(88% - 24px)",
                  maxWidth:310,
                  background:"#0b1220",
                  border:`1px solid rgba(212,160,23,${i===activeIdx?.42:.18})`,
                  borderRadius:16,
                  padding:"14px 14px 12px",
                  transition:"border-color .3s",
                  display:"flex",flexDirection:"column",gap:0,
                }}>
                {/* Salon name */}
                <div style={{fontSize:12,fontWeight:800,color:"#d4a017",marginBottom:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:.2}}>
                  ✂ {r.salonName}
                </div>
                {/* Customer + stars */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:11,color:"#c8c8d8",fontWeight:600}}>
                    👤 {r.customerName}
                  </span>
                  <div style={{display:"flex",gap:1}}>
                    {[1,2,3,4,5].map(n=>(
                      <span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:dimStar,lineHeight:1}}>★</span>
                    ))}
                  </div>
                </div>
                {/* Divider */}
                <div style={{height:1,background:"rgba(212,160,23,.08)",marginBottom:10}}/>
                {/* Comment */}
                <div style={{fontSize:11,color:r.comment?"#a8a8bc":"#3a3a50",fontStyle:r.comment?"italic":"normal",lineHeight:1.55,flex:1,minHeight:32}}>
                  {r.comment?`«${r.comment}»`:"بدون تعليق نصي"}
                </div>
                {/* Date */}
                <div style={{fontSize:9,color:"#3a3a52",marginTop:8,paddingTop:6,borderTop:"1px solid rgba(212,160,23,.06)"}}>
                  📅 {r.date||"—"}{r.time?` · ${r.time}`:""}
                </div>
                {/* عرض الكل — minimalist gold-border button */}
                <button
                  onClick={e=>{e.stopPropagation();openSalon(r.salonId);}}
                  style={{marginTop:12,width:"100%",background:"transparent",border:"1px solid rgba(212,160,23,.45)",color:gold,borderRadius:8,padding:"7px 0",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:700,letterSpacing:.4}}>
                  عرض الكل
                </button>
              </div>
            ))}
          </div>

          {/* ── Scroll dots ── */}
          {shown.length>1&&(
            <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:10,padding:"0 16px"}}>
              {shown.map((_,i)=>(
                <button key={i} onClick={()=>scrollTo(i)} style={{width:i===activeIdx?18:6,height:6,borderRadius:3,background:i===activeIdx?gold:"rgba(212,160,23,.2)",border:"none",cursor:"pointer",padding:0,transition:"width .3s,background .3s"}}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


export { HomeReviewsSection };

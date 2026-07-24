// صفحات: كل التقييمات، الإشعارات، المقارنة، الخريطة القريبة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";

import { DorkLogoSvg } from "./Ui.jsx";
import { IconArrowLeft, IconCalendar, IconScissors, IconStar, IconUser } from "./Icons.jsx";


export function AllReviewsView({reviews,approvedSalons,setSelSalon,setView}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[filter,setFilter]=useState(0);
  const[search,setSearch]=useState("");
  const gold="var(--gold)";
  const goldStar="var(--gold)";
  const dimStar="rgba(var(--gold-rgb),.18)";

  const byId=new Map(approvedSalons.map(s=>[Number(s.id),s]));
  const approvedSet=new Set(approvedSalons.map(s=>Number(s.id)));
  const feed=(reviews||[])
    .filter(r=>approvedSet.has(Number(r.salon_id)))
    .map(r=>({
      key:`hr-${r.id}`,
      salonId:Number(r.salon_id),
      salonName:(byId.get(Number(r.salon_id))?.name||t("all_reviews.salon_fallback")).trim(),
      customerName:(r.customer_name||t("all_reviews.customer_fallback")).trim(),
      rating:r.rating,
      comment:(r.comment||"").trim(),
      ownerReply:(r.owner_reply||"").trim(),
      date:r.booking_date||r.created_at?.split("T")[0]||"",
    }))
    .sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  const filtered=feed.filter(r=>{
    if(filter>0&&r.rating!==filter)return false;
    if(search&&!r.salonName.includes(search)&&!r.customerName.includes(search)&&!r.comment.includes(search))return false;
    return true;
  });

  const globalAvg=feed.length
    ?Math.round(feed.reduce((a,r)=>a+r.rating,0)/feed.length*10)/10:0;
  const dist=[5,4,3,2,1].map(s=>({star:s,count:feed.filter(r=>r.rating===s).length}));

  const openSalon=sid=>{
    const s=approvedSalons.find(x=>Number(x.id)===Number(sid));
    if(s){setSelSalon(s);setView("salon");}
  };

  return(
    <div style={{minHeight:"100vh",fontFamily:"'Cairo',sans-serif",direction:dir,paddingBottom:40}}>
      <div style={{position:"sticky",top:64,zIndex:50,background:"var(--bg-input)",borderBottom:"1px solid rgba(var(--gold-rgb),.15)",padding:"12px 16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <button onClick={()=>setView("home")} style={{background:"transparent",border:"none",color:gold,fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1,display:"flex",alignItems:"center"}}><IconArrowLeft size={18} color={gold}/></button>
          <DorkLogoSvg size={26}/>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"var(--text-primary)"}}>{t("all_reviews.title")}</div>
            <div style={{fontSize:10,color:gold,opacity:.8,display:"flex",alignItems:"center",gap:3}}>{feed.length} {t("all_reviews.rating_unit")} — {t("all_reviews.avg_prefix")} {globalAvg} <IconStar size={10} color={gold}/></div>
          </div>
        </div>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={t("all_reviews.search_ph")}
          style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:10,background:"var(--bg-input)",border:"1px solid rgba(var(--gold-rgb),.25)",color:"var(--text-primary)",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none"}}
        />
      </div>

      <div style={{padding:"12px 16px",background:"linear-gradient(180deg,rgba(var(--gold-rgb),.06),transparent)"}}>
        <div style={{display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
          <button onClick={()=>setFilter(0)} style={{flex:"0 0 auto",padding:"6px 14px",borderRadius:20,border:`1px solid ${filter===0?gold:"rgba(var(--gold-rgb),.2)"}`,background:filter===0?"rgba(var(--gold-rgb),.12)":"transparent",color:filter===0?gold:"var(--text-muted)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap"}}>
            {t("all_reviews.filter_all")} ({feed.length})
          </button>
          {dist.map(({star,count})=>(
            <button key={star} onClick={()=>setFilter(star===filter?0:star)}
              style={{flex:"0 0 auto",display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:20,border:`1px solid ${filter===star?gold:"rgba(var(--gold-rgb),.2)"}`,background:filter===star?"rgba(var(--gold-rgb),.12)":"transparent",color:filter===star?goldStar:"var(--text-muted)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap"}}>
              {Array.from({length:star}).map((_,i)=><IconStar key={i} size={9}/>)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"32px 0",color:"var(--text-muted)",fontSize:13}}>{t("all_reviews.no_results")}</div>
        )}
        {filtered.map((r,i)=>(
          <div key={r.key} onClick={()=>openSalon(r.salonId)}
            style={{cursor:"pointer",background:"var(--surface-1)",border:`1px solid rgba(var(--gold-rgb),.28)`,borderRadius:14,padding:"14px 14px 12px",boxShadow:"0 2px 16px rgba(0,0,0,.35)",transition:"box-shadow .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:800,color:gold,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                <IconScissors size={12} color={gold}/>{r.salonName}
              </div>
              <div style={{display:"flex",gap:1,flexShrink:0,marginRight:8}}>
                {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=r.rating?goldStar:dimStar}/>)}
              </div>
            </div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:r.comment?8:0,display:"flex",alignItems:"center",gap:4}}><IconUser size={10}/>{r.customerName}</div>
            {r.comment&&(
              <>
                <div style={{height:1,background:"rgba(var(--gold-rgb),.1)",margin:"8px 0"}}/>
                <div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.55}}>«{r.comment}»</div>
              </>
            )}
            <div style={{fontSize:9,color:"var(--text-muted)",marginTop:10,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.date||"—"}</div>
            {r.ownerReply&&(
              <div style={{marginTop:8,padding:"7px 10px",background:"rgba(var(--gold-rgb),.06)",borderRight:"3px solid #d4a017",borderRadius:"0 7px 7px 0"}}>
                <div style={{fontSize:9,color:"var(--gold)",fontWeight:700,marginBottom:2}}>{t("all_reviews.owner_reply_label")}</div>
                <div style={{fontSize:10,color:"var(--text-muted)",lineHeight:1.5}}>{r.ownerReply}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

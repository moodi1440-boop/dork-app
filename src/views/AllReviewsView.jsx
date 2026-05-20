import React, { useState } from "react";
import { DorkLogoSvg } from "../components/Logo";

function AllReviewsView({reviews,approvedSalons,setSelSalon,setView}){
  const[filter,setFilter]=useState(0);
  const[search,setSearch]=useState("");
  const gold="#d4a017";
  const goldStar="#e8c04a";
  const dimStar="rgba(212,160,23,.18)";

  const byId=new Map(approvedSalons.map(s=>[Number(s.id),s]));
  const approvedSet=new Set(approvedSalons.map(s=>Number(s.id)));
  const feed=(reviews||[])
    .filter(r=>approvedSet.has(Number(r.salon_id)))
    .map(r=>({
      key:`hr-${r.id}`,
      salonId:Number(r.salon_id),
      salonName:(byId.get(Number(r.salon_id))?.name||"صالون").trim(),
      customerName:(r.customer_name||"عميل").trim(),
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
    <div style={{minHeight:"100vh",fontFamily:"'Cairo',sans-serif",direction:"rtl",paddingBottom:40}}>
      {/* ── Sticky Header ── */}
      <div style={{position:"sticky",top:64,zIndex:50,background:"#0d0d1a",borderBottom:"1px solid rgba(212,160,23,.15)",padding:"12px 16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <button onClick={()=>setView("home")} style={{background:"transparent",border:"none",color:gold,fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1}}>←</button>
          <DorkLogoSvg size={26}/>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"#f0f0f0"}}>جميع التقييمات</div>
            <div style={{fontSize:10,color:gold,opacity:.8}}>{feed.length} تقييم — متوسط {globalAvg} ★</div>
          </div>
        </div>
        {/* Search */}
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 ابحث باسم الصالون أو العميل..."
          style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:10,background:"#111825",border:"1px solid rgba(212,160,23,.25)",color:"#e0e0e0",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none"}}
        />
      </div>

      {/* ── Summary bar ── */}
      <div style={{padding:"12px 16px",background:"linear-gradient(180deg,rgba(212,160,23,.06),transparent)"}}>
        <div style={{display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
          {/* All */}
          <button onClick={()=>setFilter(0)} style={{flex:"0 0 auto",padding:"6px 14px",borderRadius:20,border:`1px solid ${filter===0?gold:"rgba(212,160,23,.2)"}`,background:filter===0?"rgba(212,160,23,.12)":"transparent",color:filter===0?gold:"#888",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap"}}>
            الكل ({feed.length})
          </button>
          {dist.map(({star,count})=>(
            <button key={star} onClick={()=>setFilter(star===filter?0:star)}
              style={{flex:"0 0 auto",display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:20,border:`1px solid ${filter===star?gold:"rgba(212,160,23,.2)"}`,background:filter===star?"rgba(212,160,23,.12)":"transparent",color:filter===star?goldStar:"#888",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap"}}>
              {"★".repeat(star)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"32px 0",color:"#555",fontSize:13}}>لا توجد نتائج مطابقة للبحث</div>
        )}
        {filtered.map((r,i)=>(
          <div key={r.key} onClick={()=>openSalon(r.salonId)}
            style={{cursor:"pointer",background:"#0b1220",border:`1px solid rgba(212,160,23,.28)`,borderRadius:14,padding:"14px 14px 12px",boxShadow:"0 2px 16px rgba(0,0,0,.35)",transition:"box-shadow .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:800,color:gold,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                ✂ {r.salonName}
              </div>
              <div style={{display:"flex",gap:1,flexShrink:0,marginRight:8}}>
                {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:dimStar}}>★</span>)}
              </div>
            </div>
            <div style={{fontSize:11,color:"#9898a8",marginBottom:r.comment?8:0}}>👤 {r.customerName}</div>
            {r.comment&&(
              <>
                <div style={{height:1,background:"rgba(212,160,23,.1)",margin:"8px 0"}}/>
                <div style={{fontSize:11,color:"#a0a0bc",fontStyle:"italic",lineHeight:1.55}}>«{r.comment}»</div>
              </>
            )}
            <div style={{fontSize:9,color:"#363650",marginTop:10}}>📅 {r.date||"—"}</div>
            {r.ownerReply&&(
              <div style={{marginTop:8,padding:"7px 10px",background:"rgba(212,160,23,.06)",borderRight:"3px solid #d4a017",borderRadius:"0 7px 7px 0"}}>
                <div style={{fontSize:9,color:"#d4a017",fontWeight:700,marginBottom:2}}>✂ رد الصالون</div>
                <div style={{fontSize:10,color:"#b8b880",lineHeight:1.5}}>{r.ownerReply}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


export { AllReviewsView };

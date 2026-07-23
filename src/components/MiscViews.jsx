// صفحات: كل التقييمات، الإشعارات، المقارنة، الخريطة القريبة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import {
  IconArrowLeft, IconArrowRight, IconCalendar, IconPin, IconScissors, IconStar,
  IconUser, NotifIcon
} from "./icons.jsx";
import { sb } from "../../App.jsx";

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

export function NotifsView({setView}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[notifs,setNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}});

  // تحميل الإشعارات من Supabase عند فتح الصفحة
  useEffect(()=>{
    sb("notifications","GET",null,"?select=id,title,body,icon,created_at&order=created_at.desc&limit=50").then(data=>{
      if(!Array.isArray(data)||!data.length)return;
      const converted=data.map(n=>({
        id:n.id||Date.now(),
        icon:n.icon||"🔔",
        title:n.title||"",
        body:n.body||"",
        time:new Date(n.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),
        read:n.read||false,
      }));
      setNotifs(converted);
      try{localStorage.setItem("dork_notifs",JSON.stringify(converted.slice(0,50)));}catch{}
    }).catch(()=>{});
  },[]);

  const markAll=()=>{
    const updated=notifs.map(n=>({...n,read:true}));
    setNotifs(updated);
    localStorage.setItem("dork_notifs",JSON.stringify(updated));
    localStorage.setItem("dork_notif_count","0");
    // وضع علامة مقروء في Supabase
    sb("notifications","PATCH",{read:true},"?read=eq.false").catch(()=>{});
  };

  const clearAll=()=>{
    setNotifs([]);
    localStorage.setItem("dork_notifs","[]");
    localStorage.setItem("dork_notif_count","0");
    // حذف من Supabase
    sb("notifications","DELETE",null,"?id=gt.0").catch(()=>{});
  };

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}>
        <button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button>
        <h2 style={{...G.ft,flex:1}}>{t("notifs_view.title")}</h2>
        {notifs.length>0&&<button style={{...G.pageBtn,fontSize:11,padding:"5px 10px"}} onClick={markAll}>{t("notifs_view.mark_all")}</button>}
        {notifs.length>0&&<button style={{...G.delBtn,fontSize:11,padding:"5px 10px"}} onClick={clearAll}>{t("notifs_view.clear")}</button>}
      </div>
      {notifs.length===0
        ?<div style={G.empty}>{t("notifs_view.empty")}</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {notifs.map(n=>(
            <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"var(--border-ui)":"var(--p)"}`,opacity:n.read?.7:1}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{flexShrink:0,display:"flex"}}><NotifIcon icon={n.icon} size={20}/></span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{n.title}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{n.body}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>{n.time}</div>
                </div>
                {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:"var(--p)",flexShrink:0,marginTop:4}}/>}
              </div>
            </div>
          ))}
        </div>
      }
    </div></div>
  );
}

export function CompareSalonsView({salons,setView,setSelSalon}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  if(!salons||salons.length<2)return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("compare.title")}</h2></div>
      <div style={G.empty}>{t("compare.empty")}</div>
    </div></div>
  );

  const[a,b]=salons;
  const rows=[
    {l:t("compare.rating"),av:a.rating||"-",bv:b.rating||"-",better:(+a.rating||0)>(+b.rating||0)?"a":"b"},
    {l:t("compare.barbers_count"),av:a.barbers?.length||1,bv:b.barbers?.length||1,better:(a.barbers?.length||1)>(b.barbers?.length||1)?"a":"b"},
    {l:t("compare.services_count"),av:a.services.length,bv:b.services.length,better:a.services.length>b.services.length?"a":"b"},
    {l:t("compare.min_price"),av:Math.min(...Object.values(a.prices||{0:0}))+" "+t("compare.sar"),bv:Math.min(...Object.values(b.prices||{0:0}))+" "+t("compare.sar"),better:Math.min(...Object.values(a.prices||{999:0}))<Math.min(...Object.values(b.prices||{999:0}))?"a":"b"},
    {l:t("compare.max_price"),av:Math.max(...Object.values(a.prices||{0:0}))+" "+t("compare.sar"),bv:Math.max(...Object.values(b.prices||{0:0}))+" "+t("compare.sar"),better:Math.max(...Object.values(a.prices||{0:0}))<Math.max(...Object.values(b.prices||{0:0}))?"a":"b"},
    {l:t("compare.bookings"),av:a.bookings.length,bv:b.bookings.length,better:a.bookings.length>b.bookings.length?"a":"b"},
  ];

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("compare.title")}</h2></div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        <div/>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid var(--pa25)",cursor:"pointer"}} onClick={()=>{setSelSalon(s);setView("salon");}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><IconScissors size={24} color="var(--p)"/></div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",lineHeight:1.3}}>{s.name}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",gap:3}}><IconPin size={9}/>{s.gov||s.region}</div>
          </div>
        ))}
      </div>

      {rows.map(({l,av,bv,better})=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center"}}>{l}</div>
          {[{v:av,side:"a"},{v:bv,side:"b"}].map(({v,side})=>(
            <div key={side} style={{background:better===side?"var(--pa12)":"var(--surface-1)",border:`1px solid ${better===side?"var(--p)":"var(--border-ui)"}`,borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:better===side?900:400,color:better===side?"var(--p)":"var(--text-muted)"}}>{v}</div>
              {better===side&&<div style={{fontSize:9,color:"var(--p)"}}>{t("compare.better")}</div>}
            </div>
          ))}
        </div>
      ))}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:12,border:"1px solid var(--border-ui)"}}>
            <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>{t("compare.services_of")} {s.name.split(" ")[0]}</div>
            {s.services.map(sv=>(
              <div key={sv} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                <span style={{color:"var(--text-primary)"}}>{sv}</span>
                <span style={{color:"var(--p)"}}>{s.prices?.[sv]||0} {t("compare.sar")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <button key={s.id} style={G.sub} onClick={()=>{setSelSalon(s);setView("book");}}>
            {t("compare.book_btn")} {s.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div></div>
  );
}

export function NearMapView({salons,setView,setSelSalon}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[userLoc,setUserLoc]=useState(null);
  const[loading,setLoading]=useState(false);
  const[sorted,setSorted]=useState([]);

  const haversine=(lat1,lon1,lat2,lon2)=>{
    const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const getCoords=(s)=>{
    if(!s.locationUrl)return null;
    const m=s.locationUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    return m?{lat:+m[1],lng:+m[2]}:null;
  };

  const detect=()=>{
    if(!navigator.geolocation){alert(t("near_map.no_geolocation"));return;}
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      p=>{
        const loc={lat:p.coords.latitude,lng:p.coords.longitude};
        setUserLoc(loc);
        const s=[...salons].map(s=>({...s,dist:getCoords(s)?haversine(loc.lat,loc.lng,getCoords(s).lat,getCoords(s).lng):999}))
          .sort((a,b)=>a.dist-b.dist);
        setSorted(s);
        setLoading(false);
      },
      ()=>{setLoading(false);alert(t("near_map.error_location"));},
      {enableHighAccuracy:true,timeout:15000}
    );
  };

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("near_map.title")}</h2></div>
      {!userLoc?(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconPin size={50}/></div>
          <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700,marginBottom:8}}>{t("near_map.intro_title")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>{t("near_map.intro_body")}</div>
          <button style={G.sub} onClick={detect} disabled={loading}>
            {loading?t("near_map.detecting"):t("near_map.detect_btn")}
          </button>
        </div>
      ):(
        <div>
          <div style={{background:"var(--pa08)",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
            {t("near_map.located")} - {sorted.filter(s=>s.dist<50).length} {t("near_map.range_suffix")}
          </div>
          {sorted.length===0
            ?<div style={G.empty}>{t("near_map.no_salons")}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sorted.slice(0,15).map(s=>(
                <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#555"}`}}
                  onClick={()=>{setSelSalon(s);setView("salon");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:5}}><IconScissors size={13} color="var(--p)"/>{s.name}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:3}}><IconPin size={10}/>{s.gov||s.region}{s.village?" - "+s.village:""}</div>
                    </div>
                    <div style={{textAlign:"left",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:900,color:s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#888"}}>
                        {s.dist<999?`${s.dist.toFixed(1)} ${t("near_map.km")}`:"-"}
                      </div>
                      <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2,display:"flex",alignItems:"center",gap:3}}><IconStar size={9}/>{s.rating}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}
    </div></div>
  );
}


// صفحات: كل التقييمات، الإشعارات، المقارنة، الخريطة القريبة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";

import { IconArrowRight, NotifIcon } from "./Icons.jsx";
import { sb } from "../../api.js";


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

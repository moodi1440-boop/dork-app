import React, { useState, useEffect, useRef, useCallback } from "react";
import { G } from "../styles";
import { supabase, sb } from "../api/supabase";

function MessagesPanel({salon,toast$}){
  const KEY=`dork_msgs_${salon.id}`;
  const[msgs,setMsgs]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const bottomRef=useRef(null);

  // تحميل الرسائل من Supabase
  const loadMsgs=useCallback(async()=>{
    try{
      const data=await sb("messages","GET",null,`?salon_id=eq.${salon.id}&order=created_at.asc&limit=200`);
      if(Array.isArray(data)&&data.length>0){
        const converted=data.map(m=>({id:m.id,from:m.from_admin?"admin":"owner",text:m.text,time:new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}));
        setMsgs(converted);
        try{localStorage.setItem(KEY,JSON.stringify(converted));}catch{}
      }
    }catch{
      // الرجوع للرسائل المحلية إذا فشل Supabase
    }
  },[salon.id,KEY]);

  useEffect(()=>{loadMsgs();},[loadMsgs]);

  // Realtime subscription للرسائل الجديدة
  useEffect(()=>{
    const channel=supabase.channel(`msgs-${salon.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`salon_id=eq.${salon.id}`},()=>{loadMsgs();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadMsgs]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async()=>{
    if(!txt.trim()||sending)return;
    setSending(true);
    const msgText=txt.trim();
    setTxt("");
    try{
      await sb("messages","POST",{salon_id:salon.id,from_admin:false,text:msgText});
      await loadMsgs();
    }catch{
      // fallback localStorage
      const m={id:Date.now(),from:"owner",text:msgText,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})};
      const newMsgs=[...msgs,m];
      setMsgs(newMsgs);
      try{localStorage.setItem(KEY,JSON.stringify(newMsgs));}catch{}
    }
    setSending(false);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:400}}>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {msgs.length===0&&<div style={G.empty}>لا توجد رسائل - ابدأ المحادثة مع الإدارة</div>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:m.from==="owner"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:m.from==="owner"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.from==="owner"?"var(--pa25)":"#1a1a2e",border:`1px solid ${m.from==="owner"?"var(--pa4)":"#2a2a3a"}`}}>
              <div style={{fontSize:10,color:"#888",marginBottom:3}}>{m.from==="owner"?"أنت":"الإدارة"}</div>
              <div style={{fontSize:13,color:"#fff"}}>{m.text}</div>
              <div style={{fontSize:9,color:"#555",marginTop:3,textAlign:m.from==="owner"?"left":"right"}}>{m.time}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input style={{flex:1,padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
          placeholder="اكتب رسالة للإدارة..." value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={{...G.sub,width:"auto",padding:"0 16px",marginTop:0,opacity:sending?.5:1}} onClick={send} disabled={sending}>{sending?"...":"إرسال"}</button>
      </div>
    </div>
  );
}


export { MessagesPanel };

// المراسلة بين الصالون والعميل (لوحة المالك + نافذة العميل) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";

import { IconChat, IconClose } from "../shared/Icons.jsx";
import { sb, supabase } from "../../api.js";
import { useChat } from "../../chat.jsx";


export function CustomerSalonChat({salonId,customerId,bookingId,salonName,onClose,toast$}){
  const{t}=useTranslation();
  const cKey=`cm_${salonId}-${customerId}-${bookingId}`;
  const{msgs,setMsgs,addMsg}=useChat(cKey);
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const chatBoxRef=useRef(null);
  const prevMsgCount=useRef(-1);
  const prevFromSalonRef=useRef(-1);
  const didMarkReadRef=useRef(false);

  const load=useCallback(async()=>{
    if(!salonId||!customerId)return;
    try{
      let url=`/api/customer-messages?salonId=${salonId}&customerId=${customerId}`;
      if(bookingId)url+=`&bookingId=${bookingId}`;
      const res=await fetch(url);
      const data=await res.json();
      if(Array.isArray(data)){
        setMsgs(data);
        const salonMsgsCount=data.filter(m=>!m.from_customer).length;
        if(prevFromSalonRef.current>=0&&salonMsgsCount>prevFromSalonRef.current){
          toast$&&toast$("💬 رسالة جديدة من الصالون","info");
        }
        prevFromSalonRef.current=salonMsgsCount;
      }
      if(!didMarkReadRef.current){didMarkReadRef.current=true;fetch(url,{method:"PATCH"}).catch(()=>{});}
    }catch{}
  },[salonId,customerId,bookingId,setMsgs,toast$]);

  useEffect(()=>{load();},[load]);

  useEffect(()=>{
    const id=setInterval(()=>load(),3000);
    return()=>clearInterval(id);
  },[load]);

  useEffect(()=>{
    const ch=supabase.channel(`cm-${salonId}-${customerId}-${bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${salonId}`},(payload)=>{
        load();
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[salonId,customerId,bookingId,load]);

  useEffect(()=>{const el=chatBoxRef.current;if(!el)return;if(prevMsgCount.current<0||msgs.length>prevMsgCount.current){requestAnimationFrame(()=>{if(chatBoxRef.current)chatBoxRef.current.scrollTop=chatBoxRef.current.scrollHeight;});}prevMsgCount.current=msgs.length;},[msgs]);

  const send=async()=>{
    if(!txt.trim()||sending)return;
    setSending(true);
    const msgText=txt.trim();
    setTxt("");
    const tempId=`tmp-${Date.now()}`;
    addMsg({id:tempId,from_customer:true,text:msgText,created_at:new Date().toISOString(),read_at:null});
    try{
      await sb("customer_messages","POST",{
        salon_id:Number(salonId),customer_id:Number(customerId),booking_id:bookingId?Number(bookingId):null,
        from_customer:true,text:msgText
      });
      await load();
    }catch(e){
      setTxt(msgText);
      await load();
      toast$&&toast$(i18n.t('ui.send_error_check'),"err");
    }
    setSending(false);
  };

  return(
    <div style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:12,marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",display:"flex",alignItems:"center",gap:5}}><IconChat size={13}/>{t('ui.contact_salon',{salon:salonName||""})}</div>
        <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:0}} onClick={onClose}><IconClose size={14}/></button>
      </div>
      <div ref={chatBoxRef} style={{height:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
        {msgs.length===0&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,marginTop:40}}>{t('ui.no_messages_yet')}</div>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:m.from_customer?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"80%",padding:"7px 11px",borderRadius:m.from_customer?"12px 12px 2px 12px":"12px 12px 12px 2px",
              background:m.from_customer?"var(--pa25)":"var(--surface-2)",
              border:`1px solid ${m.from_customer?"rgba(var(--pr),.3)":"var(--border-ui)"}`}}>
              <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{m.from_customer?"أنت":salonName||"الصالون"}</div>
              <div style={{fontSize:13,color:"var(--text-primary)"}}>{m.text}</div>
              <div style={{fontSize:9,color:"var(--text-muted)",marginTop:2,display:"flex",alignItems:"center",gap:3}}>
                {new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})}
                {m.from_customer&&<span style={{color:String(m.id).startsWith("tmp-")?"#888":(m.read_at?"#34B7F1":"#888888")}}>{String(m.id).startsWith("tmp-")?"✓":"✓✓"}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <input style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
          placeholder={t('ui.message_ph')} value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0,opacity:sending?.5:1}} onClick={send} disabled={sending}>{sending?"...":"إرسال"}</button>
      </div>
    </div>
  );
}

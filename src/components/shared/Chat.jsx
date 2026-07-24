// المراسلة بين الصالون والعميل (لوحة المالك + نافذة العميل) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";
import { IconArrowRight, IconChat, IconClose } from "./Icons.jsx";
import { sb, supabase } from "../../api.js";
import { useChat } from "../../chat.jsx";

export function MessagesPanel({salon,toast$}){
  const{t}=useTranslation();
  const KEY=`dork_msgs_${salon.id}`;
  const[msgs,setMsgs]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const adminBoxRef=useRef(null);
  const[msgTab,setMsgTab]=useState("customers"); // "admin" | "customers"
  const[selCust,setSelCust]=useState(null); // {customerId,bookingId,customerName}
  const[convList,setConvList]=useState([]);
  const[loadingConv,setLoadingConv]=useState(false);
  const[custMsgs,setCustMsgs]=useState([]);
  const[ownerTxt,setOwnerTxt]=useState("");
  const[ownerSending,setOwnerSending]=useState(false);
  const custBoxRef=useRef(null);
  const custMsgsEndRef=useRef(null);
  const prevAdminCount=useRef(-1);
  const prevCustCount=useRef(-1);
  const needScrollRef=useRef(false);
  const prevUnreadRef=useRef(-1);
  const isFirstLoadConv=useRef(true);
  const[clearConfirm,setClearConfirm]=useState(false);
  const[searchTxt,setSearchTxt]=useState("");
  const[searchResults,setSearchResults]=useState(null); // null=لم يُبحث, array=نتائج
  const[searching,setSearching]=useState(false);
  const[clearAllConfirm,setClearAllConfirm]=useState(false);

  // تحميل الرسائل من Supabase
  const loadMsgs=useCallback(async()=>{
    try{
      const data=await sb("messages","GET",null,`?select=id,salon_id,from_admin,text,created_at,read_at&salon_id=eq.${salon.id}&order=created_at.asc&limit=50`);
      if(Array.isArray(data)&&data.length>0){
        const converted=data.map(m=>({id:m.id,from:m.from_admin?"admin":"owner",text:m.text,readAt:m.read_at||null,time:new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})}));
        setMsgs(converted);
        try{localStorage.setItem(KEY,JSON.stringify(converted));}catch{}
      }
    }catch{}
  },[salon.id,KEY]);

  useEffect(()=>{loadMsgs();},[loadMsgs]);

  useEffect(()=>{
    fetch("/api/customer-messages?markAdminRead=1",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({salonId:salon.id})}).catch(()=>{});
  },[salon.id]);

  useEffect(()=>{
    const channel=supabase.channel(`msgs-${salon.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`salon_id=eq.${salon.id}`},()=>{loadMsgs();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadMsgs]);

  useEffect(()=>{const el=adminBoxRef.current;if(!el)return;if(prevAdminCount.current<0||msgs.length>prevAdminCount.current)el.scrollTop=el.scrollHeight;prevAdminCount.current=msgs.length;},[msgs]);

  const send=async()=>{
    if(!txt.trim()||sending)return;
    setSending(true);
    const msgText=txt.trim();
    setTxt("");
    try{
      await sb("messages","POST",{salon_id:salon.id,from_admin:false,text:msgText});
      await loadMsgs();
    }catch{
      const m={id:Date.now(),from:"owner",text:msgText,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})};
      const newMsgs=[...msgs,m];
      setMsgs(newMsgs);
      try{localStorage.setItem(KEY,JSON.stringify(newMsgs));}catch{}
    }
    setSending(false);
  };

  // تحميل قائمة محادثات العملاء
  const loadConvList=useCallback(async()=>{
    if(isFirstLoadConv.current)setLoadingConv(true);
    try{
      const res=await fetch("/api/owner-chat?list=1",{credentials:"include"});
      const data=await res.json();
      if(Array.isArray(data)){
        setConvList(data);
        const newTotal=data.reduce((a,c)=>a+(c.unread_count||0),0);
        if(prevUnreadRef.current>=0&&newTotal>prevUnreadRef.current){
          toast$&&toast$("💬 رسالة جديدة من عميل","info");
        }
        prevUnreadRef.current=newTotal;
        isFirstLoadConv.current=false;
      }
    }catch{}
    setLoadingConv(false);
  },[selCust,toast$]);

  // تحميل رسائل محادثة عميل محدد
  const loadOwnerChat=useCallback(async(cId,bId)=>{
    try{
      const url=bId?`/api/owner-chat?customerId=${cId}&bookingId=${bId}`:`/api/owner-chat?customerId=${cId}`;
      const res=await fetch(url,{credentials:"include"});
      const data=await res.json();
      if(Array.isArray(data))setCustMsgs(data);
      else setCustMsgs([]);
    }catch{setCustMsgs([]);}
  },[]);

  const searchCustomer=useCallback(async()=>{
    const q=searchTxt.trim();
    if(!q)return;
    setSearching(true);
    try{
      const res=await fetch(`/api/owner-chat?searchPhone=${encodeURIComponent(q)}`,{credentials:"include"});
      const data=await res.json();
      setSearchResults(Array.isArray(data)?data:[]);
    }catch{setSearchResults([]);}
    setSearching(false);
  },[searchTxt]);

  useEffect(()=>{if(msgTab==="customers")loadConvList();},[msgTab,loadConvList]);
  // تحديث القائمة دورياً (كل 10 ثوانٍ) لتحديث عداد غير المقروء حتى بدون دخول المحادثة
  useEffect(()=>{
    if(msgTab!=="customers")return;
    const id=setInterval(loadConvList,10000);
    return()=>clearInterval(id);
  },[msgTab,loadConvList]);
  // Realtime: تحديث القائمة فورياً عند وصول رسالة جديدة من أي عميل
  useEffect(()=>{
    if(msgTab!=="customers"||!salon?.id)return;
    const ch=supabase.channel(`convlist-${salon.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${salon.id}`},()=>{
        loadConvList();
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[msgTab,salon?.id,loadConvList]);
  useEffect(()=>{if(selCust){needScrollRef.current=true;prevCustCount.current=-1;setClearConfirm(false);setCustMsgs([]);loadOwnerChat(selCust.customerId,selCust.bookingId);}},[selCust,loadOwnerChat]);
  useEffect(()=>{
    if(!selCust)return;
    const id=setInterval(()=>loadOwnerChat(selCust.customerId,selCust.bookingId),3000);
    return()=>clearInterval(id);
  },[selCust,loadOwnerChat]);
  // Realtime: الصالون يستقبل رسائل العميل فورياً بدون انتظار الـ polling
  useEffect(()=>{
    if(!selCust||!salon?.id)return;
    const ch=supabase.channel(`owner-cm-${salon.id}-${selCust.customerId}-${selCust.bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${salon.id}`},()=>{
        loadOwnerChat(selCust.customerId,selCust.bookingId);
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[selCust,salon?.id,loadOwnerChat]);
  useEffect(()=>{if(needScrollRef.current||prevCustCount.current<0||custMsgs.length>prevCustCount.current){requestAnimationFrame(()=>{custMsgsEndRef.current?.scrollIntoView({block:"end"});});needScrollRef.current=false;}prevCustCount.current=custMsgs.length;},[custMsgs]);

  const sendOwnerReply=async()=>{
    if(!ownerTxt.trim()||ownerSending||!selCust)return;
    setOwnerSending(true);
    const msgText=ownerTxt.trim();
    setOwnerTxt("");
    try{
      const res=await fetch("/api/owner-chat",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:selCust.customerId,bookingId:selCust.bookingId,text:msgText})});
      if(res.ok){
        await loadOwnerChat(selCust.customerId,selCust.bookingId);
      }else{
        setOwnerTxt(msgText);
        let errMsg=i18n.t('ui.send_failed');
        try{const j=await res.json();if(j?.error)errMsg=j.error;}catch{}
        toast$&&toast$(errMsg,"err");
      }
    }catch{
      setOwnerTxt(msgText);
      toast$&&toast$(i18n.t('ui.connection_error'),"err");
    }
    setOwnerSending(false);
  };

  const unreadCustTotal=convList.reduce((a,c)=>a+(c.unread_count||0),0);
  const tabBtn=(v,l,badge)=>(
    <button onClick={()=>setMsgTab(v)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${msgTab===v?"var(--p)":"var(--border-ui)"}`,background:msgTab===v?"var(--pa08)":"transparent",color:msgTab===v?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
      {l}
      {badge>0&&<span style={{background:"var(--p)",color:"#fff",borderRadius:999,fontSize:10,fontWeight:900,minWidth:17,height:17,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{badge>99?"99+":badge}</span>}
    </button>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:440,overflow:"hidden"}}>
      {/* تبويبات */}
      <div style={{display:"flex",gap:6,marginBottom:10}}>{tabBtn("customers","العملاء",unreadCustTotal)}{tabBtn("admin","الإدارة",0)}</div>

      {/* تبويب الإدارة */}
      {msgTab==="admin"&&<>
        <div ref={adminBoxRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {msgs.length===0&&<div style={G.empty}>{t("messages.empty")}</div>}
          {msgs.map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:m.from==="owner"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:m.from==="owner"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.from==="owner"?"var(--pa25)":"var(--surface-2)",border:`1px solid ${m.from==="owner"?"var(--pa4)":"var(--border-ui)"}`}}>
                <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>{m.from==="owner"?t("messages.from_you"):t("messages.from_admin")}</div>
                <div style={{fontSize:13,color:"var(--text-primary)"}}>{m.text}</div>
                <div style={{fontSize:9,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",justifyContent:m.from==="owner"?"flex-start":"flex-end",gap:3}}>{m.time}{m.from==="owner"&&<span style={{color:m.readAt?"#34B7F1":"#888888"}}>✓✓</span>}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input style={{flex:1,padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
            placeholder={t("messages.placeholder")} value={txt} onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}/>
          <button style={{...G.sub,width:"auto",padding:"0 16px",marginTop:0,opacity:sending?.5:1}} onClick={send} disabled={sending}>{sending?t("messages.sending"):t("messages.send")}</button>
        </div>
      </>}

      {/* تبويب العملاء */}
      {msgTab==="customers"&&<>
        {!selCust?(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* شريط البحث */}
            <div style={{display:"flex",gap:5,marginBottom:7}}>
              <input
                style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",direction:"rtl"}}
                placeholder="بحث بالاسم أو رقم الجوال..."
                value={searchTxt}
                onChange={e=>{setSearchTxt(e.target.value);if(!e.target.value){setSearchResults(null);}}}
                onKeyDown={e=>e.key==="Enter"&&searchCustomer()}
              />
              <button onClick={searchCustomer} style={{background:"var(--pa08)",border:"1px solid var(--pa4)",borderRadius:8,cursor:"pointer",padding:"0 9px",color:"var(--p)",fontSize:13}} title="بحث">🔍</button>
              {searchTxt&&<button onClick={()=>{setSearchTxt("");setSearchResults(null);}} style={{background:"none",border:"1px solid var(--border-ui)",borderRadius:8,cursor:"pointer",padding:"0 8px",color:"var(--text-muted)",fontSize:11}}>✕</button>}
            </div>
            {/* زر مسح الكل */}
            {convList.length>0&&!clearAllConfirm&&!searchTxt&&(
              <button onClick={()=>setClearAllConfirm(true)} style={{background:"none",border:"1px solid #ef444430",borderRadius:7,color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer",padding:"4px 10px",fontFamily:"inherit",marginBottom:7,alignSelf:"flex-end"}}>مسح الكل 🗑</button>
            )}
            {clearAllConfirm&&(
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:7,padding:"6px 10px",borderRadius:8,background:"#ef444415",border:"1px solid #ef444430"}}>
                <span style={{fontSize:11,color:"var(--text-muted)",flex:1}}>مسح جميع المحادثات نهائياً؟</span>
                <button onClick={async()=>{
                  try{await fetch("/api/owner-chat?clearAll=1",{method:"DELETE",credentials:"include"});}catch{}
                  setConvList([]);setClearAllConfirm(false);
                }} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",padding:"3px 9px",fontFamily:"inherit"}}>نعم</button>
                <button onClick={()=>setClearAllConfirm(false)} style={{background:"none",border:"1px solid var(--border-ui)",borderRadius:5,fontSize:10,cursor:"pointer",padding:"3px 8px",color:"var(--text-muted)",fontFamily:"inherit"}}>لا</button>
              </div>
            )}
            {/* القائمة */}
            <div style={{flex:1,overflowY:"auto"}}>
              {searchResults!==null?(
                <>
                  {searching&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,padding:20}}>{t('ui.loading')}</div>}
                  {!searching&&searchResults.length===0&&<div style={G.empty}>لا يوجد عميل بهذا الرقم أو الاسم</div>}
                  {searchResults.map(c=>(
                    <div key={c.id} onClick={()=>{setSelCust({customerId:c.id,bookingId:null,customerName:c.name||c.phone||`عميل #${c.id}`});setSearchTxt("");setSearchResults(null);}}
                      style={{padding:"10px 12px",borderBottom:"1px solid var(--border-ui)",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{c.name||`عميل #${c.id}`}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>{c.phone}</div>
                    </div>
                  ))}
                </>
              ):(
                <>
                  {loadingConv&&isFirstLoadConv.current&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,padding:20}}>{t('ui.loading')}</div>}
                  {!loadingConv&&convList.length===0&&<div style={G.empty}>{t('ui.no_cust_messages')}</div>}
                  {convList.filter(c=>!searchTxt||(c.customer_name||"").toLowerCase().includes(searchTxt.toLowerCase())||(c.customer_phone||"").includes(searchTxt)).map((c,i)=>(
                    <div key={i} onClick={()=>setSelCust({customerId:c.customer_id,bookingId:c.booking_id,customerName:c.customer_name||`عميل #${c.customer_id}`})}
                      style={{padding:"10px 12px",borderBottom:"1px solid var(--border-ui)",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{c.customer_name||t('ui.customer_prefix',{id:c.customer_id})} {c.booking_id&&<span style={{fontSize:11,color:"var(--text-muted)",fontWeight:400}}>· {t('ui.booking_prefix',{id:c.booking_id})}</span>}</div>
                        <div style={{fontSize:11,color:(c.unread_count||0)>0?"var(--text-primary)":"var(--text-muted)",fontWeight:(c.unread_count||0)>0?600:400,marginTop:2,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.text}</div>
                      </div>
                      {(c.unread_count||0)>0
                        ?<span style={{background:"var(--p)",color:"#fff",borderRadius:999,fontSize:10,fontWeight:900,minWidth:19,height:19,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 5px",flexShrink:0}}>{c.unread_count>99?"99+":c.unread_count}</span>
                        :null}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ):(
          <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexShrink:0,background:"var(--surface-1)",borderRadius:6,padding:"4px 2px"}}>
              <button onClick={()=>{setSelCust(null);loadConvList();}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--p)",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <IconArrowRight size={12}/>{t('ui.back_label')}
              </button>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{selCust.customerName}</div>
              {!clearConfirm
                ?<button onClick={()=>setClearConfirm(true)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:11,fontFamily:"inherit",padding:"2px 6px",borderRadius:6}} title="مسح الدردشة">🗑</button>
                :<div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:"var(--text-muted)"}}>تأكيد المسح؟</span>
                  <button onClick={async()=>{
                    try{
                      const url=selCust.bookingId
                        ?`/api/owner-chat?customerId=${selCust.customerId}&bookingId=${selCust.bookingId}`
                        :`/api/owner-chat?customerId=${selCust.customerId}`;
                      await fetch(url,{method:"DELETE",credentials:"include"});
                      setCustMsgs([]);
                      loadConvList();
                    }catch{}
                    setClearConfirm(false);
                  }} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",padding:"2px 7px",fontFamily:"inherit"}}>نعم</button>
                  <button onClick={()=>setClearConfirm(false)} style={{background:"none",border:"1px solid var(--border-ui)",borderRadius:5,fontSize:10,cursor:"pointer",padding:"2px 6px",color:"var(--text-muted)",fontFamily:"inherit"}}>لا</button>
                </div>
              }
            </div>
            <div ref={custBoxRef} style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
              {custMsgs.length===0&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,marginTop:20}}>{t('ui.no_messages')}</div>}
              {custMsgs.map(m=>(
                <div key={m.id} style={{display:"flex",justifyContent:m.from_customer?"flex-start":"flex-end"}}>
                  <div style={{maxWidth:"80%",padding:"7px 11px",borderRadius:m.from_customer?"12px 12px 12px 2px":"12px 12px 2px 12px",
                    background:m.from_customer?"var(--surface-2)":"var(--pa25)",
                    border:`1px solid ${m.from_customer?"var(--border-ui)":"var(--pa4)"}`}}>
                    <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{m.from_customer?"العميل":"أنت"}</div>
                    <div style={{fontSize:13,color:"var(--text-primary)"}}>{m.text}</div>
                    <div style={{fontSize:9,color:"var(--text-muted)",marginTop:2,display:"flex",alignItems:"center",gap:3}}>
                      {new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})}
                      {!m.from_customer&&<span style={{color:m.read_at?"#34B7F1":"#888888"}}>✓✓</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={custMsgsEndRef}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <input style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
                placeholder={t('ui.reply_ph')} value={ownerTxt} onChange={e=>setOwnerTxt(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&sendOwnerReply()}/>
              <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0,opacity:ownerSending?.5:1}} onClick={sendOwnerReply} disabled={ownerSending}>{ownerSending?"...":"إرسال"}</button>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

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


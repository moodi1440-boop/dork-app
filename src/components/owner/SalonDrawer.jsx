// القائمة الجانبية لصاحب الصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../../constants.js";
import { initializeWebPushNotifications } from "../../push.js";
import {
  IconClose, IconChevronLeft, IconBell, IconWarning, NotifIcon, LabelWithIcon
} from "../shared/Icons.jsx";

export function SalonDrawer({open,onClose,salon,ownerTab,setOwnerTab,view,setView,setOwnerSession,settings,setSettings,persistUiToSupabase,toast$,salonUnreadMsgs=0}){
  const[showLogout,setShowLogout]=useState(false);
  const[showDeleteSalon,setShowDeleteSalon]=useState(false);
  const[deletingSalon,setDeletingSalon]=useState(false);
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  useEffect(()=>{if(!open){setShowLogout(false);setShowDeleteSalon(false);};},[open]);
  const[_sUnread,_setSUnread]=useState(salonUnreadMsgs);
  useEffect(()=>{_setSUnread(salonUnreadMsgs);},[salonUnreadMsgs]);
  const[fcmStatus,setFcmStatus]=useState(()=>localStorage.getItem("fcm_debug")||"pending");
  const[fcmMsg,setFcmMsg]=useState("");
  const handleEnableNotifications=async()=>{
    setFcmMsg("");
    const permission=await Notification.requestPermission();
    if(permission==="granted"){
      await initializeWebPushNotifications();
      setFcmStatus(localStorage.getItem("fcm_debug")||"pending");
    } else {
      localStorage.setItem("fcm_debug","permission-"+permission);
      setFcmStatus("permission-"+permission);
      setFcmMsg("يرجى الضغط على سماح لتصلك إشعارات الحجوزات");
    }
  };
  useEffect(()=>{
    if(!open||!salon?.id)return;
    fetch("/api/owner-chat?list=1",{credentials:"include"}).then(r=>r.json()).then(data=>{if(Array.isArray(data))_setSUnread(data.reduce((a,c)=>a+(c.unread_count||0),0));}).catch(()=>{});
  },[open,salon?.id]);
  if(!salon)return null;

  const nav=(fn)=>{fn();onClose();};

  const Row=({icon,label,active,onClick})=>(
    <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 20px",background:active?"rgba(var(--pr),.15)":"transparent",border:"none",borderBottom:"1px solid var(--border-ui)",borderRight:active?`3px solid var(--p)`:"3px solid transparent",cursor:"pointer",fontFamily:"inherit",color:active?"var(--p)":"var(--text-primary)",WebkitAppearance:"none",appearance:"none",textAlign:dir==="rtl"?"right":"left",transition:"all .2s"}}>
      <span style={{flexShrink:0,display:"flex",alignItems:"center"}}><NotifIcon icon={icon} size={16}/></span>
      <span style={{fontSize:14,fontWeight:active?800:500,flex:1}}>{label}</span>
      {active
        ?<div style={{width:8,height:8,borderRadius:"50%",background:"var(--p)",flexShrink:0,boxShadow:"0 0 6px var(--p)"}}/>
        :<IconChevronLeft size={14} color="var(--text-muted)"/>
      }
    </button>
  );
  const SecHead=({label})=>(<div style={{padding:"10px 20px 5px",fontSize:11,color:"var(--p)",fontWeight:700,letterSpacing:.8,background:"var(--shell-bg)",borderBottom:"1px solid var(--border-ui)"}}>{label}</div>);

  return(
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1100,backdropFilter:"blur(2px)"}}/>}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"82%",maxWidth:340,background:"var(--shell-bg)",zIndex:1101,transform:open?"translateX(0)":"translateX(110%)",transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",overflowY:"auto",display:"flex",flexDirection:"column",direction:dir,boxShadow:open?"-4px 0 32px rgba(0,0,0,.6)":"none"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 16px",borderBottom:"1px solid var(--border-ui)",background:"var(--shell-bg)",position:"sticky",top:0,zIndex:1}}>
          <button onClick={onClose} aria-label="إغلاق القائمة" style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.06)",border:"none",color:"var(--text-muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IconClose size={16}/></button>
          <span style={{fontSize:15,fontWeight:700,color:"var(--p)"}}>{t("salon_drawer.title")}</span>
        </div>
        <div style={{height:8}}/>
        <SecHead label={t("salon_drawer.section_operations")}/>
        <Row icon="📋" label={t("salon_drawer.dashboard")} active={ownerTab===null&&view==="ownerDash"} onClick={()=>nav(()=>{setOwnerTab(null);setView("ownerDash");})}/>
        <Row icon="🗓" label={t("salon_drawer.bookings")} active={ownerTab==="calendar"} onClick={()=>nav(()=>{setOwnerTab("calendar");setView("ownerDash");})}/>
        <Row icon="🔥" label="إرسال عرض" active={ownerTab==="promo"} onClick={()=>nav(()=>{setOwnerTab("promo");setView("ownerDash");})}/>
        <Row icon="⭐" label={t("salon_drawer.reviews")} active={ownerTab==="reviews"} onClick={()=>nav(()=>{setOwnerTab("reviews");setView("ownerDash");})}/>
        <Row icon="💬" label={<span style={{display:"flex",alignItems:"center",gap:5}}>{t("salon_drawer.messages")}{_sUnread>0&&<span style={{background:"#e74c3c",color:"#fff",borderRadius:999,fontSize:9,fontWeight:900,minWidth:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{_sUnread>99?"99+":_sUnread}</span>}</span>} active={ownerTab==="messages"} onClick={()=>nav(()=>{setOwnerTab("messages");setView("ownerDash");})}/>
        <Row icon="📊" label={t("salon_drawer.stats")} active={ownerTab==="stats"} onClick={()=>nav(()=>{setOwnerTab("stats");setView("ownerDash");})}/>
        <SecHead label={t("salon_drawer.section_salon")}/>
        <Row icon="📋" label={t("salon_drawer.salon_info")} active={view==="ownerInfo"} onClick={()=>nav(()=>setView("ownerInfo"))}/>
        <Row icon="✂" label={t("salon_drawer.services_prices")} active={view==="ownerServices"} onClick={()=>nav(()=>setView("ownerServices"))}/>
        <Row icon="💈" label={t("salon_drawer.barbers")} active={view==="ownerBarbers"||view==="ownerHours"} onClick={()=>nav(()=>setView("ownerBarbers"))}/>
        <Row icon="📱" label={t("salon_drawer.social_media")} active={view==="ownerSocial"} onClick={()=>nav(()=>setView("ownerSocial"))}/>
        <SecHead label={t("salon_drawer.section_app")}/>
        <Row icon="🎨" label={t("salon_drawer.colors_theme")} active={view==="ownerTheme"} onClick={()=>nav(()=>setView("ownerTheme"))}/>
        <Row icon="🌙" label={t("salon_drawer.lighting")} active={view==="ownerDark"} onClick={()=>nav(()=>setView("ownerDark"))}/>
        <Row icon="🌐" label={t("salon_drawer.language")} active={view==="ownerLang"} onClick={()=>nav(()=>setView("ownerLang"))}/>
        <Row icon="🔔" label={t("salon_drawer.tones")} active={view==="ownerTone"} onClick={()=>nav(()=>setView("ownerTone"))}/>
        <Row icon="🔐" label={t("salon_drawer.pin")} active={view==="ownerPin"} onClick={()=>nav(()=>setView("ownerPin"))}/>
        <Row icon="❓" label={t("salon_drawer.faq")} active={view==="ownerFaq"} onClick={()=>nav(()=>setView("ownerFaq"))}/>
        <Row icon="🔒" label={t("salon_drawer.privacy")} active={view==="ownerPrivacy"} onClick={()=>nav(()=>setView("ownerPrivacy"))}/>

        <div style={{height:16}}/>
        <button onClick={()=>setShowLogout(true)} style={{width:"100%",padding:"15px 20px",background:"transparent",border:"none",borderTop:"1px solid var(--border-ui)",color:"#e74c3c",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:dir==="rtl"?"right":"left",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",gap:8}}>
          <NotifIcon icon="🚪" size={16}/> {t("salon_drawer.logout_btn")}
        </button>
        <button onClick={()=>setShowDeleteSalon(true)} style={{width:"100%",padding:"12px 20px",background:"transparent",border:"none",borderTop:"1px solid rgba(231,76,60,.2)",color:"#e74c3c",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:dir==="rtl"?"right":"left",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",gap:8,opacity:.75}}>
          <NotifIcon icon="🗑" size={14}/> {t("salon_drawer.delete_account")}
        </button>
        <div style={{padding:"14px 20px",textAlign:"center",fontSize:11,color:"var(--text-muted)",fontFamily:"monospace"}}>{t("salon_drawer.version")} {APP_VERSION}</div>
        <div style={{padding:"4px 20px 8px",textAlign:"center",fontSize:10,color:"var(--text-muted)",fontFamily:"monospace",wordBreak:"break-all"}}>FCM: {fcmStatus}</div>
        {(fcmStatus.includes("permission-denied")||fcmStatus.includes("permission-blocked")||fcmStatus.includes("permission-error")||fcmStatus.includes("permission-default"))&&(
          <div style={{margin:"0 16px 12px"}}>
            <div style={{padding:"10px 14px",background:"rgba(231,76,60,.12)",border:"1px solid rgba(231,76,60,.3)",borderRadius:"10px 10px 0 0",fontSize:11,color:"#e74c3c",textAlign:"center",lineHeight:1.5}}>{t('ui.notif_blocked')}</div>
            <button onClick={handleEnableNotifications} style={{width:"100%",padding:"13px",background:"var(--grad)",color:"#000",border:"none",borderRadius:"0 0 10px 10px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{t('ui.enable_notifs')} <IconBell size={14}/></button>
            {fcmMsg&&<div style={{marginTop:8,padding:"8px 12px",background:"rgba(243,156,18,.12)",border:"1px solid rgba(243,156,18,.3)",borderRadius:8,fontSize:11,color:"#f39c12",textAlign:"center"}}>{fcmMsg}</div>}
          </div>
        )}
        <div style={{height:40}}/>
      </div>
      {showLogout&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowLogout(false)}>
          <div style={{width:"100%",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--border-ui)",borderBottom:"none",direction:dir}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:10,display:"flex",justifyContent:"center"}}><NotifIcon icon="🚪" size={36}/></div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("salon_drawer.logout_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("salon_drawer.logout_body")}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}} onClick={()=>setShowLogout(false)}>{t("salon_drawer.cancel")}</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{setOwnerSession&&setOwnerSession(null);setView("entry");onClose();}}>{t("salon_drawer.exit")}</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteSalon&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>!deletingSalon&&setShowDeleteSalon(false)}>
          <div style={{width:"100%",background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid rgba(231,76,60,.5)",borderBottom:"none",boxShadow:"0 -8px 32px rgba(231,76,60,.1)",direction:dir}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconWarning size={36}/></div>
              <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:6}}>{t("salon_drawer.delete_account_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>{t("salon_drawer.delete_account_body")}</div>
            </div>
            <div style={{background:"rgba(231,76,60,.08)",border:"1px solid rgba(231,76,60,.25)",borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:"#ddd",lineHeight:1.9}}>
              <div style={{marginBottom:6,fontWeight:700,color:"#e74c3c"}}>{t("salon_drawer.delete_account_will")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="✗" size={11}/> {t("salon_drawer.delete_account_item1")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="✗" size={11}/> {t("salon_drawer.delete_account_item2")}</div>
            </div>
            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:10,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700,display:"flex",justifyContent:"center"}}>
              <LabelWithIcon label={t("salon_drawer.delete_account_warn")} size={11}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button disabled={deletingSalon} style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={()=>setShowDeleteSalon(false)}><NotifIcon icon="↩️" size={13}/> {t("salon_drawer.delete_account_cancel")}</button>
              <button disabled={deletingSalon} style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:deletingSalon?"not-allowed":"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none",opacity:deletingSalon?.6:1}} onClick={async()=>{
                setDeletingSalon(true);
                try{
                  const res=await fetch("/api/delete-salon",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"}});
                  const d=await res.json().catch(()=>({}));
                  if(!res.ok)throw new Error(d.error||"فشل الحذف");
                  setOwnerSession&&setOwnerSession(null);
                  setView("entry");
                  onClose();
                }catch(e){
                  alert("خطأ: "+e.message);
                  setDeletingSalon(false);
                }
              }}>{deletingSalon?"جارٍ الحذف...":t("salon_drawer.delete_account_confirm")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

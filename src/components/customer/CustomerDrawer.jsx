// القائمة الجانبية للعميل — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { APP_VERSION, THEMES, TONES } from "../../constants.js";
import { hashPin, getCustomerClassification } from "../../utils.js";
import { sb, supabase, initializeWebPushNotifications } from "../../../App.jsx";
import {
  IconClose, IconChevronLeft, IconBell, IconWarning, IconTrash, NotifIcon, LabelWithIcon
} from "../shared/Icons.jsx";

export function CustomerDrawer({open,onClose,customer,setCustomers,setCustomerSession,setView,setCustDashKey,setCustDashNav,activeDrawerItem,setActiveDrawerItem,settings,setSettings,darkMode,setDarkMode,themeMode,setThemeMode,persistUiToSupabase,toast$,salons,favSet}){
  const{t}=useTranslation();
  const[exp,setExp]=useState(null);
  const[showLogout,setShowLogout]=useState(false);
  const[showDel,setShowDel]=useState(false);
  const[deletingAcc,setDeletingAcc]=useState(false);
  const deletingAccLockRef=useRef(false);
  useEffect(()=>{if(!open){setShowLogout(false);setShowDel(false);}},[open]);
  const[editName,setEditName]=useState("");
  const[editPhone,setEditPhone]=useState("");
  const[editEmail,setEditEmail]=useState("");
  const[locMode,setLocMode]=useState("gps");
  const[locUrl,setLocUrl]=useState("");
  const[editPinStep,setEditPinStep]=useState(null);
  const[editPinLength,setEditPinLength]=useState(4);
  const[editTempPin,setEditTempPin]=useState("");
  const[editPinConfirm,setEditPinConfirm]=useState("");
  const[editPinErr,setEditPinErr]=useState("");
  const saveEditPin=async()=>{
    if(editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm)return;
    try{
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:customer.id,pin:editTempPin})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok){setEditPinErr(d.error||t("cust_drawer.pin_mismatch"));if(d.code==="err_same_pin"){setEditPinStep("enter");setEditTempPin("");}return;}
      const k=String(customer.id);
      localStorage.setItem(`dork_customer_pin_${k}`,await hashPin(editTempPin));
      localStorage.setItem(`dork_customer_pin_length_${k}`,String(editPinLength));
      setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");
      toast$(t("cust_drawer.pin_success"));
    }catch(e){setEditPinErr(""+e.message);}
  };
  const toggle=(s)=>setExp(e=>e===s?null:s);
  const [fcmStatus,setFcmStatus]=useState(()=>localStorage.getItem("fcm_debug")||"pending");
  const [fcmMsg,setFcmMsg]=useState("");
  const handleEnableNotifications=async()=>{
    setFcmMsg("");
    const permission=await Notification.requestPermission();
    if(permission==="granted"){
      await initializeWebPushNotifications();
      setFcmStatus(localStorage.getItem("fcm_debug")||"pending");
    } else {
      localStorage.setItem("fcm_debug","permission-"+permission);
      setFcmStatus("permission-"+permission);
      setFcmMsg("يرجى الضغط على سماح لتصلك تنبيهات الحجوزات");
    }
  };
  if(!customer)return null;
  const cl=getCustomerClassification(customer);
  const history=customer.history||[];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[(customer.name?.charCodeAt(0)||0)%avatarColors.length];
  const saveLocation=()=>{
    if(!navigator.geolocation){toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));setCustomerSession({...customer,locationLat:lat,locationLng:lng});toast$(i18n.t('ui.location_saved'));}catch{toast$(i18n.t('ui.location_save_failed'),"err");}
    },()=>toast$(i18n.t('ui.location_detect_failed'),"err"),{enableHighAccuracy:true,timeout:15000});
  };
  const clearLocation=async()=>{
    try{await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));setCustomerSession({...customer,locationLat:null,locationLng:null});toast$(i18n.t('ui.location_deleted'));}catch{toast$(i18n.t('ui.location_delete_failed'),"err");}
  };
  const saveEdit=async()=>{
    if(!editName.trim())return;
    const patch={name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()};
    const locExtra={};
    if(locMode==="url"&&locUrl.trim()){const m=locUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);if(m){patch.location_lat=parseFloat(m[1]);patch.location_lng=parseFloat(m[2]);locExtra.locationLat=parseFloat(m[1]);locExtra.locationLng=parseFloat(m[2]);}}
    try{await sb("customers","PATCH",patch,`?id=eq.${customer.id}`);setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim(),...locExtra}:c));setExp(null);toast$(i18n.t('ui.data_saved'));}catch(e){toast$(""+e.message,"err");}
  };
  const applyTheme=(id)=>{
    const t=THEMES[id]||THEMES.gold;const r=document.documentElement.style;
    r.setProperty("--p",t.primary);r.setProperty("--pl",t.light);r.setProperty("--pd",t.dark);r.setProperty("--pll",t.lightest);r.setProperty("--pr",t.rgb);
    ["5","07","08","12","15","18","2","25","3","4"].forEach(a=>{const pct=a==="4"?.45:a==="3"?.3:a==="25"?.25:a==="2"?.2:a==="18"?.18:a==="15"?.15:a==="12"?.12:a==="08"?.08:a==="07"?.07:.05;r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);});
    r.setProperty("--grad",`linear-gradient(135deg,${t.primary},${t.light})`);r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
    r.setProperty("--gold",t.primary);r.setProperty("--gold-rgb",t.rgb);
    setSettings(s=>({...s,theme:id}));persistUiToSupabase&&persistUiToSupabase({theme:id});
  };
  const THEME_OPT=[{id:"gold",l:"ذهبي",c:"#d4a017",e:"✨"},{id:"emerald",l:"زمردي",c:"#10b981",e:"🌿"},{id:"sapphire",l:"ياقوتي",c:"#3b82f6",e:"💎"},{id:"royalBlue",l:"ملكي",c:"#1e3a8a",e:"👑"},{id:"bronze",l:"برونزي",c:"#8b5a2b",e:"🏺"},{id:"rose",l:"وردي",c:"#ec4899",e:"🌸"},{id:"violet",l:"بنفسجي",c:"#8b5cf6",e:"🔮"},{id:"crimson",l:"قرمزي",c:"#ef4444",e:"🔴"},{id:"teal",l:"فيروزي",c:"#0d9488",e:"🩵"},{id:"coral",l:"مرجاني",c:"#f97316",e:"🪸"},{id:"fuchsia",l:"فوشيا",c:"#d946ef",e:"🌺"},{id:"wine",l:"خمري",c:"#9f1239",e:"🍷"},{id:"forest",l:"غابة",c:"#15803d",e:"🌲"},{id:"lime",l:"ليموني",c:"#65a30d",e:"🍃"},{id:"sky",l:"سماوي",c:"#0284c7",e:"🌊"}];
  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const Row=({icon,label,sub,chev,onClick,danger,itemId})=>{
    const isActive=itemId&&activeDrawerItem===itemId;
    return(
      <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",background:isActive?"var(--pa12)":"transparent",border:"none",borderBottom:"1px solid var(--border-ui)",borderRight:isActive?"3px solid var(--p)":"3px solid transparent",cursor:"pointer",fontFamily:"inherit",color:danger?"#e74c3c":isActive?"var(--p)":"var(--text-primary)",WebkitAppearance:"none",appearance:"none",textAlign:"right"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          <span style={{fontSize:15,fontWeight:isActive?700:600,display:"flex",alignItems:"center",gap:6}}><NotifIcon icon={icon} size={15}/>{label}</span>
          {sub&&<span style={{fontSize:11,color:isActive?"var(--p)":"var(--text-muted)"}}>{sub}</span>}
        </div>
        {chev
          ?<span style={{display:"flex",transform:exp===chev?"rotate(90deg)":"rotate(-90deg)",transition:"transform 0.2s"}}><IconChevronLeft size={14} color={exp===chev?"var(--p)":"var(--text-muted)"}/></span>
          :<IconChevronLeft size={14} color="var(--text-muted)"/>
        }
      </button>
    );
  };
  const SecHead=({label})=>(<div style={{padding:"10px 20px 5px",fontSize:12,color:"var(--p)",fontWeight:700,letterSpacing:.8,background:"var(--shell-bg)",borderBottom:"1px solid var(--border-ui)",textTransform:"uppercase"}}>{label}</div>);
  const Panel=({children})=>(<div style={{background:"var(--surface-1)",padding:"14px 18px",borderBottom:"1px solid var(--border-ui)"}}>{children}</div>);
  const BtnRow=({children})=>(<div style={{display:"flex",gap:8,marginTop:8}}>{children}</div>);
  const Btn=({label,onClick,primary,danger,small})=>(<button onClick={onClick} style={{flex:1,padding:small?"8px 10px":"11px 10px",borderRadius:10,border:danger?"1.5px solid #e74c3c":primary?"none":"1.5px solid var(--border-ui)",background:primary?"var(--p)":danger?"rgba(231,76,60,.1)":"transparent",color:primary?"#000":danger?"#e74c3c":"#aaa",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12,WebkitAppearance:"none",appearance:"none"}}>{label}</button>);
  return(
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1100,backdropFilter:"blur(2px)"}}/>}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"82%",maxWidth:340,background:"var(--shell-bg)",zIndex:1101,transform:open?"translateX(0)":"translateX(110%)",transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",overflowY:"auto",display:"flex",flexDirection:"column",direction:"rtl",boxShadow:open?"-4px 0 32px rgba(0,0,0,.6)":"none"}}>
        {/* رأس الـ Drawer */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 16px",borderBottom:"1px solid var(--border-ui)",background:"var(--shell-bg)",position:"sticky",top:0,zIndex:1}}>
          <button onClick={onClose} aria-label="إغلاق القائمة" style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.06)",border:"none",color:"var(--text-muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IconClose size={16}/></button>
          <span style={{fontSize:15,fontWeight:700,color:"var(--p)"}}>{t("cust_drawer.title")}</span>
        </div>
        {/* بطاقة العميل */}
        <div style={{margin:"14px 14px 0",background:"linear-gradient(135deg,var(--surface-1),var(--surface-2))",borderRadius:16,padding:16,border:`1.5px solid ${themeMode==="lgray"?"var(--border-ui)":"#d4a017"}`,position:"relative",boxShadow:`0 4px 16px ${themeMode==="lgray"?"rgba(0,0,0,0.12)":"rgba(var(--gold-rgb),.1)"}`}}>
          <div style={themeMode==="lgray"?{position:"absolute",top:12,left:12,background:"#e5e5ea",border:"1px solid #aeaeb2",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:"#3a3a3c",boxShadow:"0 2px 8px rgba(0,0,0,.22)"}:{position:"absolute",top:12,left:12,background:`${cl.color}22`,border:`1px solid ${cl.color}`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:cl.color}}><LabelWithIcon label={cl.label} size={10}/></div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.name")} <span style={{color:"var(--p)"}}>{customer.name}</span></div>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.phone")} <span style={{color:"var(--p)"}}>{customer.phone}</span></div>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.bookings_count")} <span style={{color:"var(--p)"}}>{history.length} {t("cust_drawer.bookings_unit")}</span></div>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.joined")} <span style={{color:"var(--p)"}}>{new Date(customer.createdAt).toLocaleDateString("ar")}</span></div>
          </div>
        </div>
        <div style={{height:12}}/>
        {/* التنقل */}
        <SecHead label={t("cust_drawer.nav")}/>
        <Row icon="🔔" label={t("cust_drawer.notifications")} itemId="notif" onClick={()=>{setActiveDrawerItem("notif");setCustDashNav({tab:"notif",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="📅" label={t("cust_drawer.my_bookings")} itemId="hist" onClick={()=>{setActiveDrawerItem("hist");setCustDashNav({tab:"hist",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="❤️" label={t("cust_drawer.favorites")} itemId="favs" onClick={()=>{setActiveDrawerItem("favs");setCustDashNav({tab:"favs",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="📊" label={t("cust_drawer.attendance")} itemId="attend" onClick={()=>{setActiveDrawerItem("attend");setCustDashNav({tab:"attend",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="⏰" label={t("cust_drawer.reminders")} itemId="remind" onClick={()=>{setActiveDrawerItem("remind");setCustDashNav({tab:"remind",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        {/* حسابي */}
        <div style={{height:8}}/>
        <SecHead label={t("cust_drawer.my_account")}/>
        <Row icon="✏️" label={t("cust_drawer.edit_data")} itemId="custEditData" onClick={()=>{setActiveDrawerItem("custEditData");onClose();setView("custEditData");}}/>
        {/* إعدادات التطبيق */}
        <div style={{height:8}}/>
        <SecHead label={t("cust_drawer.settings")}/>
        <Row icon="🎨" label={t("cust_drawer.colors")} sub={THEME_OPT.find(th=>th.id===settings?.theme)?.l||t("cust_drawer.colors")} itemId="custSettingsTheme" onClick={()=>{setActiveDrawerItem("custSettingsTheme");onClose();setView("custSettingsTheme");}}/>
        <Row icon="🌙" label={t("cust_drawer.lighting")} sub={themeMode==="dark"?t("cust_drawer.dark_mode"):themeMode==="dim"?t("cust_drawer.dim_mode"):t("cust_drawer.light_mode")} itemId="custSettingsDark" onClick={()=>{setActiveDrawerItem("custSettingsDark");onClose();setView("custSettingsDark");}}/>
        <Row icon="🔤" label={t("cust_drawer.font_size")} sub={{sm:t("cust_drawer.font_sm"),md:t("cust_drawer.font_md"),lg:t("cust_drawer.font_lg")}[settings?.fontSize||"md"]} itemId="custSettingsFont" onClick={()=>{setActiveDrawerItem("custSettingsFont");onClose();setView("custSettingsFont");}}/>
        <Row icon="🖼" label={t("cust_drawer.background")} sub={t("settings.bgs."+(settings?.bg||"none"))} itemId="custSettingsBg" onClick={()=>{setActiveDrawerItem("custSettingsBg");onClose();setView("custSettingsBg");}}/>
        <Row icon="🔔" label={t("cust_drawer.tone")} sub={(()=>{const tn=TONES.find(tn=>tn.id===settings?.defaultTone);return tn?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><NotifIcon icon={tn.icon} size={11}/>{tn.label}</span>:"—";})()} itemId="custSettingsTone" onClick={()=>{setActiveDrawerItem("custSettingsTone");onClose();setView("custSettingsTone");}}/>
        <Row icon="🌐" label={t("cust_drawer.language")} itemId="custLang" onClick={()=>{setActiveDrawerItem("custLang");onClose();setView("custLang");}}/>
        {/* مزيد */}
        <div style={{height:8}}/>
        <SecHead label={t("cust_drawer.more")}/>
        <Row icon="📱" label={t("cust_drawer.social")} itemId="social" onClick={()=>{setActiveDrawerItem("social");onClose();setView("social");}}/>
        <Row icon="❓" label={t("cust_drawer.faq")} itemId="faq" onClick={()=>{setActiveDrawerItem("faq");onClose();setView("faq");}}/>
        <Row icon="🔒" label={t("settings.sec_privacy")} itemId="privacy" onClick={()=>{setActiveDrawerItem("privacy");onClose();setView("privacy");}}/>
        {/* الخروج والحذف */}
        <div style={{height:16}}/>
        <button onClick={()=>setShowLogout(true)} style={{width:"100%",padding:"15px 20px",background:"transparent",border:"none",borderTop:"1px solid var(--border-ui)",color:"#e74c3c",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"right",WebkitAppearance:"none",appearance:"none"}}>
          {t("cust_drawer.logout_btn")}
        </button>
        <button onClick={()=>setShowDel(true)} style={{width:"100%",padding:"14px 20px",background:"linear-gradient(135deg,rgba(231,76,60,.15),rgba(231,76,60,.08))",border:"none",borderTop:"1px solid var(--border-ui)",color:"#e74c3c",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"center",WebkitAppearance:"none",appearance:"none"}}>
          {t("cust_drawer.delete_btn")}
        </button>
        <div style={{padding:"14px 20px",textAlign:"center",fontSize:11,color:"var(--text-muted)",fontFamily:"monospace"}}>{t("cust_drawer.version")} {APP_VERSION}</div>
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
      {/* نوافذ تسجيل الخروج وحذف الحساب — خارج الـ drawer لتجنب تأثير transform */}
      {showLogout&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowLogout(false)}>
          <div style={{width:"100%",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--border-ui)",borderBottom:"none"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:10,display:"flex",justifyContent:"center"}}><NotifIcon icon="🚪" size={36}/></div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.logout_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("cust_drawer.logout_body")}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}} onClick={()=>setShowLogout(false)}>{t("cust_drawer.cancel")}</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{setCustomerSession(null);setView("entry");onClose();}}>{t("cust_drawer.exit")}</button>
            </div>
          </div>
        </div>
      )}
      {showDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowDel(false)}>
          <div style={{width:"100%",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--gold)",borderBottom:"none",boxShadow:"0 -8px 32px rgba(var(--gold-rgb),.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconWarning size={36}/></div>
              <div style={{fontSize:16,fontWeight:900,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.delete_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>{t("cust_drawer.delete_body")}</div>
            </div>
            <div style={{background:"rgba(var(--pr),.08)",border:"1px solid rgba(var(--pr),.2)",borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:"var(--text-primary)",lineHeight:1.8}}>
              <div style={{marginBottom:6,fontWeight:700,color:"var(--p)"}}>{t("cust_drawer.delete_will")}</div>
              <div>{t("cust_drawer.delete_item1")}</div>
              <div>{t("cust_drawer.delete_item2")}</div>
              <div>{t("cust_drawer.delete_item3")}</div>
            </div>
            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:10,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700,display:"flex",justifyContent:"center"}}>
              <LabelWithIcon label="⚡ تنبيه: لا يمكن استرجاع البيانات بعد الحذف" size={11}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button disabled={deletingAcc} style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={()=>setShowDel(false)}><NotifIcon icon="↩️" size={13}/> {t("cust_drawer.cancel")}</button>
              <button disabled={deletingAcc} style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:deletingAcc?"not-allowed":"pointer",opacity:deletingAcc?0.6:1,fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={async()=>{
                if(deletingAccLockRef.current)return;
                deletingAccLockRef.current=true;setDeletingAcc(true);
                try{
                  const res=await fetch("/api/delete-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:customer.id})});
                  const d=await res.json().catch(()=>({}));
                  if(!res.ok)throw new Error(d.error||"فشل الحذف");
                  await supabase.auth.signOut().catch(()=>{});
                  setCustomerSession(null);setView("entry");onClose();
                }catch(e){toast$(""+e.message,"err");}
                deletingAccLockRef.current=false;setDeletingAcc(false);setShowDel(false);
              }}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconTrash size={14} color="#fff"/>{deletingAcc?"...":t("cust_drawer.delete_confirm")}</span></button>
            </div>
          </div>
        </div>
      )}
      {/* حوار تغيير PIN */}
      {editPinStep&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
            {editPinStep==="select"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_select_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_select_hint")}</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <button onClick={()=>{setEditPinLength(4);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===4?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.pin_4")}</button>
                <button onClick={()=>{setEditPinLength(6);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===6?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.pin_6")}</button>
              </div>
              <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);}} style={{width:"100%",padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.cancel")}</button>
            </>:editPinStep==="enter"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_enter")} ({editPinLength} {t("cust_drawer.pin_digits_hint")})</div>
              <input type="password" maxLength={editPinLength} value={editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditTempPin(val);setEditPinErr("");if(val.length===editPinLength)setTimeout(()=>setEditPinStep("confirm"),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr",boxSizing:"border-box"}} placeholder="•••••" autoFocus/>
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
            </>:editPinStep==="confirm"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_confirm_title")}</div>
              <input type="password" maxLength={editPinLength} value={editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditPinConfirm(val);if(val.length===editPinLength&&editTempPin!==val){setEditPinErr(t("cust_drawer.pin_mismatch"));}else{setEditPinErr("");}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr",boxSizing:"border-box"}} placeholder="•••••" autoFocus/>
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={saveEditPin} disabled={editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"var(--p)":"var(--border-ui)",color:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"#000":"#555",cursor:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.pin_save")}</button>
                <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.cancel")}</button>
              </div>
            </>:null}
          </div>
        </div>
      )}
    </>
  );
}

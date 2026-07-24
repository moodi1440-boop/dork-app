// EntryView وTopBar — شاشتا الدخول وشريط التنقل العلوي — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../styles.js";
import { NotifIcon, IconUser } from "./Icons.jsx";

export function EntryView({setView}){
  const[showLang,setShowLang]=useState(false);
  const[logoLoaded,setLogoLoaded]=useState(false);
  const LOGO_PLACEHOLDER="data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAACQAwCdASoUAA0APzmGuVOvKSWisAgB4CcJYgCw7CFT4rqfPwwAAP7ZEa95QUaqWzCM0vMrT3vd7rt/PCpeS2iuqpAAAA==";
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const LANGS=[
    {code:'ar',flag:'🇸🇦',label:'العربية'},
    {code:'en',flag:'🇬🇧',label:'English'},
    {code:'ur',flag:'🇵🇰',label:'اردو'},
    {code:'tr',flag:'🇹🇷',label:'Türkçe'},
  ];
  return(
    <div style={{minHeight:"100vh",background:"var(--shell-bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 28px",gap:40,position:"relative",direction:dir}}>
      <div style={{position:"absolute",top:20,right:20,zIndex:10}}>
        {showLang&&<div onClick={()=>setShowLang(false)} style={{position:"fixed",inset:0,zIndex:9}}/>}
        <button onClick={()=>setShowLang(v=>!v)} style={{width:40,height:40,borderRadius:12,border:"1.5px solid var(--border-ui)",background:showLang?"var(--pa08)":"transparent",color:"var(--text-primary)",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",WebkitAppearance:"none",appearance:"none",position:"relative",zIndex:11}}><NotifIcon icon="🌐" size={20}/></button>
        {showLang&&(
          <div style={{position:"absolute",top:"110%",right:0,background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--border-ui)",overflow:"hidden",zIndex:12,minWidth:160,boxShadow:"0 4px 24px rgba(0,0,0,.4)"}}>
            {LANGS.map((l,i)=>{
              const active=i18n.language===l.code;
              return(
                <button key={l.code} onClick={()=>{i18n.changeLanguage(l.code);setShowLang(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:active?"var(--pa08)":"transparent",border:"none",borderBottom:i<LANGS.length-1?"1px solid var(--border-ui)":"none",cursor:"pointer",fontFamily:"inherit",color:active?"var(--p)":"var(--text-primary)",textAlign:"right",WebkitAppearance:"none",appearance:"none"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{l.flag}</span>
                  <span style={{fontSize:14,fontWeight:active?700:500,flex:1,textAlign:"right"}}>{l.label}</span>
                  {active&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--p)",flexShrink:0}}/>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{position:"relative",width:"82%",maxWidth:320}}>
        <img src={LOGO_PLACEHOLDER} alt="" aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",filter:"blur(12px)",transform:"scale(1.05)",opacity:logoLoaded?0:1,transition:"opacity 0.5s ease",pointerEvents:"none"}}/>
        <img src="/logo.webp" alt="DAWRAK" style={{width:"100%",objectFit:"contain",opacity:logoLoaded?1:0,transition:"opacity 0.5s ease"}} onLoad={()=>setLogoLoaded(true)}/>
      </div>
      <div style={{width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:16}}>
        <button onClick={()=>setView("ownerLogin")} style={{width:"100%",padding:"17px 0",borderRadius:14,border:"2px solid var(--p)",background:"transparent",color:"var(--p)",fontSize:18,fontWeight:700,fontFamily:"'Cairo',sans-serif",cursor:"pointer",letterSpacing:.5,WebkitAppearance:"none",appearance:"none"}}>{t("entry.salon_btn")}</button>
        <button onClick={()=>setView("custLogin")} style={{width:"100%",padding:"17px 0",borderRadius:14,border:"2px solid var(--p)",background:"rgba(var(--pr),.12)",color:"var(--p)",fontSize:18,fontWeight:700,fontFamily:"'Cairo',sans-serif",cursor:"pointer",letterSpacing:.5,WebkitAppearance:"none",appearance:"none"}}>{t("entry.client_btn")}</button>
      </div>
    </div>
  );
}

export function TopBar({ownerSession,customerSession,setView,setOwnerSession,setCustomerSession,darkMode,setDarkMode,resetHome,showDrawer,setShowDrawer,showSalonDrawer,setShowSalonDrawer,setOwnerTab}){
  const{t}=useTranslation();
  // للعميل: هيدر مبسط مع زر ≡
  if(customerSession&&!ownerSession){
    return(
      <div style={G.topBar}>
        {/* LEFT: زر القائمة + زر الصفحة الرئيسية */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowDrawer&&setShowDrawer(v=>!v)} style={{width:44,height:44,borderRadius:12,background:showDrawer?"var(--pa15)":"var(--surface-1)",border:`1.5px solid ${showDrawer?"var(--p)":"rgba(var(--pr),.3)"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:0,flexShrink:0,transition:"all 0.2s"}}>
            <span style={{display:"block",width:18,height:2,background:"var(--p)",borderRadius:2,transition:"all 0.2s"}}/>
            <span style={{display:"block",width:14,height:2,background:"var(--p)",borderRadius:2,transition:"all 0.2s"}}/>
            <span style={{display:"block",width:18,height:2,background:"var(--p)",borderRadius:2,transition:"all 0.2s"}}/>
          </button>
          <button onClick={()=>resetHome?resetHome():setView("home")} style={{width:44,height:44,borderRadius:12,background:"var(--surface-1)",border:"1.5px solid rgba(var(--pr),.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--p)",padding:0,flexShrink:0,transition:"all 0.2s"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg></button>        </div>
        {/* RIGHT: شعار */}
        <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",lineHeight:1}} onClick={()=>resetHome&&resetHome()}>
          <span style={{fontFamily:"'Cairo',sans-serif",fontSize:17,fontWeight:900,color:"var(--p)",letterSpacing:0.5}}>{t('ui.book')}</span>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:32,fontWeight:900,background:"linear-gradient(180deg,var(--pll) 0%,var(--p) 50%,var(--pd) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0px 2px 2px rgba(0,0,0,0.25))",letterSpacing:2,lineHeight:1}}>DAWRAK</span>
        </div>
      </div>
    );
  }
  // صاحب الصالون: زر الدرج فقط
  if(ownerSession) return(
    <div style={G.topBar}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>setShowSalonDrawer&&setShowSalonDrawer(v=>!v)} style={{width:44,height:44,borderRadius:12,background:showSalonDrawer?"var(--pa15)":"var(--surface-1)",border:`1.5px solid ${showSalonDrawer?"var(--p)":"rgba(var(--pr),.3)"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:0,flexShrink:0,transition:"all 0.2s"}}>
          <span style={{display:"block",width:18,height:2,background:"var(--p)",borderRadius:2,transition:"all 0.2s"}}/>
          <span style={{display:"block",width:14,height:2,background:"var(--p)",borderRadius:2,transition:"all 0.2s"}}/>
          <span style={{display:"block",width:18,height:2,background:"var(--p)",borderRadius:2,transition:"all 0.2s"}}/>
        </button>
        <button onClick={()=>{setView("ownerDash");setOwnerTab&&setOwnerTab(null);}} style={{width:44,height:44,borderRadius:12,background:"var(--surface-1)",border:"1.5px solid rgba(var(--pr),.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--p)",padding:0,flexShrink:0,transition:"all 0.2s"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></svg></button>      </div>
      <div style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>setView("ownerDash")}>
        <span style={{fontFamily:"'Cairo',sans-serif",fontSize:17,fontWeight:900,color:"var(--p)",letterSpacing:0.5}}>{t('ui.book')}</span>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:32,fontWeight:900,background:"linear-gradient(180deg,var(--pll) 0%,var(--p) 50%,var(--pd) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0px 2px 2px rgba(0,0,0,0.25))",letterSpacing:2,lineHeight:1}}>DAWRAK</span>
      </div>
    </div>
  );
  // بدون تسجيل: الأزرار الحالية
  return(
    <div style={G.topBar}>
      <div style={{display:"flex",gap:5,alignItems:"center"}}>
        <button style={{...G.roleBtn,...(customerSession?G.roleBtnActive:{})}} onClick={()=>setView(customerSession?"custDash":"custLogin")} aria-label={customerSession?"حسابي":"تسجيل الدخول"}><IconUser size={18}/></button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",lineHeight:1}} onClick={()=>resetHome&&resetHome()}>
        <span style={{fontFamily:"'Cairo',sans-serif",fontSize:17,fontWeight:900,color:"var(--p)",letterSpacing:0.5}}>{t('ui.book')}</span>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:32,fontWeight:900,background:"linear-gradient(180deg,var(--pll) 0%,var(--p) 50%,var(--pd) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0px 2px 2px rgba(0,0,0,0.25))",letterSpacing:2,lineHeight:1}}>DAWRAK</span>
      </div>
    </div>
  );
}

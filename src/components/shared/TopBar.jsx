// EntryView وTopBar — شاشتا الدخول وشريط التنقل العلوي — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../styles.js";
import { IconUser } from "./Icons.jsx";


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

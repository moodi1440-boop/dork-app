// شاشات اللغة والخصوصية والأسئلة الشائعة (صالون/عميل) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React from "react";
import { useTranslation } from "react-i18next";
import i18n, { CLIENT_LANGS } from "../../i18n.js";
import { G } from "../../styles.js";
import { ALL_LANG_INFO } from "../../constants.js";

import { IconArrowRight, NotifIcon } from "../shared/Icons.jsx";


export function CustLangView({setView,setShowDrawer}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const LANGS=ALL_LANG_INFO.filter(l=>CLIENT_LANGS.includes(l.code));
  return(
    <div style={{...G.page,direction:dir}}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,display:"flex",alignItems:"center",gap:8}}><NotifIcon icon="🌐" size={18}/> {t("cust_drawer.language")}</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:8}}>
          {LANGS.map(l=>{
            const active=i18n.language===l.code;
            return(
              <button key={l.code} onClick={()=>i18n.changeLanguage(l.code)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:14,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa15)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s"}}>
                <span style={{fontSize:28,flexShrink:0}}>{l.flag}</span>
                <div style={{flex:1,textAlign:dir==="rtl"?"right":"left"}}>
                  <div style={{fontSize:16,fontWeight:700,color:active?"var(--p)":"var(--text-primary)"}}>{l.label}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{l.sub}</div>
                </div>
                {active&&<div style={{width:10,height:10,borderRadius:"50%",background:"var(--p)",flexShrink:0}}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

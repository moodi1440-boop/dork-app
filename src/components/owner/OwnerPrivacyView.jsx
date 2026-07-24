// شاشات اللغة والخصوصية والأسئلة الشائعة (صالون/عميل) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React from "react";
import { useTranslation } from "react-i18next";

import { G } from "../../styles.js";


import { IconArrowRight } from "../shared/Icons.jsx";


export function OwnerPrivacyView({setView,setShowSalonDrawer}){
  const{t}=useTranslation();
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const sections=t("settings.privacy_sections",{returnObjects:true})||[];
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setShowSalonDrawer&&setShowSalonDrawer(true);setView("ownerDash");}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("settings.privacy_header")}</h2></div>
      <div style={box}>
        <div style={hdr}>{t("settings.privacy_header")}</div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:12}}>{t("settings.privacy_updated")}</div>
        {sections.map(({title,content},i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:5}}>{title}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.8}}>{content}</div>
          </div>
        ))}
      </div>
    </div></div>
  );
}

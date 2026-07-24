// صفحات: كل التقييمات، الإشعارات، المقارنة، الخريطة القريبة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";

import { IconArrowRight, IconPin, IconScissors } from "./Icons.jsx";


export function CompareSalonsView({salons,setView,setSelSalon}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  if(!salons||salons.length<2)return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("compare.title")}</h2></div>
      <div style={G.empty}>{t("compare.empty")}</div>
    </div></div>
  );

  const[a,b]=salons;
  const rows=[
    {l:t("compare.rating"),av:a.rating||"-",bv:b.rating||"-",better:(+a.rating||0)>(+b.rating||0)?"a":"b"},
    {l:t("compare.barbers_count"),av:a.barbers?.length||1,bv:b.barbers?.length||1,better:(a.barbers?.length||1)>(b.barbers?.length||1)?"a":"b"},
    {l:t("compare.services_count"),av:a.services.length,bv:b.services.length,better:a.services.length>b.services.length?"a":"b"},
    {l:t("compare.min_price"),av:Math.min(...Object.values(a.prices||{0:0}))+" "+t("compare.sar"),bv:Math.min(...Object.values(b.prices||{0:0}))+" "+t("compare.sar"),better:Math.min(...Object.values(a.prices||{999:0}))<Math.min(...Object.values(b.prices||{999:0}))?"a":"b"},
    {l:t("compare.max_price"),av:Math.max(...Object.values(a.prices||{0:0}))+" "+t("compare.sar"),bv:Math.max(...Object.values(b.prices||{0:0}))+" "+t("compare.sar"),better:Math.max(...Object.values(a.prices||{0:0}))<Math.max(...Object.values(b.prices||{0:0}))?"a":"b"},
    {l:t("compare.bookings"),av:a.bookings.length,bv:b.bookings.length,better:a.bookings.length>b.bookings.length?"a":"b"},
  ];

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("compare.title")}</h2></div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        <div/>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid var(--pa25)",cursor:"pointer"}} onClick={()=>{setSelSalon(s);setView("salon");}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><IconScissors size={24} color="var(--p)"/></div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",lineHeight:1.3}}>{s.name}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",gap:3}}><IconPin size={9}/>{s.gov||s.region}</div>
          </div>
        ))}
      </div>

      {rows.map(({l,av,bv,better})=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center"}}>{l}</div>
          {[{v:av,side:"a"},{v:bv,side:"b"}].map(({v,side})=>(
            <div key={side} style={{background:better===side?"var(--pa12)":"var(--surface-1)",border:`1px solid ${better===side?"var(--p)":"var(--border-ui)"}`,borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:better===side?900:400,color:better===side?"var(--p)":"var(--text-muted)"}}>{v}</div>
              {better===side&&<div style={{fontSize:9,color:"var(--p)"}}>{t("compare.better")}</div>}
            </div>
          ))}
        </div>
      ))}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:12,border:"1px solid var(--border-ui)"}}>
            <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>{t("compare.services_of")} {s.name.split(" ")[0]}</div>
            {s.services.map(sv=>(
              <div key={sv} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                <span style={{color:"var(--text-primary)"}}>{sv}</span>
                <span style={{color:"var(--p)"}}>{s.prices?.[sv]||0} {t("compare.sar")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <button key={s.id} style={G.sub} onClick={()=>{setSelSalon(s);setView("book");}}>
            {t("compare.book_btn")} {s.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div></div>
  );
}

// حضور العميل وإعدادات التطبيق العامة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";


import { IconScissors, LabelWithIcon } from "../shared/Icons.jsx";
import { sb } from "../../api.js";


export function AttendanceView({customer,salons}){
  const{t}=useTranslation();
  const[filter,setFilter]=useState("all");
  const[records,setRecords]=useState([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!customer?.phone){setLoading(false);return;}
    sb("bookings","GET",null,
      `?customer_phone=eq.${encodeURIComponent(customer.phone)}&select=id,salon_id,attendance,status&order=created_at.desc&limit=200`
    ).then(data=>{
      if(Array.isArray(data)) setRecords(data.filter(b=>
        b.attendance==="attended"||b.attendance==="no_show"||(b.status==="approved"&&!b.attendance)
      ));
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[customer?.phone]);
  const displayed=
    filter==="attended"?records.filter(r=>r.attendance==="attended"):
    filter==="no_show"?records.filter(r=>r.attendance==="no_show"):
    filter==="pending"?records.filter(r=>r.status==="approved"&&!r.attendance):
    records;
  const getStatus=r=>r.attendance==="attended"?{label:"ملتزم",color:"#27ae60"}:
    r.attendance==="no_show"?{label:"غير ملتزم",color:"#e74c3c"}:{label:"قيد الانتظار",color:"var(--text-muted)"};
  const getSalonName=r=>(salons?.find(x=>String(x.id)===String(r.salon_id))?.name)||"صالون";
  const counts={
    all:records.length,
    attended:records.filter(r=>r.attendance==="attended").length,
    no_show:records.filter(r=>r.attendance==="no_show").length,
    pending:records.filter(r=>r.status==="approved"&&!r.attendance).length,
  };
  const evalTotal=counts.attended+counts.no_show;
  const attendRate=evalTotal>0?Math.round((counts.attended/evalTotal)*100):null;
  const classification=attendRate===null?null:
    counts.no_show>=3||attendRate<50?{label:"⚠️ غير ملتزم",color:"#e74c3c",bg:"rgba(231,76,60,.08)"}:
    counts.attended>=5&&counts.no_show===0?{label:"🌟 مميز",color:"var(--gold)",bg:"rgba(var(--gold-rgb),.08)"}:
    attendRate>=70?{label:"✅ منتظم",color:"#27ae60",bg:"rgba(39,174,96,.08)"}:
    {label:"🆕 جديد",color:"#3498db",bg:"rgba(52,152,219,.08)"};
  const filtersArr=[
    {key:"attended",label:"ملتزم",color:"#27ae60"},
    {key:"no_show",label:"غير ملتزم",color:"#e74c3c"},
    {key:"pending",label:"قيد الانتظار",color:"var(--text-muted)"},
    {key:"all",label:"سجلي الكامل",color:"var(--gold)"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {filtersArr.map(f=>(
          <button key={f.key}
            onClick={()=>setFilter(f.key)}
            style={{padding:"18px 4px 14px",borderRadius:14,border:`2px solid ${f.color}`,
              background:filter===f.key?`${f.color}22`:"var(--surface-2)",
              color:f.color,cursor:"pointer",fontFamily:"inherit",
              display:"flex",flexDirection:"column",alignItems:"center",gap:6,
              outline:"none",WebkitTapHighlightColor:"transparent"}}>
            <span style={{fontSize:24,fontWeight:800,lineHeight:1}}>{counts[f.key]}</span>
            <span style={{fontSize:10,fontWeight:700,textAlign:"center",lineHeight:1.3}}>{f.label}</span>
          </button>
        ))}
      </div>
      {!loading&&classification&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{background:classification.bg,borderRadius:12,padding:"12px 16px",
            border:`1.5px solid ${classification.color}`,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{t('ui.total_score')}</span>
            <span style={{fontSize:14,fontWeight:800,color:classification.color}}><LabelWithIcon label={classification.label} size={13}/></span>
          </div>
          <div style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 16px",border:"1px solid var(--border-ui)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.attendance_rate')}</span>
              <span style={{fontSize:13,fontWeight:700,color:"var(--gold)"}}>{attendRate}%</span>
            </div>
            <div style={{height:8,background:"var(--surface-2)",borderRadius:999,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${attendRate}%`,
                background:"linear-gradient(90deg,var(--gold),var(--pl))",borderRadius:999}}/>
            </div>
            <div style={{fontSize:11,color:"#666",marginTop:6,textAlign:"right"}}>
              {counts.attended} حضر من أصل {evalTotal} تم تقييمه
            </div>
          </div>
        </div>
      )}
      {loading
        ?<div style={{textAlign:"center",color:"var(--text-muted)",padding:24}}>{t('ui.loading')}</div>
        :displayed.length===0
          ?<div style={{textAlign:"center",color:"var(--text-muted)",padding:24}}>{t('ui.no_records')}</div>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {displayed.map((r,i)=>{
              const st=getStatus(r);
              return(
                <div key={r.id||i} style={{background:"var(--surface-1)",borderRadius:10,padding:"12px 14px",
                  borderRight:`3px solid ${st.color}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:5}}><IconScissors size={13} color="var(--p)"/>{getSalonName(r)}</div>
                  <div style={{fontSize:12,fontWeight:700,color:st.color,background:`${st.color}22`,
                    padding:"4px 10px",borderRadius:20}}>{st.label}</div>
                </div>
              );
            })}
          </div>}
    </div>
  );
}

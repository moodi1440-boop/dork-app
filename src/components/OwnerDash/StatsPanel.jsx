import React, { useState } from "react";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const fi=(err)=>({width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${err?"#e74c3c":"#2a2a3a"}`,background:"#13131f",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"});

export function StatsPanel({salon}){
  const[mode,setMode]=useState("month");
  const[m,setM]=useState(new Date().getMonth());
  const[y,setY]=useState(new Date().getFullYear());

  const bks=salon.bookings.filter(b=>{
    if(!b.date)return false;
    const d=new Date(b.date);
    if(mode==="year")return d.getFullYear()===y;
    return d.getMonth()===m&&d.getFullYear()===y;
  });

  const chartData=mode==="year"
    ?MONTHS_AR.map((mn,i)=>{
        const cnt=salon.bookings.filter(b=>{const d=new Date(b.date);return d.getMonth()===i&&d.getFullYear()===y;}).length;
        return{label:mn.slice(0,3),count:cnt};
      })
    :Array.from({length:new Date(y,m+1,0).getDate()},(_, i)=>{
        const day=String(i+1).padStart(2,"0");
        const dateStr=`${y}-${String(m+1).padStart(2,"0")}-${day}`;
        const cnt=salon.bookings.filter(b=>b.date===dateStr).length;
        return{label:String(i+1),count:cnt};
      }).filter((_, i)=>i%3===0);
  const maxCount=Math.max(...chartData.map(d=>d.count),1);

  return(
    <div style={{paddingTop:4}}>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button style={{flex:1,padding:"8px 0",borderRadius:9,border:`1.5px solid ${mode==="month"?"var(--p)":"#2a2a3a"}`,background:mode==="month"?"var(--pa12)":"#1a1a2e",color:mode==="month"?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>setMode("month")}>📅 شهري</button>
        <button style={{flex:1,padding:"8px 0",borderRadius:9,border:`1.5px solid ${mode==="year"?"var(--p)":"#2a2a3a"}`,background:mode==="year"?"var(--pa12)":"#1a1a2e",color:mode==="year"?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>setMode("year")}>📆 سنوي</button>
      </div>

      <div style={{display:"flex",gap:7,marginBottom:12}}>
        {mode==="month"&&<select style={{...fi(),...{flex:1}}} value={m} onChange={e=>setM(+e.target.value)}>{MONTHS_AR.map((mn,i)=><option key={i} value={i}>{mn}</option>)}</select>}
        <select style={{...fi(),...{width:mode==="year"?"100%":88}}} value={y} onChange={e=>setY(+e.target.value)}>{[2024,2025,2026,2027].map(yr=><option key={yr}>{yr}</option>)}</select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["الحجوزات",bks.length,"var(--p)"],["مقبول",bks.filter(b=>b.status==="approved").length,"#27ae60"],["انتظار",bks.filter(b=>b.status==="pending").length,"var(--pl)"],["مرفوض",bks.filter(b=>b.status==="rejected").length,"#e74c3c"]].map(([l,n,c])=>(
          <div key={l} style={{background:"#13131f",borderRadius:11,padding:"12px 8px",textAlign:"center",border:`1px solid ${c}33`}}><div style={{fontSize:22,fontWeight:900,color:c}}>{n}</div><div style={{fontSize:11,color:"#888"}}>{l}</div></div>
        ))}
      </div>

      <div style={{background:"var(--pa08)",borderRadius:11,padding:"12px 14px",border:"1px solid var(--pa25)",textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:"#888",marginBottom:3}}>الإيرادات - {mode==="year"?y:`${MONTHS_AR[m]} ${y}`}</div>
        <div style={{fontSize:26,fontWeight:900,color:"var(--p)"}}>{bks.filter(b=>b.status==="approved").reduce((a,b)=>a+(b.total||0),0)} <span style={{fontSize:13}}>ريال</span></div>
      </div>

      {(()=>{
        const svcCount={};
        bks.forEach(b=>(b.services||[]).forEach(s=>{svcCount[s]=(svcCount[s]||0)+1;}));
        const top=Object.entries(svcCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
        return top.length>0?(
          <div style={{background:"#13131f",borderRadius:11,padding:"12px 14px",border:"1px solid #2a2a3a",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--p)",marginBottom:8}}>🏆 أكثر الخدمات طلباً</div>
            {top.map(([svc,cnt],i)=>(
              <div key={svc} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:12,color:"#fff"}}>{["🥇","🥈","🥉"][i]} {svc}</span>
                <span style={{fontSize:12,color:"var(--p)",fontWeight:700}}>{cnt} مرة</span>
              </div>
            ))}
          </div>
        ):null;
      })()}

      <div style={{background:"#13131f",borderRadius:11,padding:"12px 8px",border:"1px solid #2a2a3a",marginBottom:4}}>
        <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:10}}>📊 {mode==="year"?"الحجوزات الشهرية":"الحجوزات اليومية"}</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:mode==="year"?4:2,height:60}}>
          {chartData.map((d,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{width:"100%",background:`linear-gradient(180deg,var(--p),var(--pd))`,borderRadius:"3px 3px 0 0",height:`${Math.max((d.count/maxCount)*48,d.count?3:0)}px`,minHeight:d.count?3:0}}/>
              <div style={{fontSize:8,color:"#555",textAlign:"center"}}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

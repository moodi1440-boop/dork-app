import React, { useState } from "react";
import { G } from "../styles";

function BookingCalendar({salon,onUpdate}){
  const[selDate,setSelDate]=useState(todayStr());
  const today=new Date();
  const[viewMonth,setViewMonth]=useState(today.getMonth());
  const[viewYear,setViewYear]=useState(today.getFullYear());

  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const bookingsForDate=(d)=>{
    const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return salon.bookings.filter(b=>b.date===dateStr);
  };
  const selBks=salon.bookings.filter(b=>b.date===selDate);

  return(
    <div style={{paddingTop:4}}>
      {/* header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <button style={{...G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}}>{"<"}</button>
        <span style={{fontSize:14,fontWeight:700,color:"var(--p)"}}>{MONTHS_AR[viewMonth]} {viewYear}</span>
        <button style={{...G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}}>{">"}</button>
      </div>
      {/* days header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["أح","إث","ثل","أر","خم","جم","سب"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"#555",padding:"4px 0"}}>{d}</div>)}
      </div>
      {/* calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12}}>
        {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{
          const d=i+1;
          const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const bks=bookingsForDate(d);
          const isToday=dateStr===todayStr();
          const isSel=dateStr===selDate;
          const hasBks=bks.length>0;
          return(
            <button key={d} onClick={()=>setSelDate(dateStr)}
              style={{position:"relative",padding:"6px 0",borderRadius:8,border:`1.5px solid ${isSel?"var(--p)":isToday?"var(--pd)":"#2a2a3a"}`,background:isSel?"var(--pa12)":isToday?"var(--pa05)":"transparent",color:isSel?"var(--p)":isToday?"var(--pl)":"#aaa",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:isSel||isToday?700:400,textAlign:"center"}}>
              {d}
              {hasBks&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"var(--p)"}}/>}
            </button>
          );
        })}
      </div>
      {/* bookings for selected date */}
      <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8}}>📅 {selDate} - {selBks.length} حجز</div>
      {selBks.length===0
        ?<div style={G.empty}>لا توجد حجوزات في هذا اليوم</div>
        :selBks.map(b=>(
          <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--p)"}`,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>🕐 {b.time} - {b.name}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{Array.isArray(b.services)?b.services.join(" + "):""} - {b.total||0} ر</div>
              </div>
              <span style={{fontSize:10,color:b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--p)"}}>{b.status==="approved"?"✅":b.status==="rejected"?"❌":"⏳"}</span>
            </div>
            {b.status==="pending"&&<div style={{display:"flex",gap:6,marginTop:6}}>
              <button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>✅ قبول</button>
              <button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>❌ رفض</button>
            </div>}
          </div>
        ))
      }
    </div>
  );
}


export { BookingCalendar };

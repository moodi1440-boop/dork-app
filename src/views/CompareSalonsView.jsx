import React from "react";
import { G } from "../styles.js";

function CompareSalonsView({salons,setView,setSelSalon}){
  if(!salons||salons.length<2)return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>⚖ مقارنة الصالونات</h2></div>
      <div style={G.empty}>اختر صالونين من الصفحة الرئيسية للمقارنة</div>
    </div></div>
  );

  const [a,b]=salons;
  const rows=[
    {l:"التقييم",av:a.rating||"-",bv:b.rating||"-",better:(+a.rating||0)>(+b.rating||0)?"a":"b"},
    {l:"عدد الحلاقين",av:a.barbers?.length||1,bv:b.barbers?.length||1,better:(a.barbers?.length||1)>(b.barbers?.length||1)?"a":"b"},
    {l:"عدد الخدمات",av:a.services.length,bv:b.services.length,better:a.services.length>b.services.length?"a":"b"},
    {l:"أقل سعر",av:Math.min(...Object.values(a.prices||{0:0}))+" ر",bv:Math.min(...Object.values(b.prices||{0:0}))+" ر",better:Math.min(...Object.values(a.prices||{999:0}))<Math.min(...Object.values(b.prices||{999:0}))?"a":"b"},
    {l:"أعلى سعر",av:Math.max(...Object.values(a.prices||{0:0}))+" ر",bv:Math.max(...Object.values(b.prices||{0:0}))+" ر",better:Math.max(...Object.values(a.prices||{0:0}))<Math.max(...Object.values(b.prices||{0:0}))?"a":"b"},
    {l:"الحجوزات",av:a.bookings.length,bv:b.bookings.length,better:a.bookings.length>b.bookings.length?"a":"b"},
  ];

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>⚖ مقارنة الصالونات</h2></div>

      {/* عناوين */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        <div/>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"#13131f",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid var(--pa25)",cursor:"pointer"}} onClick={()=>{setSelSalon(s);setView("salon");}}>
            <div style={{fontSize:24,marginBottom:4}}>✂</div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",lineHeight:1.3}}>{s.name}</div>
            <div style={{fontSize:10,color:"#888",marginTop:3}}>📍 {s.gov||s.region}</div>
          </div>
        ))}
      </div>

      {/* مقارنة */}
      {rows.map(({l,av,bv,better})=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
          <div style={{fontSize:11,color:"#888",textAlign:"center"}}>{l}</div>
          {[{v:av,side:"a"},{v:bv,side:"b"}].map(({v,side})=>(
            <div key={side} style={{background:better===side?"var(--pa12)":"#13131f",border:`1px solid ${better===side?"var(--p)":"#2a2a3a"}`,borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:better===side?900:400,color:better===side?"var(--p)":"#aaa"}}>{v}</div>
              {better===side&&<div style={{fontSize:9,color:"var(--p)"}}>✓ أفضل</div>}
            </div>
          ))}
        </div>
      ))}

      {/* الخدمات */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"#13131f",borderRadius:12,padding:12,border:"1px solid #2a2a3a"}}>
            <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>خدمات {s.name.split(" ")[0]}</div>
            {s.services.map(sv=>(
              <div key={sv} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                <span style={{color:"#fff"}}>{sv}</span>
                <span style={{color:"var(--p)"}}>{s.prices?.[sv]||0} ر</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* أزرار الحجز */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <button key={s.id} style={G.sub} onClick={()=>{setSelSalon(s);setView("book");}}>
            احجز في {s.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div></div>
  );
}


export { CompareSalonsView };

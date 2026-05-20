import React, { useState } from "react";
import { G } from "../styles";

function NearMapView({salons,setView,setSelSalon}){
  const[userLoc,setUserLoc]=useState(null);
  const[loading,setLoading]=useState(false);
  const[sorted,setSorted]=useState([]);

  const haversine=(lat1,lon1,lat2,lon2)=>{
    const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const getCoords=(s)=>{
    if(!s.locationUrl)return null;
    const m=s.locationUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    return m?{lat:+m[1],lng:+m[2]}:null;
  };

  const detect=()=>{
    if(!navigator.geolocation){alert("⚠ المتصفح لا يدعم تحديد الموقع");return;}
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      p=>{
        const loc={lat:p.coords.latitude,lng:p.coords.longitude};
        setUserLoc(loc);
        const s=[...salons].map(s=>({...s,dist:getCoords(s)?haversine(loc.lat,loc.lng,getCoords(s).lat,getCoords(s).lng):999}))
          .sort((a,b)=>a.dist-b.dist);
        setSorted(s);
        setLoading(false);
      },
      ()=>{setLoading(false);alert("تعذّر تحديد موقعك");},
      {enableHighAccuracy:true,timeout:15000}
    );
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>📍 الصالونات القريبة</h2></div>
      {!userLoc?(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:50,marginBottom:12}}>📍</div>
          <div style={{fontSize:14,color:"#fff",fontWeight:700,marginBottom:8}}>اعرف أقرب صالون إليك</div>
          <div style={{fontSize:12,color:"#888",marginBottom:20}}>سنحتاج إذن موقعك لإظهار الصالونات القريبة</div>
          <button style={G.sub} onClick={detect} disabled={loading}>
            {loading?"⏳ جاري التحديد...":"📍 تحديد موقعي"}
          </button>
        </div>
      ):(
        <div>
          <div style={{background:"var(--pa08)",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
            📍 تم تحديد موقعك - {sorted.filter(s=>s.dist<50).length} صالون في نطاق 50 كم
          </div>
          {sorted.length===0
            ?<div style={G.empty}>لا توجد صالونات مع روابط خريطة</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sorted.slice(0,15).map(s=>(
                <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#555"}`}}
                  onClick={()=>{setSelSalon(s);setView("salon");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                      <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?" - "+s.village:""}</div>
                    </div>
                    <div style={{textAlign:"left",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:900,color:s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#888"}}>
                        {s.dist<999?`${s.dist.toFixed(1)} كم`:"-"}
                      </div>
                      <div style={{fontSize:10,color:"#555",marginTop:2}}>⭐ {s.rating}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}
    </div></div>
  );
}


export { NearMapView };

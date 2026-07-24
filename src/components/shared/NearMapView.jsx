// صفحات: كل التقييمات، الإشعارات، المقارنة، الخريطة القريبة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";

import { IconArrowRight, IconPin, IconScissors, IconStar } from "./Icons.jsx";


export function NearMapView({salons,setView,setSelSalon}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
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
    if(!navigator.geolocation){alert(t("near_map.no_geolocation"));return;}
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
      ()=>{setLoading(false);alert(t("near_map.error_location"));},
      {enableHighAccuracy:true,timeout:15000}
    );
  };

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("near_map.title")}</h2></div>
      {!userLoc?(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconPin size={50}/></div>
          <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700,marginBottom:8}}>{t("near_map.intro_title")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>{t("near_map.intro_body")}</div>
          <button style={G.sub} onClick={detect} disabled={loading}>
            {loading?t("near_map.detecting"):t("near_map.detect_btn")}
          </button>
        </div>
      ):(
        <div>
          <div style={{background:"var(--pa08)",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
            {t("near_map.located")} - {sorted.filter(s=>s.dist<50).length} {t("near_map.range_suffix")}
          </div>
          {sorted.length===0
            ?<div style={G.empty}>{t("near_map.no_salons")}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sorted.slice(0,15).map(s=>(
                <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#555"}`}}
                  onClick={()=>{setSelSalon(s);setView("salon");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:5}}><IconScissors size={13} color="var(--p)"/>{s.name}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:3}}><IconPin size={10}/>{s.gov||s.region}{s.village?" - "+s.village:""}</div>
                    </div>
                    <div style={{textAlign:"left",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:900,color:s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#888"}}>
                        {s.dist<999?`${s.dist.toFixed(1)} ${t("near_map.km")}`:"-"}
                      </div>
                      <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2,display:"flex",alignItems:"center",gap:3}}><IconStar size={9}/>{s.rating}</div>
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

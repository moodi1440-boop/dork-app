import React from "react";
import { G } from "../styles";

function SalonCard({salon,fav,onFav,onBook,onViewReviews,realRating,reviewCount,userLoc,getSalonCoords,haversine,isOpenNow,inCompare,onCompare}){
  const displayRating=realRating||salon.rating||"5.0";

  let distance=null;
  if(userLoc&&getSalonCoords&&haversine){
    const coords=getSalonCoords(salon);
    if(coords)distance=haversine(userLoc.lat,userLoc.lng,coords.lat,coords.lng).toFixed(1);
  }

  if(salon.frozen)return(
    <div style={{...G.card,opacity:.5,position:"relative"}}>
      <div style={{position:"absolute",top:8,left:8,background:"#e74c3c",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>🔒 مغلق مؤقتاً</div>
      <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>✂ {salon.name}</div>
      <div style={{fontSize:11,color:"#888"}}>هذا الصالون مغلق مؤقتاً</div>
    </div>
  );

  return(
    <div style={{...G.card,border:inCompare?"2px solid var(--p)":"1px solid #3a3a4a",padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
      {/* Header Row - Icon + Name + Status + Rating */}
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flex:1}}>
          {/* Scissors Icon - Yellow Background */}
          <div style={{background:"#d4a017",width:40,height:40,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flex:"0 0 auto"}}>✂</div>

          {/* Name */}
          <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{salon.name}</div>

          {/* Status */}
          <span style={{fontSize:9,color:isOpenNow?"#27ae60":"#e74c3c",fontWeight:700}}>
            {isOpenNow?"🟢 مفتوح":"🔴 مغلق"}
          </span>
        </div>

        {/* Rating on Right */}
        <div style={{border:"1.5px solid rgba(212,160,23,.4)",borderRadius:10,padding:"6px 10px",minWidth:"65px",textAlign:"center",flex:"0 0 auto",cursor:"pointer"}} onClick={onViewReviews} title="عرض التقييمات والتعليقات">
          <div style={{fontSize:16,fontWeight:900,color:"#d4a017"}}>⭐ {displayRating}</div>
          <div style={{fontSize:8,color:"#aaa"}}>({reviewCount})</div>
        </div>
      </div>

      {/* Location Row */}
      <div style={{fontSize:10,color:"#888"}}>
        📍 {salon.gov||salon.region}{salon.village?` - ${salon.village}`:""}</div>

      {/* Hours & Wait Time */}
      <div style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,color:"#aaa"}}>
        <div>
          ⏰ {salon.shiftEnabled?(salon.shift1Start&&salon.shift1End?`${salon.shift1Start.slice(0,5)}-${salon.shift1End.slice(0,5)}`:"--:-- - --:--"):(salon.workStart&&salon.workEnd?`${salon.workStart.slice(0,5)}-${salon.workEnd.slice(0,5)}`:"--:-- - --:--")}
        </div>
        <div>
          👥 {salon.barbers?.length||1} حلاق - 20 دقيقة
        </div>
      </div>

      {/* Services Tags - Below Barbers */}
      {salon.services.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {salon.services.slice(0,4).map(s=>(
            <span key={s} style={{fontSize:9,background:"rgba(212,160,23,.12)",color:"#d4a017",padding:"4px 10px",borderRadius:8,fontWeight:600}}>
              {s}
            </span>
          ))}
          {salon.services.length>4&&<span style={{fontSize:9,background:"rgba(212,160,23,.12)",color:"#d4a017",padding:"4px 10px",borderRadius:8,fontWeight:600}}>+{salon.services.length-4}</span>}
        </div>
      )}

      {/* Divider */}
      <div style={{height:1,background:"rgba(212,160,23,.1)"}}/>

      {/* Book Button + Action Buttons - Reordered */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title="الموقع" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:"#e74c3c",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          📍
        </button>
        <button onClick={()=>onFav?.()} title="المفضلة" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:fav?"#d4a017":"#aaa",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          {fav?"♥":"♡"}
        </button>
        <button onClick={onCompare} title="مقارنة" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:inCompare?"#d4a017":"#aaa",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          ⚖
        </button>
        <button onClick={onBook} style={{background:"#d4a017",color:"#000",border:"none",borderRadius:10,padding:"12px 16px",fontSize:12,fontWeight:700,cursor:"pointer",flex:1,fontFamily:"'Cairo',sans-serif"}}>
          احجز الان
        </button>
      </div>
    </div>
  );
}


export { SalonCard };

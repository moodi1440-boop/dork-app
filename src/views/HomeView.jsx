import React, { useState } from "react";
import { G } from "../styles";
import { LocFilter } from "../components/LocFilter";
import { SalonCard } from "../components/SalonCard";

function HomeView({displaySalons,approvedSalons,allLoc,fRegion,setFRegion,fGov,setFGov,fCenter,setFCenter,fVillage,setFVillage,govList,villageList,centerList2,showFavs,setShowFavs,favSet,toggleFav,setView,setSelSalon,customer,search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,toast$,customers,salons,reviews,compareSalons,setCompareSalons,handlePullRefresh,pullRefreshing}){
  const[urgentMode,setUrgentMode]=useState(false);

  const getRealRating=(salonId)=>{
    const id=Number(salonId);
    const sRatings=(reviews||[]).filter(r=>Number(r.salon_id)===id).map(r=>r.rating);
    if(!sRatings.length)return null;
    return Math.round(sRatings.reduce((a,r)=>a+r,0)/sRatings.length*10)/10;
  };
  const getReviewCount=(salonId)=>{
    return (reviews||[]).filter(r=>Number(r.salon_id)===Number(salonId)).length;
  };

  const detectUserLoc=()=>{
    if(!navigator.geolocation){alert("⚠ المتصفح لا يدعم تحديد الموقع");return;}
    navigator.geolocation.getCurrentPosition(
      p=>{setUserLoc({lat:p.coords.latitude,lng:p.coords.longitude});setSortBy("nearest");toast$&&toast$("✅ تم تحديد موقعك");},
      err=>{let m="تعذّر تحديد موقعك";if(err.code===1)m="🚫 رفضت إذن الموقع";alert(m);},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  };

  // حجز سريع
  const lastSalon=customer?.history?.length
    ?salons?.find(s=>s.id===Number(customer.history[customer.history.length-1]?.salonId))
    :null;

  // Haversine
  const haversine=(lat1,lon1,lat2,lon2)=>{
    const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const getSalonCoords=(s)=>{
    if(!s.locationUrl)return null;
    const m=s.locationUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    return m?{lat:+m[1],lng:+m[2]}:null;
  };

  // وضع الاستعجال - الصالونات المفتوحة الآن
  const now=new Date();
  const curMins=now.getHours()*60+now.getMinutes();
  const isOpenNow=(s)=>{
    const toMins=(t)=>{const[h,m]=(t||"0:0").split(":").map(Number);return h*60+m;};
    if(s.shiftEnabled){
      return(curMins>=toMins(s.shift1Start)&&curMins<=toMins(s.shift1End))||(curMins>=toMins(s.shift2Start)&&curMins<=toMins(s.shift2End));
    }
    return curMins>=toMins(s.workStart)&&curMins<=toMins(s.workEnd);
  };

  // ترتيب الأقرب
  const sortedSalons=(()=>{
    let list=urgentMode?displaySalons.filter(isOpenNow):displaySalons;
    if(sortBy==="nearest"&&userLoc){
      return[...list].sort((a,b)=>{
        const ca=getSalonCoords(a),cb=getSalonCoords(b);
        if(!ca&&!cb)return 0;if(!ca)return 1;if(!cb)return -1;
        return haversine(userLoc.lat,userLoc.lng,ca.lat,ca.lng)-haversine(userLoc.lat,userLoc.lng,cb.lat,cb.lng);
      });
    }
    return list;
  })();

  // إضافة لمقارنة
  const toggleCompare=(s)=>{
    if(compareSalons.find(x=>x.id===s.id)){
      setCompareSalons(p=>p.filter(x=>x.id!==s.id));
    }else if(compareSalons.length<2){
      setCompareSalons(p=>[...p,s]);
      if(compareSalons.length===1){
        setTimeout(()=>setView("compare"),300);
      }
    }
  };

  return(
    <div style={G.page}>
      {/* Pull to refresh */}
      {pullRefreshing&&<div style={{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",zIndex:100,background:"var(--p)",color:"#000",padding:"4px 16px",borderRadius:20,fontSize:12,fontWeight:700}}>⟳ جاري التحديث...</div>}

      <div style={{background:"linear-gradient(160deg,#12122a,#1a1a3a)",borderBottom:"1px solid #2a2a3a",padding:"14px 14px 0"}}>
        <div style={{textAlign:"center",paddingBottom:10}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:6,marginBottom:8}}>
            <span style={{fontSize:20,fontWeight:700,color:"var(--p)",letterSpacing:1}}>احجز</span>
            <span style={{fontSize:56,fontWeight:900,color:"#fff",letterSpacing:3,textShadow:"0 4px 20px rgba(212,160,23,0.4)",fontFamily:"'Playfair Display', 'Courier New', serif"}}>DORK</span>
          </div>
          <div style={{fontSize:11,color:"#888",letterSpacing:2,marginBottom:8,fontWeight:600}}>✂ حجوزات فاخرة ✂</div>
          <p style={{color:"#777",fontSize:12,marginTop:2}}>أفضل صالونات الحلاقة في مدينتك</p>
        </div>

        {/* حجز سريع */}
        {lastSalon&&customer&&(
          <div style={{background:"var(--pa08)",border:"1px solid var(--pa25)",borderRadius:10,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>⚡</span>
            <div style={{flex:1,fontSize:12,color:"#ccc"}}>آخر زيارة: <strong style={{color:"var(--p)"}}>{lastSalon.name}</strong></div>
            <button style={{...G.bookBtn,padding:"5px 12px",fontSize:11}} onClick={()=>{setSelSalon(lastSalon);setView("book");}}>احجز سريع</button>
          </div>
        )}

        {/* وضع الاستعجال */}
        <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
          <button style={{...G.sortChip,...(urgentMode?{...G.sortChipOn,background:"rgba(231,76,60,.2)",border:"1.5px solid #e74c3c",color:"#e74c3c"}:{})}} onClick={()=>setUrgentMode(u=>!u)}>
            🔥 {urgentMode?"مفتوح الآن":"مفتوح الآن؟"}
          </button>
          <button style={{...G.sortChip,...(compareSalons.length>0?G.sortChipOn:{})}} onClick={()=>compareSalons.length===2?setView("compare"):toast$&&toast$("اختر صالونين للمقارنة من القائمة")}>
            ⚖ مقارنة {compareSalons.length>0&&`(${compareSalons.length}/2)`}
          </button>
          {compareSalons.length>0&&<button style={{...G.sortChip,color:"#e74c3c",border:"1px solid #e74c3c"}} onClick={()=>setCompareSalons([])}>✕</button>}
        </div>

        <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,.05)",borderRadius:9,border:"1px solid #2a2a3a",padding:"6px 10px",gap:6}}>
            <span style={{fontSize:12,color:"var(--p)",flexShrink:0}}>🔎</span>
            <input style={{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"}} placeholder="ابحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button style={{background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:11,padding:0}} onClick={()=>setSearch("")}>✕</button>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,paddingBottom:14}}>
          <LocFilter icon="🗺" label="المنطقة" value={fRegion} onChange={v=>{setFRegion(v);setFGov("");setFCenter("");setFVillage("");}} options={allLoc.map(r=>r.region)} all="كل المناطق"/>
          {fRegion&&<LocFilter icon="🏛" label="المحافظة" value={fGov} onChange={v=>{setFGov(v);setFCenter("");setFVillage("");}} options={govList.map(g=>g.name||g)} all="كل المحافظات"/>}
          {fGov&&centerList2.length>0&&<LocFilter icon="🏘" label="المركز" value={fCenter} onChange={v=>{setFCenter(v);setFVillage("");}} options={centerList2} all="كل المراكز"/>}
          {fCenter&&(()=>{const villages=[...new Set(approvedSalons.filter(s=>s.center===fCenter&&s.village).map(s=>s.village))];return villages.length>0?<LocFilter icon="📍" label="الحي/القرية" value={fVillage} onChange={setFVillage} options={villages} all="كل الأحياء"/>:null;})()}
        </div>
      </div>

      <div style={{padding:"10px 14px 0",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
        {[
          ["default","الافتراضي","🔄"],
          ["ratingHigh","الأعلى تقييماً","⭐"],
          ["ratingLow","الأقل تقييماً","☆"],
          ["priceLow","الأرخص","💰"],
          ["nearest","الأقرب","📍"],
        ].map(([k,l,ic])=>(
          <button key={k} style={{...G.sortChip,...(sortBy===k?G.sortChipOn:{})}} onClick={()=>{
            if(k==="nearest"&&!userLoc){detectUserLoc();return;}
            setSortBy(k);
          }}>{ic} {l}</button>
        ))}
        <button style={G.sortChip} onClick={handlePullRefresh}>⟳ تحديث</button>
      </div>

      <div style={{padding:"10px 14px 80px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>
            {urgentMode?"🔥 مفتوح الآن":"الصالونات المتاحة"}
          </span>
          <span style={G.badge}>{sortedSalons.length}</span>
        </div>
        {sortedSalons.length===0
          ?<div style={G.empty}>{urgentMode?"لا توجد صالونات مفتوحة الآن":"لا توجد صالونات في هذه المنطقة"}</div>
          :<div style={{display:"flex",flexDirection:"column",gap:11}}>
            {sortedSalons.map(s=>(
              <SalonCard key={s.id} salon={s} fav={favSet.has(s.id)} onFav={()=>toggleFav(s.id)}
                realRating={getRealRating(s.id)}
                reviewCount={getReviewCount(s.id)}
                userLoc={userLoc}
                getSalonCoords={getSalonCoords}
                haversine={haversine}
                isOpenNow={isOpenNow(s)}
                inCompare={compareSalons.some(x=>x.id===s.id)}
                onCompare={()=>toggleCompare(s)}
                onViewReviews={()=>{setSelSalon(s);setView("salonReviews");}}
                onBook={()=>{setSelSalon(s);setView("book");}}/>
            ))}
          </div>
        }
      </div>
    </div>
  );
}


export { HomeView };

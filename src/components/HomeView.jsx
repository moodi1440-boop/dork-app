// الصفحة الرئيسية (بحث/فلاتر/قائمة الصالونات) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { SalonCard } from "./SalonCard.jsx";
import {
  IconCalendar, IconClose, IconFire, IconLightning, IconPin, IconSearch, IconStar,
  IconUser, NotifIcon
} from "./icons.jsx";

export function HomeView({displaySalons,approvedSalons,allLoc,fRegion,setFRegion,fGov,setFGov,fCenter,setFCenter,fVillage,setFVillage,govList,villageList,centerList2,showFavs,setShowFavs,favSet,toggleFav,setView,setSelSalon,customer,search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,toast$,customers,salons,reviews,compareSalons,setCompareSalons,handlePullRefresh,pullRefreshing,loading,promotions,homeResetKey,setQuickBookSeed,fPriceMin,setFPriceMin,fPriceMax,setFPriceMax}){
  const{t}=useTranslation();
  const[urgentMode,setUrgentMode]=useState(false);
  const[promoMode,setPromoMode]=useState(false);
  const[showSearch,setShowSearch]=useState(false);
  const[showRegionSelect,setShowRegionSelect]=useState(false);
  const[showPriceFilter,setShowPriceFilter]=useState(false);
  const[reviewsSheet,setReviewsSheet]=useState(null);
  useEffect(()=>{
    if(homeResetKey===undefined)return;
    setUrgentMode(false);setPromoMode(false);setShowSearch(false);setShowRegionSelect(false);setShowPriceFilter(false);
  },[homeResetKey]);

  // Pull to Refresh
  const _ptStartY=useRef(0);const _ptActive=useRef(false);const _ptYRef=useRef(0);
  const[_ptY,_setPtY]=useState(0);const _PT=65;
  useEffect(()=>{
    const onTS=(e)=>{if(window.scrollY>2)return;_ptStartY.current=e.touches[0].clientY;_ptActive.current=true;_ptYRef.current=0;};
    const onTM=(e)=>{if(!_ptActive.current)return;const dy=e.touches[0].clientY-_ptStartY.current;if(dy>0){const y=Math.min(dy*.45,80);_ptYRef.current=y;_setPtY(y);}else{_ptActive.current=false;_ptYRef.current=0;_setPtY(0);}};
    const onTE=()=>{if(_ptActive.current&&_ptYRef.current>=_PT&&!pullRefreshing)handlePullRefresh();_ptActive.current=false;_ptYRef.current=0;_setPtY(0);};
    window.addEventListener('touchstart',onTS,{passive:true});
    window.addEventListener('touchmove',onTM,{passive:true});
    window.addEventListener('touchend',onTE,{passive:true});
    return()=>{window.removeEventListener('touchstart',onTS);window.removeEventListener('touchmove',onTM);window.removeEventListener('touchend',onTE);};
  },[handlePullRefresh,pullRefreshing]);

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
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"warn");return;}
    navigator.geolocation.getCurrentPosition(
      p=>{setUserLoc({lat:p.coords.latitude,lng:p.coords.longitude});setSortBy("nearest");toast$&&toast$(i18n.t('ui.location_detected'));},
      err=>{let m=i18n.t('ui.location_detect_failed_icon');if(err.code===1)m=i18n.t('ui.location_denied_hint');toast$&&toast$(m,"warn");},
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
  const nowPromo=new Date();
  const activeSalonPromoIds=new Set((promotions||[]).filter(p=>p.status==="active"&&p.package==="silver"&&(!p.ends_at||new Date(p.ends_at)>nowPromo)).map(p=>String(p.salon_id)));
  const savedLoc=(customer?.locationLat&&customer?.locationLng)?{lat:customer.locationLat,lng:customer.locationLng}:null;
  const sortedSalons=(()=>{
    let list=urgentMode?displaySalons.filter(isOpenNow):displaySalons;
    if(promoMode)list=list.filter(s=>activeSalonPromoIds.has(String(s.id)));
    // ترتيب بزر "أقرب" (GPS لحظي)
    if(sortBy==="nearest"&&userLoc){
      return[...list].sort((a,b)=>{
        const ca=getSalonCoords(a),cb=getSalonCoords(b);
        if(!ca&&!cb)return 0;if(!ca)return 1;if(!cb)return -1;
        return haversine(userLoc.lat,userLoc.lng,ca.lat,ca.lng)-haversine(userLoc.lat,userLoc.lng,cb.lat,cb.lng);
      });
    }
    // ترتيب افتراضي حسب موقع العميل المحفوظ (بدون ضغط أي زر)
    if(sortBy===""&&savedLoc){
      return[...list].sort((a,b)=>{
        const ca=getSalonCoords(a),cb=getSalonCoords(b);
        if(!ca&&!cb)return 0;if(!ca)return 1;if(!cb)return -1;
        return haversine(savedLoc.lat,savedLoc.lng,ca.lat,ca.lng)-haversine(savedLoc.lat,savedLoc.lng,cb.lat,cb.lng);
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
      {(_ptY>8||pullRefreshing)&&<div style={{position:"fixed",top:64,left:"50%",transform:`translate(-50%,${pullRefreshing?10:Math.max(_ptY-16,0)}px)`,zIndex:100,transition:pullRefreshing?"transform .2s":"none",width:34,height:34,borderRadius:"50%",background:"var(--p)",color:"var(--p-text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 2px 10px rgba(0,0,0,.35)",pointerEvents:"none"}}>{pullRefreshing?<span style={{animation:"spin .7s linear infinite",display:"inline-block"}}><NotifIcon icon="↻" size={17}/></span>:<NotifIcon icon={_ptY>=_PT?"↑":"↓"} size={17}/>}</div>}

      {/* Region Select - قائمة متدرجة */}
      {showRegionSelect&&(()=>{
        const villages=[...new Set(approvedSalons.filter(s=>s.center===fCenter&&s.village).map(s=>s.village))];
        const selStyle=(active)=>({flex:1,minWidth:72,height:32,borderRadius:8,border:`1.5px solid ${active?"var(--gold)":"#333"}`,background:"rgba(12,12,22,.97)",color:active?"var(--gold)":"#777",fontSize:11,fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:"0 6px",cursor:"pointer",outline:"none"});
        return(
          <div style={{background:"rgba(0,0,0,.5)",borderBottom:"1px solid rgba(var(--gold-rgb),.15)",padding:"8px 10px",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            <button onClick={()=>{setShowRegionSelect(false);setFRegion("");setFGov("");setFCenter("");setFVillage("");}} aria-label="إلغاء فلتر المنطقة" style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",padding:"2px 4px",flexShrink:0,display:"flex",alignItems:"center"}}><IconClose size={14}/></button>
            <select value={fRegion||""} onChange={e=>{setFRegion(e.target.value);setFGov("");setFCenter("");setFVillage("");}} style={selStyle(!!fRegion)}>
              <option value="">{t('ui.region')}</option>
              {allLoc.map(r=><option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
            {fRegion&&govList.length>0&&(
              <select value={fGov||""} onChange={e=>{setFGov(e.target.value);setFCenter("");setFVillage("");}} style={selStyle(!!fGov)}>
                <option value="">{t('ui.gov')}</option>
                {govList.map(g=><option key={g.name||g} value={g.name||g}>{g.name||g}</option>)}
              </select>
            )}
            {fGov&&centerList2.length>0&&(
              <select value={fCenter||""} onChange={e=>{setFCenter(e.target.value);setFVillage("");}} style={selStyle(!!fCenter)}>
                <option value="">{t('ui.center')}</option>
                {centerList2.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {fCenter&&villages.length>0&&(
              <select value={fVillage||""} onChange={e=>{setFVillage(e.target.value);if(e.target.value)setShowRegionSelect(false);}} style={selStyle(!!fVillage)}>
                <option value="">{t('ui.neighborhood')}</option>
                {villages.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </div>
        );
      })()}

      {/* Price Filter - نطاق سعري */}
      {showPriceFilter&&(
        <div style={{background:"rgba(0,0,0,.5)",borderBottom:"1px solid rgba(var(--gold-rgb),.15)",padding:"8px 10px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>{setShowPriceFilter(false);setFPriceMin("");setFPriceMax("");}} aria-label="إلغاء فلتر السعر" style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",padding:"2px 4px",flexShrink:0,display:"flex",alignItems:"center"}}><IconClose size={14}/></button>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{t("home.price_from")}</span>
          <input type="number" min="0" inputMode="numeric" aria-label={t("home.price_from")} value={fPriceMin} onChange={e=>setFPriceMin(e.target.value)} style={{width:72,height:32,borderRadius:8,border:"1.5px solid #333",background:"rgba(12,12,22,.97)",color:"var(--gold)",fontSize:12,fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:"0 8px",outline:"none"}}/>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{t("home.price_to")}</span>
          <input type="number" min="0" inputMode="numeric" aria-label={t("home.price_to")} value={fPriceMax} onChange={e=>setFPriceMax(e.target.value)} style={{width:72,height:32,borderRadius:8,border:"1.5px solid #333",background:"rgba(12,12,22,.97)",color:"var(--gold)",fontSize:12,fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:"0 8px",outline:"none"}}/>
        </div>
      )}

      <div style={{padding:"10px 14px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",alignItems:"center"}}>
        {/* البحث - عدسة صغيرة */}
        <button style={{minWidth:50,width:50,height:50,borderRadius:"50%",background:showSearch?"var(--pa3)":"var(--pa15)",border:"1.5px solid var(--p)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20,transition:"all 0.2s",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{const o=!showSearch;setShowSearch(o);setShowRegionSelect(false);if(o)setSortBy("");}} title="بحث" aria-label="بحث عن صالون">
          <NotifIcon icon="🔍" size={20}/>
        </button>

        {/* المنطقة */}
        <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:showRegionSelect?"var(--pa3)":"var(--surface-2)",border:`1.5px solid ${showRegionSelect?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"var(--text-primary)",transition:"all 0.2s",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{const o=!showRegionSelect;setShowRegionSelect(o);setShowSearch(false);if(o)setSortBy("");}} title={t('ui.region')} aria-label="تصفية حسب المنطقة">
          {fVillage?fVillage.substring(0,3):fCenter?fCenter.substring(0,3):fGov?fGov.substring(0,3):fRegion?fRegion.substring(0,3):t("home.filter_region")}
        </button>

        {/* احجز سريع */}
        {lastSalon&&customer&&(
          <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,.05)",border:"1.5px solid var(--border-ui)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:24,transition:"all 0.2s"}} onClick={()=>{const lastH=customer.history[customer.history.length-1];setQuickBookSeed?.({services:lastH?.services||[],barberId:lastH?.barberId||""});setSelSalon(lastSalon);setView("book");}} title="احجز سريع" aria-label="حجز سريع من آخر حجز">
            <IconLightning size={22}/>
          </button>
        )}

        {/* زر العروض */}
        <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:promoMode?"rgba(231,76,60,.25)":"var(--surface-2)",border:`1.5px solid ${promoMode?"#e74c3c":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18,transition:"all 0.2s",flexDirection:"column",gap:2}} onClick={()=>{setPromoMode(p=>!p);setShowSearch(false);setShowRegionSelect(false);setSortBy("");}} title="العروض" aria-label="عرض العروض النشطة">
          <IconFire size={18}/>
          <span style={{fontSize:9,color:promoMode?"#e74c3c":"var(--text-muted)"}}>{t('ui.offers')}</span>
        </button>

        {/* الفلاتر الأخرى */}
        {[
          ["nearest","📍",t("home.sort_nearest")],
          ["ratingHigh","⭐",t("home.sort_rating_high")],
          ["ratingLow","☆",t("home.sort_rating_low")],
          ["priceHigh","💰",t("home.sort_price_high")],
          ["priceLow","🪙",t("home.sort_price_low")],
        ].map(([k,ic,l])=>(
          <button key={k} style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:sortBy===k?"var(--pa3)":"var(--surface-2)",border:`1.5px solid ${sortBy===k?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18,transition:"all 0.2s",flexDirection:"column",gap:2}} onClick={()=>{if(sortBy===k){setSortBy("");}else{setShowSearch(false);setShowRegionSelect(false);if(k==="nearest"&&!userLoc){if(savedLoc){setUserLoc(savedLoc);setSortBy(k);return;}detectUserLoc();return;}setSortBy(k);}}} title={l} aria-label={l}>
            <span style={{display:"flex"}}><NotifIcon icon={ic} size={18}/></span>
            <span style={{fontSize:9,color:"var(--text-muted)"}}>{l}</span>
          </button>
        ))}

        {/* السعر - آخر الفلاتر */}
        <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:(showPriceFilter||fPriceMin!==""||fPriceMax!=="")?"var(--pa3)":"var(--surface-2)",border:`1.5px solid ${(showPriceFilter||fPriceMin!==""||fPriceMax!=="")?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"var(--text-primary)",transition:"all 0.2s",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{const o=!showPriceFilter;setShowPriceFilter(o);setShowSearch(false);setShowRegionSelect(false);}} title={t("home.filter_price")} aria-label={t("home.filter_price")}>
          {(fPriceMin!==""||fPriceMax!=="")?`${fPriceMin||0}-${fPriceMax||"∞"}`:t("home.filter_price")}
        </button>
      </div>

      {/* البحث */}
      {showSearch&&(
      <div style={{padding:"10px 14px",background:"rgba(0,0,0,.4)",borderBottom:"1px solid rgba(var(--gold-rgb),.1)",animation:"slideDown 0.2s ease-out"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,.05)",borderRadius:9,border:"1px solid var(--border-ui)",padding:"8px 12px",gap:6,cursor:"text"}}>
          <span style={{fontSize:12,color:"var(--p)",flexShrink:0,display:"flex"}}><IconSearch size={12} color="var(--p)"/></span>
          <input autoFocus style={{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl",WebkitAppearance:"none",appearance:"none"}} placeholder={t("home.search_ph")} value={search} onChange={e=>setSearch(e.target.value)} onBlur={()=>{if(!search)setShowSearch(false);}}/>
          {search&&<button style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",padding:0,WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center"}} onClick={()=>setSearch("")} aria-label="مسح البحث"><IconClose size={12}/></button>}
        </div>
      </div>
      )}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{padding:"10px 14px 80px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:15,fontWeight:700,color:"var(--text-primary)",display:"inline-flex",alignItems:"center",gap:5}}>
            {promoMode?<><IconFire size={14}/>{t('ui.active_offers')}</>:urgentMode?t("home.open_now"):t("home.available_salons")}
          </span>
          <span style={G.badge}>{sortedSalons.length}</span>
        </div>
        {promoMode&&savedLoc&&<div style={{fontSize:11,color:"var(--p)",fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={11}/>{t('ui.sorted_nearest')}</div>}
        {loading&&sortedSalons.length===0
          ?null
          :promoMode&&!savedLoc&&!userLoc
            ?<div style={{textAlign:"center",padding:"40px 20px",background:"var(--surface-1)",borderRadius:16,border:"1px solid var(--border-ui)"}}>
               <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconPin size={36}/></div>
               <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t('ui.add_loc_offers')}</div>
               <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>{t('ui.show_offers_near')}</div>
               <button onClick={()=>setView("custSettings")} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="←" size={13}/> الإعدادات</button>
             </div>
            :sortedSalons.length===0
              ?<div style={G.empty}>{promoMode?"لا توجد عروض نشطة الآن":urgentMode?t("home.no_salons_open"):t("home.no_salons")}</div>
              :<div style={{display:"flex",flexDirection:"column",gap:11,animation:"fadeInCards .4s ease-out"}}>
                {sortedSalons.map(s=>{
                  const activePromo=(promotions||[]).find(p=>String(p.salon_id)===String(s.id)&&p.status==="active"&&p.package==="silver")||null;
                  const loc=savedLoc||userLoc;
                  const coords=getSalonCoords(s);
                  const distKm=promoMode&&loc&&coords?Math.round(haversine(loc.lat,loc.lng,coords.lat,coords.lng)*10)/10:null;
                  return(
                  <SalonCard key={s.id} salon={s} fav={favSet.has(s.id)} onFav={()=>toggleFav(s.id)}
                    realRating={getRealRating(s.id)}
                    reviewCount={getReviewCount(s.id)}
                    userLoc={userLoc}
                    getSalonCoords={getSalonCoords}
                    haversine={haversine}
                    isOpenNow={isOpenNow(s)}
                    inCompare={compareSalons.some(x=>x.id===s.id)}
                    onCompare={()=>toggleCompare(s)}
                    activePromo={activePromo}
                    distKm={distKm}
                    onViewReviews={()=>setReviewsSheet(s)}
                    onBook={()=>{setSelSalon(s);setView("book");}}/>
                );})}
              </div>
        }
      </div>

    {/* ── Bottom Sheet التقييمات ── */}
    {reviewsSheet&&(()=>{
      const id=Number(reviewsSheet.id);
      const sRev=(reviews||[]).filter(r=>Number(r.salon_id)===id).map(r=>({name:r.customer_name||"عميل",rating:r.rating,comment:r.comment||"",ownerReply:r.owner_reply||"",date:r.booking_date||r.created_at?.split("T")[0]||""})).sort((a,b)=>b.date.localeCompare(a.date));
      const avg=sRev.length?Math.round(sRev.reduce((s,r)=>s+r.rating,0)/sRev.length*10)/10:0;
      return(
        <>
          <div onClick={()=>setReviewsSheet(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:900}}/>
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:901,background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"0 0 env(safe-area-inset-bottom)",maxHeight:"80vh",display:"flex",flexDirection:"column",animation:"slideUpSheet .3s ease-out"}}>
            <style>{`@keyframes slideUpSheet{from{transform:translateY(100%);}to{transform:translateY(0);}}`}</style>
            {/* Handle */}
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px"}}><div style={{width:36,height:4,borderRadius:2,background:"var(--border-ui)"}}/></div>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 16px 12px",borderBottom:"1px solid var(--border-ui)"}}>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:"var(--text-primary)",marginBottom:4}}>{reviewsSheet.name}</div>
                {sRev.length>0&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:22,fontWeight:900,color:"var(--gold)"}}>{avg}</span><div><div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=Math.round(avg)?"var(--gold)":"rgba(var(--gold-rgb),.2)"}/>)}</div><div style={{fontSize:10,color:"var(--text-muted)"}}>{sRev.length} تقييم</div></div></div>}
              </div>
              <button onClick={()=>setReviewsSheet(null)} style={{background:"var(--surface-2)",border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-muted)",fontSize:16}}>✕</button>
            </div>
            {/* قائمة التقييمات */}
            <div style={{overflowY:"auto",flex:1,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              {sRev.length===0?<div style={G.empty}>{t('ui.no_ratings')}</div>:sRev.map((r,i)=>(
                <div key={i} style={{background:"var(--surface-2)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"11px 13px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:r.comment?5:0}}>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)",display:"inline-flex",alignItems:"center",gap:4}}><IconUser size={11}/>{r.name}</span>
                    <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><IconStar key={n} size={12} color={n<=r.rating?"var(--gold)":"rgba(var(--gold-rgb),.18)"}/>)}</div>
                  </div>
                  {r.comment&&<div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:3}}>«{r.comment}»</div>}
                  {r.date&&<div style={{fontSize:9,color:"var(--text-muted)",marginBottom:r.ownerReply?8:0,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.date}</div>}
                  {r.ownerReply&&(
                    <div style={{marginTop:6,padding:"8px 10px",background:"rgba(var(--gold-rgb),.07)",borderRight:"3px solid #d4a017",borderRadius:"0 8px 8px 0"}}>
                      <div style={{fontSize:10,color:"var(--gold)",fontWeight:700,marginBottom:3}}>{t("salon_reviews.owner_reply_label")}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{r.ownerReply}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      );
    })()}
    </div>
  );
}

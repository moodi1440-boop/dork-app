// لوحتا الإحصائيات والإشعارات لصاحب الصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { getTodayDateInRiyadh } from "../../utils.js";
import { IconBarberPole, IconCalendar, IconCheck, IconClose, IconMedal, IconRadioFilled, IconScissors, IconTrash, NotifIcon, LabelWithIcon } from "../shared/Icons.jsx";
import { sb, supabase } from "../../api.js";


export function StatsPanel({salon,onUpdate,customers=[],refreshSalonBookings,totalEarned=0,totalPaid=0}){
  const{t}=useTranslation();
  const _months=t("owner_dash.months",{returnObjects:true});
  const[selectedDate,setSelectedDate]=useState(getTodayDateInRiyadh());
  const[m,setM]=useState(new Date().getMonth());
  const[y,setY]=useState(new Date().getFullYear());
  const[selectedBarber,setSelectedBarber]=useState(null);
  const[dayStats,setDayStats]=useState({});
  const[monthStats,setMonthStats]=useState({});
  const[yearStats,setYearStats]=useState({});
  const[loadingStats,setLoadingStats]=useState(false);
  const[showDayPicker,setShowDayPicker]=useState(false);
  const[showMonthPicker,setShowMonthPicker]=useState(false);
  const[showYearPicker,setShowYearPicker]=useState(false);
  const[barberPeriod,setBarberPeriod]=useState("day");
  const todayDefault=getTodayDateInRiyadh();
  const nowM=new Date().getMonth();
  const nowY=new Date().getFullYear();
  const[barberDay,setBarberDay]=useState(todayDefault);
  const[barberM,setBarberM]=useState(nowM);
  const[barberY,setBarberY]=useState(nowY);
  const[showBarberDayPicker,setShowBarberDayPicker]=useState(false);
  const[showBarberMonthPicker,setShowBarberMonthPicker]=useState(false);
  const[showBarberYearPicker,setShowBarberYearPicker]=useState(false);
  const[servicesView,setServicesView]=useState("requests");
  const[showCashForm,setShowCashForm]=useState(false);
  const[cashAmount,setCashAmount]=useState("");
  const[cashNote,setCashNote]=useState("");
  const[cashDate,setCashDate]=useState(getTodayDateInRiyadh());
  const[cashBarber,setCashBarber]=useState("");
  const CASH_KEY=`dork_cash_${salon.id}`;
  const[cashEntries,setCashEntries]=useState(()=>{try{return JSON.parse(localStorage.getItem(`dork_cash_${salon.id}`)||"[]");}catch{return[];}});
  const balance=totalEarned-totalPaid;

  const todayBks=salon.bookings.filter(b=>b.date===selectedDate);
  const salonDayRevenue=Object.values(dayStats).reduce((s,b)=>s+b.revenue,0);
  const salonMonthRevenue=Object.values(monthStats).reduce((s,b)=>s+b.revenue,0);
  const salonYearRevenue=Object.values(yearStats).reduce((s,b)=>s+b.revenue,0);
  const todayApproved=todayBks.filter(b=>b.status==="approved");
  const todayPending=todayBks.filter(b=>b.status==="pending");
  const todayRejected=todayBks.filter(b=>b.status==="rejected");

  const loadBarberStats=useCallback(async()=>{
    if(!salon.barbers?.length)return;
    setLoadingStats(true);
    try{
      const mm=String(barberM+1).padStart(2,"0");
      const dim=new Date(barberY,barberM+1,0).getDate();
      const startM=`${barberY}-${mm}-01`;
      const endM=`${barberY}-${mm}-${String(dim).padStart(2,"0")}`;
      const[dayR,monthR,yearR]=await Promise.all([
        sb("bookings","GET",null,`?select=barber_id,total&salon_id=eq.${salon.id}&status=eq.approved&date=eq.${barberDay}&limit=100`),
        sb("bookings","GET",null,`?select=barber_id,total&salon_id=eq.${salon.id}&status=eq.approved&date=gte.${startM}&date=lte.${endM}&limit=100`),
        sb("bookings","GET",null,`?select=barber_id,total&salon_id=eq.${salon.id}&status=eq.approved&date=gte.${barberY}-01-01&date=lte.${barberY}-12-31&limit=100`)
      ]);
      const grp=(rows)=>{const s={};if(Array.isArray(rows))for(const r of rows){const bid=r.barber_id||"any";if(!s[bid])s[bid]={count:0,revenue:0};s[bid].count++;s[bid].revenue+=(r.total||0);}return s;};
      setDayStats(grp(dayR));
      setMonthStats(grp(monthR));
      setYearStats(grp(yearR));
    }catch(e){}
    setLoadingStats(false);
  },[salon.id,salon.barbers?.length,barberDay,barberM,barberY]);

  useEffect(()=>{loadBarberStats();},[loadBarberStats]);

  const loadStatsRef=useRef(loadBarberStats);
  loadStatsRef.current=loadBarberStats;
  useEffect(()=>{
    const channel=supabase.channel(`barber-stats-${salon.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings',filter:`salon_id=eq.${salon.id}`},()=>{loadStatsRef.current();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id]);

  const getBarberStats=(barberId)=>{
    const day=dayStats[barberId]||{count:0,revenue:0};
    const month=monthStats[barberId]||{count:0,revenue:0};
    const year=yearStats[barberId]||{count:0,revenue:0};
    return{dayCount:day.count,dayRevenue:day.revenue,monthCount:month.count,monthRevenue:month.revenue,yearCount:year.count,yearRevenue:year.revenue};
  };

  // ── حسابات إضافية ──
  const allBks=salon.bookings||[];
  const approvedBks=allBks.filter(b=>b.status==="approved");
  const cancelledBks=allBks.filter(b=>b.status==="rejected"||b.status==="cancelled");
  const cancelRate=allBks.length>0?Math.round((cancelledBks.length/allBks.length)*100):0;
  const avgBookingVal=approvedBks.length>0?Math.round(approvedBks.reduce((s,b)=>s+(b.total||0),0)/approvedBks.length):0;

  // إيراد آخر 7 أيام
  const last7=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-6+i);
    const ds=d.toISOString().split("T")[0];
    const rev=approvedBks.filter(b=>b.date===ds).reduce((s,b)=>s+(b.total||0),0);
    return{ds,rev,day:d.toLocaleDateString("ar-SA",{weekday:"short"})};
  });
  const maxRev=Math.max(...last7.map(x=>x.rev),1);

  // أوقات الذروة
  const hourCounts={};
  const dayCounts={};
  const dayNames=["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  approvedBks.forEach(b=>{
    if(b.time){const h=parseInt(b.time.split(":")[0]);hourCounts[h]=(hourCounts[h]||0)+1;}
    if(b.date){const dn=new Date(b.date).getDay();dayCounts[dn]=(dayCounts[dn]||0)+1;}
  });
  const topHours=Object.entries(hourCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([h,c])=>({h:parseInt(h),c}));
  const topDays=Object.entries(dayCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([d,c])=>({d:parseInt(d),c}));

  // تحليل العملاء
  const salonCusts=customers.filter(c=>(c.history||[]).some(h=>String(h.salonId)===String(salon.id)));
  const now30=new Date();now30.setDate(now30.getDate()-30);
  const newCusts=salonCusts.filter(c=>{
    const visits=(c.history||[]).filter(h=>String(h.salonId)===String(salon.id));
    if(!visits.length)return false;
    const first=new Date(Math.min(...visits.map(v=>new Date(v.date||v.bookedAt||0))));
    return first>=now30;
  });
  const returningCusts=salonCusts.filter(c=>{
    const visits=(c.history||[]).filter(h=>String(h.salonId)===String(salon.id));
    return visits.length>=2;
  });

  // أفضل الخدمات
  const svcCount={};const svcRev={};
  approvedBks.forEach(b=>{
    const svcs=Array.isArray(b.services)?b.services:(b.service?[b.service]:[]);
    svcs.forEach(s=>{svcCount[s]=(svcCount[s]||0)+1;svcRev[s]=(svcRev[s]||0)+(b.total||0);});
  });
  const topSvcs=Object.keys(svcCount).sort((a,b)=>servicesView==="requests"?svcCount[b]-svcCount[a]:svcRev[b]-svcRev[a]).slice(0,4);
  const maxSvc=Math.max(...topSvcs.map(s=>servicesView==="requests"?svcCount[s]:svcRev[s]),1);

  // توقع الأسبوع القادم
  const thisWeekBks=approvedBks.filter(b=>{const d=new Date(b.date||"");const diff=(new Date()-d)/86400000;return diff>=0&&diff<7;}).length;
  const prevWeekBks=approvedBks.filter(b=>{const d=new Date(b.date||"");const diff=(new Date()-d)/86400000;return diff>=7&&diff<14;}).length;
  const forecastNext=Math.round((thisWeekBks+prevWeekBks)/2);

  // الكاش
  const todayCash=cashEntries.filter(e=>e.date===getTodayDateInRiyadh()).reduce((s,e)=>s+(e.amount||0),0);
  const monthStr=`${y}-${String(m+1).padStart(2,"0")}`;
  const monthCash=cashEntries.filter(e=>e.date?.startsWith(monthStr)).reduce((s,e)=>s+(e.amount||0),0);
  const yearCash=cashEntries.filter(e=>e.date?.startsWith(String(y))).reduce((s,e)=>s+(e.amount||0),0);

  const addCashEntry=()=>{
    const amt=parseFloat(cashAmount);
    if(!amt||amt<=0)return;
    const selBarber=salon.barbers?.find(b=>b.id===cashBarber);
    const entry={id:Date.now(),amount:amt,note:cashNote.trim(),date:cashDate,barberId:cashBarber||null,barberName:selBarber?.name||""};
    const updated=[...cashEntries,entry];
    setCashEntries(updated);
    try{localStorage.setItem(CASH_KEY,JSON.stringify(updated));}catch{}
    setCashAmount("");setCashNote("");setCashBarber("");setShowCashForm(false);
  };
  const removeCashEntry=(id)=>{
    const updated=cashEntries.filter(e=>e.id!==id);
    setCashEntries(updated);
    try{localStorage.setItem(CASH_KEY,JSON.stringify(updated));}catch{}
  };

  // تنبيه ذكي
  const smartAlert=(()=>{
    if(cancelRate>20)return`⚠️ معدل الإلغاء ${cancelRate}% — حاول تأكيد الحجوزات مسبقاً`;
    if(topDays.length>0){const quietDay=dayNames.find((_,i)=>!dayCounts[i]);if(quietDay)return`💡 ${quietDay} أقل أيامك — جرّب عرضاً لرفع الحجوزات`;}
    if(forecastNext>thisWeekBks+2)return`📈 الأسبوع القادم متوقع ${forecastNext} حجز — كن مستعداً`;
    if(approvedBks.length===0)return`🚀 ابدأ باستقبال حجوزاتك عبر التطبيق وتابع إحصائياتك هنا`;
    return`✅ الصالون يعمل بشكل جيد — واصل`;
  })();

  const formatH=(h)=>`${h>12?h-12:h||12} ${h>=12?"م":"ص"}`;

  return(
    <div style={{paddingTop:4}}>

      {/* ── بطاقات KPI ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[
          {label:"إيراد اليوم",val:`${salonDayRevenue} ر`,sub:`+${todayCash} ر كاش`,icon:"💰"},
          {label:"حجوزات الشهر",val:approvedBks.filter(b=>b.date?.startsWith(monthStr)).length,sub:`${cancelRate}% إلغاء`,icon:"📅"},
          {label:"متوسط الحجز",val:`${avgBookingVal} ر`,sub:"لكل حجز",icon:"📊"},
          {label:"إجمالي العملاء",val:salonCusts.length,sub:"جميع العملاء",icon:"👥"},
          {label:"العملاء الجدد",val:newCusts.length,sub:"آخر 30 يوم",icon:"🆕"},
        ].map(({label,val,sub,icon})=>(
          <div key={label} style={{background:"var(--surface-1)",borderRadius:12,padding:"12px",border:"1px solid var(--border-ui)"}}>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4,display:"flex",alignItems:"center",gap:4}}><NotifIcon icon={icon} size={11}/>{label}</div>
            <div style={{fontSize:20,fontWeight:900,color:"var(--p)",lineHeight:1,marginBottom:3}}>{val}</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── رسم بياني — آخر 7 أيام ── */}
      <div style={{background:"var(--surface-1)",borderRadius:14,padding:"12px",border:"1px solid var(--border-ui)",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📈" size={13}/> الإيراد — آخر 7 أيام</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:60}}>
          {last7.map(({ds,rev,day})=>(
            <div key={ds} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:"100%",background:`rgba(var(--pr),.${rev>0?"6":"15"})`,borderRadius:"4px 4px 0 0",height:`${Math.max(4,(rev/maxRev)*52)}px`,transition:"height .3s"}}/>
              <div style={{fontSize:8,color:"var(--text-muted)",whiteSpace:"nowrap"}}>{day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── تنبيه ذكي ── */}
      <div style={{background:"rgba(var(--pr),.08)",border:"1px solid rgba(var(--pr),.25)",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--p)",lineHeight:1.6}}>
        <LabelWithIcon label={smartAlert} size={13}/>
      </div>

      {/* ── أداء الحلاقين ── */}
      {salon.barbers&&salon.barbers.length>0&&(
        <div style={{background:"var(--surface-1)",borderRadius:14,padding:"12px",border:"1px solid var(--border-ui)",marginBottom:14}}>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}><IconBarberPole size={12}/>{t('ui.barbers_perf')}</div>
            <div style={{display:"flex",gap:6}}>
              {/* تاب اليوم */}
              <div style={{flex:1,position:"relative"}}>
                <button onClick={()=>{setBarberPeriod("day");setShowBarberDayPicker(v=>!v);setShowBarberMonthPicker(false);setShowBarberYearPicker(false);}} style={{width:"100%",padding:"5px 6px",borderRadius:9,border:`1.5px solid ${barberPeriod==="day"?"var(--p)":"var(--border-ui)"}`,background:barberPeriod==="day"?"var(--pa12)":"transparent",color:barberPeriod==="day"?"var(--p)":"var(--text-muted)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"space-between",gap:2}}>
                  <span>{t('ui.today')}</span>
                  {barberDay!==todayDefault&&<span onClick={(e)=>{e.stopPropagation();setBarberDay(todayDefault);}} style={{display:"inline-flex"}}><IconClose size={9} color="#e74c3c"/></span>}
                </button>
                {barberPeriod==="day"&&showBarberDayPicker&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface-2)",border:"1px solid var(--gold)",borderRadius:10,padding:6,maxHeight:180,overflowY:"auto",zIndex:20,marginTop:3}}>
                    {Array.from({length:31},(_,i)=>i+1).map(d=>{
                      const ds=`${barberY}-${String(barberM+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                      const sel=barberDay===ds;
                      return(<button key={d} onClick={()=>{setBarberDay(ds);setShowBarberDayPicker(false);}} style={{display:"block",width:"100%",padding:"4px 0",borderRadius:7,background:sel?"var(--gold)":"transparent",color:sel?"#000":"var(--gold)",border:`1px solid ${sel?"var(--gold)":"var(--border-ui)"}`,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:2}}>{d}</button>);
                    })}
                  </div>
                )}
              </div>
              {/* تاب الشهر */}
              <div style={{flex:1,position:"relative"}}>
                <button onClick={()=>{setBarberPeriod("month");setShowBarberMonthPicker(v=>!v);setShowBarberDayPicker(false);setShowBarberYearPicker(false);}} style={{width:"100%",padding:"5px 6px",borderRadius:9,border:`1.5px solid ${barberPeriod==="month"?"var(--p)":"var(--border-ui)"}`,background:barberPeriod==="month"?"var(--pa12)":"transparent",color:barberPeriod==="month"?"var(--p)":"var(--text-muted)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"space-between",gap:2}}>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{_months[barberM]||"الشهر"}</span>
                  {barberM!==nowM&&<span onClick={(e)=>{e.stopPropagation();setBarberM(nowM);}} style={{display:"inline-flex"}}><IconClose size={9} color="#e74c3c"/></span>}
                </button>
                {barberPeriod==="month"&&showBarberMonthPicker&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface-2)",border:"1px solid var(--gold)",borderRadius:10,padding:6,maxHeight:180,overflowY:"auto",zIndex:20,marginTop:3}}>
                    {(_months||[]).map((mn,idx)=>{
                      const sel=barberM===idx;
                      return(<button key={idx} onClick={()=>{setBarberM(idx);setShowBarberMonthPicker(false);}} style={{display:"block",width:"100%",padding:"4px 0",borderRadius:7,background:sel?"var(--gold)":"transparent",color:sel?"#000":"var(--gold)",border:`1px solid ${sel?"var(--gold)":"var(--border-ui)"}`,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:2}}>{mn}</button>);
                    })}
                  </div>
                )}
              </div>
              {/* تاب السنة */}
              <div style={{flex:1,position:"relative"}}>
                <button onClick={()=>{setBarberPeriod("year");setShowBarberYearPicker(v=>!v);setShowBarberDayPicker(false);setShowBarberMonthPicker(false);}} style={{width:"100%",padding:"5px 6px",borderRadius:9,border:`1.5px solid ${barberPeriod==="year"?"var(--p)":"var(--border-ui)"}`,background:barberPeriod==="year"?"var(--pa12)":"transparent",color:barberPeriod==="year"?"var(--p)":"var(--text-muted)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"space-between",gap:2}}>
                  <span>{barberY}</span>
                  {barberY!==nowY&&<span onClick={(e)=>{e.stopPropagation();setBarberY(nowY);}} style={{display:"inline-flex"}}><IconClose size={9} color="#e74c3c"/></span>}
                </button>
                {barberPeriod==="year"&&showBarberYearPicker&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface-2)",border:"1px solid var(--gold)",borderRadius:10,padding:6,maxHeight:180,overflowY:"auto",zIndex:20,marginTop:3}}>
                    {Array.from({length:6},(_,i)=>nowY-2+i).map(yr=>{
                      const sel=barberY===yr;
                      return(<button key={yr} onClick={()=>{setBarberY(yr);setShowBarberYearPicker(false);}} style={{display:"block",width:"100%",padding:"4px 0",borderRadius:7,background:sel?"var(--gold)":"transparent",color:sel?"#000":"var(--gold)",border:`1px solid ${sel?"var(--gold)":"var(--border-ui)"}`,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:2}}>{yr}</button>);
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          {loadingStats&&<div style={{textAlign:"center",padding:"6px",color:"var(--text-muted)",fontSize:11}}>{t('ui.loading')}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[...salon.barbers].sort((a,b)=>{
              const sa=getBarberStats(a.id);const sb=getBarberStats(b.id);
              const va=barberPeriod==="day"?sa.dayCount:barberPeriod==="month"?sa.monthCount:sa.yearCount;
              const vb=barberPeriod==="day"?sb.dayCount:barberPeriod==="month"?sb.monthCount:sb.yearCount;
              return vb-va;
            }).map((barber,idx)=>{
              const stats=getBarberStats(barber.id);
              const cnt=barberPeriod==="day"?stats.dayCount:barberPeriod==="month"?stats.monthCount:stats.yearCount;
              const rev=barberPeriod==="day"?stats.dayRevenue:barberPeriod==="month"?stats.monthRevenue:stats.yearRevenue;
              const barberCash=(()=>{
                const filtered=cashEntries.filter(e=>e.barberId===barber.id);
                if(barberPeriod==="day")return filtered.filter(e=>e.date===barberDay).reduce((s,e)=>s+(e.amount||0),0);
                const mStr=`${barberY}-${String(barberM+1).padStart(2,"0")}`;
                if(barberPeriod==="month")return filtered.filter(e=>e.date?.startsWith(mStr)).reduce((s,e)=>s+(e.amount||0),0);
                return filtered.filter(e=>e.date?.startsWith(String(barberY))).reduce((s,e)=>s+(e.amount||0),0);
              })();
              const palette=[["#3498db","#3498db33"],["#9b59b6","#9b59b633"],["#1abc9c","#1abc9c33"],["#e67e22","#e67e2233"],["#e91e63","#e91e6333"],["#00bcd4","#00bcd433"]];
              const[col,colBg]=palette[idx%palette.length];
              const medalColors=["#d4a017","#9e9e9e","#cd7f32"];
              const maxCnt=Math.max(...salon.barbers.map(b=>{const s=getBarberStats(b.id);return barberPeriod==="day"?s.dayCount:barberPeriod==="month"?s.monthCount:s.yearCount;}),1);
              return(
                <div key={barber.id} style={{borderRadius:12,background:colBg,border:`1.5px solid ${col}44`,padding:"10px 12px",overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:16,flexShrink:0,display:"flex"}}>{idx<3?<IconMedal size={16} color={medalColors[idx]}/>:<NotifIcon icon="💈" size={16}/>}</span>
                    <span style={{fontSize:13,fontWeight:700,color:col,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{barber.name||barber.barber_name||t('ui.barber_unit')}</span>
                    <div style={{width:42,height:5,background:"rgba(255,255,255,.15)",borderRadius:3,flexShrink:0,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(cnt/maxCnt)*100}%`,background:col,borderRadius:3}}/>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                    <div style={{background:"rgba(255,255,255,.07)",borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
                      <div style={{fontSize:9,color:`${col}bb`,marginBottom:3,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><NotifIcon icon="💳" size={10}/> حجوزات</div>
                      <div style={{fontSize:12,fontWeight:700,color:col}}>{cnt}<span style={{fontSize:9}}> حجز</span></div>
                      <div style={{fontSize:10,color:col,fontWeight:600,marginTop:1}}>{rev} ر</div>
                    </div>
                    <div style={{background:"rgba(255,255,255,.07)",borderRadius:8,padding:"6px 4px",textAlign:"center"}}>
                      <div style={{fontSize:9,color:`${col}bb`,marginBottom:3,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><NotifIcon icon="💵" size={10}/> كاش</div>
                      <div style={{fontSize:12,fontWeight:700,color:barberCash>0?"#27ae60":col}}>{barberCash} ر</div>
                    </div>
                    <div style={{background:`${col}20`,borderRadius:8,padding:"6px 4px",textAlign:"center",border:`1px solid ${col}33`}}>
                      <div style={{fontSize:9,color:`${col}bb`,marginBottom:3,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><NotifIcon icon="📊" size={10}/> الإجمالي</div>
                      <div style={{fontSize:13,fontWeight:700,color:col}}>{rev+barberCash} ر</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── أوقات الذروة ── */}
      <div style={{background:"var(--surface-1)",borderRadius:14,padding:"12px",border:"1px solid var(--border-ui)",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10}}>{t('ui.peak_times')}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:6}}>{t('ui.peak_hours_label')}</div>
            {topHours.length>0?topHours.map(({h,c},i)=>(
              <div key={h} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"4px 8px",borderRadius:7,background:"rgba(var(--pr),.06)"}}>
                <span style={{fontSize:11,color:"var(--p)",fontWeight:700}}>{i+1}. {formatH(h)}</span>
                <span style={{fontSize:10,color:"var(--text-muted)"}}>{c} حجز</span>
              </div>
            )):<div style={{fontSize:11,color:"var(--text-muted)"}}>{t('ui.no_data')}</div>}
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:6}}>{t('ui.peak_days_label')}</div>
            {topDays.length>0?topDays.map(({d,c},i)=>(
              <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"4px 8px",borderRadius:7,background:"rgba(var(--pr),.06)"}}>
                <span style={{fontSize:11,color:"var(--p)",fontWeight:700}}>{i+1}. {dayNames[d]}</span>
                <span style={{fontSize:10,color:"var(--text-muted)"}}>{c} حجز</span>
              </div>
            )):<div style={{fontSize:11,color:"var(--text-muted)"}}>{t('ui.no_data')}</div>}
          </div>
        </div>
      </div>

      {/* ── تحليل العملاء ── */}
      <div style={{background:"var(--surface-1)",borderRadius:14,padding:"12px",border:"1px solid var(--border-ui)",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="👥" size={13}/> تحليل العملاء</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"rgba(39,174,96,.08)",border:"1px solid rgba(39,174,96,.25)",borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#27ae60"}}>{newCusts.length}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><IconRadioFilled size={8} color="#27ae60"/> جدد (آخر 30 يوم)</div>
            <div style={{fontSize:11,fontWeight:700,color:"#27ae60"}}>{salonCusts.length>0?Math.round((newCusts.length/salonCusts.length)*100):0}%</div>
          </div>
          <div style={{background:"rgba(52,152,219,.08)",border:"1px solid rgba(52,152,219,.25)",borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#3498db"}}>{returningCusts.length}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><IconRadioFilled size={8} color="#3498db"/> عائدون</div>
            <div style={{fontSize:11,fontWeight:700,color:"#3498db"}}>{salonCusts.length>0?Math.round((returningCusts.length/salonCusts.length)*100):0}%</div>
          </div>
        </div>
      </div>

      {/* ── أفضل الخدمات ── */}
      {topSvcs.length>0&&(
        <div style={{background:"var(--surface-1)",borderRadius:14,padding:"12px",border:"1px solid var(--border-ui)",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",display:"flex",alignItems:"center",gap:5}}><IconScissors size={12} color="var(--p)"/>{t('ui.top_services')}</div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setServicesView("requests")} style={{padding:"3px 8px",borderRadius:8,border:`1px solid ${servicesView==="requests"?"var(--p)":"var(--border-ui)"}`,background:servicesView==="requests"?"var(--pa12)":"transparent",color:servicesView==="requests"?"var(--p)":"var(--text-muted)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t('ui.request_unit')}</button>
              <button onClick={()=>setServicesView("revenue")} style={{padding:"3px 8px",borderRadius:8,border:`1px solid ${servicesView==="revenue"?"var(--p)":"var(--border-ui)"}`,background:servicesView==="revenue"?"var(--pa12)":"transparent",color:servicesView==="revenue"?"var(--p)":"var(--text-muted)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t('ui.revenue_label')}</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {topSvcs.map((s,i)=>{
              const val=servicesView==="requests"?svcCount[s]:svcRev[s];
              const medalColors2=["#d4a017","#9e9e9e","#cd7f32"];
              return(
                <div key={s} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:14,flexShrink:0,display:"flex"}}>{i<3?<IconMedal size={14} color={medalColors2[i]}/>:<span style={{fontSize:14}}>4️⃣</span>}</div>
                  <div style={{fontSize:12,color:"var(--text-primary)",flex:1,fontWeight:600}}>{s}</div>
                  <div style={{width:60,height:6,background:"rgba(var(--pr),.15)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(val/maxSvc)*100}%`,background:"var(--p)",borderRadius:3}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--p)",flexShrink:0,minWidth:40,textAlign:"left"}}>{servicesView==="requests"?`${val} طلب`:`${val} ر`}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── توقع الأسبوع القادم ── */}
      <div style={{background:"rgba(var(--pr),.06)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(var(--pr),.2)",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2,display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="🔮" size={11}/> توقع الأسبوع القادم</div>
          <div style={{fontSize:18,fontWeight:900,color:"var(--p)"}}>{forecastNext} حجز</div>
        </div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:10,color:"var(--text-muted)"}}>{t('ui.this_week')}</div>
          <div style={{fontSize:14,fontWeight:700,color:"var(--p)"}}>{thisWeekBks} حجز</div>
        </div>
      </div>

      {/* ── الأرباح ── */}
      <div style={{fontSize:12,fontWeight:800,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="💰" size={14}/> الأرباح</div>
      <div style={{background:"rgba(var(--pr),.12)",borderRadius:14,padding:"14px",border:"1.5px solid rgba(var(--pr),.3)",marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
          {[{l:t('ui.today'),app:salonDayRevenue,cash:todayCash},{l:"الشهر",app:salonMonthRevenue,cash:monthCash},{l:"السنة",app:salonYearRevenue,cash:yearCash}].map(({l,app,cash})=>(
            <div key={l} style={{background:"rgba(var(--pr),.1)",borderRadius:10,padding:"8px",textAlign:"center",border:"1px solid rgba(var(--pr),.2)"}}>
              <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:3}}>{l}</div>
              <div style={{fontSize:15,fontWeight:900,color:"var(--p)"}}>{app+cash} ر</div>
              <div style={{fontSize:9,color:"var(--text-muted)",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><NotifIcon icon="📱" size={9}/>{app} + <NotifIcon icon="💵" size={9}/>{cash}</div>
            </div>
          ))}
        </div>
        {/* سجل الكاش اليوم */}
        <div style={{borderTop:"1px solid rgba(var(--pr),.2)",paddingTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="💵" size={12}/> إيراد كاش اليوم</div>
            <button onClick={()=>setShowCashForm(!showCashForm)} style={{padding:"4px 10px",borderRadius:8,border:"1px solid rgba(var(--pr),.4)",background:"var(--pa08)",color:"var(--p)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t('ui.add')}</button>
          </div>
          {showCashForm&&(
            <div style={{background:"var(--surface-1)",borderRadius:12,padding:12,marginBottom:10,border:"1px solid var(--border-ui)"}}>
              {salon.barbers?.length>0&&(
                <div style={{marginBottom:10}}>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text-muted)",marginBottom:4,fontWeight:600}}><IconBarberPole size={10}/>{t('ui.barber_select')}</label>
                  <div style={{position:"relative"}}>
                    <select value={cashBarber} onChange={e=>setCashBarber(e.target.value)}
                      style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${cashBarber?"var(--p)":"var(--border-ui)"}`,background:"var(--surface-2)",color:cashBarber?"var(--p)":"var(--text-muted)",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl",appearance:"none",WebkitAppearance:"none",cursor:"pointer",boxSizing:"border-box"}}>
                      <option value="">{t('ui.no_barber')}</option>
                      {salon.barbers.map(b=><option key={b.id} value={b.id}>{b.name||t('ui.barber_unit')}</option>)}
                    </select>
                    <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--text-muted)",pointerEvents:"none"}}>▼</span>
                  </div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text-muted)",marginBottom:4,fontWeight:600}}><NotifIcon icon="💵" size={10}/> المبلغ</label>
                  <div style={{position:"relative"}}>
                    <input type="number" value={cashAmount} onChange={e=>setCashAmount(e.target.value)} placeholder="0"
                      style={{width:"100%",padding:"8px 30px 8px 8px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",fontSize:14,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",direction:"ltr",textAlign:"right",fontWeight:700}}/>
                    <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--text-muted)",pointerEvents:"none",fontWeight:600}}>{t('ui.sar_short')}</span>
                  </div>
                </div>
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text-muted)",marginBottom:4,fontWeight:600}}><IconCalendar size={10}/>{t('ui.date_label')}</label>
                  <input type="date" value={cashDate} onChange={e=>setCashDate(e.target.value)}
                    style={{width:"100%",padding:"8px 6px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",fontSize:11,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",direction:"ltr"}}/>
                </div>
              </div>
              <input value={cashNote} onChange={e=>setCashNote(e.target.value)} placeholder={t('ui.note_optional')}
                style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:10,direction:"rtl"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={()=>{setShowCashForm(false);setCashAmount("");setCashNote("");setCashDate(getTodayDateInRiyadh());setCashBarber("");}}
                  style={{padding:"10px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><NotifIcon icon="←" size={13}/> رجوع</button>
                <button onClick={addCashEntry}
                  style={{padding:"10px",borderRadius:9,border:"none",background:"var(--grad)",color:"var(--p-text,#000)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><IconCheck size={12} color="var(--p-text,#000)"/>{t('ui.ok')}</button>
              </div>
            </div>
          )}
          {cashEntries.filter(e=>e.date===getTodayDateInRiyadh()).map(e=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",borderRadius:8,background:"rgba(var(--pr),.06)",marginBottom:4}}>
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                {e.barberName&&<span style={{fontSize:10,color:"var(--p)",fontWeight:700,display:"inline-flex",alignItems:"center",gap:3}}><IconBarberPole size={9}/>{e.barberName}</span>}
                <span style={{fontSize:11,color:"var(--text-muted)"}}>{e.note||t('ui.cash')}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>{e.amount} ر</span>
                <button onClick={()=>removeCashEntry(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#e74c3c",fontSize:12,padding:0,display:"flex",alignItems:"center"}}><IconTrash size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── تصدير PDF ── */}
      <button onClick={()=>window.print()} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid rgba(var(--pr),.4)",background:"var(--pa08)",color:"var(--p)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:4}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6}}><NotifIcon icon="📄" size={14}/> تصدير التقرير</span>
      </button>

    </div>
  );
}

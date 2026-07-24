// لوحتا الإحصائيات والإشعارات لصاحب الصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";
import { getTodayDateInRiyadh, to12h, getCustomerClassification, getSlotsForSalon } from "../../utils.js";
import {
  IconBarberPole, IconCalendar, IconCheck, IconClose, IconMedal, IconRadioFilled,
  IconScissors, IconTrash, IconUser, NotifIcon, LabelWithIcon
} from "../shared/Icons.jsx";
import { sb, supabase, ntxt } from "../../../App.jsx";

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

export function NotifPanel({salon,onUpdate,customers=[],refreshSalonBookings,defaultFilter="approved",dateFilter}){
  const{t}=useTranslation();
  const[showWaiting,setShowWaiting]=useState(false);
  const[showAddForm,setShowAddForm]=useState(false);
  const[filter,setFilter]=useState(defaultFilter);
  const[localAtt,setLocalAtt]=useState({});
  const[mForm,setMForm]=useState({name:"",phone:"",date:getTodayDateInRiyadh(),slot:""});
  const KEY=`dork_waiting_${salon.id}`;
  const[waitingList,setWaitingList]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});
  const[processingWait,setProcessingWait]=useState(()=>new Set());
  const processingWaitLockRef=useRef(new Set());

  const loadWaiting=useCallback(async()=>{
    try{
      const data=await sb("waiting_list","GET",null,`?salon_id=eq.${salon.id}&select=id,name,phone,created_at,slot_date,slot_time,status&order=created_at.asc&limit=50`);
      if(Array.isArray(data)){
        const now=new Date();
        const expired=data.filter(w=>{
          if(w.status!=="waiting"||!w.slot_date||!w.slot_time)return false;
          const slotMs=new Date(`${w.slot_date}T${w.slot_time}:00`).getTime();
          return now.getTime()>slotMs+30*60*1000; // بعد 30 دقيقة من الوقت المحدد
        });
        for(const w of expired){
          sb("waiting_list","DELETE",null,`?id=eq.${w.id}`).catch(()=>{});
        }
        const active=data.filter(w=>!expired.find(e=>e.id===w.id)&&w.status==="waiting");
        const converted=active.map(w=>{const ts=w.created_at||"";const d=new Date(ts.includes("+")||ts.endsWith("Z")?ts:ts+"Z");return{id:w.id,name:w.name,phone:w.phone||"",addedAt:d.toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),slotDate:w.slot_date||"",slotTime:w.slot_time||"",status:w.status||"waiting"};});
        setWaitingList(converted);
        try{localStorage.setItem(KEY,JSON.stringify(converted));}catch{}
      }
    }catch{}
  },[salon.id,KEY]);

  useEffect(()=>{loadWaiting();},[loadWaiting]);

  // تحقق كل دقيقة لإزالة المنتهية
  useEffect(()=>{
    const t=setInterval(()=>{loadWaiting();},60*1000);
    return()=>clearInterval(t);
  },[loadWaiting]);

  // Realtime لقائمة الانتظار
  useEffect(()=>{
    const channel=supabase.channel(`waiting-${salon.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'waiting_list',filter:`salon_id=eq.${salon.id}`},()=>{loadWaiting();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadWaiting]);

  const addToWaiting=async(name,phone,slotDate,slotTime)=>{
    try{
      if(slotDate&&slotTime&&phone){
        const existing=await sb("waiting_list","GET",null,`?select=id&salon_id=eq.${salon.id}&slot_date=eq.${slotDate}&slot_time=eq.${slotTime}&phone=eq.${encodeURIComponent(phone)}&status=eq.waiting&limit=1`).catch(()=>[]);
        if(Array.isArray(existing)&&existing.length){alert(i18n.t('ui.customer_in_waiting'));return;}
      }
      await sb("waiting_list","POST",{salon_id:salon.id,name,phone,slot_date:slotDate||null,slot_time:slotTime||null});
      await loadWaiting();
    }catch{
      const item={id:Date.now(),name,phone,addedAt:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),slotDate:slotDate||"",slotTime:slotTime||""};
      const newList=[...waitingList,item];
      setWaitingList(newList);
      try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
    }
  };

  const acceptFromWaiting=async(w)=>{
    if(!w.slotDate||!w.slotTime){alert(i18n.t('ui.no_slot_set'));return;}
    if(processingWaitLockRef.current.has(w.id))return;
    processingWaitLockRef.current.add(w.id);
    setProcessingWait(prev=>new Set(prev).add(w.id));
    try{
      // إنشاء حجز مقبول مباشرة — status pending ثم نحوّله approved لتجاوز أي trigger يمنع الإدراج المباشر
      const inserted=await sb("bookings","POST",{salon_id:String(salon.id),customer_name:w.name,customer_phone:w.phone,date:w.slotDate,time:w.slotTime,status:"pending",service:"[]",barber_id:"any",barber_name:"",total:0});
      const newId=(inserted&&inserted[0])?inserted[0].id:null;
      if(newId)await sb("bookings","PATCH",{status:"approved"},`?id=eq.${newId}`).catch(()=>{});
      // تغيير الحالة لـ accepted
      await sb("waiting_list","PATCH",{status:"accepted"},"?id=eq."+w.id);
      // إشعار للمقبول
      {const _wa=ntxt(customers.find(c=>c.id===w.customer_id)?.lang||'ar').waitlist_approved(w.slotDate,w.slotTime,salon.name);
      if(w.customer_id){
        sb("notifications","POST",{target_type:"customer",target_id:w.customer_id,title:_wa.title,body:_wa.body,icon:"✅"}).catch(()=>{});
        supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:w.customer_id,user_type:"customer",title:_wa.title,body:_wa.body,data:{type:"waitlist_approved",salon_id:String(salon.id)}}}).catch(()=>{});
      }}
      // رفض المنتظرين للنفس الوقت
      const others=waitingList.filter(x=>x.id!==w.id&&x.slotDate===w.slotDate&&x.slotTime===w.slotTime);
      for(const o of others){
        await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+o.id).catch(()=>{});
        {const _wf=ntxt(customers.find(c=>c.id===o.customer_id)?.lang||'ar').waitlist_full(w.slotDate,w.slotTime,salon.name);
        if(o.customer_id){
          sb("notifications","POST",{target_type:"customer",target_id:o.customer_id,title:_wf.title,body:_wf.body,icon:"❌"}).catch(()=>{});
          supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:o.customer_id,user_type:"customer",title:_wf.title,body:_wf.body,data:{type:"waitlist_full",salon_id:String(salon.id)}}}).catch(()=>{});
        }}
      }
      await loadWaiting();
      if(refreshSalonBookings)refreshSalonBookings(salon.id);
    }catch(e){
      if(e.message&&(e.message.includes("booking_overlap")||e.message.includes("prevent_double_booking")||e.message.includes("23505"))){
        alert(i18n.t('ui.slot_still_booked'));
      }else{
        alert(i18n.t('ui.error_icon_prefix')+e.message);
      }
    }
    finally{processingWaitLockRef.current.delete(w.id);setProcessingWait(prev=>{const n=new Set(prev);n.delete(w.id);return n;});}
  };

  const rejectFromWaiting=async(w)=>{
    if(processingWaitLockRef.current.has(w.id))return;
    processingWaitLockRef.current.add(w.id);
    setProcessingWait(prev=>new Set(prev).add(w.id));
    try{
      await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+w.id);
      {const _wfl=ntxt(customers.find(c=>c.id===w.customer_id)?.lang||'ar').waitlist_failed(salon.name,w.slotDate,w.slotTime);
      if(w.customer_id){
        sb("notifications","POST",{target_type:"customer",target_id:w.customer_id,title:_wfl.title,body:_wfl.body,icon:"❌"}).catch(()=>{});
        supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:w.customer_id,user_type:"customer",title:_wfl.title,body:_wfl.body,data:{type:"waitlist_failed",salon_id:String(salon.id)}}}).catch(()=>{});
      }}
      await loadWaiting();
    }catch(e){alert(i18n.t('ui.error_icon_prefix')+e.message);}
    finally{processingWaitLockRef.current.delete(w.id);setProcessingWait(prev=>{const n=new Set(prev);n.delete(w.id);return n;});}
  };

  const removeFromWaiting=async(id)=>{
    try{
      await sb("waiting_list","DELETE",null,`?id=eq.${id}&salon_id=eq.${salon.id}`);
      await loadWaiting();
    }catch{
      const newList=waitingList.filter(w=>w.id!==id);
      setWaitingList(newList);
      try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
    }
  };

  const allBks=[...salon.bookings.filter(b=>!dateFilter||b.date===dateFilter)].sort((a,b)=>{
    const order={pending:0,approved:1,rejected:2};
    const so=(order[a.status]??1)-(order[b.status]??1);
    if(so!==0)return so;
    return `${a.date||""} ${a.time||""}`.localeCompare(`${b.date||""} ${b.time||""}`);
  });
  const counts={pending:allBks.filter(b=>b.status==="pending").length,approved:allBks.filter(b=>b.status==="approved").length,rejected:allBks.filter(b=>b.status==="rejected").length};
  const bks=filter==="all"?allBks:allBks.filter(b=>b.status===filter);

  return(
    <div style={{paddingTop:4}}>

      {/* قسم الانتظار - يظهر فقط عند فلتر "انتظار" */}
      {filter==="pending"&&(()=>{
        const allSlots=getSlotsForSalon(salon);
        const bookedSlots=new Set(salon.bookings.filter(b=>b.date===mForm.date&&b.status!=="rejected"&&b.status!=="cancelled").map(b=>b.time));
        const inp2={padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
        return(<>
          {/* زر إضافة عميل - في الأعلى مع toggle */}
          <div style={{background:"var(--bg-input)",borderRadius:10,border:"1px solid var(--border-ui)",marginBottom:10,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer"}} onClick={()=>setShowAddForm(v=>!v)}>
              <button style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid var(--p)",background:showAddForm?"var(--p)":"transparent",color:showAddForm?"#000":"var(--p)",fontSize:18,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,flexShrink:0}}>
                {showAddForm?"×":"+"}
              </button>
              <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>{t("notif.add_waiting")}</div>
            </div>
            {showAddForm&&<div style={{borderTop:"1px solid var(--border-ui)",padding:"12px 14px"}}>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={mForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))} style={{...inp2,direction:"rtl"}} placeholder={t("notif.name_ph")}/>
                <input value={mForm.phone} onChange={e=>setMForm(p=>({...p,phone:e.target.value}))} style={{...inp2,direction:"ltr"}} placeholder={t("notif.phone_ph")}/>
              </div>
              <input type="date" value={mForm.date} min={getTodayDateInRiyadh()} onChange={e=>setMForm(p=>({...p,date:e.target.value,slot:""}))} style={{...inp2,marginBottom:8}}/>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("notif.time_optional")}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {allSlots.map(sl=>{const sel=mForm.slot===sl;const booked=bookedSlots.has(sl);return(
                  <button key={sl} onClick={()=>setMForm(p=>({...p,slot:p.slot===sl?"":sl}))}
                    style={{width:64,padding:"5px 4px",borderRadius:8,border:`1.5px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa25)":booked?"var(--border-ui)":"var(--surface-1)",color:sel?"var(--p)":"var(--text-muted)",opacity:booked&&!sel?0.6:1,fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:sel?700:400,textAlign:"center",flexShrink:0}} title={booked?t("notif.slot_booked"):""}>
                    {to12h(sl)}
                  </button>
                );})}
              </div>
              {mForm.slot&&<div style={{background:"rgba(243,156,18,.08)",border:"1px solid #f39c1244",borderRadius:8,padding:"6px 10px",marginBottom:8,fontSize:11,color:"#f39c12",textAlign:"center"}}>{t("notif.selected_time")} <strong>{mForm.date} - {mForm.slot}</strong></div>}
              <button onClick={()=>{
                const n=mForm.name.trim();const p=mForm.phone.trim();
                if(!n||!p){alert(t("notif.err_name_phone"));return;}
                addToWaiting(n,p,mForm.date,mForm.slot);
                setMForm({name:"",phone:"",date:getTodayDateInRiyadh(),slot:""});
                setShowAddForm(false);
              }} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#f39c12,#e67e22)",color:"#fff",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
                {t("notif.add_btn")}
              </button>
            </div>}
          </div>

          {/* قائمة الانتظار */}
          {waitingList.length>0&&(
            <div style={{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--pa25)",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>{t("notif.waiting_title")} ({waitingList.length})</div>
                <button onClick={()=>setShowWaiting(w=>!w)} style={{fontSize:10,color:"var(--text-muted)",background:"transparent",border:"none",cursor:"pointer"}}>{showWaiting?t("notif.hide"):t("notif.show")}</button>
              </div>
              {showWaiting&&waitingList.map((w,idx)=>{
                const cust=customers.find(c=>c.phone&&w.phone&&c.phone.replace(/\D/g,"").slice(-9)===w.phone.replace(/\D/g,"").slice(-9));
                const cl=cust?getCustomerClassification(cust):null;
                return(
                <div key={w.id} style={{padding:"8px 0",borderTop:"1px solid var(--border-ui)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:12,color:"var(--text-primary)",fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{background:"var(--border-ui)",color:"var(--p)",borderRadius:10,padding:"1px 6px",fontSize:10}}>#{idx+1}</span>
                        {w.name}
                        {cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}><LabelWithIcon label={cl.label} size={9}/></span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="📞" size={11}/> {w.phone}</div>
                      {w.slotTime&&<div style={{fontSize:11,color:"var(--p)",fontWeight:700}}>⏰ {w.slotDate} - {w.slotTime}</div>}
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>{t("notif.added_at")} {w.addedAt}</div>
                    </div>
                    <button style={G.xBtn} onClick={()=>removeFromWaiting(w.id)}><IconTrash size={14}/></button>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    {w.slotTime&&<button disabled={processingWait.has(w.id)} style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:processingWait.has(w.id)?"not-allowed":"pointer",opacity:processingWait.has(w.id)?0.5:1,fontFamily:"inherit",fontWeight:700}} onClick={()=>acceptFromWaiting(w)}>{processingWait.has(w.id)?"⏳":t("notif.accept_btn")}</button>}
                    <button disabled={processingWait.has(w.id)} style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:processingWait.has(w.id)?"not-allowed":"pointer",opacity:processingWait.has(w.id)?0.5:1,fontFamily:"inherit",fontWeight:700}} onClick={()=>rejectFromWaiting(w)}>{processingWait.has(w.id)?"⏳":t("notif.reject_btn")}</button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </>);
      })()}

      {/* الحجوزات */}
      {!bks.length?<div style={G.empty}>{t("notif.no_bookings")}</div>:
      <div style={{display:"flex",flexDirection:"column",gap:8}}>{bks.map(b=>(
        <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
            {(()=>{const cust=customers.find(c=>c.phone&&b.phone&&c.phone.replace(/\D/g,"").slice(-9)===b.phone.replace(/\D/g,"").slice(-9));const cl=cust?getCustomerClassification(cust):null;return(<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><IconUser size={12}/>{b.name||t("owner_dash.customer_fallback")}{cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}><LabelWithIcon label={cl.label} size={9}/></span>}</div><div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="📞" size={11}/> {b.phone}</div><div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><IconScissors size={11}/>{Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div><div style={{fontSize:11,color:"var(--p)",display:"flex",alignItems:"center",gap:4}}><IconCalendar size={11}/>{b.date} {to12h(b.time)} - {b.total||0} ر</div></div>);})()}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?t("notif.status_approved"):b.status==="rejected"?t("notif.status_rejected"):t("notif.status_pending")}</span>
          </div>
          {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
          {b.status==="approved"&&(()=>{const att=localAtt[b.id]||b.attendance;return(<div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}><span style={{fontSize:10,color:"#666"}}>{t("notif.attendance")}</span>{att?(<span style={{fontSize:11,fontWeight:700,color:att==="attended"?"#27ae60":"#e74c3c"}}>{att==="attended"?t("notif.attended"):t("notif.no_show")}</span>):(<><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"attended"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"attended"}));}catch{}}}>{t("notif.attended")}</button><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"no_show"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"no_show"}));}catch{}}}>{t("notif.no_show")}</button></>)}</div>);})()}
        </div>
      ))}</div>}
    </div>
  );
}

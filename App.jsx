import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

// Import Supabase API
import { supabase, sb } from "./src/api/supabase";

// Import utilities
import {
  SLOT_MIN,
  MONTHS_AR,
  normalizeBgId,
  makeSlots,
  getSlotsForSalon,
  todayStr,
  openMaps,
  calcTotal,
  normPhone
} from "./src/utils/helpers";

import {
  toAppSalon,
  toDbSalon,
  toAppBooking,
  toAppCustomer
} from "./src/utils/transformers";

import {
  getCustomerClassification,
  requestNotifPermission,
  sendNotif
} from "./src/utils/notifications";

import { playTone } from "./src/utils/audio";

import {
  DEFAULT_SOCIAL_LINKS,
  TONES,
  THEMES,
  BACKGROUNDS,
  BG_LIGHT_STYLES,
  DEFAULT_SERVICES
} from "./src/constants";

import { buildDorkBgStyle, buildHomeReviewsFeed } from "./src/utils/ui";
import { BASE_LOC } from "./src/data/locations";
import { DorkLogoSvg } from "./src/components/Logo";
import { G } from "./src/styles";

// Import components
import { TopBar } from "./src/components/TopBar";
import { HomeReviewsSection } from "./src/components/HomeReviewsSection";
import { LocFilter } from "./src/components/LocFilter";
import { SalonCard } from "./src/components/SalonCard";
import { StatsPanel } from "./src/components/StatsPanel";
import { NotifPanel } from "./src/components/NotifPanel";
import { ShareBtn } from "./src/components/ShareBtn";
import { OwnerReviewsPanel } from "./src/components/OwnerReviewsPanel";
import { BookingCalendar } from "./src/components/BookingCalendar";
import { MessagesPanel } from "./src/components/MessagesPanel";
import { OwnerSettings } from "./src/components/OwnerSettings";
import { OtpInput } from "./src/components/OtpInput";
import { InlineStarRating } from "./src/components/InlineStarRating";
import { FAQItem } from "./src/components/FAQItem";
import { SL, F } from "./src/helpers/FormHelpers";

// Import views
import { HomeView } from "./src/views/HomeView";
import { SalonReviewsView } from "./src/views/SalonReviewsView";
import { SalonPage } from "./src/views/SalonPage";
import { BookView } from "./src/views/BookView";
import { TermsView } from "./src/views/TermsView";
import { RegisterView } from "./src/views/RegisterView";
import { AllReviewsView } from "./src/views/AllReviewsView";
import { NotifsView } from "./src/views/NotifsView";
import { CompareSalonsView } from "./src/views/CompareSalonsView";
import { NearMapView } from "./src/views/NearMapView";
import { OwnerLogin } from "./src/views/OwnerLogin";
import { OwnerDash } from "./src/views/OwnerDash";
import { CustomerLogin } from "./src/views/CustomerLogin";
import { CustomerDash } from "./src/views/CustomerDash";
import { SettingsView } from "./src/views/SettingsView";

class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={err:null,info:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){this.setState({info:info?.componentStack||""});}
  render(){
    if(this.state.err)return(
      <div style={{minHeight:"100vh",background:"#09112e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:20,gap:12}}>
        <div style={{fontSize:32}}>⚠️</div>
        <div style={{color:"#e74c3c",fontSize:14,fontWeight:700}}>خطأ في التطبيق</div>
        <div style={{color:"#aaa",fontSize:11,background:"#1a1a2e",padding:"12px 16px",borderRadius:8,maxWidth:340,wordBreak:"break-all",textAlign:"left",direction:"ltr"}}>{String(this.state.err)}</div>
        {this.state.info&&<div style={{color:"#666",fontSize:9,background:"#111",padding:"8px 12px",borderRadius:8,maxWidth:340,wordBreak:"break-all",textAlign:"left",direction:"ltr",maxHeight:120,overflow:"auto"}}>{this.state.info}</div>}
        <button onClick={()=>window.location.reload()} style={{background:"#d4a017",color:"#000",border:"none",borderRadius:8,padding:"8px 20px",fontFamily:"'Cairo',sans-serif",fontWeight:700,cursor:"pointer"}}>إعادة تحميل</button>
      </div>
    );
    return this.props.children;
  }
}

// Supabase client and sb function imported from src/api/supabase.js

// Data transformers imported from src/utils/transformers.js

// Constants imported from src/constants.js
// buildDorkBgStyle imported from src/utils/ui.js
// buildHomeReviewsFeed imported from src/utils/ui.js

// playTone imported from src/utils/audio.js

// Notification functions imported from src/utils/notifications.js
// BASE_LOC data imported from src/data/locations.js

// Utilities imported from src/utils/helpers.js
// buildHomeReviewsFeed - imported from src/utils/ui.js

const DEMO_SALONS=[
  {id:1,name:"صالون الأناقة",owner:"أحمد محمد",ownerPhone:"0501234567",region:"منطقة مكة المكرمة",gov:"محافظة جدة",center:"مركز جدة",village:"الروضة",phone:"0501234567",address:"شارع الملك عبدالعزيز",locationUrl:"https://maps.google.com/?q=21.5433,39.1728",services:["قص شعر","حلاقة لحية","تسريح"],prices:{"قص شعر":50,"حلاقة لحية":30,"تسريح":40},shiftEnabled:true,shift1Start:"08:00",shift1End:"13:00",shift2Start:"16:00",shift2End:"23:00",workStart:"08:00",workEnd:"23:00",barbers:[{id:"b1",name:"أبو خالد"},{id:"b2",name:"محمد"}],tone:"bell",bookings:[],rating:4.8,status:"approved"},
  {id:2,name:"بارشوب كلاسيك",owner:"سالم العتيبي",ownerPhone:"0559876543",region:"منطقة الرياض",gov:"محافظة الرياض",center:"مركز الرياض",village:"العليا",phone:"0559876543",address:"طريق الملك فهد",locationUrl:"https://maps.google.com/?q=24.6877,46.7219",services:["قص شعر","حلاقة كاملة","عناية بالبشرة"],prices:{"قص شعر":60,"حلاقة كاملة":80,"عناية بالبشرة":100},shiftEnabled:false,workStart:"10:00",workEnd:"23:00",barbers:[{id:"b3",name:"يوسف"},{id:"b4",name:"عبدالله"},{id:"b5",name:"فهد"}],tone:"welcome",bookings:[],rating:4.6,status:"approved"},
  {id:3,name:"صالون النخبة",owner:"فهد القحطاني",ownerPhone:"0533445566",region:"منطقة عسير",gov:"محافظة أبها",center:"مركز أبها",village:"السودة",phone:"0533445566",address:"شارع الأمير سلطان",locationUrl:"https://maps.google.com/?q=18.2164,42.5053",services:["قص شعر","تسريح","صبغة شعر"],prices:{"قص شعر":45,"تسريح":35,"صبغة شعر":100},shiftEnabled:false,workStart:"09:00",workEnd:"22:00",barbers:[{id:"b6",name:"عبدالرحمن"}],tone:"scissors",bookings:[],rating:4.5,status:"pending"},
];

// ==============================================
//  ROOT
// ==============================================
export { ErrorBoundary };
export default function App(){
  const[salons,setSalons]=useState([]);
  const[customers,setCustomers]=useState([]);
  const[reviews,setReviews]=useState([]);
  const[extraLoc,setExtraLoc]=useState(()=>{
    try{
      localStorage.removeItem("bbv6_loc");
      return [];
    }catch{return[];}
  });
  const[loading,setLoading]=useState(true);
  const[dbError,setDbError]=useState(null);
  const[view,setView]=useState("home");
  const[selSalon,setSelSalon]=useState(null);
  const[toast,setToast]=useState(null);
  const[splash,setSplash]=useState(true); // Splash Screen
  const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem("dork_dark")!=="0";}catch{return true;}});
  const[compareSalons,setCompareSalons]=useState([]); // مقارنة صالونين
  const[pullRefreshing,setPullRefreshing]=useState(false); // Pull to refresh
  const[rescheduleId,setRescheduleId]=useState(null);

  // تطبيق وضع الإضاءة
  useEffect(()=>{
    const shell=darkMode?"#0d0d1a":"#e8eaf0";
    const s1=darkMode?"#13131f":"#ffffff";
    const s2=darkMode?"#1a1a2e":"#f1f3f9";
    const bor=darkMode?"#2a2a3a":"#c8cdd8";
    document.documentElement.style.setProperty("--bg-main",darkMode?"#0d0d1a":"#f0f0f8");
    document.documentElement.style.setProperty("--bg-card",s1);
    document.documentElement.style.setProperty("--bg-input",darkMode?"#0d0d1a":"#f5f5f5");
    document.documentElement.style.setProperty("--txt-main",darkMode?"#f0f0f0":"#1a1a2e");
    document.documentElement.style.setProperty("--txt-sub",darkMode?"#888":"#5c6470");
    document.documentElement.style.setProperty("--border",bor);
    document.documentElement.style.setProperty("--shell-bg",shell);
    document.documentElement.style.setProperty("--surface-1",s1);
    document.documentElement.style.setProperty("--surface-2",s2);
    document.documentElement.style.setProperty("--border-ui",bor);
    document.documentElement.style.setProperty("--text-primary",darkMode?"#f0f0f0":"#141420");
    document.documentElement.style.setProperty("--text-muted",darkMode?"#888":"#5c6470");
    document.body.style.background=shell;
    document.documentElement.classList.toggle("dork-light",!darkMode);
    try{localStorage.setItem("dork_dark",darkMode?"1":"0");}catch{}
  },[darkMode]);

  // Splash Screen - يختفي بعد ثانيتين
  useEffect(()=>{
    const t=setTimeout(()=>setSplash(false),2000);
    return()=>clearTimeout(t);
  },[]);

  // -- تسجيل الدخول المستمر --
  const[ownerSession,setOwnerSession]=useState(()=>{try{const v=localStorage.getItem("dork_owner");return v?+v:null;}catch{return null;}});
  const[customerSession,setCustomerSession]=useState(()=>{try{const v=localStorage.getItem("dork_customer");return v?JSON.parse(v):null;}catch{return null;}});

  const bookingStatusSnapRef=useRef(null);
  const customerNotifyPrimedRef=useRef(false);

  useEffect(()=>{try{if(ownerSession)localStorage.setItem("dork_owner",String(ownerSession));else localStorage.removeItem("dork_owner");}catch{}},[ownerSession]);
  useEffect(()=>{try{if(customerSession)localStorage.setItem("dork_customer",JSON.stringify(customerSession));else localStorage.removeItem("dork_customer");}catch{}},[customerSession]);

  const[socialLinks,setSocialLinks]=useState({...DEFAULT_SOCIAL_LINKS});
  const[appSettingsId,setAppSettingsId]=useState(null);
  const appSettingsIdRef=useRef(null);
  useEffect(()=>{appSettingsIdRef.current=appSettingsId;},[appSettingsId]);

  const loadAppSettings=useCallback(async(opts)=>{
    const silent=opts&&opts.silent;
    try{
      const rows=await sb("app_settings","GET",null,"?order=id.asc&limit=1");
      if(rows.length){
        const r=rows[0];
        setAppSettingsId(r.id);
        appSettingsIdRef.current=r.id;
        if(r.social_links){
          try{
            let parsed={...DEFAULT_SOCIAL_LINKS,...JSON.parse(r.social_links)};
            if(!parsed.customFields||!parsed.customFields.length){
              try{
                const old=JSON.parse(localStorage.getItem("dork_social_custom")||"[]");
                if(Array.isArray(old)&&old.length)parsed={...parsed,customFields:old};
              }catch{}
            }
            if(!Array.isArray(parsed.customFields))parsed.customFields=[];
            setSocialLinks(parsed);
          }catch{}
        }
        if(r.ui_settings){
          try{
            const u=JSON.parse(r.ui_settings);
            setSettings(s=>({
              ...s,
              theme:u.theme??s.theme,
              fontSize:u.fontSize??s.fontSize,
              defaultTone:u.defaultTone??s.defaultTone,
              bg:normalizeBgId(u.bg??s.bg??"none"),
            }));
            if(typeof u.darkMode==="boolean")setDarkMode(u.darkMode);
          }catch{}
        }
      }
    }catch{
      if(!silent){
        try{const v=localStorage.getItem("dork_loyalty");if(v)setLoyaltySettings({...DEFAULT_LOYALTY_SETTINGS,...JSON.parse(v)});}catch{}
        try{const v=localStorage.getItem("dork_social");if(v)setSocialLinks({...DEFAULT_SOCIAL_LINKS,...JSON.parse(v)});}catch{}
        try{const v=localStorage.getItem("dork_ui");if(v){const u=JSON.parse(v);setSettings(s=>({...s,...u,bg:normalizeBgId(u.bg||s.bg)}));if(typeof u.darkMode==="boolean")setDarkMode(u.darkMode);}}catch{}
      }
    }
  },[]);

  // الشروط والأحكام
  const[termsAccepted,setTermsAccepted]=useState(()=>{try{return localStorage.getItem("dork_terms")==="1";}catch{return false;}});

  // Filters
  const[fRegion,setFRegion]=useState("");
  const[fGov,setFGov]=useState("");
  const[fVillage,setFVillage]=useState("");
  const[fCenter,setFCenter]=useState("");
  const[showFavs,setShowFavs]=useState(false);
  const[search,setSearch]=useState("");
  const[sortBy,setSortBy]=useState("default");
  const[userLoc,setUserLoc]=useState(null);
  const[settings,setSettings]=useState(()=>{try{const s=localStorage.getItem("bbv6_settings");if(!s)return{theme:"gold",defaultTone:"bell",fontSize:"md",bg:"none"};const p=JSON.parse(s);return{...p,bg:normalizeBgId(p.bg||"none")};}catch{return{theme:"gold",defaultTone:"bell",fontSize:"md",bg:"none"};}});
  useEffect(()=>{localStorage.setItem("bbv6_settings",JSON.stringify(settings));},[settings]);

  // حجم الخط
  useEffect(()=>{
    const sizes={sm:"13px",md:"15px",lg:"17px"};
    document.documentElement.style.setProperty("--base-font",sizes[settings.fontSize||"md"]);
  },[settings.fontSize]);
  useEffect(()=>{
    const t=THEMES[settings.theme]||THEMES.gold;
    const r=document.documentElement.style;
    r.setProperty("--p",  t.primary);
    r.setProperty("--pl", t.light);
    r.setProperty("--pd", t.dark);
    r.setProperty("--pll",t.lightest);
    r.setProperty("--pr", t.rgb);
    r.setProperty("--pa5",  `rgba(${t.rgb},.05)`);
    r.setProperty("--pa07", `rgba(${t.rgb},.07)`);
    r.setProperty("--pa08", `rgba(${t.rgb},.08)`);
    r.setProperty("--pa12", `rgba(${t.rgb},.12)`);
    r.setProperty("--pa15", `rgba(${t.rgb},.15)`);
    r.setProperty("--pa18", `rgba(${t.rgb},.18)`);
    r.setProperty("--pa2",  `rgba(${t.rgb},.2)`);
    r.setProperty("--pa25", `rgba(${t.rgb},.25)`);
    r.setProperty("--pa3",  `rgba(${t.rgb},.3)`);
    r.setProperty("--pa4",  `rgba(${t.rgb},.45)`);
    r.setProperty("--grad", `linear-gradient(135deg,${t.primary},${t.light})`);
    r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
  },[settings.theme]);

  const saveAppSettings=useCallback(async(social,uiPatch)=>{
    const S={...DEFAULT_SOCIAL_LINKS,...(social??socialLinks)};
    if(!Array.isArray(S.customFields))S.customFields=[];
    const p=uiPatch||{};
    const U={
      theme:p.theme??settings.theme??"gold",
      fontSize:p.fontSize??settings.fontSize??"md",
      defaultTone:p.defaultTone??settings.defaultTone??"bell",
      bg:normalizeBgId(p.bg??settings.bg??"none"),
      darkMode:typeof p.darkMode==="boolean"?p.darkMode:darkMode,
    };
    const base={social_links:JSON.stringify(S)};
    const full={...base,ui_settings:JSON.stringify(U)};
    const push=async(data)=>{
      const id=appSettingsIdRef.current;
      if(id){
        await sb("app_settings","PATCH",data,`?id=eq.${id}`);
      }else{
        const rows=await sb("app_settings","POST",data,"");
        const newId=rows[0]?.id;
        if(newId){setAppSettingsId(newId);appSettingsIdRef.current=newId;}
      }
    };
    try{
      try{
        await push(full);
      }catch{
        await push(base);
      }
      try{
        localStorage.setItem("dork_social",JSON.stringify(S));
        localStorage.removeItem("dork_social_custom");
        localStorage.setItem("dork_ui",JSON.stringify(U));
      }catch{}
    }catch{
      try{
        localStorage.setItem("dork_social",JSON.stringify(S));
        localStorage.setItem("dork_ui",JSON.stringify(U));
      }catch{}
    }
  },[socialLinks,settings.theme,settings.fontSize,settings.defaultTone,settings.bg,darkMode]);

  const updateSocial=useCallback((newVal)=>{
    const merged={...DEFAULT_SOCIAL_LINKS,...(typeof newVal==="function"?newVal(socialLinks):{...socialLinks,...newVal})};
    if(!Array.isArray(merged.customFields))merged.customFields=[];
    setSocialLinks(merged);
    try{localStorage.setItem("dork_social",JSON.stringify(merged));}catch{}
    void saveAppSettings(null,merged);
  },[socialLinks,saveAppSettings]);

  const persistUiToSupabase=useCallback((patch)=>{void saveAppSettings(socialLinks,patch);},[saveAppSettings,socialLinks]);

  const dorkBgStyle=useMemo(()=>buildDorkBgStyle(settings.bg||"none",darkMode),[settings.bg,darkMode]);

  const allLoc=[...BASE_LOC,...extraLoc];
  useEffect(()=>{localStorage.setItem("bbv6_loc",JSON.stringify(extraLoc));},[extraLoc]);

  const toast$=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};

  // -- تحميل البيانات من Supabase --
  const loadData = useCallback(async (opts) => {
    const silent=opts&&opts.silent;
    try {
      if(!silent)setLoading(true);
      const [salonRows, bookingRows, custRows] = await Promise.all([
        sb("salons","GET",null,"?select=*&order=id.desc"),
        sb("bookings","GET",null,"?select=id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance&order=created_at.desc"),
        sb("customers","GET",null,"?select=id,name,phone,email,google_uid,history,favs,created_at"),
      ]);
      // reviews تُجلب بشكل مستقل حتى لا توقف التطبيق عند أي خطأ
      const reviewRows = await sb("reviews","GET",null,"?select=id,salon_id,customer_id,customer_name,rating,comment,owner_reply,booking_date,created_at&order=created_at.desc").catch(()=>[]);
      const salonsWithBookings = salonRows.map(row => {
        const salon = toAppSalon(row);
        salon.bookings = bookingRows
          .filter(b => String(b.salon_id) === String(row.id))
          .map(b => ({
            id: b.id,
            salonId: b.salon_id,
            name: b.customer_name || "",
            phone: b.customer_phone || "",
            services: (() => { try { return JSON.parse(b.service || "[]"); } catch { return b.service ? [b.service] : []; } })(),
            barberId: b.barber_id || "any",
            barberName: b.barber_name || "",
            date: b.date || "",
            time: b.time || "",
            total: b.total || 0,
            status: b.status || "pending",
            attendance: b.attendance || null,
          }));
        return salon;
      });
      setSalons(salonsWithBookings);
      setCustomers(custRows.map(toAppCustomer));
      setReviews(reviewRows||[]);
      setDbError(null);
    } catch(e) {
      console.error("Data loading error:", e);
      console.log("Using demo data due to RLS/auth issue");
      setSalons(DEMO_SALONS);
      setCustomers([]);
      setReviews([]);
      setDbError(e.message);
    } finally {
      if(!silent)setLoading(false);
    }
  }, []);

  const handlePullRefresh=useCallback(async()=>{
    setPullRefreshing(true);
    try{
      await loadData();
      await loadAppSettings();
    }finally{
      setTimeout(()=>setPullRefreshing(false),800);
    }
  },[loadData,loadAppSettings]);

  useEffect(()=>{ loadData(); loadAppSettings(); }, [loadData,loadAppSettings]);

  // تحديث البيانات لما يرجع المستخدم للتطبيق من الخلفية
  useEffect(()=>{
    const onVisible=()=>{
      if(document.visibilityState==="visible"){
        loadData({silent:true});
        loadAppSettings({silent:true});
      }
    };
    document.addEventListener("visibilitychange",onVisible);
    return()=>document.removeEventListener("visibilitychange",onVisible);
  },[loadData,loadAppSettings]);

  useEffect(()=>{
    customerNotifyPrimedRef.current=false;
    bookingStatusSnapRef.current=null;
  },[customerSession?.id]);

  /* Supabase Realtime - تحديثات لحظية في كل الاتجاهات */

  // جلب مخصص للحجوزات فقط (بدون إعادة تحميل كامل)
  const pollBookings=useCallback(async()=>{
    try{
      const rows=await sb("bookings","GET",null,"?select=id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance&order=created_at.desc");
      setSalons(prev=>prev.map(salon=>({
        ...salon,
        bookings:rows
          .filter(b=>String(b.salon_id)===String(salon.id))
          .map(b=>({
            id:b.id,salonId:b.salon_id,
            name:b.customer_name||"",phone:b.customer_phone||"",
            services:(()=>{try{return JSON.parse(b.service||"[]");}catch{return b.service?[b.service]:[]}})(),
            barberId:b.barber_id||"any",barberName:b.barber_name||"",
            date:b.date||"",time:b.time||"",total:b.total||0,status:b.status||"pending",attendance:b.attendance||null,
          })),
      })));
    }catch{}
  },[]);

  // جلب مخصص للتقييمات فقط
  const pollReviews=useCallback(async()=>{
    try{
      const rows=await sb("reviews","GET",null,"?select=id,salon_id,customer_id,customer_name,rating,comment,owner_reply,booking_date,created_at&order=created_at.desc");
      setReviews(rows||[]);
    }catch{}
  },[]);

  useEffect(()=>{
    // حجوزات — لحظي في كل الاتجاهات (عميل ↔ صالون)
    const bookingChannel=supabase.channel('realtime-bookings')
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>{
        pollBookings();
      })
      .subscribe();

    // إشعارات الإدارة
    const notifChannel=supabase.channel('realtime-notifications')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},(payload)=>{
        const n=payload.new;
        if(!n)return;
        if(n.target_type==="customer")return;
        const count=parseInt(localStorage.getItem("dork_notif_count")||"0");
        localStorage.setItem("dork_notif_count",String(count+1));
        try{
          const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
          notifs.unshift({id:n.id||Date.now(),title:n.title,body:n.body,icon:n.icon||"🔔",time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),read:false});
          localStorage.setItem("dork_notifs",JSON.stringify(notifs.slice(0,50)));
        }catch{}
        if("Notification" in window&&Notification.permission==="granted"){
          try{new Notification(`${n.icon||"🔔"} ${n.title}`,{body:n.body||"",dir:"rtl",lang:"ar"});}catch{}
        }
      })
      .subscribe();

    // إعدادات التطبيق
    const settingsChannel=supabase.channel('realtime-app-settings')
      .on('postgres_changes',{event:'*',schema:'public',table:'app_settings'},()=>{
        loadAppSettings({silent:true});
      })
      .subscribe();

    // تقييمات — لحظي في كل الاتجاهات (عميل ↔ صالون)
    const reviewsChannel=supabase.channel('realtime-reviews')
      .on('postgres_changes',{event:'*',schema:'public',table:'reviews'},()=>{
        pollReviews();
      })
      .subscribe();

    return()=>{
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(reviewsChannel);
    };
  },[loadAppSettings,pollBookings,pollReviews]);

  useEffect(()=>{
    if(!customerSession?.id)return;
    const cust=customers.find(c=>c.id===customerSession.id);
    if(!cust)return;
    const phoneN=normPhone(cust.phone);
    const name=(cust.name||"").trim();
    const snap={};
    for(const s of salons){
      for(const b of s.bookings||[]){
        const bphone=normPhone(b.phone);
        const phoneMatch=phoneN.length>=9&&bphone.length>=9&&bphone===phoneN;
        const nameMatch=name&&((b.name||"").trim()===name);
        if(phoneMatch||(nameMatch&&!bphone)){
          snap[`${s.id}-${b.id}`]=b.status||"pending";
        }
      }
    }
    if(!customerNotifyPrimedRef.current){
      bookingStatusSnapRef.current=snap;
      customerNotifyPrimedRef.current=true;
      return;
    }
    const prev=bookingStatusSnapRef.current||{};
    for(const key of Object.keys(snap)){
      const was=prev[key];
      const now=snap[key];
      const sidStr=key.split("-")[0];
      const salon=salons.find(x=>String(x.id)===sidStr);
      if(was==="pending"&&now==="approved"){
        sendNotif("دورك - تأكيد الحجز",`✅ تم قبول حجزك في ${salon?.name||"الصالون"} — يُرجى الحضور في الموعد`,"✅","customer",customerSession?.id);
        toast$(`✅ تم قبول حجزك في ${salon?.name||""}`);
        try{playTone("bell",0.55);}catch{}
      }else if(was==="pending"&&now==="rejected"){
        sendNotif("دورك - تحديث الحجز",`تم رفض حجزك في ${salon?.name||"الصالون"}`,"❌","customer",customerSession?.id);
        toast$(`تم رفض حجزك في ${salon?.name||""}`,"warn");
      }
    }
    bookingStatusSnapRef.current=snap;
  },[salons,customers,customerSession]);

  const refreshSalonBookings=useCallback(async(salonId)=>{
    try{
      const rows=await sb("bookings","GET",null,
        `?salon_id=eq.${salonId}&select=id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,created_at&order=created_at.desc`
      );
      const bookings=rows.map(b=>({
        id:b.id,
        salonId:b.salon_id,
        name:b.customer_name||"",
        phone:b.customer_phone||"",
        services:(()=>{try{return JSON.parse(b.service||"[]");}catch{return b.service?[b.service]:[]}})(),
        barberId:b.barber_id||"any",
        barberName:b.barber_name||"",
        date:b.date||"",
        time:b.time||"",
        total:b.total||0,
        status:b.status||"pending",
        attendance:b.attendance||null,
      }));
      setSalons(prev=>prev.map(s=>String(s.id)===String(salonId)?{...s,bookings}:s));
    }catch(e){console.error(e);}
  },[]);

  // Polling — fallback للـ Realtime كل 10 ثواني
  useEffect(()=>{
    const id=setInterval(()=>{pollBookings();pollReviews();},10000);
    return()=>clearInterval(id);
  },[pollBookings,pollReviews]);

  // إشعار التذكير التلقائي + طلب التقييم
  useEffect(()=>{
    if(!customerSession)return;
    const check=()=>{
      const cust=customers.find(c=>c.id===customerSession.id);
      if(!cust)return;
      const now=new Date();
      const reminderMins=parseInt(localStorage.getItem("dork_reminder")||"60");
      const reminded=JSON.parse(localStorage.getItem("dork_auto_reminded")||"[]");
      const reviewed=JSON.parse(localStorage.getItem("dork_auto_review")||"[]");
      for(const h of (cust.history||[])){
        if(!h.date||!h.time||h.status==="rejected"||h.status==="cancelled")continue;
        const dt=new Date(`${h.date}T${h.time}`);
        const minsUntil=(dt-now)/60000;
        const minsAfter=(now-dt)/60000;
        const key=`${h.salonId}-${h.date}-${h.time}`;
        // تذكير قبل الموعد
        if(minsUntil>0&&minsUntil<=reminderMins&&!reminded.includes(key)){
          sendNotif("⏰ تذكير موعدك",`موعدك قريب في ${h.salonName||"الصالون"} — الساعة ${h.time}`,"⏰","customer",customerSession.id);
          reminded.push(key);
          localStorage.setItem("dork_auto_reminded",JSON.stringify(reminded.slice(-50)));
        }
        // طلب تقييم بعد الموعد بساعة
        if(minsAfter>=60&&minsAfter<=120&&!reviewed.includes(key)&&h.status==="approved"&&!h.rating){
          sendNotif("⭐ كيف كانت تجربتك؟",`قيّم ${h.salonName||"الصالون"} الآن وساعدنا في التحسين`,"⭐","customer",customerSession.id);
          reviewed.push(key);
          localStorage.setItem("dork_auto_review",JSON.stringify(reviewed.slice(-50)));
        }
      }
    };
    check();
    const id=setInterval(check,60000);
    return()=>clearInterval(id);
  },[customerSession,customers]);

  // شاشة الشروط والأحكام
  if(!termsAccepted) return <TermsView onAccept={()=>{setTermsAccepted(true);try{localStorage.setItem("dork_terms","1");}catch{}}} />;

  // Splash Screen
  if(splash) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#09112e 0%,#0d1535 45%,#111d42 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl",gap:0}}>
      {/* Full brand logo as image */}
      <div style={{animation:"splashPulse 1.4s ease-in-out infinite",marginBottom:28}}>
        <img src="/logo.png" alt="DORK" style={{width:260,height:"auto",display:"block",filter:"drop-shadow(0 4px 32px rgba(212,160,23,.5))",borderRadius:16}}/>
      </div>
      {/* Loading spinner */}
      <div style={{width:36,height:36,border:"3px solid rgba(212,160,23,.15)",borderTop:"3px solid #d4a017",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes splashPulse{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.04) translateY(-4px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}}/>
    </div>
  );

  // العميل لما يسجل دخول يروح للصفحة الرئيسية مباشرة
  const handleCustomerLogin=(c)=>{setCustomerSession(c);setView("home");};
  // customer helpers
  const getCustomer=()=>customerSession?customers.find(c=>c.id===customerSession.id)||customerSession:null;
  const toggleFav=async(salonId)=>{
    if(!customerSession){toast$("سجّل دخولك كعميل أولاً","warn");return;}
    const c=getCustomer(); if(!c)return;
    const favs=c.favs||[];
    const newFavs=favs.includes(salonId)?favs.filter(x=>x!==salonId):[...favs,salonId];
    try{
      await sb("customers","PATCH",{favs:newFavs},`?id=eq.${c.id}`);
      // تحديث محلي
      setCustomers(p=>p.map(x=>x.id===c.id?{...x,favs:newFavs}:x));
      setCustomerSession(s=>({...s,favs:newFavs}));
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };
  const customerFavs=()=>{const c=getCustomer();return c?.favs||[];};

  // -- CRUD operations > Supabase --
  const addSalon=async(s)=>{
    try{
      const dbData=toDbSalon(s);
      await sb("salons","POST",dbData,"");
      toast$("✅ تم إرسال طلب تسجيل الصالون - في انتظار موافقة الإدارة");
      setView("home");
      await loadData();
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };
  const addBooking=async(sid,bk,rescheduleOldId=null)=>{
    try{
      const salon=salons.find(s=>s.id===sid);
      if(salon?.tone)playTone(salon.tone,0.8);
      const isReschedule=!!rescheduleOldId;
      const inserted=await sb("bookings","POST",{
        salon_id:String(sid),
        customer_id:customerSession?.id||null,
        customer_name:bk.name,
        customer_phone:bk.phone,
        barber_id:bk.barberId||"any",
        barber_name:bk.barberName||"",
        service:JSON.stringify(bk.services||[]),
        date:bk.date,
        time:bk.time,
        total:bk.total,
        status:isReschedule?"approved":"pending",
        notes:bk.email||"",
      },"");
      if(isReschedule){
        await sb("bookings","PATCH",{status:"cancelled"},"?id=eq."+rescheduleOldId).catch(()=>{});
        sb("notifications","POST",{target_type:"all",title:"تعديل موعد",body:`${bk.name} عدّل موعده إلى ${bk.date} - ${bk.time}`,icon:"🔄"}).catch(()=>{});
        setRescheduleId(null);
      }
      const newBooking=inserted[0]||{};
      if(customerSession){
        const c=customers.find(x=>x.id===customerSession.id);
        if(c){
          const histItem={
            salonId:sid,
            salonName:salon?.name||"",
            date:bk.date,
            time:bk.time,
            services:bk.services,
            total:bk.total,
            rating:0,
            comment:"",
            bookingId:newBooking.id,
            status:"pending",
            phone:bk.phone||"",
          };
          const hist=[...(c.history||[]),histItem];
          // نحفظ في localStorage كحل احتياطي
          try{localStorage.setItem(`hist_${c.id}`,JSON.stringify(hist));}catch{}
          // نجرب Supabase - لو فشل نكمل بدونه
          try{await sb("customers","PATCH",{history:hist,favs:c.favs||[]},`?id=eq.${c.id}`);}catch{}
          setCustomers(p=>p.map(x=>x.id===c.id?{...x,history:hist}:x));
        }
      }
      toast$("🎉 تم إرسال طلب الحجز!");
      setView("home");
      await loadData();
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };
  const updateBookingStatus=async(sid,bid,status)=>{
    try{
      const salon=salons.find(s=>s.id===sid);
      if(!salon)return;
      const bk=salon.bookings.find(b=>b.id===bid);
      if(!bk)return;
      await sb("bookings","PATCH",{status},`?id=eq.${bid}`);
      const bkn=normPhone(bk.phone);
      const targets=bkn.length>=9?customers.filter(c=>normPhone(c.phone)===bkn):[];
      for(const c of targets){
        let changed=false;
        const hist=(c.history||[]).map(h=>{
          const byId=h.bookingId!=null&&(Number(h.bookingId)===Number(bid)||String(h.bookingId)===String(bid));
          const legacy=Number(h.salonId)===Number(sid)&&h.date===bk.date&&h.time===bk.time&&(!normPhone(h.phone)||normPhone(h.phone)===bkn);
          if(byId||legacy){
            const next={...h,status,bookingId:h.bookingId||bid,phone:h.phone||bk.phone||""};
            if(h.status!==next.status||Number(h.bookingId||0)!==Number(next.bookingId))changed=true;
            return next;
          }
          return h;
        });
        if(changed){
          try{
            await sb("customers","PATCH",{history:hist,favs:c.favs||[]},`?id=eq.${c.id}`);
            try{localStorage.setItem(`hist_${c.id}`,JSON.stringify(hist));}catch{}
          }catch{}
          setCustomers(p=>p.map(x=>x.id===c.id?{...x,history:hist}:x));
        }
      }
      toast$(status==="approved"?"✅ تم قبول الحجز":"تم تحديث حالة الحجز");
      await loadData();
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };

  const addExtraLoc=(r,g,c,v)=>{
    setExtraLoc(p=>{
      const copy=[...p];let ri=copy.find(x=>x.region===r);
      if(!ri){ri={region:r,govs:[]};copy.push(ri);}
      let gi=ri.govs.find(x=>(x.name||x)===g);
      if(!gi){gi={name:g,centers:[]};ri.govs.push(gi);}
      let ci=gi.centers?.find(x=>x===c);
      if(!ci&&c){gi.centers=gi.centers||[];if(!gi.centers.includes(c))gi.centers.push(c);}
      return copy;
    });
  };

  const govList    =fRegion?(allLoc.find(r=>r.region===fRegion)?.govs||[]):[];
  const centerList2=fGov   ?(govList.find(g=>(g.name||g)===fGov)?.centers||[]):[];
  const villageList=[];

  const customer=getCustomer();
  const favSet=new Set(customerFavs());

  const approvedSalons=salons.filter(s=>s.status==="approved");
  const parseLatLng=url=>{ if(!url)return null; const m=url.match(/[?&q=]*(-?\d+\.?\d*),(-?\d+\.?\d*)/); return m?{lat:+m[1],lng:+m[2]}:null; };
  const distance=(a,b)=>{ if(!a||!b)return Infinity; const dx=a.lat-b.lat,dy=a.lng-b.lng; return Math.sqrt(dx*dx+dy*dy)*111; };
  const minPrice=s=>{ const v=Object.values(s.prices||{}); return v.length?Math.min(...v):0; };
  const maxPrice=s=>{ const v=Object.values(s.prices||{}); return v.length?Math.max(...v):0; };
  
  let displaySalons=approvedSalons.filter(s=>{
    if(fRegion&&s.region!==fRegion)return false;
    if(fGov&&s.gov!==fGov)return false;
    if(fCenter&&s.center!==fCenter)return false;
    if(fVillage&&s.village!==fVillage)return false;
    if(search.trim()){
      const q=search.trim().toLowerCase();
      const hay=[s.name,s.owner,s.region,s.gov,s.center,s.village,s.address,...(s.services||[])].join(" ").toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
  // sort
  if(sortBy==="ratingHigh") displaySalons=[...displaySalons].sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if(sortBy==="ratingLow") displaySalons=[...displaySalons].sort((a,b)=>(a.rating||0)-(b.rating||0));
  else if(sortBy==="priceHigh") displaySalons=[...displaySalons].sort((a,b)=>maxPrice(b)-maxPrice(a));
  else if(sortBy==="priceLow") displaySalons=[...displaySalons].sort((a,b)=>minPrice(a)-minPrice(b));
  else if(sortBy==="nearest"&&userLoc) displaySalons=[...displaySalons].sort((a,b)=>distance(userLoc,parseLatLng(a.locationUrl))-distance(userLoc,parseLatLng(b.locationUrl)));

  const resetHome=()=>{
    setView("home");
    setSearch("");
    setSortBy("default");
    setFRegion("");setFGov("");setFCenter("");setFVillage("");
    setShowFavs(false);
  };

  const sharedProps={
    ownerSession,setOwnerSession,customerSession,setCustomerSession,
    setView,toast$,allLoc,addExtraLoc,
    salons,setSalons,approvedSalons,
    addSalon,
    addBooking,updateBookingStatus,loadData,refreshSalonBookings,rescheduleId,setRescheduleId,
    customers,setCustomers,
    reviews,setReviews,
    toggleFav,favSet,customer,
    selSalon,setSelSalon,
    onPage:(s)=>{setSelSalon(s);setView("salon");},
    fRegion,setFRegion:v=>{setFRegion(v);setFGov("");setFCenter("");setFVillage("");},
    fGov,setFGov:v=>{setFGov(v);setFCenter("");setFVillage("");},
    fCenter,setFCenter,
    fVillage,setFVillage,
    govList,villageList,centerList2,
    showFavs,setShowFavs,
    displaySalons,
    search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,settings,setSettings,
    socialLinks,setSocialLinks:updateSocial,
    handleCustomerLogin,
    darkMode,setDarkMode,
    compareSalons,setCompareSalons,
    handlePullRefresh,pullRefreshing,
    resetHome,
    persistUiToSupabase,
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#09112e 0%,#0d1535 45%,#111d42 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,fontFamily:"'Cairo',sans-serif",direction:"rtl"}}>
      <style>{CSS}</style>
      <DorkLogoSvg size={72}/>
      <div style={{color:"#d4a017",fontSize:14,fontWeight:700,letterSpacing:1}}>جارٍ تحميل البيانات...</div>
      <div style={{width:36,height:36,border:"3px solid rgba(212,160,23,.15)",borderTop:"3px solid #d4a017",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style dangerouslySetInnerHTML={{__html:"@keyframes spin{to{transform:rotate(360deg)}}"}} />
      {dbError&&<div style={{background:"#3a1a1a",color:"#e74c3c",padding:"12px 20px",borderRadius:10,fontSize:12,maxWidth:320,textAlign:"center",margin:"0 16px"}}>❌ خطأ في الاتصال بقاعدة البيانات:<br/><br/>{dbError}<br/><br/><small style={{color:"#aaa"}}>تحقق من الـ anon key في الكود</small></div>}
    </div>
  );

  return(
    <div style={G.app}>
      <div id="dork-bg" style={dorkBgStyle}/>
      <style>{CSS}</style>
      {toast&&<div style={{...G.toast,background:toast.type==="warn"?"#7a3a10":toast.type==="err"?"#7a1a1a":"#1a5c34"}}>{toast.msg}</div>}
      <TopBar {...sharedProps}/>
      <div style={{paddingTop:64}}>
        {view==="home"&&      <HomeView {...sharedProps}/>}
        {view==="register"&&  <RegisterView {...sharedProps}/>}
        {view==="book"&&selSalon&&<BookView salon={selSalon} {...sharedProps}/>}
        {view==="salon"&&selSalon&&<SalonPage salon={salons.find(s=>s.id===selSalon.id)||selSalon} {...sharedProps}/>}
        {view==="ownerLogin"&&<OwnerLogin {...sharedProps}/>}
        {view==="ownerDash"&& <OwnerDash  salon={salons.find(s=>s.id===ownerSession)} {...sharedProps}/>}
        {view==="custLogin"&& <CustomerLogin {...sharedProps}/>}
        {view==="custDash"&&  <CustomerDash customer={customer} {...sharedProps}/>}
        {view==="settings"&&  <SettingsView {...sharedProps}/>}
        {view==="nearMap"&&   <NearMapView salons={approvedSalons} setView={setView} setSelSalon={setSelSalon}/>}
        {view==="compare"&&   <CompareSalonsView salons={compareSalons} setView={setView} setSelSalon={setSelSalon}/>}
        {view==="notifs"&&    <NotifsView setView={setView}/>}
        {view==="allReviews"&&<AllReviewsView reviews={reviews} approvedSalons={approvedSalons} setSelSalon={setSelSalon} setView={setView}/>}
        {view==="salonReviews"&&selSalon&&<SalonReviewsView salon={salons.find(s=>s.id===selSalon.id)||selSalon} reviews={reviews} setView={setView}/>}
      </div>
    </div>
  );
}

// DorkLogoSvg imported from src/components/Logo.jsx

// ==============================================
//  TOP BAR - 3 role buttons on the LEFT
// ==============================================
const CSS=`
  :root {
    --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23;
    --pa5: rgba(212,160,23,.05); --pa07: rgba(212,160,23,.07); --pa08: rgba(212,160,23,.08);
    --pa12: rgba(212,160,23,.12); --pa15: rgba(212,160,23,.15); --pa18: rgba(212,160,23,.18);
    --pa2: rgba(212,160,23,.2); --pa25: rgba(212,160,23,.25); --pa3: rgba(212,160,23,.3);
    --pa4: rgba(212,160,23,.45);
    --grad: linear-gradient(135deg,#d4a017,#f0c040);
    --grad2: linear-gradient(135deg,#f0c040,#d4a017);
    --shell-bg: #0d0d1a; --surface-1: #13131f; --surface-2: #1a1a2e; --border-ui: #2a2a3a;
    --text-primary: #f0f0f0; --text-muted: #888;
  }
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{direction:rtl;font-family:'Cairo',sans-serif;background:var(--shell-bg);}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--p);border-radius:4px;}
  .hcard{transition:transform .18s,box-shadow .18s;} .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;}
  html:not(.dork-light) input[type=date]::-webkit-calendar-picker-indicator,
  html:not(.dork-light) input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;}
  html.dork-light select option{background:#f3f4f6;color:#1a1a2e;}
  button:active{opacity:.82;}
`;


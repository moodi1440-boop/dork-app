import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTranslation } from 'react-i18next';
import { SALON_LANGS, CLIENT_LANGS } from './src/i18n.js';

// رقم الإصدار — يُحقن تلقائياً من vite عند كل build
const APP_VERSION = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";

// تحديث تلقائي عند وجود إصدار جديد
(()=>{
  try{
    const stored=localStorage.getItem("dork_app_version");
    if(stored && stored!==APP_VERSION){
      localStorage.setItem("dork_app_version",APP_VERSION);
      // مسح كاش Service Worker ثم إعادة التحميل
      if("caches" in window){
        caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>window.location.reload(true));
      } else {
        window.location.reload(true);
      }
    } else {
      localStorage.setItem("dork_app_version",APP_VERSION);
    }
  }catch{}
})();

class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={err:null,info:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){this.setState({info:info?.componentStack||""});}
  render(){
    if(this.state.err)return(
      <div style={{minHeight:"100vh",background:"#09112e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:20,gap:12}}>
        <div style={{fontSize:32}}>⚠️</div>
        <div style={{color:"#e74c3c",fontSize:14,fontWeight:700}}>خطأ في التطبيق</div>
        <div style={{color:"var(--text-muted)",fontSize:11,background:"var(--surface-2)",padding:"12px 16px",borderRadius:8,maxWidth:340,wordBreak:"break-all",textAlign:"left",direction:"ltr"}}>{String(this.state.err)}</div>
        {this.state.info&&<div style={{color:"#666",fontSize:9,background:"#111",padding:"8px 12px",borderRadius:8,maxWidth:340,wordBreak:"break-all",textAlign:"left",direction:"ltr",maxHeight:120,overflow:"auto"}}>{this.state.info}</div>}
        <button onClick={()=>window.location.reload()} style={{background:"var(--gold)",color:"#000",border:"none",borderRadius:8,padding:"8px 20px",fontFamily:"'Cairo',sans-serif",fontWeight:700,cursor:"pointer"}}>إعادة تحميل</button>
      </div>
    );
    return this.props.children;
  }
}

// ==============================================
//  SUPABASE CLIENT
// ==============================================
const SUPABASE_URL    = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const SUPABASE_ANON   = "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

// Supabase JS client for Realtime subscriptions
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Helper function: الحصول على تاريخ اليوم بتوقيت السعودية (AST/GMT+3)
const getTodayDateInRiyadh = () =>
  new Date().toLocaleString("en-CA", { timeZone: "Asia/Riyadh" }).split(' ')[0];

async function sb(table, method, body, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ========== Firebase Cloud Messaging ==========
async function initializeFirebaseNotifications() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await loadFirebaseSDK();
    initializeFirebaseApp();
    const messaging = window.firebase.messaging();
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BPJC3oMO-HdxJa1WG7LjB1cP3k9qXMUTCIS2bKsAaWxbmK3uR0YQFiQRXHAWzwOJ64KlCXZ4X0YHmlYpQgVbla0";
    const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: swReg });
    if (token) {
      localStorage.setItem("fcm_token", token);
      try {
        let userType = null;
        let userId = null;
        try {
          const ow = localStorage.getItem("dork_owner");
          const cu = localStorage.getItem("dork_customer");
          if (ow) { userType = "salon"; userId = +ow; }
          else if (cu) { const cp = JSON.parse(cu); userType = "customer"; userId = cp.id; }
        } catch {}

        if (userType && userId) {
          await sb("fcm_tokens", "POST", {
            user_type: userType,
            user_id: userId,
            device_token: token,
            is_active: true
          });
        } else {
        }
      } catch (error) {
        console.warn("Token registration:", error.message);
      }
    }
    messaging.onMessage((payload) => {
      if (payload.notification) {
        sendNotif(payload.notification.title, payload.notification.body, "🔔", "all", payload.data?.booking_id);
      }
    });
  } catch (error) {
    console.error("FCM Error:", error.message);
  }
}

async function registerFcmTokenForUser(userType, userId) {
  try {
    const token = localStorage.getItem("fcm_token");
    if (!token || !userType || !userId) return;
    await sb("fcm_tokens", "POST", {
      user_type: userType,
      user_id: userId,
      device_token: token,
      is_active: true
    });
  } catch {}
}

function loadFirebaseSDK() {
  return new Promise((resolve, reject) => {
    if (window.firebase) {
      resolve();
      return;
    }
    const script1 = document.createElement("script");
    script1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
    script1.onload = () => {
      const script2 = document.createElement("script");
      script2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js";
      script2.onload = () => resolve();
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

function initializeFirebaseApp() {
  const firebase = window.firebase;
  if (firebase.apps.length > 0) return;
  firebase.initializeApp({
    apiKey: "AIzaSyBYCJYdJUi_oPfYlOzSukntj4YeLZFiVUY",
    projectId: "dork-app",
    messagingSenderId: "659823227621",
    appId: "1:659823227621:web:befaaa1b5063"
  });
}


// تحويل بيانات Supabase > شكل التطبيق
function toAppSalon(row) {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    ownerPhone: row.owner_phone,
    region: row.region,
    gov: row.gov,
    center: row.center,
    village: row.village,
    phone: row.phone,
    address: row.address,
    locationUrl: row.location_url,
    services: row.services || [],
    prices: row.prices || {},
    shiftEnabled: row.shift_enabled,
    shift1Start: row.shift1_start,
    shift1End: row.shift1_end,
    shift2Start: row.shift2_start,
    shift2End: row.shift2_end,
    workStart: row.work_start,
    workEnd: row.work_end,
    barbers: row.barbers || [],
    tone: row.tone,
    rating: row.rating,
    status: row.status,
    paused: row.paused || false,
    frozen: row.frozen || false,
    banned: row.banned || false,
    welcomeMsg: row.welcome_msg || "",
    closedDays: row.closed_days || [],
    slotMin: row.slot_min || 40,
    password: row.password || "",
    cancellationWindow: row.cancellation_window || 2,
    createdAt: row.created_at,
    bookings: [],
  };
}

// تحويل بيانات التطبيق > Supabase
function toDbSalon(s) {
  return {
    name: s.name,
    owner: s.owner,
    owner_phone: s.ownerPhone,
    region: s.region,
    gov: s.gov,
    center: s.center,
    village: s.village,
    phone: s.phone,
    address: s.address,
    location_url: s.locationUrl,
    services: s.services,
    prices: s.prices,
    shift_enabled: s.shiftEnabled,
    shift1_start: s.shift1Start,
    shift1_end: s.shift1End,
    shift2_start: s.shift2Start,
    shift2_end: s.shift2End,
    work_start: s.workStart,
    work_end: s.workEnd,
    barbers: s.barbers,
    tone: s.tone,
  };
}

function toAppBooking(row) {
  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    phone: row.phone,
    email: row.email||"",
    services: row.services || [],
    barberId: row.barber_id,
    barberName: row.barber_name,
    date: row.date,
    time: row.time,
    total: row.total,
    status: row.status,
  };
}

function toAppCustomer(row) {
  let history=row.history||[];
  let favs=row.favs||[];
  if(!history.length){
    try{const h=localStorage.getItem(`hist_${row.id}`);if(h)history=JSON.parse(h);}catch{}
  }
  if(!favs.length){
    try{const f=localStorage.getItem(`favs_${row.id}`);if(f)favs=JSON.parse(f);}catch{}
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email||"",
    password: row.password,
    googleUid: row.google_uid||"",
    favs,
    history,
    locationLat: row.location_lat||null,
    locationLng: row.location_lng||null,
    createdAt: row.created_at||new Date().toISOString(),
  };
}

// ==============================================
//  CONSTANTS
// ==============================================
const SLOT_MIN  = 40;

/** مصدر الحقيقة لإعدادات المنصة في جدول app_settings (Supabase) */
const DEFAULT_SOCIAL_LINKS={email:"",twitter:"",whatsapp:"",telegram:"",telegramUser:"",enabled:false,customFields:[]};

// ==============================================
//  TONES  - louder + barbershop themed
// ==============================================
const TONES = [
  { id:"scissors",  label:"مقص ✂"          },
  { id:"razor",     label:"ماكينة 🪒"       },
  { id:"bell",      label:"جرس الباب 🔔"    },
  { id:"cash",      label:"صندوق النقد 💰"  },
  { id:"welcome",   label:"أهلاً وسهلاً 🎉" },
  { id:"chime3",    label:"جرس ثلاثي 🎶"   },
  { id:"alert",     label:"تنبيه عاجل ⚡"   },
  { id:"classic",   label:"كلاسيك 🎵"       },
  { id:"barberpole",label:"عمود الحلاق 💈"  },
  { id:"clippers",  label:"ماكينة كهربائية ⚡"},
  { id:"towel",     label:"منشفة ساخنة 🧖"  },
  { id:"mirror",    label:"المرايا ✨"       },
  { id:"spray",     label:"رشاش الماء 💦"   },
  { id:"magazine",  label:"مجلة انتظار 📖"  },
  { id:"fanfare",   label:"فانفاري 🎺"       },
  { id:"vip",       label:"VIP دخول 👑"      },
];

const THEMES = {
  gold:      {primary:"#d4a017", light:"#f0c040", dark:"#a07810", lightest:"#f5d76e", rgb:"212,160,23"},
  emerald:   {primary:"#10b981", light:"#34d399", dark:"#047857", lightest:"#6ee7b7", rgb:"16,185,129"},
  sapphire:  {primary:"#3b82f6", light:"#60a5fa", dark:"#1e40af", lightest:"#93c5fd", rgb:"59,130,246"},
  royalBlue: {primary:"#1e3a8a", light:"#3b82f6", dark:"#172554", lightest:"#93c5fd", rgb:"30,58,138"},
  bronze:    {primary:"#8b5a2b", light:"#c9a227", dark:"#5c3d1a", lightest:"#e8c97a", rgb:"139,90,43"},
  rose:      {primary:"#ec4899", light:"#f472b6", dark:"#9d174d", lightest:"#f9a8d4", rgb:"236,72,153"},
  violet:    {primary:"#8b5cf6", light:"#a78bfa", dark:"#5b21b6", lightest:"#c4b5fd", rgb:"139,92,246"},
  crimson:   {primary:"#ef4444", light:"#f87171", dark:"#991b1b", lightest:"#fca5a5", rgb:"239,68,68"},
  teal:      {primary:"#0d9488", light:"#14b8a6", dark:"#0f766e", lightest:"#5eead4", rgb:"13,148,136"},
  coral:     {primary:"#f97316", light:"#fb923c", dark:"#c2410c", lightest:"#fed7aa", rgb:"249,115,22"},
  fuchsia:   {primary:"#d946ef", light:"#e879f9", dark:"#a21caf", lightest:"#f5d0fe", rgb:"217,70,239"},
  wine:      {primary:"#9f1239", light:"#e11d48", dark:"#881337", lightest:"#fda4af", rgb:"159,18,57"},
  forest:    {primary:"#15803d", light:"#22c55e", dark:"#166534", lightest:"#86efac", rgb:"21,128,61"},
  lime:      {primary:"#65a30d", light:"#84cc16", dark:"#3f6212", lightest:"#d9f99d", rgb:"101,163,13"},
  sky:       {primary:"#0284c7", light:"#38bdf8", dark:"#075985", lightest:"#bae6fd", rgb:"2,132,199"},
};

const BACKGROUNDS=[
  {id:"none",    label:"بلا خلفية",    emoji:"⬛", style:{background:"var(--bg-input)",backgroundImage:"none"}},
  {id:"stars",   label:"نجوم",          emoji:"✨", style:{background:"radial-gradient(ellipse at top,#1a1a3a 0%,#0d0d1a 70%)",backgroundImage:"radial-gradient(circle,rgba(255,255,255,.08) 1px,transparent 1px)",backgroundSize:"40px 40px"}},
  {id:"grid",    label:"شبكة",          emoji:"🔲", style:{background:"var(--bg-input)",backgroundImage:"linear-gradient(rgba(var(--gold-rgb),.05) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--gold-rgb),.05) 1px,transparent 1px)",backgroundSize:"30px 30px"}},
  {id:"waves",   label:"أمواج",         emoji:"🌊", style:{background:"linear-gradient(180deg,#0d0d1a 0%,#0a1628 50%,#0d0d1a 100%)",backgroundImage:"none"}},
  {id:"marble",  label:"رخام",          emoji:"🪨", style:{background:"linear-gradient(135deg,#111118 25%,#1a1a2a 25%,#1a1a2a 50%,#111118 50%,#111118 75%,#1a1a2a 75%)",backgroundSize:"20px 20px",backgroundImage:"none"}},
  {id:"circuit", label:"دوائر",         emoji:"🔌", style:{background:"var(--bg-input)",backgroundImage:"radial-gradient(circle at 50% 50%,rgba(var(--gold-rgb),.03) 0%,transparent 60%)"}},
  {id:"royal",   label:"ملكي",          emoji:"👑", style:{
    background:"linear-gradient(160deg,#12081f 0%,#1a0a28 45%,#0f0818 100%)",
    backgroundImage:"radial-gradient(ellipse 90% 45% at 50% -15%, rgba(var(--gold-rgb),.18), transparent), radial-gradient(circle at 100% 100%, rgba(91,33,182,.14), transparent 55%)",
  }},
  {id:"tech",    label:"تقني",          emoji:"⚡", style:{
    background:"#050a12",
    backgroundImage:"linear-gradient(rgba(56,189,248,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.07) 1px,transparent 1px), radial-gradient(ellipse 100% 40% at 50% 0%, rgba(34,211,238,.09), transparent 60%)",
    backgroundSize:"22px 22px,22px 22px,100% 100%",
  }},
  {id:"goldMarble",label:"رخام ذهبي",   emoji:"✦", style:{
    background:"linear-gradient(118deg,#141210 0%,#1c1812 30%,#12100c 60%,#1a1612 100%)",
    backgroundImage:"repeating-linear-gradient(-35deg,transparent,transparent 3px,rgba(var(--gold-rgb),.05) 3px,rgba(var(--gold-rgb),.05) 6px), radial-gradient(ellipse 70% 50% at 25% 15%, rgba(var(--gold-rgb),.14), transparent 55%)",
  }},
];

/** أوضاع فاتحة لطبقة الخلفية خلف المحتوى */
const BG_LIGHT_STYLES={
  none:{background:"#eef0f6",backgroundImage:"none",backgroundSize:"auto"},
  stars:{background:"linear-gradient(180deg,#e4e8f4 0%,#f4f5fb 100%)",backgroundImage:"radial-gradient(circle,rgba(30,58,138,.07) 1px,transparent 1px)",backgroundSize:"40px 40px"},
  grid:{background:"#eef0f6",backgroundImage:"linear-gradient(rgba(30,58,138,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,.06) 1px,transparent 1px)",backgroundSize:"30px 30px"},
  waves:{background:"linear-gradient(180deg,#f0f2f8 0%,#e2e8f4 50%,#f0f2f8 100%)",backgroundImage:"none"},
  marble:{background:"linear-gradient(135deg,#f8f7f5 25%,#ece8e4 25%,#ece8e4 50%,#f8f7f5 50%,#f8f7f5 75%,#ece8e4 75%)",backgroundSize:"20px 20px",backgroundImage:"none"},
  circuit:{background:"#eef1f8",backgroundImage:"radial-gradient(circle at 50% 40%,rgba(59,130,246,.06) 0%,transparent 65%)"},
  royal:{background:"linear-gradient(165deg,#ede8f5 0%,#e8e4f2 50%,#f2f0fa 100%)",backgroundImage:"radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,.12), transparent), radial-gradient(circle at 100% 100%, rgba(var(--gold-rgb),.08), transparent 50%)"},
  tech:{background:"#f0f4fa",backgroundImage:"linear-gradient(rgba(14,116,144,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(14,116,144,.05) 1px,transparent 1px), radial-gradient(ellipse 100% 35% at 50% 0%, rgba(56,189,248,.1), transparent 55%)",backgroundSize:"22px 22px,22px 22px,100% 100%"},
  goldMarble:{background:"linear-gradient(120deg,#faf8f5 0%,#f3efe8 45%,#faf7f2 100%)",backgroundImage:"repeating-linear-gradient(-35deg,transparent,transparent 3px,rgba(166,124,41,.06) 3px,rgba(166,124,41,.06) 6px), radial-gradient(ellipse 65% 45% at 30% 10%, rgba(201,162,39,.12), transparent 50%)"},
};

function normalizeBgId(id){
  if(BACKGROUNDS.some(b=>b.id===id))return id;
  return"none";
}

function buildDorkBgStyle(bgId,darkMode){
  const id=normalizeBgId(bgId);
  const base={position:"fixed",inset:0,zIndex:-1,pointerEvents:"none"};
  if(!darkMode){
    const L=BG_LIGHT_STYLES[id]||BG_LIGHT_STYLES.none;
    return{...base,...L};
  }
  const bg=BACKGROUNDS.find(b=>b.id===id)||BACKGROUNDS[0];
  return{...base,...bg.style};
}

function playTone(id, vol=0.7){
  try{
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    const ctx=new A();
    const g=ctx.createGain(); g.gain.value=vol; g.connect(ctx.destination);
    const beep=(freq,start,dur,type="sine",v=vol)=>{
      const o=ctx.createOscillator(),gn=ctx.createGain();
      o.type=type; o.frequency.value=freq;
      gn.gain.setValueAtTime(v,ctx.currentTime+start);
      gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+start+dur);
      o.connect(gn); gn.connect(ctx.destination);
      o.start(ctx.currentTime+start); o.stop(ctx.currentTime+start+dur);
    };
    const plays={
      scissors:   ()=>{ beep(1200,0,.05,"square",.6); beep(900,0.08,.05,"square",.6); beep(1200,0.16,.05,"square",.6); beep(900,0.24,.05,"square",.6); },
      razor:      ()=>{ [0,.06,.12,.18,.24].forEach(t=>beep(80+Math.random()*40,t,.07,"sawtooth",.7)); },
      bell:       ()=>{ beep(880,0,.6,"sine",.8); beep(1100,.15,.5,"sine",.6); beep(1320,.3,.8,"sine",.5); },
      cash:       ()=>{ beep(1800,0,.04,"square",.7); beep(2400,.05,.04,"square",.6); beep(1200,.12,.3,"triangle",.5); },
      welcome:    ()=>{ [523,659,784,1047].forEach((f,i)=>beep(f,i*.12,.25,"sine",.7)); },
      chime3:     ()=>{ [[880,.0],[1100,.18],[1320,.36],[1100,.54],[880,.72]].forEach(([f,t])=>beep(f,t,.25,"sine",.7)); },
      alert:      ()=>{ [0,.1,.2].forEach(t=>beep(1400,t,.08,"square",.8)); },
      classic:    ()=>{ [[440,0],[554,.15],[659,.3],[880,.5]].forEach(([f,t])=>beep(f,t,.3,"triangle",.7)); },
      barberpole: ()=>{ [440,550,660,770,880,770,660,550].forEach((f,i)=>beep(f,i*.1,.15,"sine",.6)); },
      clippers:   ()=>{ [0,.04,.08,.12,.16,.20,.24,.28].forEach(t=>beep(150+Math.random()*50,t,.05,"sawtooth",.5)); },
      towel:      ()=>{ beep(300,0,.2,"sine",.4); beep(400,.2,.3,"sine",.5); beep(500,.4,.4,"sine",.6); },
      mirror:     ()=>{ [[1047,0],[1319,.1],[1568,.2],[2093,.35]].forEach(([f,t])=>beep(f,t,.2,"sine",.7)); },
      spray:      ()=>{ [0,.05,.1,.15,.2,.25,.3].forEach(t=>beep(2000+Math.random()*500,t,.04,"square",.3)); },
      magazine:   ()=>{ beep(440,0,.1,"triangle",.5); beep(330,.15,.1,"triangle",.5); beep(440,.3,.3,"triangle",.6); },
      fanfare:    ()=>{ [[523,0],[659,.1],[784,.2],[1047,.3],[784,.5],[1047,.65]].forEach(([f,t])=>beep(f,t,.2,"square",.6)); },
      vip:        ()=>{ [[1047,0],[880,.15],[659,.3],[784,.45],[1047,.6],[1319,.8]].forEach(([f,t])=>beep(f,t,.25,"sine",.7)); },
    };
    plays[id]?.();
  }catch(e){}
}

// ==============================================
//  PUSH NOTIFICATIONS
// ==============================================
function getCustomerClassification(customer){
  const history=(customer?.history||[]);
  const total=history.filter(h=>h.status!=="rejected").length;
  const completed=history.filter(h=>h.status==="approved").length;
  const noShows=history.filter(h=>h.status==="cancelled"&&h.attendance==="no_show").length;
  const lateCancels=history.filter(h=>h.status==="cancelled").length;
  if(lateCancels>=3||noShows>=3)return{label:"⚠️ غير ملتزم",color:"#e74c3c",key:"unreliable"};
  if(total===0)return{label:"🆕 جديد",color:"#3498db",key:"new"};
  if(completed>=5&&lateCancels===0)return{label:"🌟 مميز",color:"var(--gold)",key:"vip"};
  if(completed>=2&&lateCancels<=1)return{label:"✅ منتظم",color:"#27ae60",key:"regular"};
  return{label:"🆕 جديد",color:"#3498db",key:"new"};
}

async function requestNotifPermission(){
  if(!("Notification" in window))return false;
  if(Notification.permission==="granted")return true;
  const p=await Notification.requestPermission();
  return p==="granted";
}

function sendNotif(title,body,icon="✂",targetType="all",targetId=null){
  // زيادة عداد الجرس
  const count=parseInt(localStorage.getItem("dork_notif_count")||"0");
  localStorage.setItem("dork_notif_count",String(count+1));
  // حفظ الإشعار محلياً
  try{
    const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
    notifs.unshift({id:Date.now(),title,body,icon,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),read:false});
    localStorage.setItem("dork_notifs",JSON.stringify(notifs.slice(0,50)));
  }catch{}
  // حفظ الإشعار في Supabase لمزامنة الويب
  sb("notifications","POST",{target_type:targetType,target_id:targetId,title,body,icon}).catch(()=>{});
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{new Notification(`${icon} ${title}`,{body,icon:"/favicon.ico",dir:"rtl",lang:"ar"});}catch{}
}

// طلب الإذن عند تحميل التطبيق
if(typeof window!=="undefined"){
  setTimeout(()=>requestNotifPermission(),3000);
}
//  المصدر: الخطة الموحدة للمراكز الإدارية ١٤٤٧هـ
//  كل منطقة > محافظات > مراكز إدارية
// ==============================================
const BASE_LOC=[
  {region:"الرياض",govs:[
    {name:"الرياض",centers:["عرقة","الحاير","هيت","العماجية","لبن","بنبان","العزة بالحائر","دبيان"]},
    {name:"الدرعية",centers:["العيينه والجبيله","سدوس","العمارية","بوضه","سلطانه","حزوى"]},
    {name:"الخرج",centers:["الهياثم","السلمية","اليمامة","الوسيطاء","الرفيعة","الرفايع","البديعة","سميح","الناصفة","بدع ابن عرفج","السهباء","مقبولة","البديع","الشكرة","التوضحية","البره","الشديدة","الفيحاء","العزيزية","الشمال","النايفية"]},
    {name:"الدوادمي",centers:["ساجر","نفي","عروى","الجمش","القاعية","ماسل","رفائع الجمش","عرجاء","الحفيرة","خف","مصده","ارطاوي حليت","القرارة","أبو جلال","كبشان","عسيلة","شبيرمة","أوضاخ","منيفة جلوي","الأرطاوي الجديد","جهام","زخام","أم سليم بالسر","الدمثي","عريفجان","الشعراء","البجادية","السر","الأرطاوي","حاضرة نفي","السكران","القرين","البرود","الأثلة","أفقره","الرشاوية","عين القنور","مغيراء","العقلة","العبل","الحيد","ارطاوي الحماميد","بدائع ابن نجم","الفقارة","الحفنة","علياء","الشفلحية","مشرفة نفي","منية","العاذرية","الخالدية","خريمان","عشيران","المستجدة","المطاوي","النبوان","فيضة المفص","الودي","عريبدة","عواضة","عصام","عنز","أم رضمة","جفناء","حديجة","سرورة","نجخ","مغيب","عين الصوينع","ارطاوي الرقاص","عصماء","أم زموع","جفن","الخفيفية","اونيلان بالسر","عشيرة المخامر","البراحة","العلوه","الظلماوي","أبو ركب","الصالحية","الوطاة","عسيلة الوسطى","العازمية"]},
    {name:"المجمعة",centers:["حوطه سدير","جلاجل","روضة سدير","الأرطاوية","تمير","حرمه","الفروثي","جراب","أم الجماجم","القاعية بسدير","أم رجوم","عودة سدير","مشاش عوض","العطار","الجنوبية بسدير","عشيرة سدير","التويم","الخيس","الحصون","العمار بسدير","الرويضة بسدير","الداخلة","الخطامة","مبايض","الجنيفي","المعشبه","الحاير بسدير","وشي","الحفص","بويضة بسدير","الشعب","مهدة","حويمية","البرزة","الشحمة","أم سدرة","أم سديرة","مشذوبة"]},
    {name:"القويعية",centers:["الخاصرة","الرويضه بالعرض","سنام","الحرملية","الرفايع","حلبان","الفويلق","مزعل","الخروعيه","صبحاء","أم سريحه","روضة الشيابين","بدائع العصمه","المليحاء","أم نخله","الخنبقية","طمي","البدع بسنام","صبحاء الشعيب","لجعه","تبراك والجله","الفهيدات","الخرائق بحلبان","نخيلان","حجيلاء","محيرقه","وادي عصيل","حلاة الجله","تبراك","وادي الخنقه","قنيفذه","الجفاره","جزالا","الامار","جزيل","دسمان","الخروعية القديمه","الفويلق الشمالي","الخاصرة القديمة","الخالدية","الجلة القديم","المديفع","أم جدير","الجله الجنوبي","الجلة الشمالي","العدامة","الجله","فيضة أعبلية","صبحاء القديمة"]},
    {name:"وادي الدواسر",centers:["الخماسين","آل معدي","الصالحية","كمدة","آل أبوسباع","القويز","الولامين","آل وثيلة","الحرارشة","آل بريك","آل براز","الزويراء","الشرافاء","الفايزية","النويعمة","الفاو","الضيرين","المخاريم","الطوال","اللدام","نزوى","المعتلاء","الخماسين الشمالي","الحناتيش","آل عريمة","آل راشد","المعتلا القديم","آل عويمر","المصارير","مقابل","الريان","المعيذر الجنوبي","صبحاء بالولامين الجنوبي","بهجه","صيحه","العسيلة","بلثقاء","طويق","الثمامية","النميص","الحزم","الحمره"]},
    {name:"الأفلاج",centers:["الهدار","الحمر","البديع الشمالي","البديع الجنوبي","السيح الشمالي","حراضه","واسط","السيح الجنوبي","رفاع السيح الشمالي","ستاره","الغيل","الروضه","الصغو","العمار","السيج","مروان","سويدان","قصر القاسم","الهدار الجنوبي","الوداعين","وسيله","الخرفه","الخالدية","الفيصليه","العجلية","الصالحية","الهمجة"]},
    {name:"الزلفي",centers:["علقه","سمنان","الثويرات","الحمودية","الروضه","البعيثه","المستوي"]},
    {name:"شقراء",centers:["القصب","أشيقر","الجريفه","الوقف","الصوح","الحريق بالوشم","بادية الداهنه","حاضرة الداهنة","غسله","المشاش","الفرعه بالوشم"]},
    {name:"حوطة بني تميم",centers:["الحلوة","العطيان","القبابنة","وادي برك","الحيانية","القويع","مصده","آل بريك","الفرشة"]},
    {name:"عفيف",centers:["الحوميات","الجمانية","ابرقية","عبلاء","أم ارطاء","بدائع العضيان","الخضاره","الأشعرية","الحنايج","المردمة","اللنسيات","الصقرة","محاماة بن زريبة","المكلاة","وبرة","البحرة","المعلق","محاماة ابن مصوي","الشواطن","أبو عشرة","الجثوم","بطاحة","الكفية","روضة عسعس","فيضة نومان","دارة المردمة","العسيبي","الصفوية","المنصورة","أم سرحه","الحمادة"]},
    {name:"السليل",centers:["تمرة","أم العلقاء","آل حنيش","آل محمد","ريداء","خيران","فوار العريقات","آل هميل","آل حجي","آل خليف","الشيدية","الدواسية","الخالدية"]},
    {name:"ضرما",centers:["قصور آل مقبل","جو","الغزيز","السيباني","الجافورة","البدائع","العليا"]},
    {name:"المزاحمية",centers:["البخراء","الجفير","الحويرة بنساح","حفيرة نساح","آل حفيان","المشاعلة","الفيصلية","الزبائر","اللقف","الصدر الأعلى"]},
    {name:"رماح",centers:["أبوثنين","شويه","الرمحية","العيطلية","حفر العتش","العمانية","بني عامر","الفراج","الصملة","آل عوجان","المزيرع","آل علي","الزيالانه","الحفنه","الشلاش","آل غرير","المجفلية","آل بليدان","سعد","الأزمع","الباني","العلا","الفيحانية","الطيري"]},
    {name:"ثادق",centers:["رغبة","البير","الحسي","الصفرات","رويضة السهول","مشاش السهول","رويغب","دبيجة","الخاتلة"]},
    {name:"حريملاء",centers:["ملهم","صلبوخ","البره","القرينة","العويند","غيانة","دقلة","البويردة"]},
    {name:"الحريق",centers:["نعام","المفيجر","أبو رمل","الربواء"]},
    {name:"الغاط",centers:["مليح","أبا الصلابيخ","العبدلية"]},
    {name:"مرات",centers:["ثرمداء","أثيثيه","لبخه","حويته"]},
    {name:"الدلم",centers:["المحمدي","ماوان","أوثيلان","العين","الرغيب","نعجان","الضبيعة","الحزم","السلمانية"]},
    {name:"الرين",centers:["الرين الأعلى","الناصفة بالرين","البدائع بالرين","الرين القديم","عنان","العفج بالرين","العمق","الرجع بالرين","عبليه بالرين","الحصاة","قبيبان","المعيزيلة","المثناه بالرين","المجذمية","هجرة عشق","المليحه الطويلة","خيم الحصاة","الغريبية بالرين","عينينان","الحصاة القصوى","الفرعه بالرين","لجع","الرفايع بالرين","الرفاع بالرين","الهفهوف","حريملاء الحصاة","الربواء","الحلوة بالرين","الحجاجي","السحيمية","الرقمية","السيح","مويسل","الرواماء","المغزالية","جاحد","شلاح","حفاير الوهوهي","حفبرة صماخ","ذعيفان","حميمان","متعبة","الفوارة","أم سلم"]},
  ]},
  {region:"مكة المكرمة",govs:[
    {name:"مكة المكرمة",centers:["المضيق","الزيمة","المطارفة","جعرانة","بني عمير","البجيدي","وادي نخله"]},
    {name:"جدة",centers:["ثول","ذهبان"]},
    {name:"الطائف",centers:["الهدا","المحاني","السيل","الشفا","عشيرة","السديرة","الفيصلية","قيا","الفريع","آل مشعان","العطيف","الفيضة","شقصان","الحفاير","العاند","العقيق","وادي كلاخ","دزبج"]},
    {name:"القنفذة",centers:["القوز","حلي","المضيلف","سبت الجاره","دوقة","كنانة","أحد بني زيد","ثلاثاء الخرم","خميس حرب"]},
    {name:"الليث",centers:["غميقه","الشواق","يلملم","الغالة","السعدية","بني يزيد","خذم","سعيا","الرهوة","حفار","صلاق","مجيرمة"]},
    {name:"رابغ",centers:["حجر","مستورة","النويبع","القضيمة","الأبواء","مغينية"]},
    {name:"الجموم",centers:["عسفان","مدركة","هدى الشام","رهط","بني مسعود","عين شمس","الريان","القفيف"]},
    {name:"خليص",centers:["الظلبية والجمعة","أم الجرم","الخوار","البرزه","وادي قديد","ستارة","حشاش","السهم","النخيل"]},
    {name:"الكامل",centers:["الغريف","الحرة","شمنصير","الحنو"]},
    {name:"الخرمة",centers:["أبو مروة","الغريف","ظليم","الخبراء"]},
    {name:"رنية",centers:["حدي","خدان","الأملح","ورشة","الغافه","العفيرية","العويلة","الشقران"]},
    {name:"تربة",centers:["القوامة","الحشرج","شعر","العصلة","الخضيراء","العرقين","العلبة","الخالدية","العلاوة","الربع"]},
    {name:"ميسان",centers:["بني سعد","حداد بني مالك","القريع بني مالك","ثقيف","الصور","أبو راكه"]},
    {name:"المويه",centers:["الزربان","أم الدوم","رضوان","ظلم","ملحه","الرفايع","النصائف","البحره","الحفر","المزيرعة","الرويبية الصهلوج","الراغية","الركنه","دغيبجه","مشاش الطارف","العوالي","مران"]},
    {name:"أضم",centers:["الجائزة","ربوع العين","حقال","المرقبان"]},
    {name:"العرضيات",centers:["نمرة","ثريبان","الويد","الرايم","حلحال بثريبان","قنونا"]},
    {name:"بحره",centers:["أم الراكه","الشعيبة","دفاق","البيضاء"]},
  ]},
  {region:"المدينة المنورة",govs:[
    {name:"المدينة المنورة",centers:["المليليح","المندسه","شجوى","الفريش","أبيار الماشي","الفقرة","الراغية","الصويدرة","العوينة","الحار","الضميرية","ضعه","غراب","حزرة","المسبعة","دثير","اليتمه"]},
    {name:"ينبع",centers:["ينبع النخل","الجابرية","تلعة نزا","رخو","نبط","خمال","السليم","الفقعلي","النباة","الهيم","الشرجة"]},
    {name:"العلا",centers:["مغيراء","الحجر","فضلا","العذيب","شلال","البريكة","النجيل","الورد","العين الجديدة","الجديده","بئر الأراك","وقير"]},
    {name:"المهد",centers:["السويرقية","أرن","صفينة","ثرب","العمق","الحره","حاذه","الأصيحر","المويهية","الصعبية","السريحية","هبا","القويعية","الهرارة","الرويضة","الركنة"]},
    {name:"بدر",centers:["المسيجيد","الواسطة","القاحة","الرايس","الشفية","السديرة","طاشا","بئر الروحاء"]},
    {name:"خيبر",centers:["العشاش","الصلصلة","العيينة","عشرة","الحفيرة","الثمد","جدعا","العرايد"]},
    {name:"الحناكية",centers:["الحسو","النخيل","عرجاء","طلال","الهميج","هدبان","بلغه","صخيبره","الشقران","بطحى"]},
    {name:"العيص",centers:["سليلة جهينه","المربع","المراميث","الأبرق","الهجر الثلاث","أميره","السليله","جراجر","البديع","المثلث"]},
    {name:"وادي الفرع",centers:["الأكحل","أبو ضباع","الحمنه","الهندية","أم البرك","صوري","مغيسل"]},
  ]},
  {region:"القصيم",govs:[
    {name:"بريدة",centers:["الشقة","البصر","الطرفية الشرقية","الهدية","خضيراء","رواق","الخضر والوجيعان","القصيعة","اللسيب","حويلان","المريديسية","جرية العمران وخب ثنيان","الدعيسة","العريمضي","الصباخ","المليداء","الغماس","خب روضان","ضراس","خب البريدي"]},
    {name:"عنيزة",centers:["الروغاني","وادي الجناح","وادي أبوعلي","العوشزية"]},
    {name:"الرس",centers:["الشبيكية","الخشيبي","قصر بن عقيل","دخنة","الشنانة","الخريشاء","الدحلة","المطية","الغيدانية"]},
    {name:"المذنب",centers:["الثامرية","العمار","روضة الحسو","المريع","الخرماء","الخرماء الشمالية","سامودة","ربيق","الملقاء"]},
    {name:"البكيرية",centers:["الهلالية","الشيحية","الفويلق","كحلة","الضلفعة","الأرطاوي","مشاش جرود","الفيضة","النجيبة","ساق"]},
    {name:"البدائع",centers:["الأبرق","دهيماء","علباء","الأحمدية"]},
    {name:"الأسياح",centers:["البطين","المدّرج","طلحة","خصيبة","أبا الورود","ضيدة","حنيظل","طريف الأسياح","البرود","التنومة","الجعلة","البندرية","البعيثة","قبه"]},
    {name:"النبهانية",centers:["ثادج","اللغبية","القيصومة","البتراء","الروضة","عطاء","عطلي","الخطيم","مطربة","البصيري","البعجاء","البديعة","عريفجان ساحوق","الطرفية الغربية","الافيهد","دويج"]},
    {name:"عيون الجواء",centers:["القرعاء","قصيباء","محير الترمس","شري","القوارة","الكدادية","البسيتين","غاف الجواء","روض الجواء","أوثال","الطراق","المخرم","كبد"]},
    {name:"رياض الخبراء",centers:["الفوارة","الخبراء","القرين","الدليمية","الذيبية","النمرية","السيح والحجازيه","صبيح","المطيوي الشمالي"]},
    {name:"الشماسية",centers:["الربيعية","أم حزم","النبقية"]},
    {name:"عقلة الصقور",centers:["العقلة","الطرفاوي","قطن","المحيلاني","الحيسونية","النقرة","امباري","ذوقان الركايا","فيضة ذيبان","الهميلية","العماير","شقران الحاجر","الجفن"]},
    {name:"ضرية",centers:["مسكة","الصمعورية","سالم","الظاهرية","بلقياء الجنوبية","بدائع الغبيان","العاقر","المطيوي الجنوبي","هرمولة","فيضة الريشية","القاعية","صعينين","ليم"]},
    {name:"أبانات",centers:["الهمجة","خضراء","الحنينية","المرموثة","الزهيرية","الصليبي","الجرذاوية","الركنة","رفايع اللهيب","الغضياء والسلمات","فياضة","مظيفير","وادي النخيل","رفايع الحميمة","رفايع الحجرة"]},
  ]},
  {region:"الشرقية",govs:[
    {name:"الدمام",centers:["أبو قميص"]},
    {name:"الأحساء",centers:["سحمة","ذاعبلوتن","جودة","عريعرة","يبرين","الخن","الحفايير","الغويبة","أم ربيعة","أم أثلة","العيون","العضيلية","حرض","خريص","العقير","فضيلة","هجرة الزايدية","أم العراد","هجرة السيح","الطويلة","هجرة شجعه","مريطبة","الدهو","السالمية"]},
    {name:"حفر الباطن",centers:["القيصومة","القلت","المتياهة الجنوبية","الرقعي","الصداوي","النظيم","أم قليب","الذيبية","السعيرة","الحماطيات","سامودة","النايفية","هجرة أم عشر","المطرقة","الشفاء","هجرة الصفيري","الفاو الشمالي","السلمانية","الحيرا","مناخ","خبيراء","معرج السوبان","أم كداد"]},
    {name:"الجبيل",centers:["جزيرة جنة","رأس الخير"]},
    {name:"القطيف",centers:["سيهات","صفوى","النابية","أم الساهك","جزيرة دارين وتاروث"]},
    {name:"الخبر",centers:["الظهران","جسر الملك فهد"]},
    {name:"الخفجي",centers:["السفانية","هجرة أبرق الكبريت"]},
    {name:"أبقيق",centers:["يكرب","عين دار الجديدة","الراجحة","فودة","عين دار البلد","الدغيمية","صلاصل","الفردانية","خور الذيابة","الجيشية"]},
    {name:"النعيرية",centers:["الصرار","مليجة","حنيذ","القليب","عتيق","الكهفة","الحسي","الصحاف","تاج","الونان","العيينة","الزين","نطاع","السلمانية","هجرة النقيرة","غنوى","هجرة المليحة","أم السواد","الهليسية","مغطي","الحناه","شفيه","جنوب الصرار","أبو ميركه","عرج"]},
    {name:"قرية العليا",centers:["الرفيعة","اللهابة","الشيط","مشله","العاذرية","الشيحية","الفريدة","الشامية","اللصافة","أم الشفلح","أم عقلا","أم غور","القرعاء","البويبيات","مطربة","هجرة المحوى"]},
    {name:"العديد",centers:["النخلة","البطحاء","أنباك","وسيع","عردة","أم الزمول"]},
  ]},
  {region:"عسير",govs:[
    {name:"أبها",centers:["السودة","مدينة سلطان","بلحمر","الشعف","بلسمر","مربه","طبب","تمنيه","الماوين","صدر وائلة","بيحان","الأثب","حوراء بلسمر","المروءة","الجهيفه","ردوم"]},
    {name:"خميس مشيط",centers:["تندحة","وادي بن هشبل","يعرى","خيبر الجنوب","الحفاير","الرونه","العماره","الحيمة","الصفية","الجزيرة","السليل"]},
    {name:"بيشة",centers:["النقيع","الحازمي","صمخ","الثنية","تبالة","الجعبة","وادي ترج","القوباء","العبلاء","الدحو","الجنينة","مهر","سد الملك فهد","الصور","الرس","العطف"]},
    {name:"النماص",centers:["بني عمرو","السرح","وادي زيد"]},
    {name:"محايل عسير",centers:["قنا","بحر أبو سكينة","تهامة بلسمر وبلأحمر","السعيدة","خلال","حميد العلايا","خيم","حبطن","وادي تيه","السلام"]},
    {name:"سراة عبيدة",centers:["العرقين","العسران","سبت بني بشر","جوف آل معمر","عين اللوي"]},
    {name:"تثليث",centers:["أبرق النعام","القبرة","حبية","الحمضة","الزرق","جاش","كحلان","واسط"]},
    {name:"رجال ألمع",centers:["حسوة","الحبيل","الحريضة","روام","وسانب","مفرغ السيل والمجمعة"]},
    {name:"أحد رفيدة",centers:["الواديين","الفرعين","شعف جارمه"]},
    {name:"ظهران الجنوب",centers:["علب","الحماد","الحمرة"]},
    {name:"بلقرن",centers:["البشائر","عفراء","خثعم","باشوت","آل سلمة","طلالا","شواص","شعف بلقرن","الشفاء"]},
    {name:"المجاردة",centers:["ثريبان","عبس","أحد ثريبان","ختبه","خاط"]},
    {name:"تنومة",centers:["منصبة"]},
    {name:"طريب",centers:["العرين","المضه","الصبيخة","الغضاه","عرقة آل سليمان","الخنقة","ملحة الحباب"]},
    {name:"بارق",centers:["سيالة والسليم","ثلوث المنظر","جمعة ربيعة المقاطره"]},
    {name:"البرك",centers:["القحمه","المرصد","ذهبان","عمق","الفيض الساحلي"]},
    {name:"الحرجة",centers:["الفيض","النعضاء","الغول","الرفغه"]},
    {name:"الأمواه",centers:["العين","الفرع","ثجر سويدان","العمائر","النهدين","الرهوه","العزيزيه","بيضان"]},
    {name:"الفرشة",centers:["الربوعه","كحلا","الجوه","وادي الحيا","وادي سريان","خشم عنقار","الغائل"]},
  ]},
  {region:"تبوك",govs:[
    {name:"تبوك",centers:["شقري","حالة عمار","بجدة","بئر بن هرماس","رحيب","اللوز","الأخضر","البديعة","عيينة","حاج","السرو","الظلفة","ونعمى"]},
    {name:"الوجه",centers:["المنجور","أبو القزاز","بداء","خرباء","النابع","الكر","عنتر","الخرار","السديد","الرس","أبو راكة","الفارعة","النشيفة","الجو"]},
    {name:"ضباء",centers:["شواق","شرماء","صدر","الموبلح","صر","الديسه","شغب","رأس الخريطة","العمود","نابع داما","أبو سلمة"]},
    {name:"تيماء",centers:["الجهراء","فجر","القليبة","الكتيب","عردة","المعظم","العسافية","أبيط","مديسيس","الحزم","الجديد"]},
    {name:"أملج",centers:["الحرة الشمالية","الشبحة","الشدخ","العنبجة","مرخ","ذعفى","الرويضات","الشبعان","حراض","عمق","صروم","الحسي","الهجمية","الحائل","الشتات"]},
    {name:"حقل",centers:["الدرة","أبو الحنشان","علقان","الزيتة","الوادي الجديد","علو القصير"]},
    {name:"البدع",centers:["قبال","أبو رمانه"]},
  ]},
  {region:"حائل",govs:[
    {name:"حائل",centers:["جبة","الخطة","قناء","أم القلبان","الروضة","عقدة","قفار","النيصية","قصر العشروات","الودي","العش","القاعد","الرديفة","التيم","عريجاء"]},
    {name:"بقعاء",centers:["تربة","الزبيرة","الخوير","الأجفر","ضبيعة","الحيانية","أشيقر","شعيبة المياة","الشيحية","الجبيلي","أم ساروث","الناصرية","الشعلانية","جبله","الجثياثة"]},
    {name:"الغزالة",centers:["ربع البكر","الهويدي","سقف","وسيطاء الجفن","المستجدة","بدع الحويط"]},
    {name:"الشنان",centers:["الكهفة","طابة","السعيرة","العدوة","فيد","الساقية","رك","النعي","الجحفة","البير","السبعان","الصغوي","المطرفية","الأرشاوية"]},
    {name:"السليمي",centers:["الذكرى","البعايث","النحيتية","العجاجة","الثمامية","مراغان","قاع حجلاء","العيثمة","البركة"]},
    {name:"الحائط",centers:["عيال عبيد","الوسعه","الحليفة السفلى","روض بن هادي","انبوان","المرير","الخفيج","صفيط","الدابية","الشويمس","ضريغط","فيضة أثقب","الحليفة العليا","المناخ","بدع بن خلف","المغار","الخفج","الرقب","المعرش","جبال العلم"]},
    {name:"سميراء",centers:["الجابرية","القصير","عقلة ابن طوله","عقلة ابن داني","العظيم","غمره","أشبرية","غسل","كتيفه","المضيح","الصفراء"]},
    {name:"الشملي",centers:["بيضاء نحيل","فيضة بن سويلم","بئر الرفدي","غزلانه","عمائر بن صنعاء","الحفيرة","ساحوث","ضاحية الشملي الغربية","لبده","ضرغط"]},
    {name:"موقق",centers:["المحفر","الشقيق","الصنينا","دلهان","الحفير","سعيدان","العويد","عقلة بن جبرين"]},
  ]},
  {region:"الحدود الشمالية",govs:[
    {name:"عرعر",centers:["الجديدة","أم خنصر","حزم الجلاميد"]},
    {name:"رفحاء",centers:["لينة","الشعبة","سماح","نصاب","لوقة","طلعة التمياط","بن شريم","بن هباس","أم رضمة","الخشيبي","زبالا","العجرمية","رغوه","الحدقة","الحدق","أعيوج لينه","الجميمة"]},
    {name:"طريف",centers:["الجراني"]},
    {name:"العويقيلة",centers:["الأيدية","المركوز","الكاسب","نعيجان","ابو رواث","الدويد","زهوة"]},
  ]},
  {region:"جازان",govs:[
    {name:"جازان",centers:[]},
    {name:"صبيا",centers:["العالية","قوز الجعافرة","الكدمي"]},
    {name:"أبو عريش",centers:["وادي جازان","وادي مقاب"]},
    {name:"صامطة",centers:["القفل","السبى"]},
    {name:"الحرث",centers:["الخشل"]},
    {name:"ضمد",centers:["الشقيري","المشوف"]},
    {name:"الريث",centers:["مقزع","وادي عمود","جبل القهر","الجبل الأسود","ملاطس"]},
    {name:"بيش",centers:["الفطيحه","الحقو","مسلية","الخلاوية والنجوع"]},
    {name:"جزر فرسان",centers:["السقيد","صير"]},
    {name:"الدائر",centers:["جبال الحشر","آل زيدان","دفا","جبل عثوان","السلف","الجانبه","الشجعة","العزة"]},
    {name:"أحد المسارحة",centers:["الحكامية"]},
    {name:"العيدابي",centers:["بلغازي","ريع مصيدة"]},
    {name:"العارضة",centers:["قيس","القصبة","الحميراء"]},
    {name:"الدرب",centers:["ريم","الشقيق","عتود","سمرة"]},
    {name:"هروب",centers:["جبل الجوين","منجد","وادي رزان","الضيعة","حجن","الأودية"]},
    {name:"فيفا",centers:["الجوة"]},
    {name:"الطوال",centers:["الموسم"]},
  ]},
  {region:"نجران",govs:[
    {name:"نجران",centers:["رجلا","الحظن","المشعلية","أبا السعود","بئر عسكر","عاكفة","أبا الرشاف","خشم العان","الغويلة","الحصينية","الخرعاء","الموفجة"]},
    {name:"شرورة",centers:["الوديعة","تماني","حمراء نثيل","قلمة خجيم","الأخاشيم","المعاطيف","أم غارب","البتراء","مجه","الأبرق","الحايره","بهجة","منفذ الوديعة","السطحية","المرطاء","سرداب","أم الملح","خور بن حمودة","الحرجة","البديع"]},
    {name:"حبونا",centers:["المجمع","سلوة","الحرشف والجفة"]},
    {name:"بدر الجنوب",centers:["الخانق","هداده","الرحاب","لدمه","العرج"]},
    {name:"يدمة",centers:["سدير","سلطانة","أبرق شرقة","الوجيد","الخالدية","السبيل","منادي","المندفن","نجد سهى","العزيزية"]},
    {name:"ثار",centers:["الساري","قطن","حمى","الصفاح","ثجر","الجوشن","المحمدية"]},
    {name:"خباش",centers:["الخضراء","هويمل","النقيحاء","أبو شداد","أم الوهط","المحياش","شقة الكناور","المنخلي"]},
  ]},
  {region:"الباحة",govs:[
    {name:"الباحة",centers:["الفرعة","بني ظبيان"]},
    {name:"بلجرشي",centers:["بني كبير","بالشهم","بادية بني كبير","شرى","الجنابين"]},
    {name:"المندق",centers:["بلخزمر","دوس","برحرح","دوس بني فهم"]},
    {name:"المخواة",centers:["ناوان","شدا الأعلى","الجوه","نيرا","وادي ممنا","وادي الأحسبة"]},
    {name:"العقيق",centers:["جرب","كرا الحائط","وراخ","البعيثة","الجاوة","بهر"]},
    {name:"قلوه",centers:["الشعراء","باللسود","المحمدية","الشعب","وادي ريم"]},
    {name:"القرى",centers:["بيدة","بني حرير وبني عدوان","نخال","معشوقة","تربة الخيالة"]},
    {name:"بني حسن",centers:["بيضان","وادي الصدر"]},
    {name:"غامد الزناد",centers:["يبس","بطاط","نصبة وجبال السودة"]},
    {name:"الحجرة",centers:["الجرين","جرداء بني علي","وادي رما","بني عطا"]},
  ]},
  {region:"الجوف",govs:[
    {name:"سكاكا",centers:["خوعاء","الفياض","عذفاء","المرير","أم إذن","مغيراء"]},
    {name:"القريات",centers:["الحديثة","العيساوية","عين الجواس","الناصفة","الحماد","الوادي","قليب خضر","رديفة الجماجم"]},
    {name:"دومة الجندل",centers:["أبو عجرم","الأضارع","أصفان","الشقيق","الرديفة والرافعية"]},
    {name:"طبرجل",centers:["ميقوع","النبك أبو قصر","ثنيه أم نخيله","بسيطا","الثنيه","صبيحا"]},
    {name:"صوير",centers:["طلعة عمار","زلوم","الشويحيطية","الرفيعة","هديب","الحرة","غدير الخيل"]},
  ]},
]
const DEFAULT_SERVICES=["قص شعر","حلاقة لحية","تسريح","حلاقة كاملة","عناية بالبشرة","صبغة شعر","تنظيف بشرة","ماسك وجه"];

// ==============================================
//  UTILS
// ==============================================
function makeSlots(s,e,slotMin=40){
  const r=[]; let[h,m]=s.split(":").map(Number); const[eh,em]=e.split(":").map(Number);
  while(h<eh||(h===eh&&m<em)){r.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);m+=slotMin;if(m>=60){h++;m-=60;}} return r;
}
function getSlotsForSalon(s){
  const sm=s.slotMin||SLOT_MIN;
  if(s.shiftEnabled){
    return[...(s.shift1Start&&s.shift1End?makeSlots(s.shift1Start,s.shift1End,sm):[]),...(s.shift2Start&&s.shift2End?makeSlots(s.shift2Start,s.shift2End,sm):[])];
  }
  return makeSlots(s.workStart||"09:00",s.workEnd||"22:00",sm);
}
function todayStr(){return new Date().toISOString().split("T")[0];}
function openMaps(url,name,addr){window.open(url?.trim()||`https://www.google.com/maps/search/${encodeURIComponent(name+" "+addr)}`,"_blank");}
function calcTotal(svcs,prices){return(svcs||[]).reduce((a,s)=>a+(prices?.[s]||0),0);}
function normPhone(p){return String(p||"").replace(/\D/g,"");}

// تحسين الصور: إضافة parameters للحصول على thumbnails محسّنة
function optimizeImageUrl(url, width=100, height=100){
  if(!url)return null;
  // إذا كانت الصورة من Supabase
  if(url.includes('supabase'))return `${url}?w=${width}&h=${height}&fit=crop`;
  // إذا كانت من CDN آخر
  if(url.includes('cloudinary'))return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
  // صور محلية - بدون تعديل
  return url;
}

// caching للبيانات الثابتة مع فترة انتهاء صلاحية
function getCachedData(key, fetcher, cacheDuration=86400000){
  // cacheDuration: 1 يوم = 86400000ms (يمكن تعديله إلى 7 أيام = 604800000ms)
  const cached=localStorage.getItem(`cache_${key}`);
  if(cached){
    const {data,timestamp}=JSON.parse(cached);
    if(Date.now()-timestamp<cacheDuration)return Promise.resolve(data);
  }
  return fetcher().then(data=>{
    localStorage.setItem(`cache_${key}`,JSON.stringify({data,timestamp:Date.now()}));
    return data;
  });
}

function buildHomeReviewsFeed(customers, approvedSalons){
  const byId=new Map(approvedSalons.map(s=>[Number(s.id),s]));
  const approvedSet=new Set(approvedSalons.map(s=>Number(s.id)));
  const rows=[];
  let k=0;
  for(const c of customers||[]){
    for(const h of c.history||[]){
      if(!h||!h.rating||h.rating<=0)continue;
      const sid=Number(h.salonId);
      if(!approvedSet.has(sid))continue;
      const salon=byId.get(sid);
      rows.push({
        key:`hr-${k++}`,
        salonId:sid,
        salonName:(h.salonName||salon?.name||"صالون").trim(),
        customerName:(c.name||"عميل").trim(),
        rating:h.rating,
        comment:(h.comment||"").trim(),
        date:h.date||"",
        time:h.time||"",
      });
    }
  }
  rows.sort((a,b)=>{
    const d=(b.date||"").localeCompare(a.date||"");
    if(d!==0)return d;
    return (b.time||"").localeCompare(a.time||"");
  });
  return rows;
}

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
  const[salons,setSalons]=useState(()=>{
    try{
      const c=localStorage.getItem("dork_salons_cache");
      return c?JSON.parse(c):[];
    }catch{return[];}
  });
  const[customers,setCustomers]=useState([]);
  const[reviews,setReviews]=useState([]);
  const[promotions,setPromotions]=useState([]);
  const[extraLoc,setExtraLoc]=useState(()=>{
    try{
      localStorage.removeItem("bbv6_loc");
      return [];
    }catch{return[];}
  });
  const[loading,setLoading]=useState(false); // تحميل سريع - البيانات تُحمّل في الخلفية
  const[dbError,setDbError]=useState(null);
  const[view,setView]=useState(()=>{try{const o=localStorage.getItem("dork_owner");const c=localStorage.getItem("dork_customer");if(o)return"ownerDash";if(c)return"home";return"entry";}catch{return"entry";}});
  const[custDashKey,setCustDashKey]=useState(0);
  const[custDashNav,setCustDashNav]=useState({tab:"settings",section:false});
  const[activeDrawerItem,setActiveDrawerItem]=useState(null);
  const[selSalon,setSelSalon]=useState(null);
  const[toast,setToast]=useState(null);
  const[showDrawer,setShowDrawer]=useState(false);
  const[showSalonDrawer,setShowSalonDrawer]=useState(false);
  const[ownerTab,setOwnerTab]=useState(null);
  const[splash,setSplash]=useState(false); // Splash Screen - مُلغى
  const[themeMode,setThemeMode]=useState(()=>{try{const t=localStorage.getItem("dork_theme");if(t==="dark"||t==="dim"||t==="light"||t==="lgray")return t;return localStorage.getItem("dork_dark")==="0"?"light":"dark";}catch{return"dark";}});
  const darkMode=themeMode==="dark"||themeMode==="dim";
  const setDarkMode=useCallback((v)=>setThemeMode(v?"dark":"light"),[]);
  const[compareSalons,setCompareSalons]=useState([]); // مقارنة صالونين
  const[pullRefreshing,setPullRefreshing]=useState(false); // Pull to refresh
  const[rescheduleId,setRescheduleId]=useState(null);

  // تطبيق وضع الإضاءة (داكن / رمادي / فاتح / رمادي فاتح)
  useEffect(()=>{
    const dk=themeMode==="dark",dm=themeMode==="dim",lt=themeMode==="light",lg=themeMode==="lgray";
    const shell=dk?"#0d0d1a":dm?"#1e1e24":lg?"#9e9b98":"#f7f7f7";
    const s1=dk?"#13131f":dm?"#28282f":lg?"#e0dedd":"#ffffff";
    const s2=dk?"#1a1a2e":dm?"#32323a":lg?"#d0cecd":"#f0f0f2";
    const bor=dk?"#2a2a3a":dm?"#3d3d47":lg?"#5a5a5c":"#e0e0e0";
    const tp=dk?"#f0f0f0":dm?"#ededf2":lg?"#1c1c1e":"#2d2d2d";
    const tm=dk?"#888888":dm?"#8e8e9e":lg?"#3a3a3c":"#666666";
    const inp=dk?"#0d0d1a":dm?"#1a1a21":lg?"#d4d2d0":"#fafafa";
    const setProp=(k,v)=>document.documentElement.style.setProperty(k,v);
    setProp("--bg-main",shell);setProp("--bg-card",s1);setProp("--bg-input",inp);
    setProp("--txt-main",tp);setProp("--txt-sub",tm);setProp("--border",bor);
    setProp("--shell-bg",shell);setProp("--surface-1",s1);setProp("--surface-2",s2);
    setProp("--border-ui",bor);setProp("--text-primary",tp);setProp("--text-muted",tm);
    // lgray: خلفية رمادية دافئة — فواصل فحمية منفصلة تماماً عن الخلفية
    if(lg){
      setProp("--p","#1c1c1e");setProp("--pl","#3a3a3c");setProp("--pd","#1c1c1e");
      setProp("--pll","#636366");setProp("--pr","28,28,30");
      setProp("--pa5","rgba(28,28,30,.05)");setProp("--pa07","rgba(28,28,30,.07)");
      setProp("--pa08","rgba(28,28,30,.08)");setProp("--pa12","rgba(28,28,30,.12)");
      setProp("--pa15","rgba(28,28,30,.15)");setProp("--pa18","rgba(28,28,30,.18)");
      setProp("--pa2","rgba(28,28,30,.2)");setProp("--pa25","rgba(28,28,30,.25)");
      setProp("--pa3","rgba(28,28,30,.3)");setProp("--pa4","rgba(28,28,30,.45)");
      setProp("--grad","linear-gradient(135deg,#b8b6b4,#d0cecd)");
      setProp("--grad2","linear-gradient(135deg,#d0cecd,#b8b6b4)");
      setProp("--p-text","#1c1c1e");
      setProp("--chip-border","#5a5a5c");
      setProp("--gold","var(--p)");
      setProp("--gold-rgb","28,28,30");
    } else {
      setProp("--p-text","#000000");
      setProp("--chip-border",bor);
      setProp("--gold","#d4a017");
      setProp("--gold-rgb","212,160,23");
    }
    document.body.style.background=shell;
    document.documentElement.classList.remove("dork-dark","dork-dim","dork-light","dork-lgray");
    document.documentElement.classList.add("dork-"+themeMode);
    try{localStorage.setItem("dork_theme",themeMode);localStorage.setItem("dork_dark",(lt||lg)?"0":"1");}catch{}
  },[themeMode]);

  // Splash Screen - يختفي بعد ثانيتين
  useEffect(()=>{
    const t=setTimeout(()=>setSplash(false),2000);
    return()=>clearTimeout(t);
  },[]);

  useEffect(() => {
    initializeFirebaseNotifications();
  }, []);

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
      const rows=await getCachedData("app_settings",()=>sb("app_settings","GET",null,"?order=id.asc&limit=1"),86400000);
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
            if(u.themeMode&&["dark","dim","light","lgray"].includes(u.themeMode))setThemeMode(u.themeMode);
          }catch{}
        }
      }
    }catch{
      if(!silent){
        try{const v=localStorage.getItem("dork_loyalty");if(v)setLoyaltySettings({...DEFAULT_LOYALTY_SETTINGS,...JSON.parse(v)});}catch{}
        try{const v=localStorage.getItem("dork_social");if(v)setSocialLinks({...DEFAULT_SOCIAL_LINKS,...JSON.parse(v)});}catch{}
        try{const v=localStorage.getItem("dork_ui");if(v){const u=JSON.parse(v);setSettings(s=>({...s,...u,bg:normalizeBgId(u.bg||s.bg)}));if(u.themeMode&&["dark","dim","light","lgray"].includes(u.themeMode))setThemeMode(u.themeMode);}}catch{}
      }
    }
  },[]);


  // Filters
  const[fRegion,setFRegion]=useState("");
  const[fGov,setFGov]=useState("");
  const[fVillage,setFVillage]=useState("");
  const[fCenter,setFCenter]=useState("");
  const[showFavs,setShowFavs]=useState(false);
  const[search,setSearch]=useState("");
  const[sortBy,setSortBy]=useState("");
  const[userLoc,setUserLoc]=useState(null);
  const[settings,setSettings]=useState(()=>{try{const s=localStorage.getItem("bbv6_settings");if(!s)return{theme:"gold",defaultTone:"bell",fontSize:"md",bg:"none"};const p=JSON.parse(s);return{...p,bg:normalizeBgId(p.bg||"none")};}catch{return{theme:"gold",defaultTone:"bell",fontSize:"md",bg:"none"};}});
  useEffect(()=>{localStorage.setItem("bbv6_settings",JSON.stringify(settings));},[settings]);

  // حجم الخط
  useEffect(()=>{
    const sizes={sm:"13px",md:"15px",lg:"17px"};
    document.documentElement.style.setProperty("--base-font",sizes[settings.fontSize||"md"]);
  },[settings.fontSize]);
  useEffect(()=>{
    // lgray لها لوحة ألوانها المستقلة — لا تُطبَّق ألوان الثيم عليها
    if(themeMode==="lgray") return;
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
    r.setProperty("--p-text","#000000");
    r.setProperty("--gold",   t.primary);
    r.setProperty("--gold-rgb",t.rgb);
  },[settings.theme,themeMode]);

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
      themeMode:p.themeMode??themeMode,
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
  },[socialLinks,settings.theme,settings.fontSize,settings.defaultTone,settings.bg,darkMode,themeMode]);

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
        sb("salons","GET",null,"?select=id,name,owner,owner_phone,region,gov,center,village,phone,address,location_url,services,prices,shift_enabled,shift1_start,shift1_end,shift2_start,shift2_end,work_start,work_end,barbers,tone,rating,status,paused,frozen,banned,welcome_msg,closed_days,slot_min,password,cancellation_window,created_at&status=eq.approved&order=created_at.desc&limit=500"),
        sb("bookings","GET",null,"?select=id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,created_at&order=created_at.desc&limit=1000"),
        sb("customers","GET",null,"?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at&limit=500"),
      ]);
      // reviews تُجلب بشكل مستقل حتى لا توقف التطبيق عند أي خطأ
      const reviewRows = await sb("reviews","GET",null,"?select=id,salon_id,customer_id,customer_name,rating,comment,owner_reply,booking_date,created_at&order=created_at.desc&limit=20").catch(()=>[]);
      const promoRows = await sb("promotions","GET",null,"?select=id,salon_id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&status=eq.active&order=created_at.desc&limit=200").catch(()=>[]);
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
      try{localStorage.setItem("dork_salons_cache",JSON.stringify(salonsWithBookings));}catch{}
      setCustomers(custRows.map(toAppCustomer));
      setReviews(reviewRows||[]);
      setPromotions(promoRows||[]);
      setDbError(null);
    } catch(e) {
      console.error(e);
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

  useEffect(()=>{
    const hasCached=!!localStorage.getItem("dork_salons_cache");
    loadData(hasCached?{silent:true}:{});
    loadAppSettings();
  },[loadData,loadAppSettings]);

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
      const rows=await sb("bookings","GET",null,"?select=id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,created_at&order=created_at.desc&limit=1000");
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
      const rows=await sb("reviews","GET",null,"?select=id,salon_id,customer_id,customer_name,rating,comment,owner_reply,booking_date,created_at&order=created_at.desc&limit=20");
      setReviews(rows||[]);
    }catch{}
  },[]);

  // جلب العروض النشطة فقط
  const pollPromotions=useCallback(async()=>{
    try{
      const rows=await sb("promotions","GET",null,"?select=id,salon_id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&status=eq.active&order=created_at.desc&limit=200");
      setPromotions(rows||[]);
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

    // عروض — تحديث لحظي
    const promoChannel=supabase.channel('realtime-promotions')
      .on('postgres_changes',{event:'*',schema:'public',table:'promotions'},()=>{
        pollPromotions();
      })
      .subscribe();

    return()=>{
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(promoChannel);
    };
  },[loadAppSettings,pollBookings,pollReviews,pollPromotions]);

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
        toast$(`✅ تم قبول حجزك في ${salon?.name||""}`);
        try{playTone("bell",0.55);}catch{}
      }else if(was==="pending"&&now==="rejected"){
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
    const id=setInterval(()=>{pollBookings();pollReviews();pollPromotions();},10000);
    return()=>clearInterval(id);
  },[pollBookings,pollReviews,pollPromotions]);

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


  // Splash Screen
  if(splash) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#09112e 0%,#0d1535 45%,#111d42 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl",gap:0}}>
      {/* Full brand logo as text */}
      <div style={{animation:"splashPulse 1.4s ease-in-out infinite",marginBottom:28}}>
        <div style={{fontSize:72,fontWeight:900,color:"var(--gold)",filter:"drop-shadow(0 4px 32px rgba(var(--gold-rgb),.5))",letterSpacing:2}}>دورك</div>
      </div>
      {/* Loading spinner */}
      <div style={{width:36,height:36,border:"3px solid rgba(var(--gold-rgb),.15)",borderTop:"3px solid var(--gold)",borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes splashPulse{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.04) translateY(-4px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeInCards{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}}/>
    </div>
  );

  // العميل لما يسجل دخول يروح للصفحة الرئيسية مباشرة
  const handleCustomerLogin=(c)=>{setCustomerSession(c);setView("home");registerFcmTokenForUser("customer",c.id);};
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
      if(newBooking&&newBooking.id){
        supabase.functions.invoke('send-fcm-notification',{
          body:{record:newBooking,type:"new_booking"},
        }).then(({data,error})=>{
          if(error){
            console.error('❌ خطأ في إرسال الإشعار:',error);
          }else{
            console.log('✅ تم إرسال الإشعار بنجاح:',data);
          }
        }).catch((err)=>{
          console.error('⚠️ فشل الاتصال بخدمة الإشعارات:',err);
        });
      }
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
      if(status==="approved"||status==="rejected"){
        const bookingRecord={...bk,id:bid,salon_id:sid,status};
        supabase.functions.invoke('send-fcm-notification',{
          body:{record:bookingRecord,type:status==="approved"?"booking_approved":"booking_rejected"},
        }).then(({data,error})=>{
          if(error)console.error('❌ خطأ في إرسال الإشعار:',error);
          else console.log('✅ تم إرسال إشعار تحديث الحجز:',data);
        }).catch((err)=>{
          console.error('⚠️ فشل الاتصال بخدمة الإشعارات:',err);
        });
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
    setSortBy("");
    setFRegion("");setFGov("");setFCenter("");setFVillage("");
    setShowFavs(false);
  };

  // حماية: لا تصفح بدون تسجيل دخول
  useEffect(()=>{
    const allowed=["entry","ownerLogin","custLogin","register"];
    if(!customerSession&&!ownerSession&&!allowed.includes(view))setView("entry");
  },[customerSession,ownerSession]);

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
    darkMode,setDarkMode,themeMode,setThemeMode,
    compareSalons,setCompareSalons,
    handlePullRefresh,pullRefreshing,
    resetHome,
    persistUiToSupabase,
    loading,
    showDrawer,setShowDrawer,
    showSalonDrawer,setShowSalonDrawer,
    ownerTab,setOwnerTab,
    promotions,setPromotions,pollPromotions,
  };

  return(
    <div style={G.app}>
      <div id="dork-bg" style={dorkBgStyle}/>
      <style>{CSS}</style>
      {/* بانر خطأ الاتصال - يظهر فقط عند الخطأ */}
      {dbError&&!loading&&<div style={{position:"fixed",top:64,left:0,right:0,zIndex:998,background:"#3a1a1a",color:"#e74c3c",padding:"8px 16px",fontSize:12,textAlign:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl"}}>❌ خطأ في الاتصال بقاعدة البيانات — تحقق من الاتصال</div>}
      {toast&&<div style={{...G.toast,background:toast.type==="warn"?"#7a3a10":toast.type==="err"?"#7a1a1a":"#1a5c34"}}>{toast.msg}</div>}
      {view!=="entry"&&view!=="custLogin"&&view!=="ownerLogin"&&<TopBar {...sharedProps} showDrawer={showDrawer} setShowDrawer={setShowDrawer}/>}
      <CustomerDrawer open={showDrawer} onClose={()=>setShowDrawer(false)} customer={customer} setCustomers={sharedProps.setCustomers} setCustomerSession={sharedProps.setCustomerSession} setView={setView} setCustDashKey={setCustDashKey} setCustDashNav={setCustDashNav} activeDrawerItem={activeDrawerItem} setActiveDrawerItem={setActiveDrawerItem} settings={sharedProps.settings} setSettings={sharedProps.setSettings} darkMode={darkMode} setDarkMode={setDarkMode} themeMode={themeMode} setThemeMode={setThemeMode} persistUiToSupabase={sharedProps.persistUiToSupabase} socialLinks={sharedProps.socialLinks} setSocialLinks={sharedProps.setSocialLinks} toast$={toast$} salons={salons} favSet={sharedProps.favSet}/>
      <SalonDrawer open={showSalonDrawer} onClose={()=>setShowSalonDrawer(false)} salon={salons.find(s=>s.id===ownerSession)} ownerTab={ownerTab} setOwnerTab={setOwnerTab} setView={setView} setOwnerSession={sharedProps.setOwnerSession} settings={sharedProps.settings} setSettings={sharedProps.setSettings} persistUiToSupabase={sharedProps.persistUiToSupabase} toast$={toast$}/>
      <div style={{paddingTop:(view==="entry"||view==="custLogin"||view==="ownerLogin")?0:64}}>
        {view==="entry"&&     <EntryView setView={setView}/>}
        {view==="home"&&      <HomeView {...sharedProps}/>}
        {view==="register"&&  <RegisterView {...sharedProps}/>}
        {view==="book"&&selSalon&&<BookView salon={selSalon} {...sharedProps}/>}
        {view==="salon"&&selSalon&&<SalonPage salon={salons.find(s=>s.id===selSalon.id)||selSalon} {...sharedProps}/>}
        {view==="ownerLogin"&&<OwnerLogin {...sharedProps}/>}
        {view==="ownerDash"&& <OwnerDash  salon={salons.find(s=>s.id===ownerSession)} ownerTab={ownerTab} setOwnerTab={setOwnerTab} showSalonDrawer={showSalonDrawer} setShowSalonDrawer={setShowSalonDrawer} {...sharedProps}/>}
        {(view==="ownerInfo"||view==="ownerHours"||view==="ownerServices"||view==="ownerBarbers"||view==="ownerSocial"||view==="ownerTone"||view==="ownerPin")&&<OwnerSettings salon={salons.find(s=>s.id===ownerSession)} setSalons={sharedProps.setSalons} toast$={toast$} socialLinks={sharedProps.socialLinks} setSocialLinks={sharedProps.updateSocial} setView={setView} setShowSalonDrawer={setShowSalonDrawer} onlySec={view.replace("owner","").toLowerCase()}/>}
        {view==="ownerTheme"&&<SettingsView {...sharedProps} onlySec="theme" backFn={()=>{setView("ownerDash");setShowSalonDrawer(true);}}/>}
        {view==="ownerDark"&&<SettingsView {...sharedProps} onlySec="dark" backFn={()=>{setView("ownerDash");setShowSalonDrawer(true);}}/>}
        {view==="ownerLang"&&<OwnerLangView setView={setView} setShowSalonDrawer={setShowSalonDrawer}/>}
        {view==="ownerFaq"&&<OwnerFaqView setView={setView} setShowSalonDrawer={setShowSalonDrawer}/>}
        {view==="custLang"&&<CustLangView setView={setView} setShowDrawer={setShowDrawer}/>}
        {view==="custEditData"&&customer&&<CustEditDataView customer={customer} setCustomers={sharedProps.setCustomers} setCustomerSession={sharedProps.setCustomerSession} setView={setView} setShowDrawer={setShowDrawer} toast$={toast$}/>}
        {view==="custSettingsTheme"&&<SettingsView {...sharedProps} onlySec="theme" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsDark"&&<SettingsView {...sharedProps} onlySec="dark" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsFont"&&<SettingsView {...sharedProps} onlySec="font" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsBg"&&<SettingsView {...sharedProps} onlySec="bg" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsTone"&&<SettingsView {...sharedProps} onlySec="tone" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="social"&&<SettingsView {...sharedProps} onlySec="social" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="faq"&&<SettingsView {...sharedProps} onlySec="faq" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custLogin"&& <CustomerLogin {...sharedProps}/>}
        {view==="custDash"&&  <CustomerDash key={custDashKey} initTab={custDashNav.tab} initSection={custDashNav.section} customer={customer} setShowDrawer={setShowDrawer} {...sharedProps}/>}
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

// ==============================================
//  DORK LOGO SVG — full brand icon: rounded frame + scissors + clock + rings + pin
// ==============================================
function DorkLogoSvg({size=40}){
  return(
    <svg width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dlg" x1="0" y1="0" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#fff8c8"/>
          <stop offset="22%"  stopColor="#f5d060"/>
          <stop offset="55%"  stopColor="#d4a017"/>
          <stop offset="100%" stopColor="#8b6000"/>
        </linearGradient>
        <linearGradient id="dlg2" x1="50" y1="0" x2="50" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffe566"/>
          <stop offset="100%" stopColor="#c8900a"/>
        </linearGradient>
      </defs>

      {/* Outer rounded rectangle frame */}
      <rect x="5" y="4" width="90" height="102" rx="22" ry="22"
        stroke="url(#dlg)" strokeWidth="4" fill="none"/>

      {/* Clock arc — upper half circle */}
      <path d="M 22 46 A 28 28 0 0 1 78 46"
        stroke="url(#dlg)" strokeWidth="3.8" fill="none" strokeLinecap="round"/>

      {/* Clock tick 12 */}
      <line x1="50" y1="16" x2="50" y2="22" stroke="url(#dlg)" strokeWidth="3" strokeLinecap="round"/>
      {/* Clock tick 9 (left) */}
      <line x1="21" y1="46" x2="27" y2="46" stroke="url(#dlg)" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Clock tick 3 (right) */}
      <line x1="79" y1="46" x2="73" y2="46" stroke="url(#dlg)" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Clock hands — 10:10 position */}
      <line x1="50" y1="46" x2="39" y2="36" stroke="url(#dlg)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="50" y1="46" x2="61" y2="37" stroke="url(#dlg2)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="50" cy="46" r="3" fill="url(#dlg)"/>

      {/* Scissors blade 1 — lower-left ring → upper-right */}
      <line x1="22" y1="94" x2="79" y2="22"
        stroke="url(#dlg)" strokeWidth="5.5" strokeLinecap="round"/>

      {/* Scissors blade 2 — lower-right ring → upper-left */}
      <line x1="78" y1="94" x2="21" y2="22"
        stroke="url(#dlg)" strokeWidth="5.5" strokeLinecap="round"/>

      {/* Pivot screw */}
      <circle cx="50" cy="58" r="5.5" fill="url(#dlg)"/>
      <circle cx="50" cy="58" r="2.5" fill="#0b0d1e"/>

      {/* Left handle ring */}
      <circle cx="22" cy="94" r="9.5" stroke="url(#dlg)" strokeWidth="3.5" fill="none"/>
      {/* Right handle ring */}
      <circle cx="78" cy="94" r="9.5" stroke="url(#dlg)" strokeWidth="3.5" fill="none"/>

      {/* Location pin between rings */}
      <path d="M 50 89 C 47 86 44 83 44 80.5 A 6 6 0 0 1 56 80.5 C 56 83 53 86 50 89 Z"
        fill="url(#dlg)"/>
      <circle cx="50" cy="80.5" r="2.5" fill="#0b0d1e"/>
    </svg>
  );
}

// ==============================================
//  CUSTOMER DRAWER — القائمة الجانبية للعميل
// ==============================================
function CustomerDrawer({open,onClose,customer,setCustomers,setCustomerSession,setView,setCustDashKey,setCustDashNav,activeDrawerItem,setActiveDrawerItem,settings,setSettings,darkMode,setDarkMode,themeMode,setThemeMode,persistUiToSupabase,toast$,salons,favSet}){
  const{t}=useTranslation();
  const[exp,setExp]=useState(null);
  const[showLogout,setShowLogout]=useState(false);
  const[showDel,setShowDel]=useState(false);
  useEffect(()=>{if(!open){setShowLogout(false);setShowDel(false);}},[open]);
  const[editName,setEditName]=useState("");
  const[editPhone,setEditPhone]=useState("");
  const[editEmail,setEditEmail]=useState("");
  const[locMode,setLocMode]=useState("gps");
  const[locUrl,setLocUrl]=useState("");
  const[editPinStep,setEditPinStep]=useState(null);
  const[editPinLength,setEditPinLength]=useState(4);
  const[editTempPin,setEditTempPin]=useState("");
  const[editPinConfirm,setEditPinConfirm]=useState("");
  const[editPinErr,setEditPinErr]=useState("");
  const toggle=(s)=>setExp(e=>e===s?null:s);
  if(!customer)return null;
  const cl=getCustomerClassification(customer);
  const history=customer.history||[];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[(customer.name?.charCodeAt(0)||0)%avatarColors.length];
  const saveLocation=()=>{
    if(!navigator.geolocation){toast$("❌ المتصفح لا يدعم الموقع","err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));setCustomerSession({...customer,locationLat:lat,locationLng:lng});toast$("✅ تم حفظ موقعك");}catch{toast$("❌ فشل حفظ الموقع","err");}
    },()=>toast$("❌ تعذر تحديد موقعك","err"),{enableHighAccuracy:true,timeout:15000});
  };
  const clearLocation=async()=>{
    try{await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));setCustomerSession({...customer,locationLat:null,locationLng:null});toast$("✅ تم حذف الموقع");}catch{toast$("❌ فشل حذف الموقع","err");}
  };
  const saveEdit=async()=>{
    if(!editName.trim())return;
    const patch={name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()};
    const locExtra={};
    if(locMode==="url"&&locUrl.trim()){const m=locUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);if(m){patch.location_lat=parseFloat(m[1]);patch.location_lng=parseFloat(m[2]);locExtra.locationLat=parseFloat(m[1]);locExtra.locationLng=parseFloat(m[2]);}}
    try{await sb("customers","PATCH",patch,`?id=eq.${customer.id}`);setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim(),...locExtra}:c));setExp(null);toast$("✅ تم حفظ البيانات");}catch(e){toast$("❌ "+e.message,"err");}
  };
  const applyTheme=(id)=>{
    const t=THEMES[id]||THEMES.gold;const r=document.documentElement.style;
    r.setProperty("--p",t.primary);r.setProperty("--pl",t.light);r.setProperty("--pd",t.dark);r.setProperty("--pll",t.lightest);r.setProperty("--pr",t.rgb);
    ["5","07","08","12","15","18","2","25","3","4"].forEach(a=>{const pct=a==="4"?.45:a==="3"?.3:a==="25"?.25:a==="2"?.2:a==="18"?.18:a==="15"?.15:a==="12"?.12:a==="08"?.08:a==="07"?.07:.05;r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);});
    r.setProperty("--grad",`linear-gradient(135deg,${t.primary},${t.light})`);r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
    r.setProperty("--gold",t.primary);r.setProperty("--gold-rgb",t.rgb);
    setSettings(s=>({...s,theme:id}));persistUiToSupabase&&persistUiToSupabase({theme:id});
  };
  const THEME_OPT=[{id:"gold",l:"ذهبي",c:"#d4a017",e:"✨"},{id:"emerald",l:"زمردي",c:"#10b981",e:"🌿"},{id:"sapphire",l:"ياقوتي",c:"#3b82f6",e:"💎"},{id:"royalBlue",l:"ملكي",c:"#1e3a8a",e:"👑"},{id:"bronze",l:"برونزي",c:"#8b5a2b",e:"🏺"},{id:"rose",l:"وردي",c:"#ec4899",e:"🌸"},{id:"violet",l:"بنفسجي",c:"#8b5cf6",e:"🔮"},{id:"crimson",l:"قرمزي",c:"#ef4444",e:"🔴"},{id:"teal",l:"فيروزي",c:"#0d9488",e:"🩵"},{id:"coral",l:"مرجاني",c:"#f97316",e:"🪸"},{id:"fuchsia",l:"فوشيا",c:"#d946ef",e:"🌺"},{id:"wine",l:"خمري",c:"#9f1239",e:"🍷"},{id:"forest",l:"غابة",c:"#15803d",e:"🌲"},{id:"lime",l:"ليموني",c:"#65a30d",e:"🍃"},{id:"sky",l:"سماوي",c:"#0284c7",e:"🌊"}];
  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const Row=({icon,label,sub,chev,onClick,danger,itemId})=>{
    const isActive=itemId&&activeDrawerItem===itemId;
    return(
      <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 20px",background:isActive?"var(--pa12)":"transparent",border:"none",borderBottom:"1px solid var(--border-ui)",borderRight:isActive?"3px solid var(--p)":"3px solid transparent",cursor:"pointer",fontFamily:"inherit",color:danger?"#e74c3c":isActive?"var(--p)":"var(--text-primary)",WebkitAppearance:"none",appearance:"none",textAlign:"right"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          <span style={{fontSize:15,fontWeight:isActive?700:600}}>{icon} {label}</span>
          {sub&&<span style={{fontSize:11,color:isActive?"var(--p)":"var(--text-muted)"}}>{sub}</span>}
        </div>
        {chev&&<span style={{color:exp===chev?"var(--p)":"var(--text-muted)",fontSize:14,transform:exp===chev?"rotate(90deg)":"rotate(-90deg)",transition:"transform 0.2s"}}>‹</span>}
      </button>
    );
  };
  const SecHead=({label})=>(<div style={{padding:"10px 20px 5px",fontSize:12,color:"var(--p)",fontWeight:700,letterSpacing:.8,background:"var(--shell-bg)",borderBottom:"1px solid var(--border-ui)",textTransform:"uppercase"}}>{label}</div>);
  const Panel=({children})=>(<div style={{background:"var(--surface-1)",padding:"14px 18px",borderBottom:"1px solid var(--border-ui)"}}>{children}</div>);
  const BtnRow=({children})=>(<div style={{display:"flex",gap:8,marginTop:8}}>{children}</div>);
  const Btn=({label,onClick,primary,danger,small})=>(<button onClick={onClick} style={{flex:1,padding:small?"8px 10px":"11px 10px",borderRadius:10,border:danger?"1.5px solid #e74c3c":primary?"none":"1.5px solid var(--border-ui)",background:primary?"var(--p)":danger?"rgba(231,76,60,.1)":"transparent",color:primary?"#000":danger?"#e74c3c":"#aaa",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:12,WebkitAppearance:"none",appearance:"none"}}>{label}</button>);
  return(
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1100,backdropFilter:"blur(2px)"}}/>}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"82%",maxWidth:340,background:"var(--shell-bg)",zIndex:1101,transform:open?"translateX(0)":"translateX(110%)",transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",overflowY:"auto",display:"flex",flexDirection:"column",direction:"rtl",boxShadow:open?"-4px 0 32px rgba(0,0,0,.6)":"none"}}>
        {/* رأس الـ Drawer */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 16px",borderBottom:"1px solid var(--border-ui)",background:"var(--shell-bg)",position:"sticky",top:0,zIndex:1}}>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.06)",border:"none",color:"var(--text-muted)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
          <span style={{fontSize:15,fontWeight:700,color:"var(--p)"}}>{t("cust_drawer.title")}</span>
        </div>
        {/* بطاقة العميل */}
        <div style={{margin:"14px 14px 0",background:"linear-gradient(135deg,var(--surface-1),var(--surface-2))",borderRadius:16,padding:16,border:`1.5px solid ${themeMode==="lgray"?"var(--border-ui)":"#d4a017"}`,position:"relative",boxShadow:`0 4px 16px ${themeMode==="lgray"?"rgba(0,0,0,0.12)":"rgba(var(--gold-rgb),.1)"}`}}>
          <div style={themeMode==="lgray"?{position:"absolute",top:12,left:12,background:"#e5e5ea",border:"1px solid #aeaeb2",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:"#3a3a3c",boxShadow:"0 2px 8px rgba(0,0,0,.22)"}:{position:"absolute",top:12,left:12,background:`${cl.color}22`,border:`1px solid ${cl.color}`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:cl.color}}>{cl.label}</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.name")} <span style={{color:"var(--p)"}}>{customer.name}</span></div>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.phone")} <span style={{color:"var(--p)"}}>{customer.phone}</span></div>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.bookings_count")} <span style={{color:"var(--p)"}}>{history.length} {t("cust_drawer.bookings_unit")}</span></div>
            <div style={{fontSize:14,color:"var(--text-primary)",fontWeight:700}}>{t("cust_drawer.joined")} <span style={{color:"var(--p)"}}>{new Date(customer.createdAt).toLocaleDateString("ar")}</span></div>
          </div>
        </div>
        <div style={{height:12}}/>
        {/* التنقل */}
        <SecHead label={t("cust_drawer.nav")}/>
        <Row icon="🔔" label={t("cust_drawer.notifications")} itemId="notif" onClick={()=>{setActiveDrawerItem("notif");setCustDashNav({tab:"notif",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="📅" label={t("cust_drawer.my_bookings")} itemId="hist" onClick={()=>{setActiveDrawerItem("hist");setCustDashNav({tab:"hist",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="❤️" label={t("cust_drawer.favorites")} itemId="favs" onClick={()=>{setActiveDrawerItem("favs");setCustDashNav({tab:"favs",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="📊" label={t("cust_drawer.attendance")} itemId="attend" onClick={()=>{setActiveDrawerItem("attend");setCustDashNav({tab:"attend",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        <Row icon="⏰" label={t("cust_drawer.reminders")} itemId="remind" onClick={()=>{setActiveDrawerItem("remind");setCustDashNav({tab:"remind",section:true});setCustDashKey(k=>k+1);onClose();setView("custDash");}}/>
        {/* حسابي */}
        <div style={{height:8}}/>
        <SecHead label={t("cust_drawer.my_account")}/>
        <Row icon="✏️" label={t("cust_drawer.edit_data")} itemId="custEditData" onClick={()=>{setActiveDrawerItem("custEditData");onClose();setView("custEditData");}}/>
        {/* إعدادات التطبيق */}
        <div style={{height:8}}/>
        <SecHead label={t("cust_drawer.settings")}/>
        <Row icon="🎨" label={t("cust_drawer.colors")} sub={THEME_OPT.find(th=>th.id===settings?.theme)?.l||t("cust_drawer.colors")} itemId="custSettingsTheme" onClick={()=>{setActiveDrawerItem("custSettingsTheme");onClose();setView("custSettingsTheme");}}/>
        <Row icon="🌙" label={t("cust_drawer.lighting")} sub={themeMode==="dark"?t("cust_drawer.dark_mode"):themeMode==="dim"?t("cust_drawer.dim_mode"):t("cust_drawer.light_mode")} itemId="custSettingsDark" onClick={()=>{setActiveDrawerItem("custSettingsDark");onClose();setView("custSettingsDark");}}/>
        <Row icon="🔤" label={t("cust_drawer.font_size")} sub={{sm:t("cust_drawer.font_sm"),md:t("cust_drawer.font_md"),lg:t("cust_drawer.font_lg")}[settings?.fontSize||"md"]} itemId="custSettingsFont" onClick={()=>{setActiveDrawerItem("custSettingsFont");onClose();setView("custSettingsFont");}}/>
        <Row icon="🖼" label={t("cust_drawer.background")} sub={t("settings.bgs."+(settings?.bg||"none"))} itemId="custSettingsBg" onClick={()=>{setActiveDrawerItem("custSettingsBg");onClose();setView("custSettingsBg");}}/>
        <Row icon="🔔" label={t("cust_drawer.tone")} sub={TONES.find(tn=>tn.id===settings?.defaultTone)?.label||"—"} itemId="custSettingsTone" onClick={()=>{setActiveDrawerItem("custSettingsTone");onClose();setView("custSettingsTone");}}/>
        <Row icon="🌐" label={t("cust_drawer.language")} itemId="custLang" onClick={()=>{setActiveDrawerItem("custLang");onClose();setView("custLang");}}/>
        {/* مزيد */}
        <div style={{height:8}}/>
        <SecHead label={t("cust_drawer.more")}/>
        <Row icon="📱" label={t("cust_drawer.social")} itemId="social" onClick={()=>{setActiveDrawerItem("social");onClose();setView("social");}}/>
        <Row icon="❓" label={t("cust_drawer.faq")} itemId="faq" onClick={()=>{setActiveDrawerItem("faq");onClose();setView("faq");}}/>
        {/* الخروج والحذف */}
        <div style={{height:16}}/>
        <button onClick={()=>setShowLogout(true)} style={{width:"100%",padding:"15px 20px",background:"transparent",border:"none",borderTop:"1px solid var(--border-ui)",color:"#e74c3c",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"right",WebkitAppearance:"none",appearance:"none"}}>
          {t("cust_drawer.logout_btn")}
        </button>
        <button onClick={()=>setShowDel(true)} style={{width:"100%",padding:"14px 20px",background:"linear-gradient(135deg,rgba(231,76,60,.15),rgba(231,76,60,.08))",border:"none",borderTop:"1px solid var(--border-ui)",color:"#e74c3c",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:"center",WebkitAppearance:"none",appearance:"none"}}>
          {t("cust_drawer.delete_btn")}
        </button>
        <div style={{padding:"14px 20px",textAlign:"center",fontSize:11,color:"var(--text-muted)",fontFamily:"monospace"}}>{t("cust_drawer.version")} {APP_VERSION}</div>
        <div style={{height:40}}/>
      </div>
      {/* نوافذ تسجيل الخروج وحذف الحساب — خارج الـ drawer لتجنب تأثير transform */}
      {showLogout&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowLogout(false)}>
          <div style={{width:"100%",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--border-ui)",borderBottom:"none"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:10}}>🚪</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.logout_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("cust_drawer.logout_body")}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}} onClick={()=>setShowLogout(false)}>{t("cust_drawer.cancel")}</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{setCustomerSession(null);setView("entry");onClose();}}>{t("cust_drawer.exit")}</button>
            </div>
          </div>
        </div>
      )}
      {showDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowDel(false)}>
          <div style={{width:"100%",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--gold)",borderBottom:"none",boxShadow:"0 -8px 32px rgba(var(--gold-rgb),.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:10}}>⚠️</div>
              <div style={{fontSize:16,fontWeight:900,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.delete_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>{t("cust_drawer.delete_body")}</div>
            </div>
            <div style={{background:"rgba(var(--pr),.08)",border:"1px solid rgba(var(--pr),.2)",borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:"var(--text-primary)",lineHeight:1.8}}>
              <div style={{marginBottom:6,fontWeight:700,color:"var(--p)"}}>{t("cust_drawer.delete_will")}</div>
              <div>{t("cust_drawer.delete_item1")}</div>
              <div>{t("cust_drawer.delete_item2")}</div>
              <div>{t("cust_drawer.delete_item3")}</div>
            </div>
            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:10,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700}}>
              ⚡ تنبيه: لا يمكن استرجاع البيانات بعد الحذف
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}} onClick={()=>setShowDel(false)}>↩️ {t("cust_drawer.cancel")}</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={async()=>{try{await sb("customers","DELETE",null,`?id=eq.${customer.id}`);setCustomerSession(null);setView("entry");onClose();}catch(e){toast$("❌ "+e.message,"err");}setShowDel(false);}}>🗑️ {t("cust_drawer.delete_confirm")}</button>
            </div>
          </div>
        </div>
      )}
      {/* حوار تغيير PIN */}
      {editPinStep&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
            {editPinStep==="select"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_select_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_select_hint")}</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <button onClick={()=>{setEditPinLength(4);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===4?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.pin_4")}</button>
                <button onClick={()=>{setEditPinLength(6);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===6?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.pin_6")}</button>
              </div>
              <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);}} style={{width:"100%",padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.cancel")}</button>
            </>:editPinStep==="enter"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_enter")} ({editPinLength} {t("cust_drawer.pin_digits_hint")})</div>
              <input type="password" maxLength={editPinLength} value={editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditTempPin(val);if(val.length===editPinLength)setTimeout(()=>setEditPinStep("confirm"),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr",boxSizing:"border-box"}} placeholder="•••••" autoFocus/>
            </>:editPinStep==="confirm"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("cust_drawer.pin_confirm_title")}</div>
              <input type="password" maxLength={editPinLength} value={editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditPinConfirm(val);if(val.length===editPinLength&&editTempPin!==val){setEditPinErr(t("cust_drawer.pin_mismatch"));}else{setEditPinErr("");}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr",boxSizing:"border-box"}} placeholder="•••••" autoFocus/>
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={()=>{if(editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm){const k=String(customer.id);localStorage.setItem(`dork_customer_pin_${k}`,editTempPin);localStorage.setItem(`dork_customer_pin_length_${k}`,String(editPinLength));setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");toast$(t("cust_drawer.pin_success"));}}} disabled={editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"var(--p)":"var(--border-ui)",color:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"#000":"#555",cursor:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.pin_save")}</button>
                <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_drawer.cancel")}</button>
              </div>
            </>:null}
          </div>
        </div>
      )}
    </>
  );
}
// ==============================================
//  SALON DRAWER — قائمة صاحب الصالون
// ==============================================
function SalonDrawer({open,onClose,salon,ownerTab,setOwnerTab,setView,setOwnerSession,settings,setSettings,persistUiToSupabase,toast$}){
  const[showLogout,setShowLogout]=useState(false);
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  useEffect(()=>{if(!open)setShowLogout(false);},[open]);
  if(!salon)return null;

  const nav=(fn)=>{fn();onClose();};

  const Row=({icon,label,active,onClick})=>(
    <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 20px",background:active?"var(--pa08)":"transparent",border:"none",borderBottom:"1px solid var(--border-ui)",cursor:"pointer",fontFamily:"inherit",color:active?"var(--p)":"var(--text-primary)",WebkitAppearance:"none",appearance:"none",textAlign:dir==="rtl"?"right":"left"}}>
      <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
      <span style={{fontSize:14,fontWeight:active?700:500,flex:1}}>{label}</span>
      {active&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--p)",flexShrink:0}}/>}
    </button>
  );
  const SecHead=({label})=>(<div style={{padding:"10px 20px 5px",fontSize:11,color:"var(--p)",fontWeight:700,letterSpacing:.8,background:"var(--shell-bg)",borderBottom:"1px solid var(--border-ui)"}}>{label}</div>);

  return(
    <>
      {open&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1100,backdropFilter:"blur(2px)"}}/>}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:"82%",maxWidth:340,background:"var(--shell-bg)",zIndex:1101,transform:open?"translateX(0)":"translateX(110%)",transition:"transform 0.3s cubic-bezier(.4,0,.2,1)",overflowY:"auto",display:"flex",flexDirection:"column",direction:dir,boxShadow:open?"-4px 0 32px rgba(0,0,0,.6)":"none"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 16px",borderBottom:"1px solid var(--border-ui)",background:"var(--shell-bg)",position:"sticky",top:0,zIndex:1}}>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.06)",border:"none",color:"var(--text-muted)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
          <span style={{fontSize:15,fontWeight:700,color:"var(--p)"}}>{t("salon_drawer.title")}</span>
        </div>
        <div style={{height:8}}/>
        <SecHead label={t("salon_drawer.section_operations")}/>
        <Row icon="📋" label={t("salon_drawer.dashboard")} active={ownerTab===null} onClick={()=>nav(()=>{setOwnerTab(null);setView("ownerDash");})}/>
        <Row icon="🗓" label={t("salon_drawer.bookings")} active={ownerTab==="calendar"} onClick={()=>nav(()=>{setOwnerTab("calendar");setView("ownerDash");})}/>
        <Row icon="💬" label={t("salon_drawer.messages")} active={ownerTab==="messages"} onClick={()=>nav(()=>{setOwnerTab("messages");setView("ownerDash");})}/>
        <Row icon="⭐" label={t("salon_drawer.reviews")} active={ownerTab==="reviews"} onClick={()=>nav(()=>{setOwnerTab("reviews");setView("ownerDash");})}/>
        <Row icon="📊" label={t("salon_drawer.stats")} active={ownerTab==="stats"} onClick={()=>nav(()=>{setOwnerTab("stats");setView("ownerDash");})}/>
        <Row icon="🔥" label="إرسال عرض" active={ownerTab==="promo"} onClick={()=>nav(()=>{setOwnerTab("promo");setView("ownerDash");})}/>
        <SecHead label={t("salon_drawer.section_salon")}/>
        <Row icon="📋" label={t("salon_drawer.salon_info")} onClick={()=>nav(()=>setView("ownerInfo"))}/>
        <Row icon="🕐" label={t("salon_drawer.working_hours")} onClick={()=>nav(()=>setView("ownerHours"))}/>
        <Row icon="✂" label={t("salon_drawer.services_prices")} onClick={()=>nav(()=>setView("ownerServices"))}/>
        <Row icon="💈" label={t("salon_drawer.barbers")} onClick={()=>nav(()=>setView("ownerBarbers"))}/>
        <Row icon="📱" label={t("salon_drawer.social_media")} onClick={()=>nav(()=>setView("ownerSocial"))}/>
        <SecHead label={t("salon_drawer.section_app")}/>
        <Row icon="🎨" label={t("salon_drawer.colors_theme")} onClick={()=>nav(()=>setView("ownerTheme"))}/>
        <Row icon="🌙" label={t("salon_drawer.lighting")} onClick={()=>nav(()=>setView("ownerDark"))}/>
        <Row icon="🌐" label={t("salon_drawer.language")} onClick={()=>nav(()=>setView("ownerLang"))}/>
        <Row icon="🔔" label={t("salon_drawer.tones")} onClick={()=>nav(()=>setView("ownerTone"))}/>
        <Row icon="🔐" label={t("salon_drawer.pin")} onClick={()=>nav(()=>setView("ownerPin"))}/>
        <Row icon="❓" label={t("salon_drawer.faq")} onClick={()=>nav(()=>setView("ownerFaq"))}/>

        <div style={{height:16}}/>
        <button onClick={()=>setShowLogout(true)} style={{width:"100%",padding:"15px 20px",background:"transparent",border:"none",borderTop:"1px solid var(--border-ui)",color:"#e74c3c",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",textAlign:dir==="rtl"?"right":"left",WebkitAppearance:"none",appearance:"none"}}>
          🚪 {t("salon_drawer.logout_btn")}
        </button>
        <div style={{padding:"14px 20px",textAlign:"center",fontSize:11,color:"var(--text-muted)",fontFamily:"monospace"}}>{t("salon_drawer.version")} {APP_VERSION}</div>
        <div style={{height:40}}/>
      </div>
      {showLogout&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowLogout(false)}>
          <div style={{width:"100%",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--border-ui)",borderBottom:"none",direction:dir}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:10}}>🚪</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("salon_drawer.logout_title")}</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("salon_drawer.logout_body")}</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}} onClick={()=>setShowLogout(false)}>{t("salon_drawer.cancel")}</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{setOwnerSession&&setOwnerSession(null);setView("entry");onClose();}}>{t("salon_drawer.exit")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==============================================
// ==============================================
//  ENTRY VIEW — شاشة اختيار عميل / صالون
// ==============================================
function EntryView({setView}){
  const[showLang,setShowLang]=useState(false);
  const[logoLoaded,setLogoLoaded]=useState(false);
  const LOGO_PLACEHOLDER="data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAACQAwCdASoUAA0APzmGuVOvKSWisAgB4CcJYgCw7CFT4rqfPwwAAP7ZEa95QUaqWzCM0vMrT3vd7rt/PCpeS2iuqpAAAA==";
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const LANGS=[
    {code:'ar',flag:'🇸🇦',label:'العربية'},
    {code:'en',flag:'🇬🇧',label:'English'},
    {code:'ur',flag:'🇵🇰',label:'اردو'},
    {code:'tr',flag:'🇹🇷',label:'Türkçe'},
  ];
  return(
    <div style={{minHeight:"100vh",background:"var(--shell-bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 28px",gap:40,position:"relative",direction:dir}}>
      <div style={{position:"absolute",top:20,right:20,zIndex:10}}>
        {showLang&&<div onClick={()=>setShowLang(false)} style={{position:"fixed",inset:0,zIndex:9}}/>}
        <button onClick={()=>setShowLang(v=>!v)} style={{width:40,height:40,borderRadius:12,border:"1.5px solid var(--border-ui)",background:showLang?"var(--pa08)":"transparent",color:"var(--text-primary)",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",WebkitAppearance:"none",appearance:"none",position:"relative",zIndex:11}}>🌐</button>
        {showLang&&(
          <div style={{position:"absolute",top:"110%",right:0,background:"var(--surface-1)",borderRadius:12,border:"1px solid var(--border-ui)",overflow:"hidden",zIndex:12,minWidth:160,boxShadow:"0 4px 24px rgba(0,0,0,.4)"}}>
            {LANGS.map((l,i)=>{
              const active=i18n.language===l.code;
              return(
                <button key={l.code} onClick={()=>{i18n.changeLanguage(l.code);setShowLang(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:active?"var(--pa08)":"transparent",border:"none",borderBottom:i<LANGS.length-1?"1px solid var(--border-ui)":"none",cursor:"pointer",fontFamily:"inherit",color:active?"var(--p)":"var(--text-primary)",textAlign:"right",WebkitAppearance:"none",appearance:"none"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{l.flag}</span>
                  <span style={{fontSize:14,fontWeight:active?700:500,flex:1,textAlign:"right"}}>{l.label}</span>
                  {active&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--p)",flexShrink:0}}/>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{position:"relative",width:"82%",maxWidth:320}}>
        <img src={LOGO_PLACEHOLDER} alt="" aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",filter:"blur(12px)",transform:"scale(1.05)",opacity:logoLoaded?0:1,transition:"opacity 0.5s ease",pointerEvents:"none"}}/>
        <img src="/logo.webp" alt="DORK" style={{width:"100%",objectFit:"contain",opacity:logoLoaded?1:0,transition:"opacity 0.5s ease"}} onLoad={()=>setLogoLoaded(true)}/>
      </div>
      <div style={{width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:16}}>
        <button onClick={()=>setView("ownerLogin")} style={{width:"100%",padding:"17px 0",borderRadius:14,border:"2px solid var(--p)",background:"transparent",color:"var(--p)",fontSize:18,fontWeight:700,fontFamily:"'Cairo',sans-serif",cursor:"pointer",letterSpacing:.5,WebkitAppearance:"none",appearance:"none"}}>{t("entry.salon_btn")}</button>
        <button onClick={()=>setView("custLogin")} style={{width:"100%",padding:"17px 0",borderRadius:14,border:"2px solid var(--p)",background:"rgba(var(--pr),.12)",color:"var(--p)",fontSize:18,fontWeight:700,fontFamily:"'Cairo',sans-serif",cursor:"pointer",letterSpacing:.5,WebkitAppearance:"none",appearance:"none"}}>{t("entry.client_btn")}</button>
      </div>
    </div>
  );
}
// ==============================================
//  TOP BAR - 3 role buttons on the LEFT
// ==============================================
function TopBar({ownerSession,customerSession,setView,setOwnerSession,setCustomerSession,darkMode,setDarkMode,resetHome,showDrawer,setShowDrawer,showSalonDrawer,setShowSalonDrawer}){
  // للعميل: هيدر مبسط مع زر ≡
  if(customerSession&&!ownerSession){
    return(
      <div style={G.topBar}>
        {/* LEFT: زر القائمة */}
        <button onClick={()=>setShowDrawer&&setShowDrawer(v=>!v)} style={{width:44,height:44,borderRadius:12,background:showDrawer?"var(--pa15)":"rgba(255,255,255,.05)",border:`1.5px solid ${showDrawer?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:0,flexShrink:0,transition:"all 0.2s"}}>
          <span style={{display:"block",width:18,height:2,background:showDrawer?"var(--p)":"var(--text-muted)",borderRadius:2,transition:"all 0.2s"}}/>
          <span style={{display:"block",width:14,height:2,background:showDrawer?"var(--p)":"var(--text-muted)",borderRadius:2,transition:"all 0.2s"}}/>
          <span style={{display:"block",width:18,height:2,background:showDrawer?"var(--p)":"var(--text-muted)",borderRadius:2,transition:"all 0.2s"}}/>
        </button>
        {/* RIGHT: شعار */}
        <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",lineHeight:1}} onClick={()=>resetHome&&resetHome()}>
          <span style={{fontFamily:"'Cairo',sans-serif",fontSize:17,fontWeight:900,color:"var(--p)",letterSpacing:0.5}}>احجز</span>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:48,fontWeight:900,background:"linear-gradient(180deg,var(--pll) 0%,var(--p) 50%,var(--pd) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0px 2px 2px rgba(0,0,0,0.25))",letterSpacing:2,lineHeight:1}}>DORK</span>
        </div>
      </div>
    );
  }
  // صاحب الصالون: زر الدرج فقط
  if(ownerSession) return(
    <div style={G.topBar}>
      <button onClick={()=>setShowSalonDrawer&&setShowSalonDrawer(v=>!v)} style={{width:44,height:44,borderRadius:12,background:showSalonDrawer?"var(--pa15)":"rgba(255,255,255,.05)",border:`1.5px solid ${showSalonDrawer?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,padding:0,flexShrink:0,transition:"all 0.2s"}}>
        <span style={{display:"block",width:18,height:2,background:showSalonDrawer?"var(--p)":"var(--text-muted)",borderRadius:2,transition:"all 0.2s"}}/>
        <span style={{display:"block",width:14,height:2,background:showSalonDrawer?"var(--p)":"var(--text-muted)",borderRadius:2,transition:"all 0.2s"}}/>
        <span style={{display:"block",width:18,height:2,background:showSalonDrawer?"var(--p)":"var(--text-muted)",borderRadius:2,transition:"all 0.2s"}}/>
      </button>
      <div style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>setView("ownerDash")}>
        <span style={{fontFamily:"'Cairo',sans-serif",fontSize:17,fontWeight:900,color:"var(--p)",letterSpacing:0.5}}>احجز</span>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:48,fontWeight:900,background:"linear-gradient(180deg,var(--pll) 0%,var(--p) 50%,var(--pd) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0px 2px 2px rgba(0,0,0,0.25))",letterSpacing:2,lineHeight:1}}>DORK</span>
      </div>
    </div>
  );
  // بدون تسجيل: الأزرار الحالية
  return(
    <div style={G.topBar}>
      <div style={{display:"flex",gap:5,alignItems:"center"}}>
        <button style={{...G.roleBtn,...(customerSession?G.roleBtnActive:{})}} onClick={()=>setView(customerSession?"custDash":"custLogin")}>👤</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",lineHeight:1}} onClick={()=>resetHome&&resetHome()}>
        <span style={{fontFamily:"'Cairo',sans-serif",fontSize:17,fontWeight:900,color:"var(--p)",letterSpacing:0.5}}>احجز</span>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:48,fontWeight:900,background:"linear-gradient(180deg,var(--pll) 0%,var(--p) 50%,var(--pd) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0px 2px 2px rgba(0,0,0,0.25))",letterSpacing:2,lineHeight:1}}>DORK</span>
      </div>
    </div>
  );
}

// ==============================================
//  HOME — آراء العملاء — Horizontal Minimalist Carousel
// ==============================================
function HomeReviewsSection({customers,approvedSalons,setSelSalon,setView}){
  const{t}=useTranslation();
  const reviews=buildHomeReviewsFeed(customers,approvedSalons);
  const [activeIdx,setActiveIdx]=useState(0);
  const scrollRef=useRef(null);
  const timerRef=useRef(null);
  const gold="var(--gold)";
  const goldStar="var(--gold)";
  const dimStar="rgba(var(--gold-rgb),.18)";
  const shown=reviews.slice(0,16);

  const scrollTo=idx=>{
    if(!scrollRef.current)return;
    const el=scrollRef.current.children[idx];
    if(el)el.scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});
    setActiveIdx(idx);
  };

  // auto-scroll every 4 s, pause on user hover
  const startTimer=()=>{
    clearInterval(timerRef.current);
    if(shown.length<2)return;
    timerRef.current=setInterval(()=>{
      setActiveIdx(prev=>{
        const next=(prev+1)%shown.length;
        if(scrollRef.current&&scrollRef.current.children[next])
          scrollRef.current.children[next].scrollIntoView({behavior:"smooth",block:"nearest",inline:"start"});
        return next;
      });
    },4000);
  };
  useEffect(()=>{startTimer();return()=>clearInterval(timerRef.current);},[shown.length]);

  const openSalon=sid=>{
    const s=approvedSalons.find(x=>Number(x.id)===Number(sid));
    if(s){setSelSalon(s);setView("salon");}
  };

  const globalAvg=reviews.length
    ?Math.round(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length*10)/10
    :0;

  return(
    <div style={{padding:"16px 0 8px",borderTop:"1px solid rgba(var(--gold-rgb),.1)"}}>
      {/* ── Header row ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",marginBottom:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"var(--text-primary)",letterSpacing:.4}}>{t("home_reviews.title")}</div>
          <div style={{fontSize:10,color:gold,opacity:.85}}>{t("home_reviews.subtitle")}</div>
        </div>
        {reviews.length>0&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 10px",borderRadius:10,background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)"}}>
            <span style={{fontSize:14,fontWeight:900,color:goldStar,lineHeight:1}}>{globalAvg}</span>
            <span style={{fontSize:8,color:"var(--text-muted)",marginTop:1}}>{reviews.length} {t("home_reviews.reviews_count")}</span>
          </div>
        )}
      </div>

      {/* ── Carousel track ── */}
      {reviews.length===0?(
        <div style={{margin:"0 16px",padding:"18px 14px",borderRadius:14,background:"var(--shell-bg)",border:"1px dashed rgba(var(--gold-rgb),.2)",textAlign:"center"}}>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("home_reviews.empty")}</div>
        </div>
      ):(
        <>
          <div
            ref={scrollRef}
            onMouseEnter={()=>clearInterval(timerRef.current)}
            onMouseLeave={startTimer}
            onTouchStart={()=>clearInterval(timerRef.current)}
            onTouchEnd={startTimer}
            onScroll={e=>{
              const c=e.currentTarget;
              const cardW=(c.children[0]?.offsetWidth||260)+10;
              setActiveIdx(Math.round(c.scrollLeft/cardW));
            }}
            style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6,paddingLeft:16,paddingRight:8,scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            {shown.map((r,i)=>(
              <div
                key={r.key}
                style={{
                  scrollSnapAlign:"start",
                  flex:"0 0 calc(88% - 24px)",
                  maxWidth:310,
                  background:"var(--surface-1)",
                  border:`1px solid rgba(var(--gold-rgb),${i===activeIdx?.42:.18})`,
                  borderRadius:16,
                  padding:"14px 14px 12px",
                  transition:"border-color .3s",
                  display:"flex",flexDirection:"column",gap:0,
                }}>
                {/* Salon name */}
                <div style={{fontSize:12,fontWeight:800,color:"var(--gold)",marginBottom:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:.2}}>
                  ✂ {r.salonName}
                </div>
                {/* Customer + stars */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:11,color:"var(--text-primary)",fontWeight:600}}>
                    👤 {r.customerName}
                  </span>
                  <div style={{display:"flex",gap:1}}>
                    {[1,2,3,4,5].map(n=>(
                      <span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:dimStar,lineHeight:1}}>★</span>
                    ))}
                  </div>
                </div>
                {/* Divider */}
                <div style={{height:1,background:"rgba(var(--gold-rgb),.08)",marginBottom:10}}/>
                {/* Comment */}
                <div style={{fontSize:11,color:"var(--text-muted)",fontStyle:r.comment?"italic":"normal",lineHeight:1.55,flex:1,minHeight:32}}>
                  {r.comment?`«${r.comment}»`:t("home_reviews.no_comment")}
                </div>
                {/* Date */}
                <div style={{fontSize:9,color:"var(--text-muted)",marginTop:8,paddingTop:6,borderTop:"1px solid rgba(var(--gold-rgb),.06)"}}>
                  📅 {r.date||"—"}{r.time?` · ${r.time}`:""}
                </div>
                {/* عرض الكل — minimalist gold-border button */}
                <button
                  onClick={e=>{e.stopPropagation();openSalon(r.salonId);}}
                  style={{marginTop:12,width:"100%",background:"transparent",border:"1px solid rgba(var(--gold-rgb),.45)",color:gold,borderRadius:8,padding:"7px 0",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:700,letterSpacing:.4}}>
                  {t("home_reviews.view_all")}
                </button>
              </div>
            ))}
          </div>

          {/* ── Scroll dots ── */}
          {shown.length>1&&(
            <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:10,padding:"0 16px"}}>
              {shown.map((_,i)=>(
                <button key={i} onClick={()=>scrollTo(i)} style={{width:i===activeIdx?18:6,height:6,borderRadius:3,background:i===activeIdx?gold:"rgba(var(--gold-rgb),.2)",border:"none",cursor:"pointer",padding:0,transition:"width .3s,background .3s"}}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==============================================
//  HOME
// ==============================================
function HomeView({displaySalons,approvedSalons,allLoc,fRegion,setFRegion,fGov,setFGov,fCenter,setFCenter,fVillage,setFVillage,govList,villageList,centerList2,showFavs,setShowFavs,favSet,toggleFav,setView,setSelSalon,customer,search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,toast$,customers,salons,reviews,compareSalons,setCompareSalons,handlePullRefresh,pullRefreshing,loading,promotions}){
  const{t}=useTranslation();
  const[urgentMode,setUrgentMode]=useState(false);
  const[promoMode,setPromoMode]=useState(false);
  const[showSearch,setShowSearch]=useState(false);
  const[showRegionSelect,setShowRegionSelect]=useState(false);

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
  const activeSalonPromoIds=new Set((promotions||[]).filter(p=>p.status==="active").map(p=>String(p.salon_id)));
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
      {pullRefreshing&&<div style={{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",zIndex:100,background:"var(--p)",color:"#000",padding:"4px 16px",borderRadius:20,fontSize:12,fontWeight:700}}>{t("home.refreshing")}</div>}

      {/* Region Select - قائمة متدرجة */}
      {showRegionSelect&&(()=>{
        const villages=[...new Set(approvedSalons.filter(s=>s.center===fCenter&&s.village).map(s=>s.village))];
        const selStyle=(active)=>({flex:1,minWidth:72,height:32,borderRadius:8,border:`1.5px solid ${active?"var(--gold)":"#333"}`,background:"rgba(12,12,22,.97)",color:active?"var(--gold)":"#777",fontSize:11,fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:"0 6px",cursor:"pointer",outline:"none"});
        return(
          <div style={{background:"rgba(0,0,0,.5)",borderBottom:"1px solid rgba(var(--gold-rgb),.15)",padding:"8px 10px",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            <button onClick={()=>{setShowRegionSelect(false);setFRegion("");setFGov("");setFCenter("");setFVillage("");}} style={{background:"transparent",border:"none",color:"var(--text-muted)",fontSize:15,cursor:"pointer",padding:"2px 4px",flexShrink:0,lineHeight:1}}>✕</button>
            <select value={fRegion||""} onChange={e=>{setFRegion(e.target.value);setFGov("");setFCenter("");setFVillage("");}} style={selStyle(!!fRegion)}>
              <option value="">المنطقة</option>
              {allLoc.map(r=><option key={r.region} value={r.region}>{r.region}</option>)}
            </select>
            {fRegion&&govList.length>0&&(
              <select value={fGov||""} onChange={e=>{setFGov(e.target.value);setFCenter("");setFVillage("");}} style={selStyle(!!fGov)}>
                <option value="">المحافظة</option>
                {govList.map(g=><option key={g.name||g} value={g.name||g}>{g.name||g}</option>)}
              </select>
            )}
            {fGov&&centerList2.length>0&&(
              <select value={fCenter||""} onChange={e=>{setFCenter(e.target.value);setFVillage("");}} style={selStyle(!!fCenter)}>
                <option value="">المركز</option>
                {centerList2.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {fCenter&&villages.length>0&&(
              <select value={fVillage||""} onChange={e=>{setFVillage(e.target.value);if(e.target.value)setShowRegionSelect(false);}} style={selStyle(!!fVillage)}>
                <option value="">الحي</option>
                {villages.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </div>
        );
      })()}

      <div style={{padding:"10px 14px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",alignItems:"center"}}>
        {/* البحث - عدسة صغيرة */}
        <button style={{minWidth:50,width:50,height:50,borderRadius:"50%",background:showSearch?"var(--pa3)":"var(--pa15)",border:"1.5px solid var(--p)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20,transition:"all 0.2s",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{const o=!showSearch;setShowSearch(o);setShowRegionSelect(false);if(o)setSortBy("");setTimeout(()=>{const inp=document.querySelector('input[placeholder="ابحث..."]');if(inp)inp.focus();},50);}} title="بحث">
          🔍
        </button>

        {/* المنطقة */}
        <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:showRegionSelect?"var(--pa3)":"var(--surface-2)",border:`1.5px solid ${showRegionSelect?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,fontWeight:700,color:"var(--text-primary)",transition:"all 0.2s",WebkitAppearance:"none",appearance:"none"}} onClick={()=>{const o=!showRegionSelect;setShowRegionSelect(o);setShowSearch(false);if(o)setSortBy("");}} title="المنطقة">
          {fVillage?fVillage.substring(0,3):fCenter?fCenter.substring(0,3):fGov?fGov.substring(0,3):fRegion?fRegion.substring(0,3):t("home.filter_region")}
        </button>

        {/* احجز سريع */}
        {lastSalon&&customer&&(
          <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,.05)",border:"1.5px solid var(--border-ui)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:24,transition:"all 0.2s"}} onClick={()=>{setSelSalon(lastSalon);setView("book");}} title="احجز سريع">
            ⚡
          </button>
        )}

        {/* زر العروض */}
        <button style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:promoMode?"rgba(231,76,60,.25)":"var(--surface-2)",border:`1.5px solid ${promoMode?"#e74c3c":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18,transition:"all 0.2s",flexDirection:"column",gap:2}} onClick={()=>{setPromoMode(p=>!p);setShowSearch(false);setShowRegionSelect(false);setSortBy("");}} title="العروض">
          <span>🔥</span>
          <span style={{fontSize:9,color:promoMode?"#e74c3c":"var(--text-muted)"}}>عروض</span>
        </button>

        {/* الفلاتر الأخرى */}
        {[
          ["nearest","📍",t("home.sort_nearest")],
          ["ratingHigh","⭐",t("home.sort_rating_high")],
          ["ratingLow","☆",t("home.sort_rating_low")],
          ["priceHigh","💰",t("home.sort_price_high")],
          ["priceLow","🪙",t("home.sort_price_low")],
        ].map(([k,ic,l])=>(
          <button key={k} style={{minWidth:60,width:60,height:60,borderRadius:"50%",background:sortBy===k?"var(--pa3)":"var(--surface-2)",border:`1.5px solid ${sortBy===k?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18,transition:"all 0.2s",flexDirection:"column",gap:2}} onClick={()=>{if(sortBy===k){setSortBy("");}else{setShowSearch(false);setShowRegionSelect(false);if(k==="nearest"&&!userLoc){detectUserLoc();return;}setSortBy(k);}}} title={l}>
            <span>{ic}</span>
            <span style={{fontSize:9,color:"var(--text-muted)"}}>{l}</span>
          </button>
        ))}
      </div>

      {/* البحث */}
      {showSearch&&(
      <div style={{padding:"10px 14px",background:"rgba(0,0,0,.4)",borderBottom:"1px solid rgba(var(--gold-rgb),.1)",animation:"slideDown 0.2s ease-out"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,.05)",borderRadius:9,border:"1px solid var(--border-ui)",padding:"8px 12px",gap:6,cursor:"text"}}>
          <span style={{fontSize:12,color:"var(--p)",flexShrink:0}}>🔎</span>
          <input autoFocus style={{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl",WebkitAppearance:"none",appearance:"none"}} placeholder={t("home.search_ph")} value={search} onChange={e=>setSearch(e.target.value)} onBlur={()=>{if(!search)setShowSearch(false);}}/>
          {search&&<button style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:11,padding:0,WebkitAppearance:"none",appearance:"none"}} onClick={()=>setSearch("")}>✕</button>}
        </div>
      </div>
      )}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{padding:"10px 14px 80px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:15,fontWeight:700,color:"var(--text-primary)"}}>
            {urgentMode?t("home.open_now"):t("home.available_salons")}
          </span>
          <span style={G.badge}>{sortedSalons.length}</span>
        </div>
        {loading&&sortedSalons.length===0
          ?null
          :sortedSalons.length===0
            ?<div style={G.empty}>{urgentMode?t("home.no_salons_open"):t("home.no_salons")}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:11,animation:"fadeInCards .4s ease-out"}}>
              {sortedSalons.map(s=>{
                const activePromo=(promotions||[]).find(p=>String(p.salon_id)===String(s.id)&&p.status==="active")||null;
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
                  onViewReviews={()=>{setSelSalon(s);setView("salonReviews");}}
                  onBook={()=>{setSelSalon(s);setView("book");}}/>
              );})}
            </div>
        }
      </div>

    </div>
  );
}
function LocFilter({icon,label,value,onChange,options,all}){
  return(
    <div style={G.fRow}>
      <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
      <span style={{fontSize:11,color:"var(--p)",flexShrink:0,minWidth:50}}>{label}</span>
      <select style={G.fSel} value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
// ==============================================
//  SALON REVIEWS PAGE
// ==============================================
function SalonReviewsView({salon,reviews,setView}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const salonReviews=useMemo(()=>{
    if(!reviews||!salon)return[];
    const id=Number(salon.id);
    return (reviews||[])
      .filter(r=>Number(r.salon_id)===id)
      .map(r=>({id:r.id,name:r.customer_name||t("salon_reviews.customer_fallback"),rating:r.rating,comment:r.comment||"",ownerReply:r.owner_reply||"",date:r.booking_date||r.created_at?.split("T")[0]||""}))
      .sort((a,b)=>b.date.localeCompare(a.date));
  },[reviews,salon,t]);
  const avg=salonReviews.length?Math.round(salonReviews.reduce((s,r)=>s+r.rating,0)/salonReviews.length*10)/10:0;
  return(
    <div style={{...G.page,direction:dir}}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setView("home")}>← {t("salon_reviews.back")}</button>
          <h2 style={{...G.ft,flex:1}}>{t("salon_reviews.title")}</h2>
        </div>
        <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>✂ {salon?.name}</div>
          {salonReviews.length>0?(
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28,fontWeight:900,color:"var(--gold)",lineHeight:1}}>{avg}</span>
              <div>
                <div style={{display:"flex",gap:2,marginBottom:2}}>
                  {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:16,color:n<=Math.round(avg)?"var(--gold)":"rgba(var(--gold-rgb),.2)"}}>★</span>)}
                </div>
                <div style={{fontSize:10,color:"var(--text-muted)"}}>{salonReviews.length} {t("salon_reviews.rating_unit")}</div>
              </div>
            </div>
          ):(
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{t("salon_reviews.no_reviews")}</div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {salonReviews.map((r,i)=>(
            <div key={i} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:r.comment?6:0}}>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700}}>👤 {r.name}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?"var(--gold)":"rgba(var(--gold-rgb),.18)"}}>★</span>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:5}}>«{r.comment}»</div>}
              {r.date&&<div style={{fontSize:9,color:"var(--text-muted)",marginBottom:r.ownerReply?8:0}}>📅 {r.date}</div>}
              {r.ownerReply&&(
                <div style={{marginTop:6,padding:"8px 10px",background:"rgba(var(--gold-rgb),.07)",borderRight:"3px solid #d4a017",borderRadius:"0 8px 8px 0"}}>
                  <div style={{fontSize:10,color:"var(--gold)",fontWeight:700,marginBottom:3}}>{t("salon_reviews.owner_reply_label")}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{r.ownerReply}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        {salonReviews.length===0&&<div style={G.empty}>{t("salon_reviews.no_reviews_salon")}</div>}
      </div>
    </div>
  );
}

function SalonCard({salon,fav,onFav,onBook,onViewReviews,realRating,reviewCount,userLoc,getSalonCoords,haversine,isOpenNow,inCompare,onCompare,activePromo}){
  const{t}=useTranslation();
  const[showPromoPopup,setShowPromoPopup]=useState(false);
  const displayRating=realRating||salon.rating||"5.0";

  let distance=null;
  if(userLoc&&getSalonCoords&&haversine){
    const coords=getSalonCoords(salon);
    if(coords)distance=haversine(userLoc.lat,userLoc.lng,coords.lat,coords.lng).toFixed(1);
  }

  if(salon.frozen)return(
    <div style={{...G.card,opacity:.5,position:"relative"}}>
      <div style={{position:"absolute",top:8,left:8,background:"#e74c3c",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{t("salon_card.frozen_tag")}</div>
      <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",marginBottom:4}}>✂ {salon.name}</div>
      <div style={{fontSize:11,color:"var(--text-muted)"}}>{t("salon_card.frozen_msg")}</div>
    </div>
  );

  const promoBorder=activePromo?(inCompare?"2px solid var(--p)":"2px solid #e74c3c"):inCompare?"2px solid var(--p)":"1px solid var(--border-ui)";
  const promoShadow=activePromo?"0 4px 20px rgba(231,76,60,.2)":"0 4px 16px rgba(0,0,0,.3)";

  return(
    <>
    <div style={{...G.card,border:promoBorder,padding:"16px",display:"flex",flexDirection:"column",gap:"12px",boxShadow:promoShadow}}>
      {/* Header Row: الاسم يسار + التقييم يمين */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
        <button onClick={activePromo?()=>setShowPromoPopup(true):undefined} style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0,cursor:activePromo?"pointer":"default",fontFamily:"'Cairo',sans-serif"}}>
          <span style={{fontSize:13,fontWeight:800,color:"var(--p)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{salon.name}</span>
          {activePromo&&<span style={{fontSize:12,flexShrink:0}}>🔥</span>}
        </button>
        <button onClick={onViewReviews} style={{border:"1.5px solid rgba(var(--gold-rgb),.4)",borderRadius:10,padding:"6px 10px",minWidth:"65px",textAlign:"center",flex:"0 0 auto",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{fontSize:16,fontWeight:900,color:"var(--gold)"}}>⭐ {displayRating}</div>
          <div style={{fontSize:8,color:"var(--text-muted)"}}>({reviewCount})</div>
        </button>
      </div>

      {/* Location Row */}
      <div style={{fontSize:10,color:"var(--text-muted)"}}>
        📍 {salon.gov||salon.region}{salon.village?` - ${salon.village}`:""}</div>

      {/* Hours & Wait Time */}
      <div style={{display:"flex",flexDirection:"column",gap:4,fontSize:11,color:"var(--text-muted)"}}>
        <div>
          ⏰ {salon.shiftEnabled?(salon.shift1Start&&salon.shift1End?`${salon.shift1Start.slice(0,5)}-${salon.shift1End.slice(0,5)}`:"--:-- - --:--"):(salon.workStart&&salon.workEnd?`${salon.workStart.slice(0,5)}-${salon.workEnd.slice(0,5)}`:"--:-- - --:--")}
        </div>
        <div>
          👥 {salon.barbers?.length||1} {t("salon_card.barber_unit")} - 20 min
        </div>
      </div>

      {/* Services Tags - Below Barbers */}
      {salon.services.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {salon.services.slice(0,4).map(s=>(
            <span key={s} style={{fontSize:9,background:"rgba(var(--gold-rgb),.12)",color:"var(--gold)",padding:"4px 10px",borderRadius:8,fontWeight:600}}>
              {s}
            </span>
          ))}
          {salon.services.length>4&&<span style={{fontSize:9,background:"rgba(var(--gold-rgb),.12)",color:"var(--gold)",padding:"4px 10px",borderRadius:8,fontWeight:600}}>+{salon.services.length-4}</span>}
        </div>
      )}

      {/* Divider */}
      <div style={{height:1,background:"rgba(var(--gold-rgb),.1)"}}/>

      {/* Book Button + Action Buttons - Reordered */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title="الموقع" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:"#e74c3c",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          📍
        </button>
        <button onClick={()=>onFav?.()} title="المفضلة" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:fav?"var(--gold)":"#aaa",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          {fav?"♥":"♡"}
        </button>
        <button onClick={onCompare} title="مقارنة" style={{background:"transparent",border:"1.5px solid #3a3a4a",color:"var(--text-muted)",borderRadius:10,padding:"8px 10px",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,flex:"0 0 36px"}}>
          ⚖
        </button>
        <button onClick={onBook} style={{background:"var(--pa12)",color:"var(--p)",border:"1.5px solid rgba(var(--pr),.4)",borderRadius:10,padding:"12px 16px",fontSize:12,fontWeight:700,cursor:"pointer",flex:1,fontFamily:"'Cairo',sans-serif"}}>
          {t("salon_card.book_btn")}
        </button>
      </div>
    </div>

    {/* popup العرض */}
    {showPromoPopup&&activePromo&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:2000,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowPromoPopup(false)}>
        <div style={{width:"100%",maxWidth:480,margin:"0 auto",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 20px 36px",border:"1.5px solid rgba(231,76,60,.4)",borderBottom:"none",direction:"rtl"}} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:32,marginBottom:8}}>🔥</div>
            <div style={{fontSize:16,fontWeight:800,color:"#e74c3c",marginBottom:6}}>عرض خاص من {salon.name}</div>
            <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.7,padding:"0 8px"}}>{activePromo.promo_text}</div>
          </div>
          {activePromo.discount_code&&(
            <div style={{background:"rgba(231,76,60,.1)",border:"1.5px dashed rgba(231,76,60,.4)",borderRadius:10,padding:"10px 14px",textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>كود الخصم</div>
              <div style={{fontSize:18,fontWeight:900,color:"#e74c3c",letterSpacing:2}}>{activePromo.discount_code}</div>
            </div>
          )}
          {activePromo.ends_at&&(
            <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center",marginBottom:14}}>
              ⏳ ينتهي العرض: {new Date(activePromo.ends_at).toLocaleDateString("ar-SA")}
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none"}} onClick={()=>{setShowPromoPopup(false);onBook();}}>احجز الآن</button>
            <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setShowPromoPopup(false)}>إغلاق</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ==============================================
//  SALON PAGE
// ==============================================
function SalonPage({salon,favSet,toggleFav,setView,addBooking,updateBookingStatus,ownerSession,customers,reviews,refreshSalonBookings,rescheduleId,customer}){
  const{t}=useTranslation();
  const[tab,setTab]=useState("book");
  const fav=favSet.has(salon.id);
  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const canManage=ownerSession===salon.id;

  const salonReviews=(reviews||[]).filter(r=>Number(r.salon_id)===Number(salon.id));
  const avgRating=salonReviews.length?Math.round(salonReviews.reduce((a,r)=>a+r.rating,0)/salonReviews.length*10)/10:salon.rating||0;

  return(
    <div style={G.page}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setView("home")}>{t("salon_page.back")}</button>
          <h2 style={{...G.ft,flex:1}}>{salon.name}</h2>
          <button style={{...G.favBtn,...(fav?G.favOn:{}),fontSize:20}} onClick={()=>toggleFav(salon.id)}>{fav?"♥":"♡"}</button>
          <ShareBtn salon={salon}/>
        </div>
        <div style={G.salonBadge}>
          <span style={{fontSize:20,color:"var(--p)"}}>✂</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"var(--text-primary)"}}>{salon.name}</div>
            <div style={{fontSize:11,color:"var(--text-muted)"}}>{salon.gov||salon.region}{salon.village?` > ${salon.village}`:""}</div>
            <div style={{fontSize:11,color:"var(--text-muted)"}}>👤 {salon.owner} - 📞 {salon.phone}</div>
            {salonReviews.length>0&&<>
              <div style={{fontSize:12,color:"#e8c04a",marginTop:2}}>⭐ {avgRating} ({salonReviews.length} {t("salon_page.reviews_count")})</div>
              <div style={{fontSize:9,color:"var(--text-muted)",marginTop:2}}>{t("salon_page.reviews_note")}</div>
            </>}
          </div>
          <button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title="الموقع">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
          </button>
        </div>
        <div style={G.tabRow}>
          <button style={{...G.tabBtn,...(tab==="book"?G.tabOn:{})}} onClick={()=>setTab("book")}>{t("salon_page.book_tab")}</button>
          {canManage&&<button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>{setTab("notif");refreshSalonBookings(salon.id);}}>🔔{pending>0&&<span style={G.notifDot}>{pending}</span>}</button>}
          {canManage&&<button style={{...G.tabBtn,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")}>📊</button>}
        </div>
        {tab==="book"&&<BookView salon={salon} addBooking={addBooking} onBack={null} inline setView={setView} rescheduleId={rescheduleId} customer={customer}/>}
        {tab==="notif"&&canManage&&<NotifPanel salon={salon} onUpdate={updateBookingStatus} customers={customers} refreshSalonBookings={refreshSalonBookings}/>}
        {tab==="stats"&&canManage&&<StatsPanel salon={salon}/>}
      </div>
    </div>
  );
}

// ==============================================
//  BOOK VIEW
// ==============================================
function BookView({salon,addBooking,onBack,inline,setView,customer,rescheduleId}){
  const{t}=useTranslation();
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({
    name: customer?.name||"",
    phone: customer?.phone||"",
    email: customer?.email||"",
    services:[], barberId:"", date:todayStr(), time:"", waitSlot:""
  });
  const[errors,setErrors]=useState({});
  const allSlots=getSlotsForSalon(salon);
  const bc=salon.barbers?.length||1;
  // Hide past slots for today
  const slots=form.date===todayStr()
    ? allSlots.filter(sl=>{
        const[h,m]=sl.split(":").map(Number);
        const now=new Date();
        return h*60+m > now.getHours()*60+now.getMinutes();
      })
    : allSlots;
  const slotUsed=sl=>salon.bookings.filter(b=>b.date===form.date&&b.time===sl&&b.status!=="rejected"&&(!form.barberId||b.barberId===form.barberId)).length;
  const slotFull=sl=>slotUsed(sl)>=(form.barberId?1:bc);
  const total=calcTotal(form.services,salon.prices);
  const barber=salon.barbers?.find(b=>b.id===form.barberId);
  const toggle=s=>setForm(p=>({...p,services:p.services.includes(s)?p.services.filter(x=>x!==s):[...p.services,s]}));
  const v1=()=>{const e={};if(!form.name.trim())e.name=t("book.err_required");if(!form.phone.trim())e.phone=t("book.err_required");if(!form.services.length)e.services=t("book.err_service");if(salon.barbers?.length&&!form.barberId)e.barberId=t("book.err_barber");setErrors(e);return!Object.keys(e).length;};
  const v2=()=>{const e={};if(!form.date)e.date=t("book.err_required");if(!form.time&&!form.waitSlot)e.time=t("book.err_time");setErrors(e);return!Object.keys(e).length;};
  const inner=(
    <>
      {!inline&&<div style={G.salonBadge}><span style={{fontSize:20,color:"var(--p)"}}>✂</span><div style={{flex:1}}><div style={{fontWeight:700,color:"var(--text-primary)"}}>{salon.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{salon.gov||salon.region}</div></div><button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg></button></div>}
      <div style={G.steps}>{[t("book.step1"),t("book.step2"),t("book.step3")].map((l,i)=><div key={i} style={{...G.si,...(step>=i+1?{opacity:1}:{})}}><div style={G.sd}>{i+1}</div><span style={{fontSize:10,color:"var(--p)"}}>{l}</span></div>)}</div>
      {step===1&&<div style={G.fc}>
        <F label={t("book.name_label")} error={errors.name}><input style={fi(errors.name)} placeholder={t("book.name_ph")} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label={t("book.phone_label")} error={errors.phone}><input style={fi(errors.phone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
        <F label={t("book.services_label")} error={errors.services}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{salon.services.map(s=><div key={s} style={{...G.chip,...(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggle(s)}>{s}{salon.prices?.[s]?` (${salon.prices[s]} ${t("book.sar")})`:""}</div>)}</div></F>
        {form.services.length>0&&<div style={G.totalBox}>{t("book.total")} <strong style={{color:"var(--p)"}}>{total} {t("book.sar")}</strong></div>}
        {salon.barbers?.length>0&&<F label={t("book.barber_label")} error={errors.barberId}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {salon.barbers.map(b=>{
              const active=form.barberId===b.id;
              // تحقق من وقت الدوام
              const now=new Date();
              const currentMins=now.getHours()*60+now.getMinutes();
              const [sh,sm]=(b.shiftStart||"00:00").split(":").map(Number);
              const [eh,em]=(b.shiftEnd||"23:59").split(":").map(Number);
              const inShift=currentMins>=sh*60+sm&&currentMins<=eh*60+em;
              return(
                <div key={b.id}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 10px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":inShift?"var(--surface-2)":"var(--shell-bg)",cursor:inShift?"pointer":"not-allowed",opacity:inShift?1:.5,minWidth:60}}
                  onClick={()=>inShift&&setForm(p=>({...p,barberId:b.id,time:""}))}>
                  {b.photo
                    ?<img src={optimizeImageUrl(b.photo,36,36)} alt={b.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`}}/>
                    :<div style={{width:36,height:36,borderRadius:"50%",background:"var(--surface-2)",border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💈</div>
                  }
                  <span style={{fontSize:11,color:active?"var(--p)":"var(--text-muted)",fontWeight:active?700:400,textAlign:"center"}}>{b.name}</span>
                  <span style={{fontSize:9,color:inShift?"#27ae60":"#e74c3c"}}>{inShift?t("book.barber_available"):t("book.barber_unavailable")}</span>
                </div>
              );
            })}
          </div>
        </F>}
        <button style={G.sub} onClick={()=>{if(v1())setStep(2);}}>{t("book.next")}</button>
      </div>}
      {step===2&&<div style={G.fc}>
        <F label={t("book.date_label")} error={errors.date}>
          <input type="date" style={fi(errors.date)} value={form.date} min={todayStr()}
            onChange={e=>{
              const d=new Date(e.target.value);
              const dayOfWeek=d.getDay();
              if(salon.closedDays?.includes(dayOfWeek)){
                const DAYS=t("book.days",{returnObjects:true});
                alert(`${t("book.closed_day")} ${DAYS[dayOfWeek]}`);
                return;
              }
              setForm(p=>({...p,date:e.target.value,time:""}));
            }}/>
          {salon.closedDays?.length>0&&(
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>
              {t("book.closed_days_prefix")} {t("book.days",{returnObjects:true}).filter((_,i)=>salon.closedDays.includes(i)).join(" - ")}
            </div>
          )}
        </F>
        {salon.shiftEnabled&&<div style={{fontSize:11,color:"var(--p)",background:"var(--pa07)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>⏰ {salon.shift1Start}-{salon.shift1End} | {salon.shift2Start}-{salon.shift2End}</div>}
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:7}}>{t("book.time_hint")}{form.barberId?` - ${barber?.name||""}`:""}</div>
        {errors.time&&<div style={G.err}>{errors.time}</div>}
        <div style={G.timeGrid}>{slots.map(sl=>{const used=slotUsed(sl);const full=slotFull(sl);const sel=form.time===sl;const waiting=form.waitSlot===sl;return(<div key={sl} style={{display:"flex",flexDirection:"column",gap:2}}><button disabled={full&&!waiting} onClick={()=>!full&&setForm(p=>({...p,time:sl,waitSlot:""}))} style={{...G.ts,...(full?G.tsF:{}),...(sel?G.tsS:{})}}><div>{sl}</div><div style={{fontSize:9,marginTop:1,color:full?"var(--text-muted)":sel?"var(--p)":"var(--text-muted)"}}>{full?t("book.booked"):`${bc-used} ${t("book.available")}`}</div></button>{full&&<button onClick={()=>setForm(p=>({...p,waitSlot:p.waitSlot===sl?"":sl,time:""}))} style={{fontSize:9,padding:"3px 4px",borderRadius:6,border:`1.5px solid ${waiting?"var(--p)":"#f39c1266"}`,background:waiting?"var(--pa12)":"rgba(243,156,18,.06)",color:waiting?"var(--p)":"#f39c12",cursor:"pointer",fontFamily:"inherit",fontWeight:waiting?700:400}}>⏳{waiting?" ✓":""}</button>}</div>);})}</div>
        {form.waitSlot&&<div style={{background:"rgba(243,156,18,.08)",border:"1px solid #f39c1244",borderRadius:8,padding:"8px 12px",marginBottom:4,fontSize:11,color:"#f39c12",textAlign:"center"}}>{t("book.wait_msg")} <strong>{form.waitSlot}</strong> {t("book.wait_notify")}</div>}
        <button style={G.sub} onClick={()=>{if(v2())setStep(3);}}>{form.waitSlot?t("book.next_wait"):t("book.next")}</button>
      </div>}
      {step===3&&<div style={G.fc}>
        <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:36}}>{form.waitSlot?"⏳":"✅"}</div><h3 style={{color:"var(--text-primary)",marginTop:4,fontSize:16}}>{form.waitSlot?t("book.confirm_wait_title"):t("book.confirm_title")}</h3></div>
        {[[t("book.field_name"),form.name],[t("book.field_phone"),form.phone],[t("book.field_email"),form.email||"-"],[t("book.field_services"),form.services.join(" + ")],[t("book.field_barber"),barber?.name||t("book.any_barber")],[t("book.field_date"),form.date],[t("book.field_time"),form.waitSlot?`⏳ ${form.waitSlot}`:form.time],[t("book.field_total"),`${total} ${t("book.sar")}`]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border-ui)"}}><span style={{color:"var(--text-muted)",fontSize:12}}>{l}</span><span style={{color:"var(--text-primary)",fontWeight:600,fontSize:12}}>{v}</span></div>)}
        <button style={{...G.mapsBtn,width:"100%",marginTop:10,justifyContent:"center",display:"flex",padding:10}} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>{t("book.open_map")}</button>
        {form.waitSlot&&<div style={{background:"rgba(243,156,18,.1)",border:"1px solid #f39c1255",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#f39c12"}}>{t("book.wait_msg")} {form.waitSlot} {t("book.wait_notify")}</div>}
        <button style={{...G.sub,marginTop:8,background:form.waitSlot?"linear-gradient(135deg,#f39c12,#e67e22)":rescheduleId?"linear-gradient(135deg,#8e44ad,#9b59b6)":"linear-gradient(135deg,#27ae60,#2ecc71)",color:"#fff"}} onClick={async()=>{
          if(form.waitSlot){
            if(!form.name||!form.phone){alert(t("book.err_name_phone"));return;}
            try{
              await sb("waiting_list","POST",{salon_id:salon.id,name:form.name,phone:form.phone,slot_date:form.date,slot_time:form.waitSlot,customer_id:null,status:"waiting"});
              alert(t("book.success_wait"));
              if(setView)setView("home");
            }catch(e){alert("❌ حدث خطأ، حاول مرة أخرى");}
          }else{
            addBooking(salon.id,{...form,barberId:form.barberId||"any",barberName:barber?.name||"",total},rescheduleId||null);
          }
        }}>{form.waitSlot?t("book.confirm_wait_btn"):rescheduleId?t("book.reschedule_btn"):t("book.confirm_btn")}</button>
      </div>}
    </>
  );
  if(inline)return <div>{inner}</div>;
  return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>onBack?onBack():setView("home")}>{t("salon_page.back")}</button><h2 style={G.ft}>{t("salon_page.book_tab")}</h2></div>{inner}</div></div>;
}

// ==============================================
//  STATS + NOTIF
// ==============================================
// ==============================================
//  TERMS VIEW
// ==============================================
function StatsPanel({salon,onUpdate,customers=[],refreshSalonBookings,totalEarned=0,totalPaid=0}){
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
  const balance=totalEarned-totalPaid;

  const todayBks=salon.bookings.filter(b=>b.date===selectedDate);
  const todayApproved=todayBks.filter(b=>b.status==="approved");
  const todayPending=todayBks.filter(b=>b.status==="pending");
  const todayRejected=todayBks.filter(b=>b.status==="rejected");

  const loadBarberStats=useCallback(async()=>{
    if(!salon.barbers?.length)return;
    setLoadingStats(true);
    try{
      const mm=String(m+1).padStart(2,"0");
      const dim=new Date(y,m+1,0).getDate();
      const startM=`${y}-${mm}-01`;
      const endM=`${y}-${mm}-${String(dim).padStart(2,"0")}`;
      const[dayR,monthR,yearR]=await Promise.all([
        sb("bookings","GET",null,`?select=barber_id,total&salon_id=eq.${salon.id}&status=eq.approved&date=eq.${selectedDate}&limit=100`),
        sb("bookings","GET",null,`?select=barber_id,total&salon_id=eq.${salon.id}&status=eq.approved&date=gte.${startM}&date=lte.${endM}&limit=100`),
        sb("bookings","GET",null,`?select=barber_id,total&salon_id=eq.${salon.id}&status=eq.approved&date=gte.${y}-01-01&date=lte.${y}-12-31&limit=100`)
      ]);
      const grp=(rows)=>{const s={};if(Array.isArray(rows))for(const r of rows){const bid=r.barber_id||"any";if(!s[bid])s[bid]={count:0,revenue:0};s[bid].count++;s[bid].revenue+=(r.total||0);}return s;};
      setDayStats(grp(dayR));
      setMonthStats(grp(monthR));
      setYearStats(grp(yearR));
    }catch(e){console.warn("barber stats error:",e);}
    setLoadingStats(false);
  },[salon.id,salon.barbers?.length,selectedDate,m,y]);

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

  return(
    <div style={{paddingTop:4}}>
      {/* منتقيات اليوم/الشهر/السنة */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {/* Day Picker */}
        <div style={{flex:1,position:"relative"}}>
          <button onClick={()=>setShowDayPicker(!showDayPicker)} style={{width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${showDayPicker?"var(--gold)":"var(--border-ui)"}`,background:showDayPicker?"rgba(var(--gold-rgb),.13)":"var(--bg-input)",color:"var(--gold)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            {String(parseInt(selectedDate.split("-")[2])).padStart(2,"0")} 📅
          </button>
          {showDayPicker&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface-2)",border:"1px solid var(--gold)",borderRadius:10,padding:8,maxHeight:200,overflowY:"auto",zIndex:10,marginTop:4}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Array.from({length:31},(_, i)=>{
                  const day=i+1;
                  const dateStr=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const isSel=selectedDate===dateStr;
                  return(
                    <button key={day} onClick={()=>{setSelectedDate(dateStr);setShowDayPicker(false);}} style={{padding:"6px 0",borderRadius:8,background:isSel?"var(--gold)":"transparent",color:isSel?"#000":"var(--gold)",border:`1px solid ${isSel?"var(--gold)":"var(--border-ui)"}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Month Picker */}
        <div style={{flex:1,position:"relative"}}>
          <button onClick={()=>setShowMonthPicker(!showMonthPicker)} style={{width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${showMonthPicker?"var(--gold)":"var(--border-ui)"}`,background:showMonthPicker?"rgba(var(--gold-rgb),.13)":"var(--bg-input)",color:"var(--gold)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            {_months[m]} 📅
          </button>
          {showMonthPicker&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface-2)",border:"1px solid var(--gold)",borderRadius:10,padding:8,maxHeight:200,overflowY:"auto",zIndex:10,marginTop:4}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {_months.map((month,idx)=>{
                  const isSel=m===idx;
                  return(
                    <button key={idx} onClick={()=>{setM(idx);const newDate=`${y}-${String(idx+1).padStart(2,"0")}-01`;setSelectedDate(newDate);setShowMonthPicker(false);}} style={{padding:"6px 0",borderRadius:8,background:isSel?"var(--gold)":"transparent",color:isSel?"#000":"var(--gold)",border:`1px solid ${isSel?"var(--gold)":"var(--border-ui)"}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Year Picker */}
        <div style={{flex:1,position:"relative"}}>
          <button onClick={()=>setShowYearPicker(!showYearPicker)} style={{width:"100%",padding:"8px",borderRadius:10,border:`1.5px solid ${showYearPicker?"var(--gold)":"var(--border-ui)"}`,background:showYearPicker?"rgba(var(--gold-rgb),.13)":"var(--bg-input)",color:"var(--gold)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            {y} 📅
          </button>
          {showYearPicker&&(
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface-2)",border:"1px solid var(--gold)",borderRadius:10,padding:8,maxHeight:200,overflowY:"auto",zIndex:10,marginTop:4}}>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Array.from({length:10},(_, i)=>y-5+i).map(yr=>{
                  const isSel=y===yr;
                  return(
                    <button key={yr} onClick={()=>{setY(yr);const newDate=`${yr}-${String(m+1).padStart(2,"0")}-01`;setSelectedDate(newDate);setShowYearPicker(false);}} style={{padding:"6px 0",borderRadius:8,background:isSel?"var(--gold)":"transparent",color:isSel?"#000":"var(--gold)",border:`1px solid ${isSel?"var(--gold)":"var(--border-ui)"}`,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* إحصائيات اليوم المختار */}
      {selectedDate&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--gold)",marginBottom:8}}>📊 {selectedDate}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
            <div style={{background:"#27ae6022",borderRadius:10,padding:"8px",textAlign:"center",border:"1px solid #27ae6044"}}>
              <div style={{fontSize:18,fontWeight:900,color:"#27ae60"}}>{todayApproved.length}</div>
              <div style={{fontSize:9,color:"var(--text-muted)"}}>{t("owner_dash.filter_approved")}</div>
            </div>
            <div style={{background:"#f39c1222",borderRadius:10,padding:"8px",textAlign:"center",border:"1px solid #f39c1244"}}>
              <div style={{fontSize:18,fontWeight:900,color:"#f39c12"}}>{todayPending.length}</div>
              <div style={{fontSize:9,color:"var(--text-muted)"}}>{t("owner_dash.filter_pending")}</div>
            </div>
            <div style={{background:"#e74c3c22",borderRadius:10,padding:"8px",textAlign:"center",border:"1px solid #e74c3c44"}}>
              <div style={{fontSize:18,fontWeight:900,color:"#e74c3c"}}>{todayRejected.length}</div>
              <div style={{fontSize:9,color:"var(--text-muted)"}}>{t("owner_dash.filter_rejected")}</div>
            </div>
            <div style={{background:"rgba(var(--gold-rgb),.13)",borderRadius:10,padding:"8px",textAlign:"center",border:"1px solid rgba(var(--gold-rgb),.27)"}}>
              <div style={{fontSize:18,fontWeight:900,color:"var(--gold)"}}>{todayBks.length}</div>
              <div style={{fontSize:9,color:"var(--text-muted)"}}>{t("owner_dash.filter_all")}</div>
            </div>
          </div>
        </div>
      )}


      {/* قسم أداء الحلاقين */}
      {salon.barbers&&salon.barbers.length>0&&(
        <div style={{background:"var(--surface-1)",borderRadius:14,padding:"12px",border:"1px solid var(--border-ui)",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--gold)",marginBottom:10}}>{t("owner_dash.stats_barbers_title")}</div>

          {loadingStats&&<div style={{textAlign:"center",padding:"8px",color:"var(--text-muted)",fontSize:11}}>{t("owner_dash.stats_loading")}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {salon.barbers.map(barber=>{
              const stats=getBarberStats(barber.id);
              return(
                <div key={barber.id} style={{background:"var(--bg-input)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)",transition:"all .2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                      <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,var(--gold),var(--pl))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>✂</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{barber.name||barber.barber_name||t("owner_dash.no_name")}</div>
                        <div style={{fontSize:10,color:"var(--text-muted)"}}>{stats.dayCount} {t("owner_dash.booking_unit")}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:900,color:"var(--gold)"}}>{stats.dayRevenue}</div>
                      <div style={{fontSize:9,color:"var(--text-muted)"}}>{t("owner_dash.balance_unit")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* الأرباح */}
      <div className="balance-tab" style={{background:"linear-gradient(135deg,rgba(var(--gold-rgb),.12),rgba(var(--gold-rgb),.06))",borderRadius:14,padding:16,border:"1.5px solid rgba(var(--gold-rgb),.3)",marginTop:8}}>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{t("owner_dash.balance_title")}</div>
        <div style={{fontSize:32,fontWeight:900,color:"var(--gold)",marginBottom:10}}>{balance} <span style={{fontSize:14}}>{t("owner_dash.balance_unit")}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"rgba(39,174,96,.1)",borderRadius:10,padding:"10px",border:"1px solid #27ae6055"}}>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>{t("owner_dash.balance_owed")}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#27ae60"}}>{totalEarned} ر</div>
          </div>
          <div style={{background:"rgba(var(--gold-rgb),.1)",borderRadius:10,padding:"10px",border:"1px solid rgba(var(--gold-rgb),.3)"}}>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>{t("owner_dash.balance_paid")}</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--gold)"}}>{totalPaid} ر</div>
          </div>
        </div>
        {balance>0&&<div style={{background:"rgba(231,76,60,.1)",border:"1px solid #e74c3c55",borderRadius:8,padding:"10px",fontSize:11,color:"#e74c3c",marginTop:10,textAlign:"center"}}>{t("owner_dash.balance_warning")}</div>}
      </div>
    </div>
  );
}
function NotifPanel({salon,onUpdate,customers=[],refreshSalonBookings,defaultFilter="approved",dateFilter}){
  const{t}=useTranslation();
  const[showWaiting,setShowWaiting]=useState(false);
  const[showAddForm,setShowAddForm]=useState(false);
  const[filter,setFilter]=useState(defaultFilter);
  const[localAtt,setLocalAtt]=useState({});
  const[mForm,setMForm]=useState({name:"",phone:"",date:getTodayDateInRiyadh(),slot:""});
  const KEY=`dork_waiting_${salon.id}`;
  const[waitingList,setWaitingList]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});

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
        const converted=active.map(w=>{const ts=w.created_at||"";const d=new Date(ts.includes("+")||ts.endsWith("Z")?ts:ts+"Z");return{id:w.id,name:w.name,phone:w.phone||"",addedAt:d.toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),slotDate:w.slot_date||"",slotTime:w.slot_time||"",status:w.status||"waiting"};});
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
      await sb("waiting_list","POST",{salon_id:salon.id,name,phone,slot_date:slotDate||null,slot_time:slotTime||null});
      await loadWaiting();
    }catch{
      const item={id:Date.now(),name,phone,addedAt:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),slotDate:slotDate||"",slotTime:slotTime||""};
      const newList=[...waitingList,item];
      setWaitingList(newList);
      try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
    }
  };

  const acceptFromWaiting=async(w)=>{
    if(!w.slotDate||!w.slotTime){alert("لا يوجد وقت محدد لهذا العميل");return;}
    try{
      // إنشاء حجز مقبول مباشرة
      await sb("bookings","POST",{salon_id:String(salon.id),customer_name:w.name,customer_phone:w.phone,date:w.slotDate,time:w.slotTime,status:"approved",service:"[]",barber_id:"any",barber_name:"",total:0});
      // تغيير الحالة لـ accepted
      await sb("waiting_list","PATCH",{status:"accepted"},"?id=eq."+w.id);
      // إشعار للمقبول
      sb("notifications","POST",{target_type:"all",title:"✅ تم قبولك في الموعد",body:`تم حجزك في ${w.slotDate} - ${w.slotTime} في ${salon.name}. تواصل مع الصالون لتأكيد الخدمة.`,icon:"✅"}).catch(()=>{});
      // رفض المنتظرين للنفس الوقت
      const others=waitingList.filter(x=>x.id!==w.id&&x.slotDate===w.slotDate&&x.slotTime===w.slotTime);
      for(const o of others){
        await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+o.id).catch(()=>{});
        sb("notifications","POST",{target_type:"all",title:"❌ عذراً، الوقت امتلأ",body:`الوقت ${w.slotDate} - ${w.slotTime} في ${salon.name} تم أخذه من شخص آخر.`,icon:"❌"}).catch(()=>{});
      }
      await loadWaiting();
      if(refreshSalonBookings)refreshSalonBookings(salon.id);
    }catch(e){alert("❌ خطأ: "+e.message);}
  };

  const rejectFromWaiting=async(w)=>{
    try{
      await sb("waiting_list","PATCH",{status:"rejected"},"?id=eq."+w.id);
      sb("notifications","POST",{target_type:"all",title:"❌ عذراً، تعذّر الحجز",body:`نأسف، لم نتمكن من تأكيد حجزك في ${salon.name}${w.slotDate?` (${w.slotDate} - ${w.slotTime})`:""}. يمكنك المحاولة مرة أخرى.`,icon:"❌"}).catch(()=>{});
      await loadWaiting();
    }catch(e){alert("❌ خطأ: "+e.message);}
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

  const allBks=[...salon.bookings].sort((a,b)=>{
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
                {allSlots.map(sl=>{const sel=mForm.slot===sl;return(
                  <button key={sl} onClick={()=>setMForm(p=>({...p,slot:p.slot===sl?"":sl}))}
                    style={{padding:"5px 10px",borderRadius:8,border:`1.5px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa25)":"var(--surface-1)",color:sel?"var(--p)":"var(--text-muted)",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:sel?700:400}}>
                    {sl}
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
                        {cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}>{cl.label}</span>}
                      </div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>📞 {w.phone}</div>
                      {w.slotTime&&<div style={{fontSize:11,color:"var(--p)",fontWeight:700}}>⏰ {w.slotDate} - {w.slotTime}</div>}
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>{t("notif.added_at")} {w.addedAt}</div>
                    </div>
                    <button style={G.xBtn} onClick={()=>removeFromWaiting(w.id)}>✕</button>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    {w.slotTime&&<button style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit",fontWeight:700}} onClick={()=>acceptFromWaiting(w)}>{t("notif.accept_btn")}</button>}
                    <button style={{fontSize:11,padding:"4px 12px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit",fontWeight:700}} onClick={()=>rejectFromWaiting(w)}>{t("notif.reject_btn")}</button>
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
            {(()=>{const cust=customers.find(c=>c.phone&&b.phone&&c.phone.replace(/\D/g,"").slice(-9)===b.phone.replace(/\D/g,"").slice(-9));const cl=cust?getCustomerClassification(cust):null;return(<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>👤 {b.name}{cl&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:10,background:`${cl.color}22`,color:cl.color,border:`1px solid ${cl.color}44`}}>{cl.label}</span>}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>📞 {b.phone}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>✂ {Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div><div style={{fontSize:11,color:"var(--p)"}}>📅 {b.date} {b.time} - {b.total||0} ر</div></div>);})()}
            <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?t("notif.status_approved"):b.status==="rejected"?t("notif.status_rejected"):t("notif.status_pending")}</span>
          </div>
          {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
          {b.status==="approved"&&(()=>{const att=localAtt[b.id]||b.attendance;return(<div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}><span style={{fontSize:10,color:"#666"}}>{t("notif.attendance")}</span>{att?(<span style={{fontSize:11,fontWeight:700,color:att==="attended"?"#27ae60":"#e74c3c"}}>{att==="attended"?t("notif.attended"):t("notif.no_show")}</span>):(<><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"attended"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"attended"}));}catch{}}}>{t("notif.attended")}</button><button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"no_show"},"?id=eq."+b.id);setLocalAtt(p=>({...p,[b.id]:"no_show"}));}catch{}}}>{t("notif.no_show")}</button></>)}</div>);})()}
        </div>
      ))}</div>}
    </div>
  );
}

// ==============================================
//  REGISTER  (salon + custom services)
// ==============================================
function RegisterView({allLoc,addSalon,setView,addExtraLoc}){
  const{t}=useTranslation();
  const[form,setForm]=useState({name:"",owner:"",ownerPhone:"",region:"",gov:"",center:"",village:"",phone:"",address:"",locationUrl:"",services:[],prices:{},shiftEnabled:false,shift1Start:"08:00",shift1End:"13:00",shift2Start:"16:00",shift2End:"23:00",workStart:"09:00",workEnd:"22:00",barbers:[{id:"b"+Date.now(),name:""}],tone:"bell"});
  const[errors,setErrors]=useState({});
  const[locMethod,setLocMethod]=useState("link");
  const[detecting,setDetecting]=useState(false);
  const[newSvc,setNewSvc]=useState("");
  // extra-loc add state
  const[newR,setNewR]=useState(""); const[newG,setNewG]=useState(""); const[newC,setNewC]=useState(""); const[newV,setNewV]=useState("");
  const[showAddLoc,setShowAddLoc]=useState(false);

  const govList=form.region?(allLoc.find(r=>r.region===form.region)?.govs||[]):[];
  const centerList=form.gov?(govList.find?.(g=>(g.name||g)===form.gov)?.centers||[]):[];

  const applyNewLoc=()=>{
    const r=newR.trim()||form.region; const g=newG.trim()||form.gov; const v=newV.trim();
    if(!r||!g){alert("أدخل المنطقة والمحافظة على الأقل");return;}
    addExtraLoc(r,g,"",v);
    setForm(p=>({...p,region:r,gov:g,village:v||p.village}));
    setNewR("");setNewG("");setNewC("");setNewV("");setShowAddLoc(false);
  };

  const detect=async()=>{
    if(!navigator.geolocation){
      alert("⚠ المتصفح لا يدعم تحديد الموقع\nاستخدم \"رابط الخريطة\" بدلاً من ذلك");
      return;
    }
    setDetecting(true);
    // Check permission state first
    try {
      if(navigator.permissions){
        const perm=await navigator.permissions.query({name:"geolocation"});
        if(perm.state==="denied"){
          alert("🚫 إذن الموقع مرفوض\n\nلتفعيله:\n- اضغط على رمز القفل/الموقع بجوار الرابط\n- اختر \"السماح\" للموقع\n- أعد المحاولة\n\nأو استخدم \"رابط الخريطة\" يدوياً");
          setDetecting(false);
          return;
        }
      }
    } catch(e){}

    navigator.geolocation.getCurrentPosition(
      p=>{
        const lat=p.coords.latitude.toFixed(6), lng=p.coords.longitude.toFixed(6);
        setForm(f=>({...f,locationUrl:`https://maps.google.com/?q=${lat},${lng}`}));
        setDetecting(false);
      },
      err=>{
        setDetecting(false);
        let msg="";
        if(err.code===1){msg="🚫 رفضت إذن الموقع\n\nمن إعدادات المتصفح:\n- اسمح للموقع\n- أعد تحميل الصفحة\n- حاول مرة أخرى";}
        else if(err.code===2){msg="📡 خدمة الموقع غير متوفرة\nتحقق من تشغيل GPS / WiFi وحاول مجدداً";}
        else if(err.code===3){msg="⏱ انتهت مهلة التحديد\nحاول مرة أخرى أو استخدم رابط الخريطة";}
        else msg="⚠ تعذّر التحديد ("+err.message+")";
        const useManual=confirm(msg+"\n\nهل تريد إدخال الإحداثيات يدوياً؟");
        if(useManual){
          const c=prompt("أدخل الإحداثيات بصيغة:\nالعرض,الطول\nمثال: 21.5433,39.1728");
          if(c&&c.includes(",")){
            const[la,lo]=c.split(",").map(s=>s.trim());
            setForm(f=>({...f,locationUrl:`https://maps.google.com/?q=${la},${lo}`}));
          }
        }
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  };

  const toggleSvc=s=>setForm(p=>{
    const has=p.services.includes(s);
    const services=has?p.services.filter(x=>x!==s):[...p.services,s];
    const prices={...p.prices};
    if(!has)prices[s]=prices[s]||50; else delete prices[s];
    return{...p,services,prices};
  });

  const addCustomSvc=()=>{
    if(!newSvc.trim())return;
    setForm(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:50}}));
    setNewSvc("");
  };

  const adjustPrice=(s,delta)=>setForm(p=>({...p,prices:{...p.prices,[s]:Math.max(0,(p.prices[s]||0)+delta)}}));
  const setPrice=(s,v)=>setForm(p=>({...p,prices:{...p.prices,[s]:Math.max(0,+v||0)}}));

  const addBarber=()=>setForm(p=>({...p,barbers:[...p.barbers,{id:"b"+Date.now(),name:"",photo:""}]}));
  const rmBarber=id=>setForm(p=>({...p,barbers:p.barbers.filter(b=>b.id!==id)}));
  const upBarber=(id,name)=>setForm(p=>({...p,barbers:p.barbers.map(b=>b.id===id?{...b,name}:b)}));
  const upBarberPhoto=(id,photo)=>setForm(p=>({...p,barbers:p.barbers.map(b=>b.id===id?{...b,photo}:b)}));
  const pickPhoto=(id)=>{
    const inp=document.createElement("input");
    inp.type="file"; inp.accept="image/*";
    inp.onchange=e=>{
      const file=e.target.files[0]; if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>upBarberPhoto(id,ev.target.result);
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const validate=()=>{
    const e={};
    if(!form.name.trim())e.name=t("register.err_required"); if(!form.owner.trim())e.owner=t("register.err_required");
    if(!form.ownerPhone.trim())e.ownerPhone=t("register.err_required");
    if(!form.region)e.region=t("register.err_required"); if(!form.gov)e.gov=t("register.err_required");
    if(!form.phone.trim())e.phone=t("register.err_required"); if(!form.address.trim())e.address=t("register.err_required");
    if(!form.locationUrl.trim())e.locationUrl=t("register.err_location");
    if(!form.services.length)e.services=t("register.err_service");
    if(form.barbers.some(b=>!b.name.trim()))e.barbers=t("register.err_barbers");
    setErrors(e); return!Object.keys(e).length;
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{t("register.back")}</button><h2 style={G.ft}>{t("register.title")}</h2></div>

      {/* pending notice */}
      <div style={{background:"var(--pa08)",border:"1px solid var(--pa3)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
        {t("register.pending_notice")}
      </div>

      <div style={G.fc}>
        <SL>{t("register.salon_info")}</SL>
        <F label={t("register.salon_name")} error={errors.name}><input style={fi(errors.name)} placeholder="صالون النخبة" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label={t("register.owner_name")} error={errors.owner}><input style={fi(errors.owner)} placeholder="الاسم الكامل" value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))}/></F>
        <F label={t("register.owner_phone")} error={errors.ownerPhone}><input style={fi(errors.ownerPhone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.ownerPhone} onChange={e=>setForm(p=>({...p,ownerPhone:e.target.value}))}/></F>
        <F label={t("register.salon_phone")} error={errors.phone}><input style={fi(errors.phone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
        <F label={t("register.address")} error={errors.address}><input style={fi(errors.address)} placeholder="الشارع والحي" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/></F>
      </div>

      <div style={G.fc}>
        <SL>{t("register.admin_section")}</SL>
        <F label={t("register.region_ph")} error={errors.region}>
          <select style={fi(errors.region)} value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value,gov:"",center:"",village:""}))}>
            <option value="">{t("register.region_ph")}</option>{allLoc.map(r=><option key={r.region} value={r.region}>{r.region}</option>)}
          </select>
        </F>
        {form.region&&<F label={t("register.gov_ph")} error={errors.gov}>
          <select style={fi(errors.gov)} value={form.gov} onChange={e=>setForm(p=>({...p,gov:e.target.value,center:"",village:""}))}>
            <option value="">{t("register.gov_ph")}</option>{govList.map(g=><option key={g.name||g} value={g.name||g}>{g.name||g}</option>)}
          </select>
        </F>}
        {form.gov&&<F label={t("register.center_ph")}>
          <select style={fi()} value={form.center} onChange={e=>setForm(p=>({...p,center:e.target.value,village:""}))}>
            <option value="">{t("register.center_ph")}</option>
            {centerList.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </F>}
        {form.center&&<F label={t("register.village_label")}>
          <input style={fi()} placeholder={t("register.village_ph")} value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
        </F>}
        {form.center&&<button style={G.otherBtn} onClick={()=>setShowAddLoc(s=>!s)}>
          {showAddLoc?"✕ إغلاق":t("register.add_location_btn")}
        </button>}
        {showAddLoc&&form.center&&<div style={{background:"rgba(42,109,217,.06)",border:"1px solid #2a6dd9",borderRadius:10,padding:12,marginTop:4}}>
          <div style={{fontSize:12,color:"#6aadff",marginBottom:8,fontWeight:700}}>{t("register.add_location_title")}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>
            {t("register.add_location_hint")} <b style={{color:"var(--p)"}}>{form.center}</b>
          </div>
          <div style={{display:"flex",gap:7}}>
            <input style={{...fi(),flex:1}} placeholder={t("register.add_location_ph")} value={newC} onChange={e=>setNewC(e.target.value)}/>
            <button style={{background:"var(--grad)",color:"#000",border:"none",borderRadius:9,padding:"0 14px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",flexShrink:0}} onClick={async()=>{
              const val=newC.trim();
              if(!val){alert("أدخل اسم الحي أو القرية");return;}
              // منع إضافة اسم منطقة أو محافظة أو مركز موجود
              const allRegions=allLoc.map(r=>r.region);
              const allGovs=allLoc.flatMap(r=>r.govs.map(g=>g.name||g));
              const allCenters=allLoc.flatMap(r=>r.govs.flatMap(g=>g.centers||[]));
              if(allRegions.includes(val)||allGovs.includes(val)||allCenters.includes(val)){
                alert("⚠ هذا الاسم موجود بالفعل كمنطقة أو محافظة أو مركز!\nأدخل اسم الحي أو القرية فقط.");
                return;
              }
              try{
                await sb("centers","POST",{name:val,governorate_id:null},"");
              }catch(e){}
              addExtraLoc(form.region,form.gov,form.center,val);
              setForm(p=>({...p,village:val}));
              setNewC("");setShowAddLoc(false);
              alert("✅ تم إضافة الحي/القرية بنجاح!");
            }}>{t("register.add_confirm")}</button>
          </div>
        </div>}
        {!form.center&&form.gov&&<F label={t("register.village_detail_label")}>
          <input style={fi()} placeholder={t("register.village_ph")} value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
        </F>}
      </div>

      <div style={G.fc}>
        <SL>{t("register.location_section")} <span style={{color:"#e74c3c"}}>*</span></SL>
        <div style={{display:"flex",gap:7,marginBottom:9}}>
          <button style={{...G.locTab,...(locMethod==="link"?G.locTabOn:{})}} onClick={()=>setLocMethod("link")}>{t("register.map_link_tab")}</button>
          <button style={{...G.locTab,...(locMethod==="detect"?G.locTabOn:{})}} onClick={()=>setLocMethod("detect")}>{t("register.detect_tab")}</button>
        </div>
        {locMethod==="link"
          ?<F error={errors.locationUrl}><input style={fi(errors.locationUrl)} placeholder={t("register.map_ph")} value={form.locationUrl} onChange={e=>setForm(p=>({...p,locationUrl:e.target.value}))}/><div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>{t("register.map_hint")}</div></F>
          :<div style={{marginBottom:11}}><button style={{...G.detectBtn,opacity:detecting?0.6:1}} disabled={detecting} onClick={detect}>{detecting?t("register.detecting"):t("register.detect_btn")}</button>{form.locationUrl&&locMethod==="detect"&&<div style={{color:"#4caf50",fontSize:11,marginTop:4,textAlign:"center"}}>{t("register.detected")}</div>}{errors.locationUrl&&<div style={G.err}>{errors.locationUrl}</div>}</div>
        }
      </div>

      <div style={G.fc}>
        <SL>{t("register.hours_section")}</SL>
        <div style={{display:"flex",gap:7,marginBottom:10}}>
          <button style={{...G.locTab,...(!form.shiftEnabled?G.locTabOn:{})}} onClick={()=>setForm(p=>({...p,shiftEnabled:false}))}>{t("register.single_shift")}</button>
          <button style={{...G.locTab,...(form.shiftEnabled?G.locTabOn:{})}}  onClick={()=>setForm(p=>({...p,shiftEnabled:true}))}>{t("register.double_shift")}</button>
        </div>
        {!form.shiftEnabled
          ?<div style={{display:"flex",gap:10}}><F label={t("register.from")} style={{flex:1}}><input type="time" style={fi()} value={form.workStart} onChange={e=>setForm(p=>({...p,workStart:e.target.value}))}/></F><F label={t("register.to")} style={{flex:1}}><input type="time" style={fi()} value={form.workEnd} onChange={e=>setForm(p=>({...p,workEnd:e.target.value}))}/></F></div>
          :<>
            <div style={{fontSize:11,color:"var(--p)",marginBottom:6}}>{t("register.morning")}</div>
            <div style={{display:"flex",gap:10,marginBottom:10}}><F label={t("register.from")} style={{flex:1}}><input type="time" style={fi()} value={form.shift1Start} onChange={e=>setForm(p=>({...p,shift1Start:e.target.value}))}/></F><F label={t("register.to")} style={{flex:1}}><input type="time" style={fi()} value={form.shift1End} onChange={e=>setForm(p=>({...p,shift1End:e.target.value}))}/></F></div>
            <div style={{fontSize:11,color:"var(--p)",marginBottom:6}}>{t("register.evening")}</div>
            <div style={{display:"flex",gap:10}}><F label={t("register.from")} style={{flex:1}}><input type="time" style={fi()} value={form.shift2Start} onChange={e=>setForm(p=>({...p,shift2Start:e.target.value}))}/></F><F label={t("register.to")} style={{flex:1}}><input type="time" style={fi()} value={form.shift2End} onChange={e=>setForm(p=>({...p,shift2End:e.target.value}))}/></F></div>
          </>
        }
      </div>

      <div style={G.fc}>
        <SL>{t("register.barbers_section")} {errors.barbers&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>- {errors.barbers}</span>}</SL>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{t("register.barbers_hint")}</div>
        {form.barbers.map((b,i)=>(
          <div key={b.id} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <div style={{position:"relative",flexShrink:0}} onClick={()=>pickPhoto(b.id)}>
              <div style={{width:44,height:44,borderRadius:"50%",background:b.photo?"transparent":"var(--surface-2)",border:`2px dashed var(--p)`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                {b.photo?<img src={optimizeImageUrl(b.photo,44,44)} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<span style={{fontSize:18,color:"var(--p)"}}>📷</span>}
              </div>
              <div style={{position:"absolute",bottom:-2,right:-2,background:"var(--p)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",cursor:"pointer"}}>+</div>
            </div>
            <input style={{...fi(),...{flex:1}}} placeholder={`${t("register.barber_ph")} ${i+1}`} value={b.name} onChange={e=>upBarber(b.id,e.target.value)}/>
            {form.barbers.length>1&&<button style={G.xBtn} onClick={()=>rmBarber(b.id)}>✕</button>}
          </div>
        ))}
        <button style={G.addBarberBtn} onClick={addBarber}>{t("register.add_barber")}</button>
      </div>

      <div style={G.fc}>
        <SL>{t("register.services_section")} {errors.services&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>- {errors.services}</span>}</SL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          {DEFAULT_SERVICES.map(s=><div key={s} style={{...G.chip,...(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggleSvc(s)}>{s}</div>)}
        </div>
        {/* add custom service */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <input style={{...fi(),...{flex:1}}} placeholder={t("register.new_service_ph")} value={newSvc} onChange={e=>setNewSvc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomSvc()}/>
          <button style={{...G.sub,...{width:60,padding:0,fontSize:13}}} onClick={addCustomSvc}>{t("register.add_service")}</button>
        </div>
        {form.services.map(s=>(
          <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,background:"var(--surface-2)",padding:"8px 11px",borderRadius:9}}>
            <span style={{fontSize:12,color:"var(--text-primary)"}}>{s}</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button style={G.pmBtn} onClick={()=>adjustPrice(s,-5)}>-</button>
              <input type="number" style={{width:52,background:"var(--bg-input)",border:"1px solid var(--border-ui)",borderRadius:6,color:"var(--text-primary)",textAlign:"center",fontSize:13,padding:"3px 0",fontFamily:"inherit",outline:"none"}} value={form.prices[s]||0} onChange={e=>setPrice(s,e.target.value)}/>
              <button style={G.pmBtn} onClick={()=>adjustPrice(s,5)}>+</button>
              <span style={{color:"var(--p)",fontSize:11}}>{t("register.sar")}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={G.fc}>
        <SL>{t("register.tone_section")}</SL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:5}}>
          {TONES.map(tn=><div key={tn.id} style={{...G.chip,...(form.tone===tn.id?G.chipOn:{})}} onClick={()=>{setForm(p=>({...p,tone:tn.id}));playTone(tn.id,0.8);}}>{tn.label}</div>)}
        </div>
        <div style={{fontSize:11,color:"var(--text-muted)"}}>{t("register.tone_hint")}</div>
      </div>

      <button style={{...G.sub,marginBottom:30}} onClick={()=>{if(validate())addSalon(form);}}>{t("register.submit")}</button>
    </div></div>
  );
}

// ==============================================
//  ALL REVIEWS VIEW — صفحة جميع التعليقات
// ==============================================
function AllReviewsView({reviews,approvedSalons,setSelSalon,setView}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[filter,setFilter]=useState(0);
  const[search,setSearch]=useState("");
  const gold="var(--gold)";
  const goldStar="var(--gold)";
  const dimStar="rgba(var(--gold-rgb),.18)";

  const byId=new Map(approvedSalons.map(s=>[Number(s.id),s]));
  const approvedSet=new Set(approvedSalons.map(s=>Number(s.id)));
  const feed=(reviews||[])
    .filter(r=>approvedSet.has(Number(r.salon_id)))
    .map(r=>({
      key:`hr-${r.id}`,
      salonId:Number(r.salon_id),
      salonName:(byId.get(Number(r.salon_id))?.name||t("all_reviews.salon_fallback")).trim(),
      customerName:(r.customer_name||t("all_reviews.customer_fallback")).trim(),
      rating:r.rating,
      comment:(r.comment||"").trim(),
      ownerReply:(r.owner_reply||"").trim(),
      date:r.booking_date||r.created_at?.split("T")[0]||"",
    }))
    .sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  const filtered=feed.filter(r=>{
    if(filter>0&&r.rating!==filter)return false;
    if(search&&!r.salonName.includes(search)&&!r.customerName.includes(search)&&!r.comment.includes(search))return false;
    return true;
  });

  const globalAvg=feed.length
    ?Math.round(feed.reduce((a,r)=>a+r.rating,0)/feed.length*10)/10:0;
  const dist=[5,4,3,2,1].map(s=>({star:s,count:feed.filter(r=>r.rating===s).length}));

  const openSalon=sid=>{
    const s=approvedSalons.find(x=>Number(x.id)===Number(sid));
    if(s){setSelSalon(s);setView("salon");}
  };

  return(
    <div style={{minHeight:"100vh",fontFamily:"'Cairo',sans-serif",direction:dir,paddingBottom:40}}>
      <div style={{position:"sticky",top:64,zIndex:50,background:"var(--bg-input)",borderBottom:"1px solid rgba(var(--gold-rgb),.15)",padding:"12px 16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <button onClick={()=>setView("home")} style={{background:"transparent",border:"none",color:gold,fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1}}>←</button>
          <DorkLogoSvg size={26}/>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"var(--text-primary)"}}>{t("all_reviews.title")}</div>
            <div style={{fontSize:10,color:gold,opacity:.8}}>{feed.length} {t("all_reviews.rating_unit")} — {t("all_reviews.avg_prefix")} {globalAvg} ★</div>
          </div>
        </div>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={t("all_reviews.search_ph")}
          style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:10,background:"var(--bg-input)",border:"1px solid rgba(var(--gold-rgb),.25)",color:"var(--text-primary)",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none"}}
        />
      </div>

      <div style={{padding:"12px 16px",background:"linear-gradient(180deg,rgba(var(--gold-rgb),.06),transparent)"}}>
        <div style={{display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
          <button onClick={()=>setFilter(0)} style={{flex:"0 0 auto",padding:"6px 14px",borderRadius:20,border:`1px solid ${filter===0?gold:"rgba(var(--gold-rgb),.2)"}`,background:filter===0?"rgba(var(--gold-rgb),.12)":"transparent",color:filter===0?gold:"var(--text-muted)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap"}}>
            {t("all_reviews.filter_all")} ({feed.length})
          </button>
          {dist.map(({star,count})=>(
            <button key={star} onClick={()=>setFilter(star===filter?0:star)}
              style={{flex:"0 0 auto",display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:20,border:`1px solid ${filter===star?gold:"rgba(var(--gold-rgb),.2)"}`,background:filter===star?"rgba(var(--gold-rgb),.12)":"transparent",color:filter===star?goldStar:"var(--text-muted)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap"}}>
              {"★".repeat(star)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"32px 0",color:"var(--text-muted)",fontSize:13}}>{t("all_reviews.no_results")}</div>
        )}
        {filtered.map((r,i)=>(
          <div key={r.key} onClick={()=>openSalon(r.salonId)}
            style={{cursor:"pointer",background:"var(--surface-1)",border:`1px solid rgba(var(--gold-rgb),.28)`,borderRadius:14,padding:"14px 14px 12px",boxShadow:"0 2px 16px rgba(0,0,0,.35)",transition:"box-shadow .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:800,color:gold,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                ✂ {r.salonName}
              </div>
              <div style={{display:"flex",gap:1,flexShrink:0,marginRight:8}}>
                {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:dimStar}}>★</span>)}
              </div>
            </div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:r.comment?8:0}}>👤 {r.customerName}</div>
            {r.comment&&(
              <>
                <div style={{height:1,background:"rgba(var(--gold-rgb),.1)",margin:"8px 0"}}/>
                <div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.55}}>«{r.comment}»</div>
              </>
            )}
            <div style={{fontSize:9,color:"var(--text-muted)",marginTop:10}}>📅 {r.date||"—"}</div>
            {r.ownerReply&&(
              <div style={{marginTop:8,padding:"7px 10px",background:"rgba(var(--gold-rgb),.06)",borderRight:"3px solid #d4a017",borderRadius:"0 7px 7px 0"}}>
                <div style={{fontSize:9,color:"var(--gold)",fontWeight:700,marginBottom:2}}>{t("all_reviews.owner_reply_label")}</div>
                <div style={{fontSize:10,color:"var(--text-muted)",lineHeight:1.5}}>{r.ownerReply}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==============================================
//  NOTIFS VIEW - صفحة الإشعارات
// ==============================================
function NotifsView({setView}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[notifs,setNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}});

  // تحميل الإشعارات من Supabase عند فتح الصفحة
  useEffect(()=>{
    sb("notifications","GET",null,"?select=id,title,body,icon,created_at&order=created_at.desc&limit=50").then(data=>{
      if(!Array.isArray(data)||!data.length)return;
      const converted=data.map(n=>({
        id:n.id||Date.now(),
        icon:n.icon||"🔔",
        title:n.title||"",
        body:n.body||"",
        time:new Date(n.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"}),
        read:n.read||false,
      }));
      setNotifs(converted);
      try{localStorage.setItem("dork_notifs",JSON.stringify(converted.slice(0,50)));}catch{}
    }).catch(()=>{});
  },[]);

  const markAll=()=>{
    const updated=notifs.map(n=>({...n,read:true}));
    setNotifs(updated);
    localStorage.setItem("dork_notifs",JSON.stringify(updated));
    localStorage.setItem("dork_notif_count","0");
    // وضع علامة مقروء في Supabase
    sb("notifications","PATCH",{read:true},"?read=eq.false").catch(()=>{});
  };

  const clearAll=()=>{
    setNotifs([]);
    localStorage.setItem("dork_notifs","[]");
    localStorage.setItem("dork_notif_count","0");
    // حذف من Supabase
    sb("notifications","DELETE",null,"?id=gt.0").catch(()=>{});
  };

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}>
        <button style={G.bb} onClick={()=>setView("home")}>← {t("notifs_view.back")}</button>
        <h2 style={{...G.ft,flex:1}}>{t("notifs_view.title")}</h2>
        {notifs.length>0&&<button style={{...G.pageBtn,fontSize:11,padding:"5px 10px"}} onClick={markAll}>{t("notifs_view.mark_all")}</button>}
        {notifs.length>0&&<button style={{...G.delBtn,fontSize:11,padding:"5px 10px"}} onClick={clearAll}>{t("notifs_view.clear")}</button>}
      </div>
      {notifs.length===0
        ?<div style={G.empty}>{t("notifs_view.empty")}</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {notifs.map(n=>(
            <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"var(--border-ui)":"var(--p)"}`,opacity:n.read?.7:1}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:20,flexShrink:0}}>{n.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{n.title}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{n.body}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>{n.time}</div>
                </div>
                {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:"var(--p)",flexShrink:0,marginTop:4}}/>}
              </div>
            </div>
          ))}
        </div>
      }
    </div></div>
  );
}

function CompareSalonsView({salons,setView,setSelSalon}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  if(!salons||salons.length<2)return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>← {t("compare.back")}</button><h2 style={G.ft}>{t("compare.title")}</h2></div>
      <div style={G.empty}>{t("compare.empty")}</div>
    </div></div>
  );

  const[a,b]=salons;
  const rows=[
    {l:t("compare.rating"),av:a.rating||"-",bv:b.rating||"-",better:(+a.rating||0)>(+b.rating||0)?"a":"b"},
    {l:t("compare.barbers_count"),av:a.barbers?.length||1,bv:b.barbers?.length||1,better:(a.barbers?.length||1)>(b.barbers?.length||1)?"a":"b"},
    {l:t("compare.services_count"),av:a.services.length,bv:b.services.length,better:a.services.length>b.services.length?"a":"b"},
    {l:t("compare.min_price"),av:Math.min(...Object.values(a.prices||{0:0}))+" "+t("compare.sar"),bv:Math.min(...Object.values(b.prices||{0:0}))+" "+t("compare.sar"),better:Math.min(...Object.values(a.prices||{999:0}))<Math.min(...Object.values(b.prices||{999:0}))?"a":"b"},
    {l:t("compare.max_price"),av:Math.max(...Object.values(a.prices||{0:0}))+" "+t("compare.sar"),bv:Math.max(...Object.values(b.prices||{0:0}))+" "+t("compare.sar"),better:Math.max(...Object.values(a.prices||{0:0}))<Math.max(...Object.values(b.prices||{0:0}))?"a":"b"},
    {l:t("compare.bookings"),av:a.bookings.length,bv:b.bookings.length,better:a.bookings.length>b.bookings.length?"a":"b"},
  ];

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>← {t("compare.back")}</button><h2 style={G.ft}>{t("compare.title")}</h2></div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        <div/>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid var(--pa25)",cursor:"pointer"}} onClick={()=>{setSelSalon(s);setView("salon");}}>
            <div style={{fontSize:24,marginBottom:4}}>✂</div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",lineHeight:1.3}}>{s.name}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>📍 {s.gov||s.region}</div>
          </div>
        ))}
      </div>

      {rows.map(({l,av,bv,better})=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center"}}>{l}</div>
          {[{v:av,side:"a"},{v:bv,side:"b"}].map(({v,side})=>(
            <div key={side} style={{background:better===side?"var(--pa12)":"#13131f",border:`1px solid ${better===side?"var(--p)":"var(--border-ui)"}`,borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:better===side?900:400,color:better===side?"var(--p)":"#aaa"}}>{v}</div>
              {better===side&&<div style={{fontSize:9,color:"var(--p)"}}>{t("compare.better")}</div>}
            </div>
          ))}
        </div>
      ))}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:12,border:"1px solid var(--border-ui)"}}>
            <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>{t("compare.services_of")} {s.name.split(" ")[0]}</div>
            {s.services.map(sv=>(
              <div key={sv} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
                <span style={{color:"#fff"}}>{sv}</span>
                <span style={{color:"var(--p)"}}>{s.prices?.[sv]||0} {t("compare.sar")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        {[a,b].map(s=>(
          <button key={s.id} style={G.sub} onClick={()=>{setSelSalon(s);setView("book");}}>
            {t("compare.book_btn")} {s.name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div></div>
  );
}

// ==============================================
//  NEAR MAP VIEW - خريطة الصالونات القريبة
// ==============================================
function NearMapView({salons,setView,setSelSalon}){
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
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>← {t("near_map.back")}</button><h2 style={G.ft}>{t("near_map.title")}</h2></div>
      {!userLoc?(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:50,marginBottom:12}}>📍</div>
          <div style={{fontSize:14,color:"#fff",fontWeight:700,marginBottom:8}}>{t("near_map.intro_title")}</div>
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
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>📍 {s.gov||s.region}{s.village?" - "+s.village:""}</div>
                    </div>
                    <div style={{textAlign:"left",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:900,color:s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#888"}}>
                        {s.dist<999?`${s.dist.toFixed(1)} ${t("near_map.km")}`:"-"}
                      </div>
                      <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2}}>⭐ {s.rating}</div>
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

function ShareBtn({salon}){
  const{t}=useTranslation();
  const shareUrl=`${window.location.origin}${window.location.pathname}?salon=${salon.id}`;
  const shareText=`✂ ${salon.name}\n📍 ${salon.gov||salon.region}\n⭐ ${salon.rating||5}\n\n${shareUrl}`;

  const share=async()=>{
    if(navigator.share){
      try{await navigator.share({title:salon.name,text:shareText,url:shareUrl});}catch{}
    }else{
      try{await navigator.clipboard.writeText(shareUrl);alert(t("share.copied"));}catch{alert(shareUrl);}
    }
  };

  return(
    <button style={{...G.pageBtn,fontSize:11,padding:"5px 10px"}} onClick={share}>
      {t("share.btn")}
    </button>
  );
}

// ==============================================
//  OWNER LOGIN + DASHBOARD
// ==============================================
function OwnerLogin({salons,setOwnerSession,setOwnerTab,setView,toast$}){
  const{t}=useTranslation();
  const[tab,setTab]=useState("phone");
  const[phone,setPhone]=useState(""); const[err,setErr]=useState("");
  const[pin,setPin]=useState(""); const[pinErr,setPinErr]=useState("");
  const loginWithPhone=()=>{
    const s=salons.find(x=>x.ownerPhone===phone.trim()||x.phone===phone.trim());
    if(!s){setErr(t("owner_login.err_not_found"));return;}
    if(s.banned){setErr(t("owner_login.err_banned"));return;}
    if(s.frozen){setErr(t("owner_login.err_frozen"));return;}
    setOwnerSession(s.id); setOwnerTab(null); setView("ownerDash"); registerFcmTokenForUser("salon",s.id);
  };
  const loginWithPin=()=>{
    const s=salons.find(s=>{const savedPin=localStorage.getItem(`dork_owner_pin_${s.id}`);return savedPin&&savedPin===pin;});
    if(!s){setPinErr(t("owner_login.err_pin_wrong"));setPin("");return;}
    if(s.banned){setPinErr(t("owner_login.err_pin_banned"));return;}
    if(s.frozen){setPinErr(t("owner_login.err_pin_frozen"));return;}
    setOwnerSession(s.id); setOwnerTab(null); setView("ownerDash"); registerFcmTokenForUser("salon",s.id);
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={{...G.tabRow,marginBottom:16}}>
        <button style={{...G.tabBtn,flex:1,...(tab==="phone"?G.tabOn:{})}} onClick={()=>{setTab("phone");setErr("");setPinErr("");}}>{t("owner_login.phone_tab")}</button>
        <button style={{...G.tabBtn,flex:1,...(tab==="pin"?G.tabOn:{})}} onClick={()=>{setTab("pin");setErr("");setPinErr("");}}>{t("owner_login.pin_tab")}</button>
      </div>
      <div style={G.fc}>
        {tab==="phone"?<>
          <SL>{t("owner_login.phone_hint")}</SL>
          <F label={t("owner_login.phone_label")} error={err}><input style={fi(err)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <button style={G.sub} onClick={loginWithPhone}>{t("owner_login.login_btn")}</button>
        </>:<>
          <SL>{t("owner_login.pin_hint")}</SL>
          <F label={t("owner_login.pin_label")} error={pinErr}><input style={fi(pinErr)} type="password" inputMode="numeric" placeholder="••••" value={pin} onChange={e=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setPin(val);setPinErr("");}}/></F>
          <button style={G.sub} onClick={loginWithPin}>{t("owner_login.login_btn")}</button>
        </>}
      </div>
      <div style={{margin:"0 0 16px",background:"rgba(var(--pr),.06)",border:"1.5px dashed rgba(var(--pr),.4)",borderRadius:13,padding:"18px 16px",textAlign:"center"}}>
        <div style={{fontSize:15,color:"var(--p)",fontWeight:700,marginBottom:6}}>{t("owner_login.no_salon_title")}</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:14}}>{t("owner_login.no_salon_sub")}</div>
        <button style={{...G.sub,background:"var(--grad)",color:"#000",fontSize:15,fontWeight:900,letterSpacing:.5}} onClick={()=>setView("register")}>
          {t("owner_login.register_btn")}
        </button>
      </div>
      <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:4,marginBottom:16,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("owner_login.back")}</button>
    </div></div>
  );
}
function OwnerDash({salon,setView,setOwnerSession,updateBookingStatus,setSalons,toast$,refreshSalonBookings,reviews,setReviews,customers=[],socialLinks,setSocialLinks,ownerTab,setOwnerTab,showSalonDrawer,setShowSalonDrawer}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[activeCard,setActiveCard]=useState(null);
  const[ownerNotifs,setOwnerNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}});
  if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{t("owner_dash.back")}</button><h2 style={G.ft}>{t("owner_dash.page_title")}</h2></div><div style={G.empty}>{t("owner_dash.not_found")}</div></div></div>;

  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const statusColor=salon.status==="approved"?"#27ae60":salon.status==="rejected"?"#e74c3c":"var(--pl)";
  const statusLabel=salon.status==="approved"?t("owner_dash.status_active"):salon.status==="rejected"?t("owner_dash.status_rejected"):t("owner_dash.status_pending");

  const approvedBookings=salon.bookings.filter(b=>b.status==="approved");
  const totalEarned=approvedBookings.length;
  const totalPaid=salon.totalPaid||0;
  const balance=totalEarned-totalPaid;


  // ── حسابات ملخص اليوم (بتوقيت السعودية AST/GMT+3) ──
  const _td=getTodayDateInRiyadh();
  const _tdBks=salon.bookings.filter(b=>b.date===_td);
  const _tdApproved=_tdBks.filter(b=>b.status==="approved");
  const _tdPending=_tdBks.filter(b=>b.status==="pending");
  const _tdRejected=_tdBks.filter(b=>b.status==="rejected");
  const _tdRevenue=_tdApproved.reduce((s,b)=>s+(b.total||0),0);
  const _now=new Date();
  const _nowMins=_now.getHours()*60+_now.getMinutes();
  const _nextBk=_tdApproved
    .filter(b=>{const[h,m]=(b.time||"0:0").split(":").map(Number);return h*60+m>_nowMins;})
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""))[0];
  const _totalSlots=Math.max((getSlotsForSalon(salon).length)*(salon.barbers?.length||1),1);
  const _occ=Math.min(100,Math.round(_tdApproved.length/_totalSlots*100));
  const _dNames=t("owner_dash.days",{returnObjects:true});
  const _mNames=t("owner_dash.months",{returnObjects:true});
  const _dayLabel=`${_dNames[_now.getDay()]}، ${_now.getDate()} ${_mNames[_now.getMonth()]}`;

  return(
    <div style={{...G.page,direction:dir}}>
      <style>{`
        @keyframes fadeInUp {from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideInFromRight {from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
        @keyframes scaleIn {from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        @keyframes growBar {from{transform:scaleX(0);}to{transform:scaleX(1);}}
        @keyframes pulse {0%,100%{opacity:1;}50%{opacity:.6;}}
        .stat-card{animation:fadeInUp .45s ease-out both;transition:all .25s ease;}
        .stat-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(var(--gold-rgb),.18);}
        .tab-button{transition:all .2s ease;}
        .balance-tab{animation:slideInFromRight .4s cubic-bezier(0.4,0,0.2,1);}
        .notif-banner{animation:fadeInUp .4s ease-out;transition:all .3s ease;}
        .today-card{animation:scaleIn .4s ease-out;}
        .occ-bar{animation:growBar 1.2s cubic-bezier(0.4,0,0.2,1);}
        .pending-pulse{animation:pulse 2s infinite;}
      `}</style>
      <div style={G.fp}>

      {/* بانر إشعارات الإدارة */}
      {ownerNotifs.filter(n=>n.title&&(n.title.includes("إدارة")||n.title.includes("اشتراك")||n.title.includes("تحذير")||n.title.includes("إعلان"))).slice(0,1).map(n=>(
        <div key={n.id} className="notif-banner" style={{background:"linear-gradient(135deg,rgba(var(--gold-rgb),.12),rgba(var(--gold-rgb),.06))",border:"1px solid rgba(var(--gold-rgb),.35)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--p)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{n.icon} {n.title} — {n.body}</span>
          <button onClick={()=>setOwnerNotifs(p=>p.filter(x=>x.id!==n.id))} style={{background:"transparent",border:"none",color:"var(--text-muted)",cursor:"pointer",fontSize:14,padding:0}}>✕</button>
        </div>
      ))}

      {/* ── الواجهة الرئيسية (لوحتي) ── */}
      {ownerTab===null&&(
        <>

      {/* ── بادج الصالون المحسّن (ثابت في لوحتي فقط) ── */}
      <div style={{background:"rgba(var(--pr),.18)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:16,padding:16,border:"1.5px solid rgba(var(--pr),.45)",marginBottom:12,boxShadow:"0 4px 20px rgba(var(--pr),.12)"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontSize:15,color:"var(--p)",fontWeight:800}}>✂ {salon.name}</div>
              {salon.status==="approved"&&<div style={{background:"rgba(var(--pr),.2)",border:"1px solid rgba(var(--pr),.5)",borderRadius:8,padding:"3px 10px",fontSize:12,color:"var(--p)",fontWeight:700}}>{t("owner_dash.salon_active")}</div>}
            </div>
            <div style={{fontSize:14,fontWeight:800,color:"#f0b429"}}>⭐ {(salon.rating||0).toFixed(1)}</div>
          </div>
          <div style={{height:1,background:"rgba(var(--pr),.3)"}}/>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:600}}>📞 {salon.phone||t("owner_dash.not_available")}</div>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:600}}>📍 {salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:600}}>📅 {salon.createdAt?new Date(salon.createdAt).toLocaleDateString("ar-SA"):t("owner_dash.not_available")}</div>
        </div>
      </div>

      {salon.status!=="approved"&&(
        <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.25)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12,color:"var(--pl)"}}>
          {t("owner_dash.pending_notice")}
        </div>
      )}

      {/* ── بطاقة ملخص اليوم ── */}
      <div className="today-card" style={{background:"linear-gradient(145deg,#16112a,#0e0e1e)",borderRadius:18,padding:"16px",marginBottom:12,border:"1px solid rgba(var(--gold-rgb),.2)",boxShadow:"0 0 30px rgba(var(--gold-rgb),.06),inset 0 1px 0 rgba(var(--gold-rgb),.08)"}}>

        {/* التاريخ */}
        <div style={{fontSize:13,fontWeight:700,color:"var(--gold)",marginBottom:14}}>🌅 {_dayLabel}</div>

        {/* حجوزات اليوم + إيراد اليوم */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:"rgba(var(--gold-rgb),.07)",borderRadius:13,padding:"13px",border:"1px solid rgba(var(--gold-rgb),.15)",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-8,right:-8,fontSize:36,opacity:.06}}>📅</div>
            <div style={{fontSize:30,fontWeight:900,color:"var(--gold)",lineHeight:1}}>{_tdApproved.length}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:5}}>{t("owner_dash.today_bookings")}</div>
          </div>
          <div style={{background:"rgba(39,174,96,.07)",borderRadius:13,padding:"13px",border:"1px solid rgba(39,174,96,.15)",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-8,right:-8,fontSize:36,opacity:.06}}>💰</div>
            <div style={{fontSize:30,fontWeight:900,color:"#27ae60",lineHeight:1}}>{_tdRevenue}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:5}}>{t("owner_dash.today_revenue")}</div>
          </div>
        </div>

        {/* شريط الامتلاء */}
        <div style={{marginBottom:_nextBk?14:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,color:"#777"}}>{t("owner_dash.occupancy")}</div>
            <div style={{fontSize:12,fontWeight:800,color:_occ>=80?"#e74c3c":_occ>=50?"var(--gold)":"#27ae60"}}>{_occ}%</div>
          </div>
          <div style={{height:7,background:"rgba(255,255,255,.05)",borderRadius:10,overflow:"hidden"}}>
            <div className="occ-bar" style={{height:"100%",width:`${_occ}%`,background:_occ>=80?"linear-gradient(90deg,#c0392b,#e74c3c)":_occ>=50?"linear-gradient(90deg,var(--pd),var(--pl))":"linear-gradient(90deg,#1e8449,#27ae60)",borderRadius:10,transformOrigin:"right center",boxShadow:_occ>0?`0 0 8px ${_occ>=80?"rgba(231,76,60,.5)":_occ>=50?"rgba(var(--gold-rgb),.5)":"rgba(39,174,96,.5)"}`:""}}/>
          </div>
        </div>

        {/* الحجز القادم */}
        {_nextBk&&(
          <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(var(--gold-rgb),.06)",borderRadius:11,padding:"10px 12px",border:"1px dashed rgba(var(--gold-rgb),.2)"}}>
            <div style={{width:32,height:32,borderRadius:9,background:"rgba(var(--gold-rgb),.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>⏰</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,color:"#666",marginBottom:2}}>{t("owner_dash.next_booking")}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {_nextBk.customerName||_nextBk.customer_name||t("owner_dash.customer")} — {_nextBk.time}
              </div>
            </div>
            <div style={{fontSize:11,fontWeight:800,color:"var(--gold)",background:"rgba(var(--gold-rgb),.12)",padding:"4px 9px",borderRadius:8,flexShrink:0,whiteSpace:"nowrap"}}>
              {(()=>{
                const[h,m]=(_nextBk.time||"0:0").split(":").map(Number);
                const diff=h*60+m-_nowMins;
                if(diff<=0)return t("owner_dash.now");
                if(diff>=60)return`${Math.floor(diff/60)}${t("owner_dash.time_hour")} ${diff%60}${t("owner_dash.time_min")}`;
                return`${diff} ${t("owner_dash.time_mins")}`;
              })()}
            </div>
          </div>
        )}
        {!_nextBk&&(
          <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center",paddingTop:_tdApproved.length>0?8:0}}>
            {_tdApproved.length>0?t("owner_dash.no_more_bookings"):t("owner_dash.no_bookings")}
          </div>
        )}
      </div>

      {/* ── الـ 4 مربعات ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:activeCard?0:14}}>
            {[
              {label:t("owner_dash.filter_all"),value:_tdBks.length,color:"var(--gold)",filter:"all",delay:0},
              {label:t("owner_dash.filter_pending"),value:_tdPending.length,color:"#f39c12",filter:"pending",delay:80},
              {label:t("owner_dash.filter_approved"),value:_tdApproved.length,color:"#27ae60",filter:"approved",delay:160},
              {label:t("owner_dash.filter_rejected"),value:_tdRejected.length,color:"#e74c3c",filter:"rejected",delay:240}
            ].map(({label,value,color,filter,delay})=>{
              const isOpen=activeCard===filter;
              return(
                <div key={label} className="stat-card"
                  onClick={()=>{setActiveCard(c=>c===filter?null:filter);if(filter==="all"||filter==="approved")refreshSalonBookings(salon.id);}}
                  style={{background:isOpen?`${color}18`:`${color}0f`,borderRadius:isOpen?"13px 13px 0 0":13,padding:"11px 6px",height:68,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:`1.5px solid ${isOpen?`${color}55`:`${color}1a`}`,borderBottom:isOpen?`1.5px solid ${color}55`:"",textAlign:"center",animationDelay:`${delay}ms`,cursor:"pointer",transition:"all .22s ease",boxShadow:isOpen?`0 0 14px ${color}1a`:"none"}}>
                  <div style={{fontSize:22,fontWeight:900,color,marginBottom:2,lineHeight:1}}>{value}</div>
                  <div style={{fontSize:10,color:isOpen?color:"#666",fontWeight:600,marginBottom:3}}>{label}</div>
                  <div style={{fontSize:9,color:isOpen?color:"var(--text-muted)",lineHeight:1,transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
                </div>
              );
            })}
          </div>

          {/* قائمة الحجوزات المنسدلة */}
          {activeCard&&(
            <div style={{animation:"fadeInUp .3s ease-out",marginBottom:14,border:`1.5px solid ${activeCard==="all"?"var(--gold)":activeCard==="pending"?"#f39c12":activeCard==="approved"?"#27ae60":"#e74c3c"}33`,borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden",background:"rgba(255,255,255,.02)"}}>
              <NotifPanel key={activeCard} salon={salon} onUpdate={updateBookingStatus} customers={customers} defaultFilter={activeCard} refreshSalonBookings={refreshSalonBookings}/>
            </div>
          )}
        </>
      )}
      {ownerTab!==null&&(
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>{setShowSalonDrawer(true);setOwnerTab(null);}}>← {t("owner_dash.back")}</button>
          <h2 style={G.ft}>{ownerTab==="calendar"?t("salon_drawer.bookings"):ownerTab==="messages"?t("salon_drawer.messages"):ownerTab==="reviews"?t("salon_drawer.reviews"):ownerTab==="stats"?t("salon_drawer.stats"):"🔥 إرسال عرض"}</h2>
        </div>
      )}
      {ownerTab==="messages"&&(
        <MessagesPanel salon={salon} toast$={toast$}/>
      )}
      {ownerTab==="calendar"&&<BookingCalendar salon={salon} onUpdate={updateBookingStatus}/>}
      {ownerTab==="reviews"&&<OwnerReviewsPanel salon={salon} reviews={reviews} setReviews={setReviews} toast$={toast$}/>}
      {ownerTab==="stats"&&<StatsPanel salon={salon} onUpdate={updateBookingStatus} customers={customers} refreshSalonBookings={refreshSalonBookings} totalEarned={totalEarned} totalPaid={totalPaid}/>}
      {ownerTab==="promo"&&<PromoPanel salon={salon} customers={customers} toast$={toast$}/>}
    </div></div>
  );
}

// ==============================================
//  OWNER REVIEWS PANEL - لوحة تقييمات الصالون للمالك
// ==============================================
function OwnerReviewsPanel({salon,reviews,setReviews,toast$}){
  const{t}=useTranslation();
  const gold="var(--p)";
  const goldStar="var(--gold)";
  const[replyDraft,setReplyDraft]=useState({});
  const[saving,setSaving]=useState(null);

  const salonReviews=useMemo(()=>{
    if(!reviews||!salon)return[];
    return (reviews||[])
      .filter(r=>Number(r.salon_id)===Number(salon.id))
      .sort((a,b)=>(b.booking_date||b.created_at||"").localeCompare(a.booking_date||a.created_at||""));
  },[reviews,salon]);

  const avg=salonReviews.length
    ?Math.round(salonReviews.reduce((s,r)=>s+r.rating,0)/salonReviews.length*10)/10:0;

  const saveReply=async(reviewId)=>{
    const text=(replyDraft[reviewId]||"").trim();
    if(!text)return;
    setSaving(reviewId);
    try{
      await sb("reviews","PATCH",{owner_reply:text},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:text}:r));
      setReplyDraft(p=>({...p,[reviewId]:""}));
      toast$(t("owner_dash.reply_saved"));
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
    finally{setSaving(null);}
  };

  const deleteReply=async(reviewId)=>{
    try{
      await sb("reviews","PATCH",{owner_reply:null},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:null}:r));
      toast$(t("owner_dash.reply_deleted"));
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };

  return(
    <div style={{paddingTop:8}}>
      {/* ملخص */}
      <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:900,color:goldStar,lineHeight:1}}>{avg||"—"}</div>
          <div style={{display:"flex",gap:1,justifyContent:"center",margin:"4px 0"}}>
            {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=Math.round(avg)?goldStar:"rgba(var(--gold-rgb),.2)"}}>★</span>)}
          </div>
          <div style={{fontSize:10,color:"var(--text-muted)"}}>{salonReviews.length} {t("salon_page.reviews_count")}</div>
        </div>
        <div style={{flex:1}}>
          {[5,4,3,2,1].map(s=>{
            const cnt=salonReviews.filter(r=>r.rating===s).length;
            const pct=salonReviews.length?Math.round(cnt/salonReviews.length*100):0;
            return(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:10,color:goldStar,width:8}}>{s}</span>
                <div style={{flex:1,height:5,background:"rgba(var(--gold-rgb),.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:gold,borderRadius:3,transition:"width .4s"}}/>
                </div>
                <span style={{fontSize:9,color:"#666",width:24,textAlign:"left"}}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {salonReviews.length===0&&<div style={G.empty}>{t("owner_dash.reviews_empty")}</div>}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {salonReviews.map(r=>{
          const hasReply=r.owner_reply&&r.owner_reply.trim();
          const draft=replyDraft[r.id]??r.owner_reply??"";
          return(
            <div key={r.id} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              {/* العميل */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,color:"#c0c0d0",fontWeight:700}}>👤 {r.customer_name||t("owner_dash.customer_fallback")}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:"rgba(var(--gold-rgb),.18)"}}>★</span>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:4}}>«{r.comment}»</div>}
              <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:8}}>📅 {r.booking_date||r.created_at?.split("T")[0]||"—"}</div>

              {/* رد موجود */}
              {hasReply&&!(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply)&&(
                <div style={{padding:"8px 10px",background:"rgba(var(--pr),.07)",borderRight:"3px solid var(--p)",borderRadius:"0 8px 8px 0",marginBottom:6}}>
                  <div style={{fontSize:10,color:gold,fontWeight:700,marginBottom:2}}>{t("owner_dash.reply_label")}</div>
                  <div style={{fontSize:11,color:"#c8c8a8",lineHeight:1.5}}>{r.owner_reply}</div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>setReplyDraft(p=>({...p,[r.id]:r.owner_reply}))} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit"}}>{t("owner_dash.reply_edit")}</button>
                    <button onClick={()=>deleteReply(r.id)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid #e74c3c55",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}>{t("owner_dash.reply_delete")}</button>
                  </div>
                </div>
              )}

              {/* حقل الرد */}
              {(!hasReply||(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply))&&(
                <div>
                  <textarea
                    value={draft}
                    onChange={e=>setReplyDraft(p=>({...p,[r.id]:e.target.value}))}
                    placeholder={t("owner_dash.reply_ph")}
                    rows={2}
                    style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--pa25)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"'Cairo',sans-serif",resize:"none",outline:"none",direction:"rtl"}}
                  />
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button
                      onClick={()=>saveReply(r.id)}
                      disabled={saving===r.id||!draft.trim()}
                      style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:draft.trim()?"linear-gradient(135deg,var(--p),var(--pl))":"var(--border-ui)",color:draft.trim()?"#000":"#555",fontWeight:700,cursor:draft.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12}}>
                      {saving===r.id?t("owner_dash.reply_sending"):t("owner_dash.reply_send")}
                    </button>
                    {hasReply&&<button onClick={()=>setReplyDraft(p=>{const n={...p};delete n[r.id];return n;})} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{t("owner_dash.reply_cancel")}</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================
//  BOOKING CALENDAR - تقويم مرئي للحجوزات
// ==============================================
function BookingCalendar({salon,onUpdate}){
  const{t}=useTranslation();
  const today=new Date();
  const todayDateStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const[expandedDate,setExpandedDate]=useState(null);
  const[localAttendance,setLocalAttendance]=useState({});
  const[viewMonth,setViewMonth]=useState(today.getMonth());
  const[viewYear,setViewYear]=useState(today.getFullYear());

  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const bks=salon?.bookings||[];

  const bookingsForDate=useCallback((d)=>{
    const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return bks.filter(b=>b.date===dateStr);
  },[viewYear,viewMonth,bks]);

  const selBks=useMemo(()=>expandedDate?bks.filter(b=>b.date===expandedDate):[],[expandedDate,bks]);

  const toggleDate=useCallback((dateStr)=>{
    setExpandedDate(prev=>prev===dateStr?null:dateStr);
  },[]);

  return(
    <div style={{paddingTop:4}}>
      {/* header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <button style={{...G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}}>{"<"}</button>
        <span style={{fontSize:14,fontWeight:700,color:"var(--p)"}}>{t("owner_dash.months",{returnObjects:true})[viewMonth]} {viewYear}</span>
        <button style={{...G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}}>{">"}</button>
      </div>
      {/* days header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["أح","إث","ثل","أر","خم","جم","سب"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"var(--text-muted)",padding:"4px 0"}}>{d}</div>)}
      </div>
      {/* calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:12}}>
        {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{
          const d=i+1;
          const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayBks=bookingsForDate(d);
          const isToday=dateStr===todayDateStr;
          const isExp=dateStr===expandedDate;
          const hasBks=dayBks.length>0;
          return(
            <button key={d} onClick={()=>toggleDate(dateStr)}
              style={{position:"relative",padding:"6px 0",borderRadius:8,border:`1.5px solid ${isExp?"var(--p)":isToday?"var(--pd)":"var(--border-ui)"}`,background:isExp?"var(--pa12)":isToday?"var(--pa05)":"transparent",color:isExp?"var(--p)":isToday?"var(--pl)":"#aaa",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:isExp||isToday?700:400,textAlign:"center"}}>
              {d}
              {hasBks&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:"var(--p)"}}/>}
            </button>
          );
        })}
      </div>
      {/* bookings for selected date */}
      {expandedDate&&(
        <>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8}}>📋 {expandedDate} • {selBks.length} {t("owner_dash.booking_unit")}</div>
          {selBks.length===0
            ?<div style={G.empty}>{t("owner_dash.calendar_no_bookings")}</div>
            :selBks.map(b=>(
              <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>👤 {b.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>📞 {b.phone}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>✂ {Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)"}}>📅 {b.date} {b.time} - {b.total||0} ر</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?t("notif.status_approved"):b.status==="rejected"?t("notif.status_rejected"):t("notif.status_pending")}</span>
                </div>
                {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
                {b.status==="approved"&&!localAttendance[b.id]&&!b.attendance&&(
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #27ae60",background:"transparent",color:"#27ae60",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"attended"},"?id=eq."+b.id);setLocalAttendance(p=>({...p,[b.id]:"attended"}));}catch{}}}>{t("notif.attended")}</button>
                    <button style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{try{await sb("bookings","PATCH",{attendance:"no_show"},"?id=eq."+b.id);setLocalAttendance(p=>({...p,[b.id]:"no_show"}));}catch{}}}>{t("notif.no_show")}</button>
                  </div>
                )}
                {b.status==="approved"&&(localAttendance[b.id]||b.attendance)&&(
                  <div style={{display:"flex",gap:6,marginTop:6,alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#666"}}>{t("notif.attendance")}</span>
                    <span style={{fontSize:11,fontWeight:700,color:(localAttendance[b.id]||b.attendance)==="attended"?"#27ae60":"#e74c3c"}}>
                      {(localAttendance[b.id]||b.attendance)==="attended"?t("notif.attended"):t("notif.no_show")}
                    </span>
                  </div>
                )}
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}

// ==============================================
//  PROMO PANEL - لوحة العروض الترويجية للصالون
// ==============================================
function PromoPanel({salon,customers,toast$}){
  const PACKAGES=[
    {id:"bronze",label:"برونز",medal:"🥉",color:"#cd7f32",bg:"rgba(205,127,50,.08)",border:"rgba(205,127,50,.4)",
     icon:"🔔",service:"إشعار push لجميع عملاء التطبيق",
     prices:{1:5,3:12,7:20}},
    {id:"silver",label:"فضي",medal:"🥈",color:"#9e9e9e",bg:"rgba(158,158,158,.08)",border:"rgba(158,158,158,.4)",
     icon:"🔥",service:"بادج 🔥 + إطار ملون في بطاقتك على الصفحة الرئيسية",
     prices:{1:10,3:25,7:40}},
    {id:"gold",label:"ذهبي",medal:"🥇",color:"#d4a017",bg:"rgba(212,160,23,.08)",border:"rgba(212,160,23,.4)",
     icon:"💬",service:"رسائل WhatsApp مباشرة لعملائك",
     prices:null},
  ];
  const DURATIONS=[{days:1,label:"يوم واحد"},{days:3,label:"3 أيام"},{days:7,label:"أسبوع"}];
  const CUSTOMER_GROUPS=[
    {key:"last80",label:"آخر 80 عميل",max:80},
    {key:"top50",label:"الأكثر زيارة",max:50},
    {key:"last30",label:"آخر 30 عميل",max:30},
  ];
  const TEMPLATES=[
    "خصم 20% على قصة الشعر طوال فترة العرض 🎉",
    "تسريح مجاني مع كل حجز للفترة المحدودة ✂",
    "الحجز الثاني بنصف السعر 💈",
    "قصة شعر + لحية بسعر قصة واحدة فقط ⚡",
    "خصم خاص 30% على الحلاقة الكاملة 🔥",
  ];
  const WHATSAPP_RATE=0.10;
  const[pkg,setPkg]=useState(null);
  const[durationDays,setDurationDays]=useState(7);
  const[useTemplate,setUseTemplate]=useState(true);
  const[selectedTemplate,setSelectedTemplate]=useState("");
  const[customText,setCustomText]=useState("");
  const[discountCode,setDiscountCode]=useState("");
  const[codeInput,setCodeInput]=useState("");
  const[codeApplied,setCodeApplied]=useState(false);
  const[codeError,setCodeError]=useState("");
  const[customerGroup,setCustomerGroup]=useState("last80");
  const[saving,setSaving]=useState(false);
  const[showPayment,setShowPayment]=useState(false);
  const[pendingPromoId,setPendingPromoId]=useState(null);
  const[myPromos,setMyPromos]=useState([]);
  const[loadingPromos,setLoadingPromos]=useState(true);

  const selectedPkg=PACKAGES.find(p=>p.id===pkg);
  const salonCustomers=customers.filter(c=>(c.history||[]).some(h=>String(h.salonId)===String(salon.id)));
  const grpMax=CUSTOMER_GROUPS.find(g=>g.key===customerGroup)?.max||80;
  const customerCount=Math.min(salonCustomers.length,grpMax);
  const promoText=useTemplate?selectedTemplate:customText;
  const basePrice=!selectedPkg?0:pkg==="gold"
    ? parseFloat((customerCount*WHATSAPP_RATE).toFixed(2))
    : (selectedPkg.prices[durationDays]||0);
  const totalPrice=codeApplied?0:basePrice;

  useEffect(()=>{
    if(!salon?.id)return;
    sb("promotions","GET",null,`?salon_id=eq.${salon.id}&select=id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&order=created_at.desc&limit=10`)
      .then(rows=>setMyPromos(rows||[])).catch(()=>{}).finally(()=>setLoadingPromos(false));
  },[salon?.id]);

  const[checkingCode,setCheckingCode]=useState(false);
  const applyCode=async()=>{
    const c=codeInput.trim().toUpperCase();
    if(!c){setCodeError("أدخل الكود أولاً");return;}
    setCheckingCode(true);
    try{
      const rows=await sb("promo_codes","GET",null,`?code=eq.${c}&active=eq.true&select=id,code,active`);
      if(rows&&rows.length>0){setCodeApplied(true);setDiscountCode(c);setCodeError("");}
      else{setCodeError("الكود غير صحيح أو منتهي");setCodeApplied(false);}
    }catch{setCodeError("تعذر التحقق من الكود، حاول مرة أخرى");}
    finally{setCheckingCode(false);}
  };

  const submitPromo=async()=>{
    if(!pkg){toast$("❌ اختر الباقة","err");return;}
    if(!promoText.trim()){toast$("❌ اختر نص العرض أو اكتبه","err");return;}
    setSaving(true);
    try{
      const now=new Date();
      const ends=new Date(now);ends.setDate(ends.getDate()+(pkg==="gold"?7:durationDays));
      const inserted=await sb("promotions","POST",{
        salon_id:salon.id,package:pkg,promo_text:promoText.trim(),
        customer_count:pkg==="gold"?customerCount:null,
        duration_days:pkg==="gold"?7:durationDays,
        price:totalPrice,
        status:totalPrice===0?"active":"pending",
        discount_code:discountCode||null,
        ends_at:ends.toISOString(),
      },"");
      if(totalPrice===0){
        toast$("✅ تم إرسال العرض وتفعيله مجاناً!");
        const rows=await sb("promotions","GET",null,`?salon_id=eq.${salon.id}&select=id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&order=created_at.desc&limit=10`).catch(()=>[]);
        setMyPromos(rows||[]);
        setPkg(null);setSelectedTemplate("");setCustomText("");setCodeInput("");setCodeApplied(false);
      }else{
        setPendingPromoId(inserted[0]?.id||null);
        setShowPayment(true);
      }
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
    finally{setSaving(false);}
  };

  const cancelPromo=async(promoId)=>{
    try{
      await sb("promotions","PATCH",{status:"cancelled"},`?id=eq.${promoId}`);
      setMyPromos(p=>p.map(x=>x.id===promoId?{...x,status:"cancelled"}:x));
      toast$("تم إلغاء العرض");
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };

  const pkgColor=(p)=>PACKAGES.find(x=>x.id===p)?.color||"var(--text-muted)";
  const statusLabel=(s)=>s==="active"?"✅ نشط":s==="pending"?"⏳ قيد المراجعة":s==="expired"?"⌛ منتهي":"❌ ملغي";
  const statusColor=(s)=>s==="active"?"#27ae60":s==="pending"?"#f39c12":s==="expired"?"#666":"#e74c3c";
  const PAYMENT_LINK="https://payment.dork-app.com/checkout";

  const[wizStep,setWizStep]=useState(1);
  const TOTAL_STEPS=4;
  const stepLabels=["الباقة",pkg==="gold"?"العملاء":"المدة","النص","التأكيد"];

  const canNext=wizStep===1?!!pkg:wizStep===2?true:wizStep===3?!!promoText.trim():false;

  const goNext=()=>{if(canNext&&wizStep<TOTAL_STEPS)setWizStep(s=>s+1);};
  const goBack=()=>{if(wizStep>1)setWizStep(s=>s-1);};
  const reset=()=>{setPkg(null);setSelectedTemplate("");setCustomText("");setCodeInput("");setCodeApplied(false);setDiscountCode("");setCodeError("");setWizStep(1);};

  /* مؤشر التقدم */
  const Progress=()=>(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:8}}>
        {Array.from({length:TOTAL_STEPS},(_,i)=>{
          const n=i+1;
          const done=n<wizStep;
          const active=n===wizStep;
          return(
            <React.Fragment key={n}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,transition:"all .3s",
                background:done?"var(--p)":active?"var(--pa15)":"var(--surface-1)",
                border:`2px solid ${done||active?"var(--p)":"var(--border-ui)"}`,
                color:done?"#000":active?"var(--p)":"var(--text-muted)",
                boxShadow:active?"0 0 0 3px rgba(var(--gold-rgb),.15)":"none"}}>
                {done?"✓":n}
              </div>
              {n<TOTAL_STEPS&&<div style={{flex:1,height:2,background:done?"var(--p)":"var(--border-ui)",transition:"all .3s",maxWidth:32}}/>}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"var(--text-muted)",fontWeight:600}}>
        {stepLabels[wizStep-1]}
      </div>
    </div>
  );

  return(
    <div style={{paddingTop:8}}>
      {/* عروضي السابقة */}
      {!loadingPromos&&myPromos.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8}}>عروضي</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {myPromos.map(pr=>(
              <div key={pr.id} style={{background:"var(--surface-1)",border:`1.5px solid ${pkgColor(pr.package)}44`,borderRadius:12,padding:"10px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:pkgColor(pr.package)}}>{PACKAGES.find(p=>p.id===pr.package)?.label||pr.package} {PACKAGES.find(p=>p.id===pr.package)?.medal}</span>
                  <span style={{fontSize:11,fontWeight:700,color:statusColor(pr.status)}}>{statusLabel(pr.status)}</span>
                </div>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4,lineHeight:1.5}}>{pr.promo_text}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#666"}}>
                  <span>{pr.price} ريال</span>
                  {pr.ends_at&&<span>ينتهي: {new Date(pr.ends_at).toLocaleDateString("ar-SA")}</span>}
                </div>
                {(pr.status==="pending"||pr.status==="active")&&(
                  <button onClick={()=>cancelPromo(pr.id)} style={{marginTop:6,background:"transparent",border:"1px solid #e74c3c",color:"#e74c3c",borderRadius:8,padding:"3px 10px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>إلغاء</button>
                )}
              </div>
            ))}
          </div>
          <div style={{height:1,background:"var(--border-ui)",margin:"16px 0"}}/>
        </div>
      )}

      {/* ─── Wizard ─── */}
      <div style={{fontSize:13,fontWeight:800,color:"var(--p)",marginBottom:14,paddingBottom:10,borderBottom:"1px solid var(--border-ui)"}}>إنشاء عرض جديد</div>

      <Progress/>

      {/* ── الخطوة 1: الباقة ── */}
      {wizStep===1&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {PACKAGES.map(p=>{
            const sel=pkg===p.id;
            return(
              <button key={p.id} onClick={()=>{setPkg(p.id);if(p.id!=="gold")setDurationDays(7);}} style={{background:sel?p.bg:"var(--surface-1)",border:`2px solid ${sel?p.color:p.border}`,borderRadius:16,padding:"14px",textAlign:"right",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",boxShadow:sel?`0 4px 16px ${p.color}22`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:p.bg,border:`1.5px solid ${p.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{p.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <span style={{fontSize:15,fontWeight:800,color:sel?p.color:"var(--text-primary)"}}>{p.label}</span>
                      <span>{p.medal}</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5,marginBottom:5}}>{p.service}</div>
                    <div style={{display:"inline-block",background:sel?`${p.color}22`:"rgba(255,255,255,.04)",border:`1px solid ${p.color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,color:p.color}}>
                      {p.prices?`${p.prices[1]}ر — ${p.prices[3]}ر — ${p.prices[7]}ر`:"0.1 ريال / عميل"}
                    </div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:"50%",border:`2.5px solid ${p.color}`,background:sel?p.color:"transparent",flexShrink:0,transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {sel&&<span style={{fontSize:10,color:"#000",fontWeight:900}}>✓</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── الخطوة 2: المدة أو الاستهداف ── */}
      {wizStep===2&&(
        pkg!=="gold"?(
          <div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:12,textAlign:"center"}}>اختر مدة بث العرض</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {DURATIONS.map(d=>{
                const sel=durationDays===d.days;
                const p=selectedPkg;
                return(
                  <button key={d.days} onClick={()=>setDurationDays(d.days)} style={{padding:"16px",borderRadius:14,border:`2px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa12)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:sel?"0 4px 14px rgba(var(--gold-rgb),.12)":"none"}}>
                    <span style={{fontSize:14,fontWeight:700,color:sel?"var(--p)":"var(--text-muted)"}}>{d.label}</span>
                    <span style={{fontSize:16,fontWeight:900,color:sel?"var(--p)":"var(--text-muted)"}}>{p?.prices[d.days]} ر</span>
                  </button>
                );
              })}
            </div>
          </div>
        ):(
          <div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:12,textAlign:"center"}}>من تريد استهدافه؟</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {CUSTOMER_GROUPS.map(g=>{
                const sel=customerGroup===g.key;
                const cnt=sel?customerCount:Math.min(salonCustomers.length,g.max);
                return(
                  <button key={g.key} onClick={()=>setCustomerGroup(g.key)} style={{padding:"16px",borderRadius:14,border:`2px solid ${sel?"#d4a017":"var(--border-ui)"}`,background:sel?"rgba(212,160,23,.1)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:sel?"0 4px 14px rgba(212,160,23,.12)":"none"}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:700,color:sel?"#d4a017":"var(--text-primary)",marginBottom:3}}>{g.label}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>التكلفة: <span style={{color:sel?"#d4a017":"var(--text-muted)",fontWeight:700}}>{parseFloat((cnt*WHATSAPP_RATE).toFixed(2))} ريال</span></div>
                    </div>
                    <div style={{background:sel?"rgba(212,160,23,.15)":"rgba(255,255,255,.04)",border:`1px solid ${sel?"#d4a017":"var(--border-ui)"}`,borderRadius:20,padding:"4px 12px",fontSize:13,fontWeight:800,color:sel?"#d4a017":"var(--text-muted)"}}>{cnt} عميل</div>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ── الخطوة 3: نص العرض ── */}
      {wizStep===3&&(
        <div>
          <div style={{display:"flex",gap:6,marginBottom:12,background:"var(--surface-1)",borderRadius:10,padding:4,border:"1px solid var(--border-ui)"}}>
            <button onClick={()=>setUseTemplate(true)} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:useTemplate?"var(--pa15)":"transparent",color:useTemplate?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>بطاقة جاهزة</button>
            <button onClick={()=>setUseTemplate(false)} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:!useTemplate?"var(--pa15)":"transparent",color:!useTemplate?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>اكتب بنفسك</button>
          </div>
          {useTemplate?(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {TEMPLATES.map(tmpl=>{
                const sel=selectedTemplate===tmpl;
                return(
                  <button key={tmpl} onClick={()=>setSelectedTemplate(tmpl)} style={{padding:"13px 14px",borderRadius:12,border:`2px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa08)":"var(--surface-1)",color:sel?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"inherit",textAlign:"right",lineHeight:1.7,WebkitAppearance:"none",appearance:"none",transition:"all .15s",boxShadow:sel?"0 4px 14px rgba(var(--gold-rgb),.1)":"none"}}>
                    {tmpl}
                  </button>
                );
              })}
            </div>
          ):(
            <>
              <textarea value={customText} onChange={e=>setCustomText(e.target.value)} placeholder="اكتب نص عرضك هنا..." maxLength={200} rows={4} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",direction:"rtl",boxSizing:"border-box"}}/>
              <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4,textAlign:"left"}}>{customText.length}/200</div>
            </>
          )}
        </div>
      )}

      {/* ── الخطوة 4: التأكيد ── */}
      {wizStep===4&&selectedPkg&&(
        <div>
          {/* ملخص */}
          <div style={{background:"linear-gradient(135deg,rgba(var(--gold-rgb),.1),rgba(var(--gold-rgb),.04))",border:"1.5px solid rgba(var(--gold-rgb),.3)",borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:"var(--p)",marginBottom:12}}>ملخص الطلب</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"var(--text-muted)"}}>الباقة</span>
                <span style={{fontSize:13,fontWeight:800,color:selectedPkg.color}}>{selectedPkg.label} {selectedPkg.medal}</span>
              </div>
              {pkg==="gold"?(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>الحساب</span>
                  <span style={{fontSize:12,fontWeight:700}}>{customerCount} عميل × {WHATSAPP_RATE} ر = <span style={{color:"var(--gold)"}}>{basePrice} ر</span></span>
                </div>
              ):(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>المدة</span>
                  <span style={{fontSize:12,fontWeight:700}}>{DURATIONS.find(d=>d.days===durationDays)?.label}</span>
                </div>
              )}
              <div style={{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)"}}>
                <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>نص العرض</div>
                <div style={{fontSize:12,color:"var(--text-primary)",lineHeight:1.6}}>{promoText}</div>
              </div>
              {codeApplied&&(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#27ae60"}}>كود ({discountCode})</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#27ae60"}}>- {basePrice} ريال</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,borderTop:"1px solid rgba(var(--gold-rgb),.2)",marginTop:12}}>
              <span style={{fontSize:14,fontWeight:700}}>الإجمالي</span>
              <span style={{fontSize:26,fontWeight:900,color:totalPrice===0?"#27ae60":"var(--gold)"}}>{totalPrice} <span style={{fontSize:13}}>ريال</span></span>
            </div>
          </div>

          {/* كود الخصم */}
          <div style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>🎟 كود الخصم <span style={{opacity:.6}}>(اختياري — يجعل العرض مجانياً)</span></div>
            <div style={{display:"flex",gap:8}}>
              <input value={codeInput} onChange={e=>{setCodeInput(e.target.value.toUpperCase());setCodeApplied(false);setCodeError("");}} placeholder="أدخل الكود" maxLength={20} disabled={codeApplied} style={{flex:1,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${codeApplied?"#27ae60":codeError?"#e74c3c":"var(--border-ui)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"ltr",textAlign:"center",boxSizing:"border-box",letterSpacing:2}}/>
              <button onClick={codeApplied?()=>{setCodeApplied(false);setCodeInput("");setDiscountCode("");setCodeError("");}:applyCode} disabled={checkingCode} style={{padding:"10px 16px",borderRadius:9,border:"none",background:codeApplied?"rgba(39,174,96,.15)":"var(--pa15)",color:codeApplied?"#27ae60":"var(--p)",cursor:checkingCode?"not-allowed":"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,flexShrink:0,WebkitAppearance:"none",appearance:"none"}}>
                {checkingCode?"...":codeApplied?"✅ مفعّل":"تطبيق"}
              </button>
            </div>
            {codeError&&<div style={{fontSize:11,color:"#e74c3c",marginTop:4}}>{codeError}</div>}
            {codeApplied&&<div style={{fontSize:11,color:"#27ae60",marginTop:4}}>✅ العرض مجاني!</div>}
          </div>

          {/* زر الإرسال */}
          <button onClick={submitPromo} disabled={saving} style={{width:"100%",background:saving?"var(--border-ui)":"linear-gradient(135deg,#c0392b,#e74c3c)",color:saving?"#555":"#fff",border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:8,transition:"all .2s"}}>
            {saving?"⏳ جاري الإرسال...":totalPrice===0?"🔥 إرسال العرض مجاناً":"🔥 إرسال العرض"}
          </button>
          {totalPrice>0&&<div style={{fontSize:10,color:"var(--text-muted)",textAlign:"center",marginBottom:4}}>سيظهر رابط الدفع بعد الإرسال</div>}
        </div>
      )}

      {/* ─── أزرار التنقل ─── */}
      <div style={{display:"flex",gap:10,marginTop:20}}>
        {wizStep>1?(
          <button onClick={goBack} style={{flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>
            → رجوع
          </button>
        ):(
          <button onClick={reset} style={{flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>
            مسح
          </button>
        )}
        {wizStep<TOTAL_STEPS&&(
          <button onClick={goNext} disabled={!canNext} style={{flex:2,padding:"13px 0",borderRadius:12,border:"none",background:canNext?"var(--pa15)":"var(--surface-1)",color:canNext?"var(--p)":"var(--text-muted)",cursor:canNext?"pointer":"not-allowed",fontSize:13,fontWeight:800,fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s"}}>
            التالي ←
          </button>
        )}
      </div>

      {/* ─── نافذة الدفع ─── */}
      {showPayment&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:2000,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowPayment(false)}>
          <div style={{width:"100%",maxWidth:480,margin:"0 auto",background:"var(--surface-1)",borderRadius:"20px 20px 0 0",padding:"28px 20px 40px",border:"1.5px solid rgba(var(--gold-rgb),.3)",borderBottom:"none",direction:"rtl"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>💳</div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",marginBottom:6}}>أكمل الدفع لتفعيل العرض</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>الإجمالي: <strong style={{color:"var(--gold)"}}>{basePrice} ريال</strong></div>
            </div>
            <button onClick={()=>{window.open(PAYMENT_LINK,"_blank");}} style={{width:"100%",background:"var(--grad)",color:"#000",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:10}}>الدفع الآن 💳</button>
            <div style={{fontSize:10,color:"var(--text-muted)",textAlign:"center",marginBottom:14}}>بعد الدفع ستُفعَّل العرض خلال دقائق</div>
            <button onClick={()=>setShowPayment(false)} style={{width:"100%",background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",borderRadius:12,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>لاحقاً</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================
//  MESSAGES PANEL - رسائل بين الإدارة والصالون
// ==============================================
function MessagesPanel({salon,toast$}){
  const{t}=useTranslation();
  const KEY=`dork_msgs_${salon.id}`;
  const[msgs,setMsgs]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}});
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const bottomRef=useRef(null);

  // تحميل الرسائل من Supabase
  const loadMsgs=useCallback(async()=>{
    try{
      const data=await sb("messages","GET",null,`?select=id,salon_id,from_admin,text,created_at&salon_id=eq.${salon.id}&order=created_at.asc&limit=50`);
      if(Array.isArray(data)&&data.length>0){
        const converted=data.map(m=>({id:m.id,from:m.from_admin?"admin":"owner",text:m.text,time:new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})}));
        setMsgs(converted);
        try{localStorage.setItem(KEY,JSON.stringify(converted));}catch{}
      }
    }catch{
      // الرجوع للرسائل المحلية إذا فشل Supabase
    }
  },[salon.id,KEY]);

  useEffect(()=>{loadMsgs();},[loadMsgs]);

  // Realtime subscription للرسائل الجديدة
  useEffect(()=>{
    const channel=supabase.channel(`msgs-${salon.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`salon_id=eq.${salon.id}`},()=>{loadMsgs();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadMsgs]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async()=>{
    if(!txt.trim()||sending)return;
    setSending(true);
    const msgText=txt.trim();
    setTxt("");
    try{
      await sb("messages","POST",{salon_id:salon.id,from_admin:false,text:msgText});
      await loadMsgs();
    }catch{
      // fallback localStorage
      const m={id:Date.now(),from:"owner",text:msgText,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})};
      const newMsgs=[...msgs,m];
      setMsgs(newMsgs);
      try{localStorage.setItem(KEY,JSON.stringify(newMsgs));}catch{}
    }
    setSending(false);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:400}}>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {msgs.length===0&&<div style={G.empty}>{t("messages.empty")}</div>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:m.from==="owner"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:m.from==="owner"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.from==="owner"?"var(--pa25)":"#1a1a2e",border:`1px solid ${m.from==="owner"?"var(--pa4)":"var(--border-ui)"}`}}>
              <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>{m.from==="owner"?t("messages.from_you"):t("messages.from_admin")}</div>
              <div style={{fontSize:13,color:"#fff"}}>{m.text}</div>
              <div style={{fontSize:9,color:"var(--text-muted)",marginTop:3,textAlign:m.from==="owner"?"left":"right"}}>{m.time}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input style={{flex:1,padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
          placeholder={t("messages.placeholder")} value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={{...G.sub,width:"auto",padding:"0 16px",marginTop:0,opacity:sending?.5:1}} onClick={send} disabled={sending}>{sending?t("messages.sending"):t("messages.send")}</button>
      </div>
    </div>
  );
}

// ==============================================

function OwnerSettings({salon,setSalons,toast$,socialLinks,setSocialLinks,onlySec,setView,setShowSalonDrawer}){
  const{t}=useTranslation();
  const[saving,setSaving]=useState(false);
  const[sec,setSec]=useState(onlySec||"info");
  const SEC_TITLES={info:t("owner_settings.tab_info"),hours:t("owner_settings.tab_hours"),services:t("owner_settings.tab_services"),barbers:t("owner_settings.tab_barbers"),tone:t("owner_settings.tab_tone"),social:t("owner_settings.tab_social"),pin:t("owner_settings.tab_pin")};
  const[draftSocial,setDraftSocial]=useState({...DEFAULT_SOCIAL_LINKS,...(socialLinks||{})});
  const[socialSaved,setSocialSaved]=useState(false);
  const saveSocial=()=>{setSocialLinks&&setSocialLinks(draftSocial);setSocialSaved(true);setTimeout(()=>setSocialSaved(false),2500);};
  const[f,setF]=useState({
    name:salon.name||"",
    phone:salon.phone||"",
    address:salon.address||"",
    locationUrl:salon.locationUrl||"",
    shiftEnabled:salon.shiftEnabled||false,
    shift1Start:salon.shift1Start||"08:00",
    shift1End:salon.shift1End||"13:00",
    shift2Start:salon.shift2Start||"16:00",
    shift2End:salon.shift2End||"23:00",
    workStart:salon.workStart||"09:00",
    workEnd:salon.workEnd||"22:00",
    services:[...(salon.services||[])],
    prices:{...(salon.prices||{})},
    barbers:JSON.parse(JSON.stringify(salon.barbers||[])),
    tone:salon.tone||"bell",
  });
  const[newSvc,setNewSvc]=useState("");
  const[newBarber,setNewBarber]=useState("");
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));

  const save=async()=>{
    setSaving(true);
    try{
      const patch={
        name:f.name,phone:f.phone,address:f.address,location_url:f.locationUrl,
        shift_enabled:f.shiftEnabled,
        shift1_start:f.shift1Start,shift1_end:f.shift1End,
        shift2_start:f.shift2Start,shift2_end:f.shift2End,
        work_start:f.workStart,work_end:f.workEnd,
        services:f.services,prices:f.prices,
        barbers:f.barbers,tone:f.tone,
      };
      await sb("salons","PATCH",patch,`?id=eq.${salon.id}`);
      setSalons(p=>p.map(s=>s.id===salon.id?{...s,name:f.name,phone:f.phone,address:f.address,locationUrl:f.locationUrl,shiftEnabled:f.shiftEnabled,shift1Start:f.shift1Start,shift1End:f.shift1End,shift2Start:f.shift2Start,shift2End:f.shift2End,workStart:f.workStart,workEnd:f.workEnd,services:f.services,prices:f.prices,barbers:f.barbers,tone:f.tone}:s));
      toast$&&toast$(t("owner_settings.success"));
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
    setSaving(false);
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4,fontWeight:600};
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};

  return(
    <div style={onlySec?G.page:undefined}><div style={onlySec?G.fp:undefined}>
      {onlySec&&<div style={G.fh}><button style={G.bb} onClick={()=>{setView&&setView("ownerDash");setShowSalonDrawer&&setShowSalonDrawer(true);}}>{t("owner_settings.back")}</button><h2 style={G.ft}>{SEC_TITLES[onlySec]||t("owner_settings.settings_title")}</h2></div>}
      {!onlySec&&<div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        {[{id:"info",icon:"📋",label:t("owner_settings.tab_info")},{id:"hours",icon:"🕐",label:t("owner_settings.tab_hours")},{id:"services",icon:"✂",label:t("owner_settings.tab_services")},{id:"barbers",icon:"💈",label:t("owner_settings.tab_barbers")},{id:"tone",icon:"🔔",label:t("owner_settings.tab_tone")},{id:"social",icon:"📱",label:t("owner_settings.tab_social")},{id:"pin",icon:"🔐",label:t("owner_settings.tab_pin")}].map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"var(--border-ui)"}`,background:sec===s.id?"var(--pa12)":"#1a1a2e",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>}

      {sec==="info"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.info_title")}</div>
        {[{l:t("owner_settings.salon_name"),k:"name"},{l:t("owner_settings.phone"),k:"phone"},{l:t("owner_settings.address"),k:"address"},{l:t("owner_settings.map_url"),k:"locationUrl"}].map(({l,k})=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={lbl}>{l}</label>
            <input style={inp} value={f[k]} onChange={e=>upd(k,e.target.value)}/>
          </div>
        ))}
      </div>}

      {sec==="hours"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.hours_title")}</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${!f.shiftEnabled?"var(--p)":"var(--border-ui)"}`,background:!f.shiftEnabled?"var(--pa12)":"#1a1a2e",color:!f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",false)}>{t("owner_settings.single_shift")}</button>
          <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${f.shiftEnabled?"var(--p)":"var(--border-ui)"}`,background:f.shiftEnabled?"var(--pa12)":"#1a1a2e",color:f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",true)}>{t("owner_settings.double_shift")}</button>
        </div>
        {!f.shiftEnabled
          ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={lbl}>{t("owner_settings.from")}</label><input type="time" style={inp} value={f.workStart} onChange={e=>upd("workStart",e.target.value)}/></div>
            <div><label style={lbl}>{t("owner_settings.to")}</label><input type="time" style={inp} value={f.workEnd} onChange={e=>upd("workEnd",e.target.value)}/></div>
          </div>
          :<>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.morning")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={lbl}>{t("owner_settings.from")}</label><input type="time" style={inp} value={f.shift1Start} onChange={e=>upd("shift1Start",e.target.value)}/></div>
              <div><label style={lbl}>{t("owner_settings.to")}</label><input type="time" style={inp} value={f.shift1End} onChange={e=>upd("shift1End",e.target.value)}/></div>
            </div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.evening")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>{t("owner_settings.from")}</label><input type="time" style={inp} value={f.shift2Start} onChange={e=>upd("shift2Start",e.target.value)}/></div>
              <div><label style={lbl}>{t("owner_settings.to")}</label><input type="time" style={inp} value={f.shift2End} onChange={e=>upd("shift2End",e.target.value)}/></div>
            </div>
          </>
        }
      </div>}

      {sec==="services"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.services_title")}</div>
        {f.services.map(svc=>(
          <div key={svc} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:"var(--bg-input)",borderRadius:9,padding:"8px 10px",border:"1px solid var(--border-ui)"}}>
            <span style={{flex:1,fontSize:13,color:"var(--text-primary)"}}>{svc}</span>
            <input type="number" min="0" style={{width:75,padding:"6px 8px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--p)",fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
              value={f.prices[svc]||0} onChange={e=>setF(p=>({...p,prices:{...p.prices,[svc]:+e.target.value}}))}/>
            <span style={{fontSize:11,color:"var(--text-muted)",flexShrink:0}}>{t("owner_settings.sar")}</span>
            <button style={G.xBtn} onClick={()=>setF(p=>{const sv=p.services.filter(s=>s!==svc);const pr={...p.prices};delete pr[svc];return{...p,services:sv,prices:pr};})}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:10}}>
          <input style={{...inp,flex:1}} placeholder={t("owner_settings.new_service_ph")} value={newSvc} onChange={e=>setNewSvc(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}>{t("owner_settings.add_btn")}</button>
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,color:"#666",marginBottom:6}}>{t("owner_settings.preset_label")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {DEFAULT_SERVICES.filter(d=>!f.services.includes(d)).map(d=>(
              <button key={d} style={{...G.chip,fontSize:11}} onClick={()=>setF(p=>({...p,services:[...p.services,d],prices:{...p.prices,[d]:0}}))}>+ {d}</button>
            ))}
          </div>
        </div>
      </div>}

      {sec==="barbers"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.barbers_title")}</div>
        {f.barbers.length===0&&<div style={G.empty}>{t("owner_settings.barbers_empty")}</div>}
        {f.barbers.map((b,i)=>(
          <div key={b.id} style={{marginBottom:10,background:"var(--bg-input)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              {/* صورة الحلاق */}
              <div style={{position:"relative",flexShrink:0}}>
                {b.photo
                  ?<img src={optimizeImageUrl(b.photo,44,44)} alt={b.name} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--p)"}}/>
                  :<div style={{width:44,height:44,borderRadius:"50%",background:"var(--surface-2)",border:"2px dashed #2a2a3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💈</div>
                }
                <label style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--p)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10}}>
                  📷
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    const reader=new FileReader();
                    reader.onload=ev=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,photo:ev.target.result}:x)}));
                    reader.readAsDataURL(file);
                  }}/>
                </label>
              </div>
              <input style={{...inp,flex:1,padding:"6px 10px"}} placeholder={t("owner_settings.barber_name_ph")} value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
              <button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}>✕</button>
            </div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.barber_shift")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
              <div>
                <label style={{display:"block",fontSize:10,color:"#666",marginBottom:3}}>{t("owner_settings.from")}</label>
                <input type="time" style={{...inp,fontSize:12}} value={b.shiftStart||"09:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftStart:e.target.value}:x)}))}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:10,color:"#666",marginBottom:3}}>{t("owner_settings.to")}</label>
                <input type="time" style={{...inp,fontSize:12}} value={b.shiftEnd||"22:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftEnd:e.target.value}:x)}))}/>
              </div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder={t("owner_settings.new_barber_ph")} value={newBarber} onChange={e=>setNewBarber(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00"}]}));setNewBarber("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00"}]}));setNewBarber("");}}}>{t("owner_settings.add_btn")}</button>
        </div>
      </div>}

      {sec==="tone"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.tone_title")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(tn=>{
            const active=f.tone===tn.id;
            return(
              <button key={tn.id} onClick={()=>{upd("tone",tn.id);playTone(tn.id,0.8);}}
                style={{padding:"11px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center"}}>
                {t("settings.tones."+tn.id)} {active&&"✓"}
              </button>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>{t("owner_settings.tone_hint")}</div>
      </div>}

      {sec==="social"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.social_title")}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,padding:"10px 14px",borderRadius:10,background:"var(--surface-2)",border:"1px solid var(--border-ui)"}}>
          <span style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{t("owner_settings.show_customers")}</span>
          <button onClick={()=>setDraftSocial(d=>({...d,enabled:!d.enabled}))}
            style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",position:"relative",
              background:draftSocial.enabled?"var(--p)":"var(--border-ui)",transition:"background .2s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,width:20,height:20,borderRadius:"50%",background:"#fff",
              transition:"left .2s",left:draftSocial.enabled?23:3}}/>
          </button>
        </div>
        {[
          {key:"email",      label:"📧 البريد الإلكتروني", placeholder:"info@example.com", type:"email"},
          {key:"whatsapp",   label:"💬 واتساب",             placeholder:"05XXXXXXXX",       type:"tel"},
          {key:"twitter",    label:"🐦 تويتر / X",          placeholder:"@username"},
          {key:"telegramUser",label:"✈ تيليغرام",           placeholder:"@username"},
        ].map(({key,label,placeholder,type})=>(
          <div key={key} style={{marginBottom:12}}>
            <label style={lbl}>{label}</label>
            <input style={inp} value={draftSocial[key]||""} dir="ltr"
              onChange={e=>setDraftSocial(d=>({...d,[key]:e.target.value}))}
              placeholder={placeholder} type={type||"text"}
              inputMode={type==="tel"?"numeric":undefined}/>
          </div>
        ))}
        <button onClick={saveSocial}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",
            background:socialSaved?"#27ae60":"var(--p)",color:"#000",
            fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"background .3s"}}>
          {socialSaved?t("owner_settings.saved_social"):t("owner_settings.save_social")}
        </button>
      </div>}

      {sec==="pin"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.pin_title")}</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14,lineHeight:1.6}}>{t("owner_settings.pin_hint")}</div>
        <button onClick={()=>setF(p=>({...p,_editPinStep:"select",_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--p)",background:"rgba(var(--pr),.1)",color:"var(--p)",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
          {t("owner_settings.change_pin")}
        </button>
        {f._editPinStep&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
              {f._editPinStep==="select"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_select_title")}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_select_hint")}</div>
                <div style={{display:"flex",gap:12,marginBottom:16}}>
                  <button onClick={()=>setF(p=>({...p,_editPinLength:4,_editPinStep:"enter"}))} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:f._editPinLength===4?"rgba(var(--pr),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    {t("owner_settings.pin_4")}
                  </button>
                  <button onClick={()=>setF(p=>({...p,_editPinLength:6,_editPinStep:"enter"}))} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:f._editPinLength===6?"rgba(var(--pr),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    {t("owner_settings.pin_6")}
                  </button>
                </div>
              </>:f._editPinStep==="enter"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_enter")} ({f._editPinLength})</div>
                <input type="password" maxLength={f._editPinLength} value={f._editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,f._editPinLength);setF(p=>({...p,_editTempPin:val}));if(val.length===f._editPinLength)setTimeout(()=>setF(p=>({...p,_editPinStep:"confirm"})),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editTempPin.length===f._editPinLength)setF(p=>({...p,_editPinStep:"confirm"}));}} />
              </>:f._editPinStep==="confirm"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_confirm_title")}</div>
                <input type="password" maxLength={f._editPinLength} value={f._editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,f._editPinLength);setF(p=>({...p,_editPinConfirm:val}));if(val.length===f._editPinLength&&f._editTempPin!==val){setF(p=>({...p,_editPinErr:t("owner_settings.pin_mismatch")}));}else{setF(p=>({...p,_editPinErr:""}));}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${f._editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm){const salonIdStr=String(salon.id);localStorage.setItem(`dork_owner_pin_${salonIdStr}`,f._editTempPin);localStorage.setItem(`dork_owner_pin_length_${salonIdStr}`,String(f._editPinLength));toast$&&toast$(t("owner_settings.success_pin"));setF(p=>({...p,_editPinStep:null,_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}));}}} />
                {f._editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{f._editPinErr}</div>}
                <div style={{display:"flex",gap:8,marginTop:16}}>
                  <button onClick={()=>{if(f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm){const salonIdStr=String(salon.id);localStorage.setItem(`dork_owner_pin_${salonIdStr}`,f._editTempPin);localStorage.setItem(`dork_owner_pin_length_${salonIdStr}`,String(f._editPinLength));toast$&&toast$(t("owner_settings.success_pin"));setF(p=>({...p,_editPinStep:null,_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}));}}} disabled={f._editPinConfirm.length!==f._editPinLength||f._editTempPin!==f._editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm?"var(--p)":"var(--border-ui)",color:f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm?"#000":"#555",cursor:f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    {t("owner_settings.save")}
                  </button>
                  <button onClick={()=>setF(p=>({...p,_editPinStep:null,_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    {t("owner_settings.cancel")}
                  </button>
                </div>
              </>:null}
            </div>
          </div>
        )}
      </div>}

      {sec!=="social"&&sec!=="pin"&&<button style={{...G.sub,marginTop:4,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
        {saving?`⏳ ${t("owner_settings.saving")}...`:t("owner_settings.save_btn")}
      </button>}
    </div>
    </div>
  );
}

// ==============================================
//  OWNER FAQ VIEW — أسئلة شائعة لصاحب الصالون
// ==============================================
// ==============================================
//  OWNER LANG VIEW - صفحة اختيار اللغة للمالك
// ==============================================
// ==============================================
//  CUST EDIT DATA VIEW - صفحة تعديل بيانات العميل
// ==============================================
function CustEditDataView({customer,setCustomers,setCustomerSession,setView,setShowDrawer,toast$}){
  const{t}=useTranslation();
  const[name,setName]=useState(customer?.name||"");
  const[phone,setPhone]=useState(customer?.phone||"");
  const[email,setEmail]=useState(customer?.email||"");
  const[pinStep,setPinStep]=useState(null);
  const[pinLen,setPinLen]=useState(4);
  const[tempPin,setTempPin]=useState("");
  const[pinConfirm,setPinConfirm]=useState("");
  const[pinErr,setPinErr]=useState("");
  const inp={width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const save=async()=>{
    if(!name.trim())return;
    try{
      await sb("customers","PATCH",{name:name.trim(),phone:phone.trim(),email:email.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:name.trim(),phone:phone.trim(),email:email.trim()}:c));
      setCustomerSession(s=>({...s,name:name.trim(),phone:phone.trim(),email:email.trim()}));
      toast$("✅ "+t("cust_drawer.save"));
      setView("home");setShowDrawer&&setShowDrawer(true);
    }catch(e){toast$("❌ "+e.message,"err");}
  };
  const savePin=async()=>{
    if(tempPin!==pinConfirm){setPinErr(t("cust_drawer.pin_mismatch"));return;}
    localStorage.setItem(`dork_customer_pin_${customer.id}`,tempPin);
    try{await sb("customers","PATCH",{pin:tempPin,pin_length:pinLen},`?id=eq.${customer.id}`);}catch{}
    toast$("✅ "+t("cust_drawer.pin_success"));setPinStep(null);setTempPin("");setPinConfirm("");setPinErr("");
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}>
        <button style={G.bb} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}>← {t("owner_dash.back")}</button>
        <h2 style={G.ft}>✏️ {t("cust_drawer.edit_data")}</h2>
      </div>
      {!pinStep&&(<>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.name_label")}</label>
          <input style={inp} value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.phone_label")}</label>
          <input style={inp} inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value)}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.email_label")}</label>
          <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <button style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",marginBottom:10}} onClick={()=>setPinStep("select")}>{t("cust_drawer.change_pin")}</button>
        <div style={{display:"flex",gap:10}}>
          <button style={{flex:1,padding:"13px",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}>{t("cust_drawer.cancel")}</button>
          <button style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:"var(--p)",color:"#000",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}} onClick={save}>{t("cust_drawer.save")}</button>
        </div>
      </>)}
      {pinStep==="select"&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:30,marginBottom:10}}>🔐</div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_select_title")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>{t("cust_drawer.pin_select_hint")}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${pinLen===4?"var(--p)":"var(--border-ui)"}`,background:pinLen===4?"var(--pa15)":"transparent",color:pinLen===4?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setPinLen(4)}>{t("cust_drawer.pin_4")}</button>
            <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${pinLen===6?"var(--p)":"var(--border-ui)"}`,background:pinLen===6?"var(--pa15)":"transparent",color:pinLen===6?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setPinLen(6)}>{t("cust_drawer.pin_6")}</button>
          </div>
          <div style={{marginTop:16,display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep(null)}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"#000",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>{setPinStep("enter");setTempPin("");}}>{t("cust_drawer.pin_enter")}</button>
          </div>
        </div>
      )}
      {pinStep==="enter"&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_enter")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>{pinLen} {t("cust_drawer.pin_digits_hint")}</div>
          <input type="password" inputMode="numeric" maxLength={pinLen} value={tempPin} onChange={e=>setTempPin(e.target.value.replace(/\D/g,"").slice(0,pinLen))} style={{...inp,textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:16}}/>
          <div style={{display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep("select")}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"#000",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>{if(tempPin.length===pinLen)setPinStep("confirm");}}>{t("cust_drawer.pin_enter")}</button>
          </div>
        </div>
      )}
      {pinStep==="confirm"&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_confirm_title")}</div>
          <input type="password" inputMode="numeric" maxLength={pinLen} value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,pinLen))} style={{...inp,textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:10}}/>
          {pinErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10}}>{pinErr}</div>}
          <div style={{display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep("enter")}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"#000",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={savePin}>{t("cust_drawer.pin_save")}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}
// ==============================================
//  OWNER LANG VIEW - صفحة اختيار اللغة للمالك
// ==============================================
const ALL_LANG_INFO=[
  {code:'ar',flag:'🇸🇦',label:'العربية',sub:'Arabic'},
  {code:'en',flag:'🇬🇧',label:'English',sub:'الإنجليزية'},
  {code:'ur',flag:'🇵🇰',label:'اردو',sub:'Urdu'},
  {code:'tr',flag:'🇹🇷',label:'Türkçe',sub:'التركية'},
];
function OwnerLangView({setView,setShowSalonDrawer}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const LANGS=ALL_LANG_INFO.filter(l=>SALON_LANGS.includes(l.code));
  return(
    <div style={{...G.page,direction:dir}}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>{setView("ownerDash");setShowSalonDrawer&&setShowSalonDrawer(true);}}>{t("owner_dash.back")}</button>
          <h2 style={G.ft}>🌐 {t("salon_drawer.language")}</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:8}}>
          {LANGS.map(l=>{
            const active=i18n.language===l.code;
            return(
              <button key={l.code} onClick={()=>i18n.changeLanguage(l.code)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:14,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa15)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s"}}>
                <span style={{fontSize:28,flexShrink:0}}>{l.flag}</span>
                <div style={{flex:1,textAlign:dir==="rtl"?"right":"left"}}>
                  <div style={{fontSize:16,fontWeight:700,color:active?"var(--p)":"var(--text-primary)"}}>{l.label}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{l.sub}</div>
                </div>
                {active&&<div style={{width:10,height:10,borderRadius:"50%",background:"var(--p)",flexShrink:0}}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ==============================================
//  CUST LANG VIEW - صفحة اختيار اللغة للعميل
// ==============================================
function CustLangView({setView,setShowDrawer}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const LANGS=ALL_LANG_INFO.filter(l=>CLIENT_LANGS.includes(l.code));
  return(
    <div style={{...G.page,direction:dir}}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}>{t("owner_dash.back")}</button>
          <h2 style={G.ft}>🌐 {t("cust_drawer.language")}</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:8}}>
          {LANGS.map(l=>{
            const active=i18n.language===l.code;
            return(
              <button key={l.code} onClick={()=>i18n.changeLanguage(l.code)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:14,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa15)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s"}}>
                <span style={{fontSize:28,flexShrink:0}}>{l.flag}</span>
                <div style={{flex:1,textAlign:dir==="rtl"?"right":"left"}}>
                  <div style={{fontSize:16,fontWeight:700,color:active?"var(--p)":"var(--text-primary)"}}>{l.label}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{l.sub}</div>
                </div>
                {active&&<div style={{width:10,height:10,borderRadius:"50%",background:"var(--p)",flexShrink:0}}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ==============================================
//  OWNER FAQ VIEW - أسئلة شائعة لصاحب الصالون
// ==============================================
function OwnerFaqView({setView,setShowSalonDrawer}){
  const{t}=useTranslation();
  const[faqQ,setFaqQ]=useState("");
  const ALL=[
    {q:"كيف أقبل أو أرفض الحجوزات؟",a:"من لوحة التحكم، اضغط على أي بطاقة حجوزات (انتظار / مقبول...) لعرض القائمة، ثم اختر قبول أو رفض لكل حجز. يتم إشعار العميل فوراً."},
    {q:"ما معنى الميزان والأرباح؟",a:"كل حجز مكتمل (مقبول) يُحتسب ريالاً واحداً عمولة لدورك. الميزان = إجمالي الحجوزات المكتملة مطروحاً منها ما تم دفعه. تواصل مع الإدارة للتسوية."},
    {q:"لماذا لا يظهر صالوني للعملاء؟",a:"يجب أن تكون حالة الصالون مفعّلة ✅. هذه الحالة تمنحها إدارة دورك عند مراجعة حسابك. تواصل مع الدعم إذا كان صالونك لا يزال في وضع الانتظار ⏳."},
    {q:"كيف أضيف حلاقاً جديداً؟",a:"من قائمة الدرج (≡) ← الحلاقون ← أدخل اسم الحلاق ثم اضغط + إضافة. يمكنك تحديد وقت دوامه وإضافة صورته."},
    {q:"كيف أغيّر أوقات عمل الصالون؟",a:"من قائمة الدرج (≡) ← أوقات العمل. اختر وردية واحدة أو ورديتين (صباحية + مسائية) وحدد الأوقات ثم احفظ."},
    {q:"هل يمكن إضافة خدمات وتعديل الأسعار؟",a:"نعم. من قائمة الدرج (≡) ← الخدمات والأسعار. يمكنك إضافة خدمة جديدة أو اختيار خدمة جاهزة وتحديد سعرها."},
    {q:"كيف أرد على تقييم عميل؟",a:"من قائمة الدرج (≡) ← التقييمات. اضغط على أي تقييم، اكتب ردّك ثم اضغط حفظ الرد. ردّك سيظهر للعملاء تحت التقييم."},
    {q:"ما الفرق بين الحجوزات اليومية وتقويم الحجوزات؟",a:"لوحة التحكم تعرض ملخص اليوم الحالي فقط (مقبول / انتظار / مرفوض). أما تقويم الحجوزات (🗓 الحجوزات) فيعرض جميع الحجوزات عبر التقويم الشهري."},
    {q:"كيف أغيّر نغمة التنبيه عند وصول حجز جديد؟",a:"من قائمة الدرج (≡) ← النغمات. اختر النغمة التي تريدها (اضغط عليها للمعاينة) ثم احفظ."},
    {q:"كيف أغيّر رمز PIN لحساب الصالون؟",a:"من قائمة الدرج (≡) ← رمز الدخول PIN ← تغيير رمز PIN. اختر 4 أو 6 أرقام وأدخلهم مرتين للتأكيد."},
    {q:"كيف أضيف معلومات التواصل الاجتماعي؟",a:"من قائمة الدرج (≡) ← التواصل الاجتماعي. أدخل حساباتك (واتساب، تويتر، تيليغرام، إيميل) ثم فعّل خيار 'إظهار للعملاء' واحفظ."},
    {q:"كيف أغيّر لون واجهة التطبيق؟",a:"من قائمة الدرج (≡) ← الألوان والثيم. اختر من 8 ألوان متاحة. التغيير يسري على الفور."},
    {q:"ما هو القسم الشرعي الذي يظهر عند أول دخول؟",a:"هو تعهد شرفي بالالتزام بدفع عمولة دورك (1 ريال لكل حجز مكتمل). يظهر مرة واحدة فقط عند أول تسجيل دخول للصالون."},
    {q:"كيف أعدّل معلومات الصالون (الاسم، الجوال، العنوان)؟",a:"من قائمة الدرج (≡) ← معلومات الصالون. عدّل الحقول التي تريد ثم اضغط حفظ التعديلات."},
    {q:"هل يمكنني تتبع إحصائيات الصالون؟",a:"نعم. من قائمة الدرج (≡) ← الإحصائيات. تعرض بيانات تفصيلية للحجوزات والإيرادات والأداء."},
  ];
  const filtered=faqQ.trim()?ALL.filter(f=>(f.q+f.a).includes(faqQ.trim())):ALL;
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setView("ownerDash");setShowSalonDrawer&&setShowSalonDrawer(true);}}>{t("faq.back")}</button><h2 style={G.ft}>{t("faq.title")}</h2></div>
      <div style={box}>
        <div style={hdr}>{t("faq.owner_faq_title")}</div>
        <input value={faqQ} onChange={e=>setFaqQ(e.target.value)} placeholder={t("faq.search_ph")} style={{...inp,marginBottom:12}}/>
        {filtered.length===0?<div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",padding:"16px 0"}}>{t("faq.no_results")}</div>:filtered.map(({q,a},i)=>(<FAQItem key={i} q={q} a={a}/>))}
      </div>
    </div></div>
  );
}

// ==============================================
//  OTP INPUT COMPONENT
// ==============================================
function OtpInput({value,onChange,error,disabled=false,use6Boxes=false}){
  const inputRef=useRef(null);
  const autofillRef=useRef(null);
  const boxRefs=useRef([]);

  // توزيع الكود على الخانات بترتيب صحيح (Index 0..5 LTR)
  const distributeDigits=(rawInput,startIndex=0)=>{
    const digits=String(rawInput||"").replace(/\D/g,"");
    if(!digits){
      const arr=value.split("");
      arr[startIndex]="";
      onChange(arr.join("").substring(0,6));
      return;
    }
    const arr=value.split("");
    const toFill=digits.substring(0,6-startIndex);
    for(let i=0;i<toFill.length;i++){
      arr[startIndex+i]=toFill[i];
    }
    const newValue=arr.slice(0,6).join("").substring(0,6);
    onChange(newValue);
    const nextIndex=Math.min(startIndex+toFill.length,5);
    setTimeout(()=>{
      if(boxRefs.current[nextIndex]){
        boxRefs.current[nextIndex].focus();
        try{boxRefs.current[nextIndex].select();}catch(_){}
      }
    },0);
  };

  const handleChange=(e)=>{
    const val=String(e.target.value||"").replace(/\D/g,"").slice(0,6);
    onChange(val);
  };

  const handleBoxChange=(index,rawInput)=>{
    distributeDigits(rawInput,index);
  };

  const handlePaste=(index,e)=>{
    e.preventDefault();
    const pasted=e.clipboardData?.getData("text")||"";
    distributeDigits(pasted,index);
  };

  const handleBoxKeyDown=(index,e)=>{
    if(e.key==="Backspace"){
      if(!value[index]&&index>0){
        e.preventDefault();
        const arr=value.split("");
        arr[index-1]="";
        onChange(arr.join("").substring(0,6));
        boxRefs.current[index-1]?.focus();
      }
    }else if(e.key==="ArrowLeft"&&index>0){
      e.preventDefault();
      boxRefs.current[index-1]?.focus();
    }else if(e.key==="ArrowRight"&&index<5){
      e.preventDefault();
      boxRefs.current[index+1]?.focus();
    }
  };

  // التعامل مع الـ autofill من iOS
  const handleAutofill=(e)=>{
    const val=String(e.target.value||"").replace(/\D/g,"").slice(0,6);
    if(val.length>0){
      onChange(val);
      setTimeout(()=>{
        if(boxRefs.current[0]){
          boxRefs.current[0].focus();
        }
      },10);
    }
  };

  if(use6Boxes){
    return(
      <div dir="ltr" style={{display:"flex",gap:8,justifyContent:"space-between",direction:"ltr",unicodeBidi:"plaintext"}}>
        {/* حقل مخفي للـ autofill من iOS - iOS يملأ هذا الحقل تلقائياً عند وصول الكود */}
        <input
          ref={autofillRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          name="otp"
          maxLength="6"
          value={value}
          onChange={handleAutofill}
          id="otp-input"
          style={{position: 'absolute', opacity: 0.01, height: "1px", width: "1px", zIndex: -1, pointerEvents: 'none', top: "50%"}}
        />
        {/* الـ 6 صناديق المرئية */}
        {[0,1,2,3,4,5].map(i=>(
          <input
            key={i}
            ref={el=>boxRefs.current[i]=el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={1}
            value={value[i]||""}
            onChange={e=>handleBoxChange(i,e.target.value)}
            onPaste={e=>handlePaste(i,e)}
            onKeyDown={e=>handleBoxKeyDown(i,e)}
            onFocus={e=>{try{e.target.select();}catch(_){}}}
            disabled={disabled}
            dir="ltr"
            style={{
              ...fi(error),
              width:"40px",
              height:"44px",
              padding:"0",
              fontSize:"18px",
              fontWeight:"700",
              direction:"ltr",
              textAlign:"center",
              unicodeBidi:"plaintext"
            }}
          />
        ))}
      </div>
    );
  }

  return(
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      name="otp"
      autoComplete="one-time-code"
      maxLength="6"
      value={value}
      onChange={handleChange}
      placeholder="000000"
      disabled={disabled}
      dir="ltr"
      style={{...fi(error),direction:"ltr",textAlign:"center",letterSpacing:"4px",fontWeight:"700"}}
    />
  );
}

// ==============================================
//  CUSTOMER LOGIN + DASHBOARD
// ==============================================
function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$}){
  const{t}=useTranslation();
  const[tab,setTab]=useState("login");
  const[loginMethod,setLoginMethod]=useState("phone");
  const[phone,setPhone]=useState(""); const[name,setName]=useState("");
  const[email,setEmail]=useState(""); const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[pin,setPin]=useState(""); const[pinErr,setPinErr]=useState("");
 const[otpSent,setOtpSent]=useState(false);
  const[otpCode,setOtpCode]=useState("");
  const[otpTimer,setOtpTimer]=useState(0);
  const[otpExpired,setOtpExpired]=useState(false);
  const[sending,setSending]=useState(false);
  const[verifying,setVerifying]=useState(false);
  const[attempts,setAttempts]=useState(0);
  const[resendTimer,setResendTimer]=useState(0);

  // تسجيل دخول بالبصمة
  const loginWithBiometric=async()=>{
    if(!window.PublicKeyCredential){toast$&&toast$("❌ البصمة غير مدعومة","err");return;}
    try{
      const savedId=localStorage.getItem("dork_biometric_id");
      if(!savedId){toast$&&toast$("❌ لم تُسجّل البصمة بعد - سجّل دخول أولاً","err");return;}
      const c=customers.find(x=>String(x.id)===savedId);
      if(!c){toast$&&toast$("❌ لم يُعثر على الحساب","err");return;}
      setCustomerSession(c);setView("home");
      toast$&&toast$("✅ تم الدخول بالبصمة");
    }catch(e){toast$&&toast$("❌ فشل التحقق","err");}
  };

  const loginWithPhone=async()=>{
    if(!phone.trim()){setErr(t("cust_login.err_phone"));return;}
    try{
      const rows=await sb("customers","GET",null,`?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at&phone=eq.${encodeURIComponent(phone.trim())}&limit=1`);
      if(!rows.length){setErr(t("cust_login.err_not_found"));return;}
      const c=toAppCustomer(rows[0]);
      setCustomerSession(c);setView("home");
      localStorage.setItem("dork_biometric_id",String(c.id));
    }catch(e){setErr("خطأ: "+e.message);}
  };

  const loginWithPin=async()=>{
    const c=customers.find(cust=>{const savedPin=localStorage.getItem(`dork_customer_pin_${cust.id}`);return savedPin&&savedPin===pin;});
    if(!c){setPinErr(t("cust_login.err_pin_wrong"));setPin("");return;}
    setCustomerSession(c);setView("home");
    localStorage.setItem("dork_biometric_id",String(c.id));
  };

  // مؤقت صلاحية الكود (5 دقائق)
  useEffect(()=>{
    if(!otpSent||otpTimer<=0)return;
    const interval=setInterval(()=>{
      setOtpTimer(prev=>{
        const newTimer=prev-1;
        if(newTimer<=0){
          setOtpExpired(true);
          return 0;
        }
        return newTimer;
      });
    },1000);
    return()=>clearInterval(interval);
  },[otpSent]);

  // مؤقت انتظار إعادة الإرسال (دقيقتين)
  useEffect(()=>{
    if(resendTimer<=0)return;
    const interval=setInterval(()=>{
      setResendTimer(prev=>Math.max(prev-1,0));
    },1000);
    return()=>clearInterval(interval);
  },[resendTimer]);

 const sendOtpCode=async()=>{
  if(sending)return;
  if(!email.trim()){setErr(t("cust_login.err_email"));return;}
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email.trim())){setErr(t("cust_login.err_email_invalid"));return;}
  if(resendTimer>0){setErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة المحاولة`);return;}
  try{
    setSending(true);
    setErr("");
    setOtpExpired(false);
    setOtpCode("");
    setOtpTimer(300);
    setResendTimer(120);
    setOtpSent(true);
    setAttempts(0);
    const {data,error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:""}});
    if(error){
      console.error("OTP Error:",error.message);
      setOtpExpired(false);
      const isRateLimit=error.message.includes("rate")||error.message.includes("too many")||error.message.includes("limit")||error.message.includes("security");
      if(isRateLimit){
        setOtpSent(true);
        setResendTimer(120);
        setErr("❌ يرجى الانتظار دقيقتين قبل المحاولة مجدداً");
      }else{
        setOtpSent(false);
        setOtpTimer(0);
        if(error.message.includes("invalid")||error.message.includes("format")){
          setErr("❌ البريد الإلكتروني غير صحيح");
        }else if(error.message.includes("disabled")||error.message.includes("not enabled")){
          setErr("❌ المصادقة غير مفعّلة - تواصل مع الدعم");
        }else{
          setErr("❌ خطأ: "+error.message.substring(0,40));
        }
      }
      return;
    }
    toast$&&toast$(t("cust_login.success_otp"),"success");
  }catch(e){
    console.error("Send OTP Exception:",e.message);
    setOtpSent(false);
    setOtpTimer(0);
    setOtpExpired(false);
    setResendTimer(60);
    setErr("❌ خطأ في الاتصال - تحقق من الإنترنت");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(user&&user.email===email.trim()){
        await supabase.auth.admin.deleteUser(user.id);
      }
    }catch(cleanupErr){
      console.error("Cleanup failed:",cleanupErr.message);
    }
  }finally{
    setSending(false);
  }
};

  const register=async()=>{
    if(verifying)return;
    if(!name.trim()||!phone.trim()){setErr(t("cust_login.err_name_phone"));return;}
    if(!email.trim()){setErr(t("cust_login.err_email"));return;}
    if(!otpSent){setErr(t("cust_login.err_send_first"));return;}
    if(attempts>=5){setErr(t("cust_login.max_attempts"));return;}
    const otpClean=String(otpCode||"").replace(/\D/g,"").slice(0,6);
    if(otpClean.length<6){setErr(t("cust_login.err_6digits"));return;}
    if(otpExpired){setErr(t("cust_login.err_code_expired"));return;}
    try{
      setVerifying(true);
      const {data,error}=await supabase.auth.verifyOtp({email:email.trim(),token:otpClean,type:"email"});
      if(error){
        console.error("Verify OTP Error:",error.message);
        const msg=error.message.toLowerCase();
        if(msg.includes("invalid")||msg.includes("wrong")||msg.includes("incorrect")||msg.includes("not found")){
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr("❌ الكود غير صحيح - تحقق من الكود المرسل لبريدك");
        }else if((msg.includes("timeout")||msg.includes("expired")||msg.includes("used"))&&otpTimer<=0){
          setOtpExpired(true);
          setOtpTimer(0);
          setErr("❌ انتهت صلاحية الكود - اضغط على إعادة الإرسال");
        }else if(msg.includes("blocked")||msg.includes("denied")){
          setErr("❌ البريد محظور - حاول بريد آخر");
        }else{
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr("❌ الكود غير صحيح - حاول مجدداً");
        }
        return;
      }
      const exists=await sb("customers","GET",null,`?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at&phone=eq.${encodeURIComponent(phone.trim())}&limit=1`);
      if(exists.length){setErr(t("cust_login.err_exists"));return;}
      const rows=await sb("customers","POST",{name:name.trim(),phone:phone.trim(),email:email.trim(),history:[],favs:[]},"");
      const nc=toAppCustomer(rows[0]);
      setCustomerSession(nc);setView("custDash");
      localStorage.setItem("dork_biometric_id",String(nc.id));
      setOtpSent(false);setOtpCode("");setOtpTimer(0);setOtpExpired(false);
      toast$&&toast$(t("cust_login.success_reg"),"success");
    }catch(e){setErr("❌ خطأ في العملية - حاول مجدداً: "+e.message.substring(0,50));
    }finally{setVerifying(false);}
  };

  return(
    <div style={G.page}><div style={G.fp}>

      {/* دخول بالبصمة */}
      {localStorage.getItem("dork_biometric_id")&&(
        <button style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--pa25)",background:"var(--pa08)",color:"var(--p)",cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={loginWithBiometric}>
          {t("cust_login.biometric")}
        </button>
      )}

      <div style={{display:"flex",gap:7,marginBottom:14}}>
        <button style={{...G.toggleBtn,...(tab==="login"?G.toggleOn:{})}} onClick={()=>{setTab("login");setErr("");}}>{t("cust_login.login_tab")}</button>
        <button style={{...G.toggleBtn,...(tab==="reg"?G.toggleOn:{})}} onClick={()=>{setTab("reg");setErr("");}}>{t("cust_login.reg_tab")}</button>
      </div>
      <div style={G.fc}>
        {tab==="login"?<>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={{...G.tabBtn,flex:1,...(loginMethod==="phone"?G.tabOn:{})}} onClick={()=>{setLoginMethod("phone");setErr("");setPinErr("");}}>{t("cust_login.phone_tab")}</button>
            <button style={{...G.tabBtn,flex:1,...(loginMethod==="pin"?G.tabOn:{})}} onClick={()=>{setLoginMethod("pin");setErr("");setPinErr("");}}>{t("cust_login.pin_tab")}</button>
          </div>
          {loginMethod==="phone"?<>
            <SL>{t("cust_login.login_title")}</SL>
            <F label={t("cust_login.phone_label")} error={err}><input style={fi(err)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
            <button style={G.sub} onClick={loginWithPhone}>{t("cust_login.login_btn")}</button>
          </>:<>
            <SL>{t("cust_login.pin_title")}</SL>
            <F label={t("cust_login.pin_label")} error={pinErr}><input style={fi(pinErr)} type="password" inputMode="numeric" placeholder="••••" value={pin} onChange={e=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setPin(val);setPinErr("");}} maxLength={6}/></F>
            <button style={G.sub} onClick={loginWithPin}>{t("cust_login.login_btn")}</button>
          </>}
          <div style={{textAlign:"center",margin:"12px 0",color:"var(--text-muted)",fontSize:12}}>{t("cust_login.or")}</div>
          <button style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #4285f4",background:"rgba(66,133,244,.1)",color:"#4285f4",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={async()=>{
            try{
              setErr("");
              // تحميل Firebase
              const loadScript=(src)=>new Promise((res,rej)=>{
                if(document.querySelector(`script[src="${src}"]`)){res();return;}
                const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;
                document.head.appendChild(s);
              });
              await loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
              await loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js");
              const fb=window.firebase;
              if(!fb.apps.length) fb.initializeApp({apiKey:"AIzaSyBYCJYdJUi_oPfYlOzSukntj4YeLZFiVUY",authDomain:"dork-app.firebaseapp.com",projectId:"dork-app",appId:"1:659823227621:web:befaaa1b5063"});
              const provider=new fb.auth.GoogleAuthProvider();
              provider.setCustomParameters({prompt:"select_account"});
              const result=await fb.auth().signInWithPopup(provider);
              const gUser={name:result.user.displayName||"مستخدم",email:result.user.email||"",googleUid:result.user.uid};
              const rows=await sb("customers","GET",null,`?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at&google_uid=eq.${gUser.googleUid}&limit=1`);
              if(rows.length){
                const c=toAppCustomer(rows[0]);
                setCustomerSession(c);setView("home");
                localStorage.setItem("dork_biometric_id",String(c.id));
              }else{
                const newRows=await sb("customers","POST",{name:gUser.name,phone:"",email:gUser.email,google_uid:gUser.googleUid,history:[],favs:[]},"");
                const nc=toAppCustomer(newRows[0]);
                setCustomerSession(nc);setView("home");
                localStorage.setItem("dork_biometric_id",String(nc.id));
              }
            }catch(e){setErr(e.message==="تم إغلاق نافذة Google"?"❌ تم إغلاق النافذة":"❌ خطأ: "+e.message);}
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t("cust_login.google_btn")}
          </button>
        </>:<>
          <SL>{t("cust_login.reg_title")}</SL>
          <F label={t("cust_login.name_label")}><input style={fi()} placeholder={t("cust_login.name_ph")} value={name} onChange={e=>setName(e.target.value)}/></F>
          <F label={t("cust_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <F label={t("cust_login.email_label")} error={err}><div style={{display:"flex",gap:8}}>
            <input style={{...fi(err),flex:1,direction:"ltr",textAlign:"left"}} placeholder="example@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} type="email" disabled={otpSent||sending} dir="ltr"/>
            <button style={{...G.sub,flex:0,padding:"12px 16px",fontSize:13,opacity:sending?.6:1,cursor:sending?"not-allowed":"pointer"}} onClick={sendOtpCode} disabled={sending}>
              {sending?t("cust_login.sending"):otpSent?t("cust_login.resend_btn"):t("cust_login.send_btn")}
            </button>
          </div></F>
          {otpSent&&<>
            <F label={t("cust_login.code_label")}>
              <OtpInput value={otpCode} onChange={(val)=>{setOtpCode(val);setErr("");}} error={false} use6Boxes={true} disabled={verifying||attempts>=5}/>
              <div style={{fontSize:11,color:attempts>=5?"#e74c3c":"#888",marginTop:8,direction:"rtl"}}>
                {t("cust_login.code_sent_to")} <span dir="ltr" style={{display:"inline-block"}}><strong>{email}</strong></span>
                {attempts>0&&attempts<5&&<><br/>{t("cust_login.attempts_left")} {5-attempts}</>}
                {attempts>=5&&<><br/>{t("cust_login.max_attempts")}</>}
              </div>
            </F>
            <button style={{width:"100%",padding:"8px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:verifying?"not-allowed":"pointer",fontFamily:"inherit",opacity:verifying?.5:1,marginTop:12,fontSize:12}} disabled={verifying} onClick={()=>{setOtpSent(false);setOtpCode("");setErr("");setOtpExpired(false);setOtpTimer(0);setResendTimer(0);setAttempts(0);}}>
              {t("cust_login.edit_email")}
            </button>
          </>}
          <button style={{...G.sub,opacity:(verifying||!otpSent)?.6:1,cursor:(verifying||!otpSent)?"not-allowed":"pointer"}} onClick={register} disabled={!otpSent||verifying||otpExpired}>
            {verifying?t("cust_login.verifying"):t("cust_login.reg_btn")}
          </button>
        </>}
      </div>
      <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:20,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_login.back")}</button>
    </div></div>
  );
}
function AttendanceView({customer,salons}){
  const[filter,setFilter]=useState("all");
  const[records,setRecords]=useState([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!customer?.phone){setLoading(false);return;}
    sb("bookings","GET",null,
      `?customer_phone=eq.${encodeURIComponent(customer.phone)}&select=id,salon_id,attendance,status&order=created_at.desc&limit=200`
    ).then(data=>{
      if(Array.isArray(data)) setRecords(data.filter(b=>
        b.attendance==="attended"||b.attendance==="no_show"||(b.status==="approved"&&!b.attendance)
      ));
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[customer?.phone]);
  const displayed=
    filter==="attended"?records.filter(r=>r.attendance==="attended"):
    filter==="no_show"?records.filter(r=>r.attendance==="no_show"):
    filter==="pending"?records.filter(r=>r.status==="approved"&&!r.attendance):
    records;
  const getStatus=r=>r.attendance==="attended"?{label:"ملتزم",color:"#27ae60"}:
    r.attendance==="no_show"?{label:"غير ملتزم",color:"#e74c3c"}:{label:"قيد الانتظار",color:"var(--text-muted)"};
  const getSalonName=r=>(salons?.find(x=>String(x.id)===String(r.salon_id))?.name)||"صالون";
  const counts={
    all:records.length,
    attended:records.filter(r=>r.attendance==="attended").length,
    no_show:records.filter(r=>r.attendance==="no_show").length,
    pending:records.filter(r=>r.status==="approved"&&!r.attendance).length,
  };
  const evalTotal=counts.attended+counts.no_show;
  const attendRate=evalTotal>0?Math.round((counts.attended/evalTotal)*100):null;
  const classification=attendRate===null?null:
    counts.no_show>=3||attendRate<50?{label:"⚠️ غير ملتزم",color:"#e74c3c",bg:"rgba(231,76,60,.08)"}:
    counts.attended>=5&&counts.no_show===0?{label:"🌟 مميز",color:"var(--gold)",bg:"rgba(var(--gold-rgb),.08)"}:
    attendRate>=70?{label:"✅ منتظم",color:"#27ae60",bg:"rgba(39,174,96,.08)"}:
    {label:"🆕 جديد",color:"#3498db",bg:"rgba(52,152,219,.08)"};
  const filtersArr=[
    {key:"attended",label:"ملتزم",color:"#27ae60"},
    {key:"no_show",label:"غير ملتزم",color:"#e74c3c"},
    {key:"pending",label:"قيد الانتظار",color:"var(--text-muted)"},
    {key:"all",label:"سجلي الكامل",color:"var(--gold)"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {filtersArr.map(f=>(
          <button key={f.key}
            onClick={()=>setFilter(f.key)}
            style={{padding:"18px 4px 14px",borderRadius:14,border:`2px solid ${f.color}`,
              background:filter===f.key?`${f.color}22`:"#0d0d1a",
              color:f.color,cursor:"pointer",fontFamily:"inherit",
              display:"flex",flexDirection:"column",alignItems:"center",gap:6,
              outline:"none",WebkitTapHighlightColor:"transparent"}}>
            <span style={{fontSize:24,fontWeight:800,lineHeight:1}}>{counts[f.key]}</span>
            <span style={{fontSize:10,fontWeight:700,textAlign:"center",lineHeight:1.3}}>{f.label}</span>
          </button>
        ))}
      </div>
      {!loading&&classification&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{background:classification.bg,borderRadius:12,padding:"12px 16px",
            border:`1.5px solid ${classification.color}`,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>تصنيفك الإجمالي</span>
            <span style={{fontSize:14,fontWeight:800,color:classification.color}}>{classification.label}</span>
          </div>
          <div style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 16px",border:"1px solid var(--border-ui)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:"var(--text-muted)"}}>نسبة الحضور</span>
              <span style={{fontSize:13,fontWeight:700,color:"var(--gold)"}}>{attendRate}%</span>
            </div>
            <div style={{height:8,background:"var(--surface-2)",borderRadius:999,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${attendRate}%`,
                background:"linear-gradient(90deg,var(--gold),var(--pl))",borderRadius:999}}/>
            </div>
            <div style={{fontSize:11,color:"#666",marginTop:6,textAlign:"right"}}>
              {counts.attended} حضر من أصل {evalTotal} تم تقييمه
            </div>
          </div>
        </div>
      )}
      {loading
        ?<div style={{textAlign:"center",color:"var(--text-muted)",padding:24}}>جاري التحميل...</div>
        :displayed.length===0
          ?<div style={{textAlign:"center",color:"var(--text-muted)",padding:24}}>لا توجد سجلات</div>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {displayed.map((r,i)=>{
              const st=getStatus(r);
              return(
                <div key={r.id||i} style={{background:"var(--surface-1)",borderRadius:10,padding:"12px 14px",
                  borderRight:`3px solid ${st.color}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {getSalonName(r)}</div>
                  <div style={{fontSize:12,fontWeight:700,color:st.color,background:`${st.color}22`,
                    padding:"4px 10px",borderRadius:20}}>{st.label}</div>
                </div>
              );
            })}
          </div>}
    </div>
  );
}
function CustomerDash({customer,salons,setSalons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers,reviews,setReviews,setRescheduleId,loadData,toast$,initTab="settings",initSection=false,setShowDrawer}){
  const{t}=useTranslation();
  const[tab,setTab]=useState(initTab);
  const[sectionMode,setSectionMode]=useState(initSection);
  const[editMode,setEditMode]=useState(false);
  const[editName,setEditName]=useState(customer?.name||"");
  const[editPhone,setEditPhone]=useState(customer?.phone||"");
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[editEmail,setEditEmail]=useState(customer?.email||"");
  const[reminderMins,setReminderMins]=useState(60);
  const[myWaiting,setMyWaiting]=useState([]);
  useEffect(()=>{
    if(!customer?.phone)return;
    sb("waiting_list","GET",null,`?phone=eq.${encodeURIComponent(customer.phone)}&select=id,salon_id,slot_date,slot_time,status,created_at&order=created_at.desc&limit=50`)
      .then(data=>{if(Array.isArray(data))setMyWaiting(data.filter(w=>w.status==="waiting"));})
      .catch(()=>{});
  },[customer?.phone]);
  const[editPinStep,setEditPinStep]=useState(null);
  const[editPinLength,setEditPinLength]=useState(4);
  const[editTempPin,setEditTempPin]=useState("");
  const[editPinConfirm,setEditPinConfirm]=useState("");
  const[editPinErr,setEditPinErr]=useState("");
  const[showLocPrompt,setShowLocPrompt]=useState(()=>!customer?.locationLat);
  if(!customer)return null;

  // حفظ موقع العميل
  const saveCustomerLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$("❌ المتصفح لا يدعم تحديد الموقع","err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
        setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession({...customer,locationLat:lat,locationLng:lng});
        setShowLocPrompt(false);
        toast$&&toast$("✅ تم حفظ موقعك بنجاح");
      }catch{toast$&&toast$("❌ فشل حفظ الموقع","err");}
    },()=>{toast$&&toast$("❌ تعذّر تحديد موقعك","err");},{enableHighAccuracy:true,timeout:15000});
  };

  // حذف موقع العميل
  const clearCustomerLocation=async()=>{
    try{
      await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));
      setCustomerSession({...customer,locationLat:null,locationLng:null});
      toast$&&toast$("✅ تم حذف الموقع");
    }catch{toast$&&toast$("❌ فشل حذف الموقع","err");}
  };

  const favSalons=salons.filter(s=>favSet.has(s.id)&&s.status==="approved");
  const history=customer.history||[];
  const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
  const classification=getCustomerClassification(customer);
  const badge=classification.label;

  // avatar بالحرف الأول
  const initials=(customer.name||"?")[0];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

  const lastSalon=history.length>0?salons.find(s=>s.id===history[history.length-1].salonId||s.id===Number(history[history.length-1].salonId)):null;

  const saveEdit=async()=>{
    if(!editName.trim()){return;}
    try{
      await sb("customers","PATCH",{name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()}:c));
      setEditMode(false);
    }catch(e){alert("خطأ: "+e.message);}
  };

  const confirmDeleteAccount=async()=>{
    try{
      await sb("customers","DELETE",null,`?id=eq.${customer.id}`);
      const {data:{user}}=await supabase.auth.getUser();
      if(user)await supabase.auth.admin.deleteUser(user.id);
      setCustomerSession(null);setView("entry");
    }catch(e){alert("خطأ: "+e.message);}
    setShowDeleteConfirm(false);
  };

  const deleteAccount=()=>{
    setShowDeleteConfirm(true);
  };

  const scheduleReminder=(h)=>{
    const dt=new Date(`${h.date}T${h.time}`);
    dt.setMinutes(dt.getMinutes()-reminderMins);
    const now=new Date();
    const diff=dt-now;
    if(diff<=0){alert("الموعد قريب جداً أو مضى!");return;}
    setTimeout(()=>{
      if(Notification.permission==="granted"){
        new Notification("تذكير موعدك في دورك ✂",{body:`موعدك في ${h.salonName||"الصالون"} الساعة ${h.time}`,icon:"/favicon.ico"});
      }else{alert(`تذكير: موعدك في ${h.salonName||"الصالون"} الساعة ${h.time}`);}
    },diff);
    Notification.requestPermission();
    alert(`✅ سيتم تذكيرك قبل ${reminderMins>=60?reminderMins/60+" ساعة":reminderMins+" دقيقة"} من موعدك!`);
  };

  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};

  const sectionTitle=tab==="notif"?t("cust_dash.section_notif"):tab==="hist"?t("cust_dash.section_hist"):tab==="favs"?t("cust_dash.section_favs"):tab==="remind"?t("cust_dash.section_remind"):tab==="attend"?t("cust_dash.section_attend"):t("cust_dash.section_settings");

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setView("home");setShowDrawer(true);}}>{t("cust_dash.back")}</button><h2 style={{...G.ft,flex:1}}>{sectionMode?sectionTitle:t("cust_dash.title")}</h2>{!sectionMode&&<button style={{...G.delBtn,border:"1.5px solid #888",color:"var(--text-muted)",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("entry");}}>{t("cust_dash.exit")}</button>}</div>

      {/* نافذة طلب الموقع — تظهر مرة واحدة لمن ليس عنده موقع */}
      {!sectionMode&&showLocPrompt&&!customer?.locationLat&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:340,width:"100%",border:"1.5px solid rgba(var(--gold-rgb),.3)",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>📍</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--p)",marginBottom:10}}>{t("cust_dash.loc_title")}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>{t("cust_dash.loc_body")}</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:13,borderRadius:12,border:"none",background:"var(--p)",color:"#000",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}} onClick={saveCustomerLocation}>{t("cust_dash.loc_yes")}</button>
              <button style={{flex:1,padding:13,borderRadius:12,border:"1px solid #444",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}} onClick={()=>setShowLocPrompt(false)}>{t("cust_dash.loc_later")}</button>
            </div>
          </div>
        </div>
      )}

      {/* بروفايل العميل - Premium */}
      {!sectionMode&&(!editMode?(
        <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1.5px solid var(--gold)",marginBottom:12,position:"relative",boxShadow:"0 4px 16px rgba(var(--gold-rgb),.1)"}}>
          {/* البادج في الزاوية اليسرى */}
          <div style={{position:"absolute",top:12,left:12,background:`${classification.color}22`,border:`1px solid ${classification.color}`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:classification.color}}>{badge}</div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.name")} <span style={{color:"var(--p)"}}>{customer.name}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.phone")} <span style={{color:"var(--p)"}}>{customer.phone}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.bookings_count")} <span style={{color:"var(--p)"}}>{history.length} {t("cust_dash.bookings_unit")}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>{t("cust_dash.joined")} <span style={{color:"var(--p)"}}>{new Date(customer.createdAt).toLocaleDateString("ar")}</span></div>
          </div>
        </div>
      ):(
        <div style={{background:"var(--surface-1)",borderRadius:16,padding:16,border:"1px solid var(--pa25)",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>{t("cust_dash.edit_title")}</div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t("cust_dash.name_label")}</label><input style={inp2} value={editName} onChange={e=>setEditName(e.target.value)}/></div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t("cust_dash.phone_label")}</label><input style={inp2} inputMode="numeric" type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t("cust_dash.email_label")}</label><input style={inp2} type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)}/></div>
          {/* الموقع */}
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>الموقع</label>
            {customer?.locationLat&&customer?.locationLng?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:9,border:"1.5px solid rgba(var(--pr),.4)",background:"rgba(var(--pr),.06)"}}>
                <span style={{fontSize:11,color:"var(--p)"}}>{t("cust_dash.loc_saved")}</span>
                <button style={{background:"transparent",border:"none",color:"#e74c3c",fontSize:11,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={clearCustomerLocation}>{t("cust_dash.loc_delete")}</button>
              </div>
            ):(
              <button style={{...inp2,background:"rgba(var(--pr),.06)",border:"1.5px dashed rgba(var(--pr),.4)",color:"var(--p)",cursor:"pointer",textAlign:"center",fontWeight:700,fontSize:12,padding:"11px"}} onClick={saveCustomerLocation}>{t("cust_dash.loc_add")}</button>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={G.sub} onClick={saveEdit}>{t("cust_dash.save")}</button>
            <button style={{...G.delBtn,padding:"12px 14px"}} onClick={()=>setEditMode(false)}>{t("cust_dash.cancel")}</button>
          </div>
        </div>
      ))}

      {!sectionMode&&<div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>{t("cust_dash.tab_favs")} {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>{t("cust_dash.tab_hist")}</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>{t("cust_dash.tab_settings")}</button>
      </div>}

      {/* المفضلة */}
      {tab==="favs"&&<>
        {favSalons.length===0?<div style={{...G.empty,display:"flex",flexDirection:"column",gap:16,alignItems:"center",padding:"36px 14px"}}>
          <div>{t("cust_dash.favs_empty")}</div>
          <button style={{...G.sub,marginTop:0}} onClick={()=>setView("home")}>{t("cust_dash.browse_btn")}</button>
        </div>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {favSalons.map(s=>(
              <div key={s.id} style={G.bItem}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>📍 {s.gov||s.region}{s.village?` - ${s.village}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)"}}>⭐ {s.rating}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={G.bookBtn} onClick={()=>{setSelSalon(s);setView("book");}}>{t("cust_dash.book_btn")}</button>
                    <button style={{...G.favBtn,fontSize:18,color:"#e74c3c"}} onClick={()=>toggleFav(s.id)}>♥</button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
      </>}

      {/* الحجوزات */}
      {tab==="hist"&&<>
        {/* قائمة انتظاري */}
        {myWaiting.length>0&&(
          <div style={{background:"rgba(243,156,18,.07)",borderRadius:10,padding:"10px 12px",marginBottom:12,border:"1px solid #f39c1244"}}>
            <div style={{fontSize:12,color:"#f39c12",fontWeight:700,marginBottom:8}}>{t("cust_dash.waiting_title")} ({myWaiting.length})</div>
            {myWaiting.map(w=>{
              const s=salons.find(x=>String(x.id)===String(w.salon_id));
              return(
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:"1px solid #f39c1222"}}>
                  <div>
                    <div style={{fontSize:12,color:"#fff",fontWeight:600}}>✂ {s?.name||"صالون"}</div>
                    <div style={{fontSize:11,color:"#f39c12"}}>⏰ {w.slot_date} - {w.slot_time}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>{t("cust_dash.waiting_confirm")}</div>
                  </div>
                  <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}
                    onClick={async()=>{
                      if(!window.confirm("هل تريد إلغاء طلب الانتظار؟"))return;
                      await sb("waiting_list","DELETE",null,"?id=eq."+w.id).catch(()=>{});
                      setMyWaiting(p=>p.filter(x=>x.id!==w.id));
                    }}>{t("cust_dash.cancel_wait")}</button>
                </div>
              );
            })}
          </div>
        )}
        {history.length===0?<div style={G.empty}>{t("cust_dash.hist_empty")}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {[...history].reverse().map((h,i)=>{
              const s=salons.find(x=>x.id===h.salonId||x.id===Number(h.salonId));
              // نجيب الحالة الحقيقية من بيانات الصالون بمقارنة مرنة
              const realBooking=s?.bookings?.find(b=>
                b.date===h.date && b.time===h.time &&
                (b.phone===h.phone || b.name===customer.name)
              ) || s?.bookings?.find(b=>b.date===h.date&&b.time===h.time);
              const status=realBooking?.status||h.status||"pending";
              const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":status==="cancelled"?"#888":"#f39c12";
              const stLabel=status==="approved"?t("cust_dash.status_approved"):status==="rejected"?t("cust_dash.status_rejected"):status==="cancelled"?t("cust_dash.status_cancelled"):t("cust_dash.status_pending");
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s?.name||h.salonName||"صالون"}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>📅 {h.date} - 🕐 {h.time}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>💰 {h.total||0} {t("cust_dash.sar")}</div>
                      <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=h.rating?"var(--p)":"#333"}}>★</span>)}</div>}
                      {s&&<button style={{...G.bookBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{setSelSalon(s);setView("book");}}>{t("cust_dash.book_again")}</button>}
                      <button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>{t("cust_dash.remind_btn")}</button>
                      {(status==="pending"||status==="approved")&&realBooking?.id&&(<>
                        <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{if(window.confirm("هل تريد تعديل موعدك؟ سيُلغى الحجز الحالي عند تأكيد الجديد.")){setRescheduleId(realBooking.id);setSelSalon(s);setView("book");}}}>✏️ تعديل</button>
                        <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{
                          if(!window.confirm("هل تريد إلغاء هذا الحجز؟"))return;
                          try{
                            const bookDT=new Date(`${h.date}T${h.time}`);
                            const hoursUntil=(bookDT-new Date())/(1000*60*60);
                            const window_h=s?.cancellationWindow||2;
                            const lateCancel=hoursUntil>=0&&hoursUntil<window_h;
                            await sb("bookings","PATCH",{status:"cancelled",...(lateCancel?{attendance:"no_show"}:{})},"?id=eq."+realBooking.id);
                            sb("notifications","POST",{target_type:"all",title:"إلغاء حجز",body:`${customer?.name||""} ألغى حجزه في ${h.date} - ${h.time}${lateCancel?" (إلغاء متأخر)":""}`,icon:"🚫"}).catch(()=>{});
                            await loadData({silent:true});
                          }catch(e){toast$("❌ خطأ في الإلغاء","err");}
                        }}>🚫 إلغاء</button>
                      </>)}
                    </div>
                  </div>
                  {/* التقييم فقط بعد القبول */}
                  {status==="approved"&&<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                    // تحديث history العميل محلياً (لعرضه في "حجوزاتي")
                    const rev=[...history].reverse();
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated}:c));
                    try{await sb("customers","PATCH",{history:updated},`?id=eq.${customer.id}`);}catch{}
                    // كتابة التقييم في جدول reviews المستقل
                    try{
                      const salonId=Number(h.salonId);
                      const existing=(reviews||[]).find(rv=>Number(rv.salon_id)===salonId&&Number(rv.customer_id)===Number(customer.id)&&rv.booking_date===h.date);
                      let allSalonReviews=(reviews||[]).filter(rv=>Number(rv.salon_id)===salonId);
                      if(existing){
                        await sb("reviews","PATCH",{rating:r,comment},`?id=eq.${existing.id}`);
                        allSalonReviews=allSalonReviews.map(rv=>rv.id===existing.id?{...rv,rating:r,comment}:rv);
                        setReviews(p=>p.map(rv=>rv.id===existing.id?{...rv,rating:r,comment}:rv));
                      }else{
                        const res=await sb("reviews","POST",{salon_id:salonId,customer_id:Number(customer.id),customer_name:customer.name,rating:r,comment,booking_date:h.date});
                        if(res&&res[0]){allSalonReviews=[...allSalonReviews,res[0]];setReviews(p=>[...p,res[0]]);}
                      }
                      // حساب المتوسط من كل تقييمات الصالون (دقيق 100%)
                      const newRating=allSalonReviews.length?Math.round(allSalonReviews.reduce((a,rv)=>a+rv.rating,0)/allSalonReviews.length*10)/10:r;
                      await sb("salons","PATCH",{rating:newRating},`?id=eq.${salonId}`);
                      setSalons(p=>p.map(s=>Number(s.id)===salonId?{...s,rating:newRating}:s));
                    }catch(e){console.error(e);}
                  }}/>}
                </div>
              );
            })}
          </div>}
      </>}

      {/* إشعارات العميل */}
      {tab==="notif"&&(()=>{
        const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
        const clearAll=()=>{localStorage.setItem("dork_notifs","[]");localStorage.setItem("dork_notif_count","0");};
        return(
          <div>
            {notifs.length>0&&<button style={{...G.pageBtn,width:"100%",marginBottom:10,color:"#e74c3c",border:"1px solid #e74c3c"}} onClick={clearAll}>🗑 مسح الكل</button>}
            {notifs.length===0
              ?<div style={G.empty}>🔔 لا توجد إشعارات</div>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {notifs.map(n=>(
                  <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"var(--border-ui)":"var(--p)"}`}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:20}}>{n.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.title}</div>
                        <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{n.body}</div>
                        <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        );
      })()}

      {/* التذكيرات */}
      {tab==="remind"&&(
        <div style={{background:"var(--surface-1)",borderRadius:10,padding:"14px 14px",border:"1px solid var(--border-ui)"}}>
          <div style={{fontSize:13,color:"var(--p)",fontWeight:700,marginBottom:12}}>🔔 وقت التذكير بالمواعيد</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {[{v:30,l:"30 د"},{v:60,l:"ساعة"},{v:120,l:"ساعتين"},{v:1440,l:"يوم"}].map(({v,l})=>(
              <button key={v} onClick={()=>setReminderMins(v)}
                style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${reminderMins===v?"var(--p)":"var(--border-ui)"}`,background:reminderMins===v?"var(--pa12)":"#1a1a2e",color:reminderMins===v?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"var(--text-muted)",flexShrink:0}}>أو أدخل دقائق:</span>
            <input type="number" min="1" max="10080"
              style={{width:90,padding:"8px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--p)",fontSize:14,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
              value={reminderMins} onChange={e=>setReminderMins(Math.max(1,+e.target.value))}/>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>دقيقة</span>
          </div>
        </div>
      )}

      {tab==="attend"&&<AttendanceView customer={customer} salons={salons}/>}

      {/* إعدادات الحساب */}
      {tab==="settings"&&(
        <div style={{background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid var(--border-ui)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"}}>⚙ إعدادات الحساب</div>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>{setTab("settings");setEditMode(true);}}>✏ تعديل البيانات</button>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>setEditPinStep("select")}>🔐 تغيير رمز PIN</button>

          {/* قسم الموقع */}
          <div style={{background:"rgba(var(--gold-rgb),.06)",borderRadius:10,padding:12,border:"1px solid rgba(var(--gold-rgb),.2)",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8}}>📍 موقعي المحفوظ</div>
            {customer?.locationLat&&customer?.locationLng?(
              <>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>✅ موقع محفوظ — تظهر الصالونات الأقرب إليك تلقائياً</div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={saveCustomerLocation}>🔄 تحديث الموقع</button>
                  <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={clearCustomerLocation}>🗑 حذف الموقع</button>
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>لا يوجد موقع محفوظ — احفظ موقعك لترى الصالونات الأقرب تلقائياً</div>
                <button style={{...G.sub,fontSize:12}} onClick={saveCustomerLocation}>📍 حفظ موقعي الحالي</button>
              </>
            )}
          </div>

          <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>🗑 حذف الحساب نهائياً</button>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:8,textAlign:"center"}}>تحذير: حذف الحساب لا يمكن التراجع عنه</div>
        </div>
      )}

      {/* حوار تغيير PIN */}
      {editPinStep&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
            {editPinStep==="select"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>🔐 تغيير رمز PIN</div>
              <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",marginBottom:20}}>اختر عدد الأرقام</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <button onClick={()=>{setEditPinLength(4);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===4?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  4 أرقام
                </button>
                <button onClick={()=>{setEditPinLength(6);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===6?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  6 أرقام
                </button>
              </div>
            </>:editPinStep==="enter"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>أدخل PIN الجديد ({editPinLength} أرقام)</div>
              <input type="password" maxLength={editPinLength} value={editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditTempPin(val);if(val.length===editPinLength)setTimeout(()=>setEditPinStep("confirm"),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editTempPin.length===editPinLength)setEditPinStep("confirm");}} />
            </>:editPinStep==="confirm"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>أعد إدخال PIN للتأكيد</div>
              <input type="password" maxLength={editPinLength} value={editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditPinConfirm(val);if(val.length===editPinLength&&editTempPin!==val){setEditPinErr("الأرقام غير متطابقة");}else{setEditPinErr("");}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm){const customerIdStr=String(customer.id);localStorage.setItem(`dork_customer_pin_${customerIdStr}`,editTempPin);localStorage.setItem(`dork_customer_pin_length_${customerIdStr}`,String(editPinLength));setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}}} />
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={()=>{if(editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm){const customerIdStr=String(customer.id);localStorage.setItem(`dork_customer_pin_${customerIdStr}`,editTempPin);localStorage.setItem(`dork_customer_pin_length_${customerIdStr}`,String(editPinLength));setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");toast$&&toast$("✅ تم تحديث PIN بنجاح");}}} disabled={editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"var(--p)":"var(--border-ui)",color:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"#000":"#555",cursor:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  حفظ
                </button>
                <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  إلغاء
                </button>
              </div>
            </>:null}
          </div>
        </div>
      )}

      {/* حذف الحساب - Dialog */}
      {showDeleteConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1400,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowDeleteConfirm(false)}>
          <div style={{width:"100%",background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:"20px 20px 0 0",padding:"28px 24px 36px",border:"1.5px solid var(--gold)",borderBottom:"none",boxShadow:"0 -8px 32px rgba(var(--gold-rgb),.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:10}}>⚠️</div>
              <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:6}}>حذف الحساب نهائياً</div>
              <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>هل أنت متأكد من رغبتك في حذف حسابك؟</div>
            </div>
            <div style={{background:"rgba(var(--gold-rgb),.08)",border:"1px solid rgba(var(--gold-rgb),.2)",borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:"#ddd",lineHeight:1.8}}>
              <div style={{marginBottom:6,fontWeight:700,color:"var(--gold)"}}>سيتم حذف:</div>
              <div>✗ حسابك بشكل نهائي</div>
              <div>✗ جميع معلوماتك الشخصية</div>
              <div>✗ سجل حجوزاتك</div>
            </div>
            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:10,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700}}>
              ⚡ تنبيه: لا يمكن استرجاع البيانات بعد الحذف</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}} onClick={()=>setShowDeleteConfirm(false)}>↩️ إلغاء</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={confirmDeleteAccount}>🗑️ حذف نهائياً</button>
            </div>
          </div>
        </div>
      )}

    </div></div>
  );
}



function InlineStarRating({rated,comment,onRate}){
  const[hover,setHover]=useState(0);
  const[sel,setSel]=useState(0);
  const[txt,setTxt]=useState("");
  const labels=["","ضعيف","مقبول","جيد","جيد جداً","ممتاز"];
  if(rated>0) return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{display:"flex",gap:1,marginBottom:comment?4:0}}>
        {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=rated?"var(--gold)":"#333"}}>★</span>)}
        <span style={{fontSize:11,color:"var(--text-muted)",marginRight:6,alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment&&<div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );
  return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{fontSize:11,color:"#666",marginBottom:5}}>قيّم تجربتك في هذا الصالون:</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{fontSize:28,cursor:"pointer",color:n<=(hover||sel)?"var(--gold)":"var(--border-ui)",transition:"color .1s",lineHeight:1,userSelect:"none"}}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}>★</span>
        ))}
        {(hover||sel)>0&&<span style={{fontSize:11,color:"var(--p)",marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel>0&&<>
        <textarea
          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"none",minHeight:60,marginBottom:8}}
          placeholder="أضف تعليقاً (اختياري)..."
          value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button style={{...G.sub,padding:"8px 0",fontSize:12}} onClick={()=>onRate(sel,txt)}>
          إرسال التقييم ⭐
        </button>
      </>}
    </div>
  );
}

function SettingsView({settings,setSettings,setView,toast$,socialLinks,setSocialLinks,darkMode,setDarkMode,themeMode,setThemeMode,persistUiToSupabase,setShowDrawer,onlySec,backFn}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const[sec,setSec]=useState(onlySec||"theme");
  const[faqQ,setFaqQ]=useState("");
  const SECS=[
    {id:"theme", icon:"🎨",label:t("settings.sec_theme")},
    {id:"bg",    icon:"🖼", label:t("settings.sec_bg")},
    {id:"font",  icon:"🔤",label:t("settings.sec_font")},
    {id:"dark",  icon:"🌙",label:t("settings.sec_dark")},
    {id:"tone",  icon:"🔔",label:t("settings.sec_tone")},
    {id:"social",icon:"📱",label:t("settings.sec_social")},
    {id:"guide", icon:"📖",label:t("settings.sec_guide")},
    {id:"faq",   icon:"❓",label:t("settings.sec_faq")},
    {id:"danger",icon:"⚠", label:t("settings.sec_danger")},
  ];
  const THEME_OPTIONS=[
    {id:"gold",     label:t("settings.themes.gold"),     color:"#d4a017",    emoji:"✨"},
    {id:"emerald",  label:t("settings.themes.emerald"),  color:"#10b981",    emoji:"🌿"},
    {id:"sapphire", label:t("settings.themes.sapphire"), color:"#3b82f6",    emoji:"💎"},
    {id:"royalBlue",label:t("settings.themes.royalBlue"),color:"#1e3a8a",    emoji:"👑"},
    {id:"bronze",   label:t("settings.themes.bronze"),   color:"#8b5a2b",    emoji:"🏺"},
    {id:"rose",     label:t("settings.themes.rose"),     color:"#ec4899",    emoji:"🌸"},
    {id:"violet",   label:t("settings.themes.violet"),   color:"#8b5cf6",    emoji:"🔮"},
    {id:"crimson",  label:t("settings.themes.crimson"),  color:"#ef4444",    emoji:"🔴"},
    {id:"teal",     label:t("settings.themes.teal"),     color:"#0d9488",    emoji:"🩵"},
    {id:"coral",    label:t("settings.themes.coral"),    color:"#f97316",    emoji:"🪸"},
    {id:"fuchsia",  label:t("settings.themes.fuchsia"),  color:"#d946ef",    emoji:"🌺"},
    {id:"wine",     label:t("settings.themes.wine"),     color:"#9f1239",    emoji:"🍷"},
    {id:"forest",   label:t("settings.themes.forest"),   color:"#15803d",    emoji:"🌲"},
    {id:"lime",     label:t("settings.themes.lime"),     color:"#65a30d",    emoji:"🍃"},
    {id:"sky",      label:t("settings.themes.sky"),      color:"#0284c7",    emoji:"🌊"},
  ];
  const applyTheme=(id)=>{
    const t=THEMES[id]||THEMES.gold;
    const r=document.documentElement.style;
    r.setProperty("--p",t.primary);r.setProperty("--pl",t.light);r.setProperty("--pd",t.dark);r.setProperty("--pll",t.lightest);r.setProperty("--pr",t.rgb);
    ["5","07","08","12","15","18","2","25","3","4"].forEach(a=>{
      const pct=a==="4"?.45:a==="3"?.3:a==="25"?.25:a==="2"?.2:a==="18"?.18:a==="15"?.15:a==="12"?.12:a==="08"?.08:a==="07"?.07:.05;
      r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);
    });
    r.setProperty("--grad",`linear-gradient(135deg,${t.primary},${t.light})`);
    r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
    r.setProperty("--gold",t.primary);r.setProperty("--gold-rgb",t.rgb);
    setSettings(s=>({...s,theme:id}));
    persistUiToSupabase&&persistUiToSupabase({theme:id});
  };
  const box={background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid var(--border-ui)",marginBottom:12};
  const hdr={fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4,fontWeight:600};

  return(
    <div style={{...G.page,direction:dir}}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{if(backFn){backFn();}else{setView("home");setShowDrawer&&setShowDrawer(true);}}}>← {t("settings.back")}</button><h2 style={G.ft}>{onlySec?({social:t("settings.title_social"),faq:t("settings.title_faq"),theme:t("settings.title_theme")}[onlySec]||t("settings.title")):t("settings.title")}</h2></div>
      {!onlySec&&<div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {SECS.map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"var(--border-ui)"}`,background:sec===s.id?"var(--pa12)":"#1a1a2e",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>}

      {sec==="theme"&&<div style={box}>
        <div style={hdr}>{t("settings.theme_header")}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {THEME_OPTIONS.map(t=>{
            const active=settings.theme===t.id;
            return(
              <button key={t.id} onClick={()=>applyTheme(t.id)}
                style={{padding:"14px 6px",borderRadius:12,border:`2px solid ${active?t.color:"var(--border-ui)"}`,background:active?t.color+"22":"#1a1a2e",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)"}}>
                <span style={{fontSize:22}}>{t.emoji}</span>
                <div style={{width:24,height:24,borderRadius:"50%",background:t.color,boxShadow:active?`0 0 0 3px ${t.color}55`:"none"}}/>
                <span style={{fontSize:11,color:active?t.color:"var(--text-muted)"}}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>}

      {sec==="font"&&<div style={box}>
        <div style={hdr}>{t("settings.font_header")}</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>{t("settings.font_hint")}</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[{id:"sm",label:t("settings.font_sm"),size:13},{id:"md",label:t("settings.font_md"),size:15},{id:"lg",label:t("settings.font_lg"),size:17}].map(({id,label,size})=>{
            const active=(settings.fontSize||"md")===id;
            return(
              <button key={id} onClick={()=>{setSettings(s=>({...s,fontSize:id}));persistUiToSupabase&&persistUiToSupabase({fontSize:id});}}
                style={{flex:1,padding:"14px 6px",borderRadius:12,border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,fontSize:size,transform:active?"scale(1.04)":"scale(1)"}}>
                {label}
              </button>
            );
          })}
        </div>
        <div style={{background:"var(--bg-input)",borderRadius:10,padding:14,border:"1px solid var(--border-ui)",fontSize:settings.fontSize==="sm"?13:settings.fontSize==="lg"?17:15,color:"var(--text-muted)",lineHeight:1.7}}>
          {t("settings.font_preview")}
        </div>
      </div>}

      {sec==="bg"&&<div style={box}>
        <div style={hdr}>{t("settings.bg_header")}</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>{t("settings.bg_hint")}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {BACKGROUNDS.map(bg=>{
            const active=(settings.bg||"none")===bg.id;
            return(
              <button key={bg.id} onClick={()=>{
                setSettings(s=>({...s,bg:bg.id}));
                persistUiToSupabase&&persistUiToSupabase({bg:bg.id});
              }}
                style={{padding:"18px 6px",borderRadius:12,border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)",minHeight:80,background:active?"var(--pa12)":"#1a1a2e"}}>
                <span style={{fontSize:26}}>{bg.emoji}</span>
                <span style={{fontSize:11,color:active?"var(--p)":"#aaa",fontWeight:active?700:400}}>{t("settings.bgs."+bg.id)}</span>
                {active&&<span style={{fontSize:9,color:"var(--p)"}}>{t("settings.active")}</span>}
              </button>
            );
          })}
        </div>
      </div>}

      {sec==="dark"&&<div style={box}>
        <div style={hdr}>{t("settings.dark_header")}</div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:16}}>{t("settings.dark_hint")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {id:"dark",  icon:"🌙", shell:"#0d0d1a", card:"#13131f"},
            {id:"dim",   icon:"⬛", shell:"#1e1e24", card:"#28282f"},
            {id:"lgray", icon:"🔘", shell:"#9e9b98", card:"#e0dedd"},
            {id:"light", icon:"☀️", shell:"#f7f7f7", card:"#ffffff"},
          ].map(({id,icon,shell,card})=>{
            const label=t("settings.dark_modes."+id+".label");
            const desc=t("settings.dark_modes."+id+".desc");
            const active=themeMode===id;
            return(
              <button key={id}
                onClick={()=>{setThemeMode(id);persistUiToSupabase&&persistUiToSupabase({darkMode:id==="dark"||id==="dim",themeMode:id});}}
                style={{padding:"20px 8px 16px",borderRadius:14,
                  border:`2px solid ${active?"var(--p)":"transparent"}`,
                  background:active?"var(--pa08)":"rgba(255,255,255,.03)",
                  boxShadow:active?"0 0 18px rgba(var(--gold-rgb),.18)":"none",
                  cursor:"pointer",fontFamily:"inherit",outline:"none",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                  transition:"all .2s",WebkitTapHighlightColor:"transparent"}}>
                <div style={{width:44,height:30,borderRadius:8,background:shell,border:`1.5px solid ${card}`,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4,fontSize:18}}>
                  {icon}
                </div>
                <span style={{fontSize:13,fontWeight:700,color:active?"var(--p)":"var(--text-primary)"}}>{label}</span>
                <span style={{fontSize:10,color:"var(--text-muted)",textAlign:"center"}}>{desc}</span>
                {active&&<span style={{fontSize:10,color:"var(--p)",fontWeight:700,marginTop:2}}>{t("settings.active")}</span>}
              </button>
            );
          })}
        </div>
      </div>}

      {sec==="tone"&&<div style={box}>
        <div style={hdr}>{t("settings.tone_header")}</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>{t("settings.tone_hint")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(tn=>{
            const active=settings.defaultTone===tn.id;
            return(
              <button key={tn.id} onClick={()=>{setSettings(s=>({...s,defaultTone:tn.id}));playTone(tn.id,0.8);persistUiToSupabase&&persistUiToSupabase({defaultTone:tn.id});}}
                style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center"}}>
                {t("settings.tones."+tn.id)} {active&&"✓"}
              </button>
            );
          })}
        </div>
      </div>}

      {sec==="social"&&<div style={box}>
        <div style={hdr}>{t("settings.social_header")}</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:12,background:"rgba(255,255,255,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid var(--border-ui)"}}>
          {t("settings.social_readonly")}
        </div>
        {socialLinks?.enabled
          ?<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {socialLinks.email&&<a href={`mailto:${socialLinks.email}`} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"var(--surface-1)",border:"1px solid var(--border-ui)",textDecoration:"none",color:"#fff"}}>
              <span style={{fontSize:18}}>📧</span><span style={{fontSize:13}}>{socialLinks.email}</span>
            </a>}
            {socialLinks.whatsapp&&<a href={`https://wa.me/966${socialLinks.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"var(--surface-1)",border:"1px solid var(--border-ui)",textDecoration:"none",color:"#fff"}}>
              <span style={{fontSize:18}}>💬</span><span style={{fontSize:13}}>{socialLinks.whatsapp}</span>
            </a>}
            {socialLinks.twitter&&<a href={`https://twitter.com/${socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"var(--surface-1)",border:"1px solid var(--border-ui)",textDecoration:"none",color:"#fff"}}>
              <span style={{fontSize:18}}>🐦</span><span style={{fontSize:13}}>{socialLinks.twitter}</span>
            </a>}
            {(socialLinks.telegram||socialLinks.telegramUser)&&<a href={`https://t.me/${(socialLinks.telegramUser||socialLinks.telegram).replace(/^0/,"").replace("@","")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"var(--surface-1)",border:"1px solid var(--border-ui)",textDecoration:"none",color:"#fff"}}>
              <span style={{fontSize:18}}>✈</span><span style={{fontSize:13}}>{socialLinks.telegramUser||socialLinks.telegram}</span>
            </a>}
            {(socialLinks.customFields||[]).filter(f=>f&&f.label&&(f.value||"").trim()).map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"var(--surface-1)",border:"1px solid var(--border-ui)",color:"#fff"}}>
                <span style={{fontSize:18}}>📌</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"var(--text-muted)"}}>{f.label}</div>
                  <div style={{fontSize:13}}>{f.value}</div>
                </div>
              </div>
            ))}
          </div>
          :<div style={G.empty}>{t("settings.social_empty")}</div>
        }
      </div>}

      {sec==="guide"&&<div style={box}>
        <div style={hdr}>{t("settings.guide_header")}</div>
        {[
          {title:t("settings.guide_client_title"),steps:t("settings.guide_client_steps",{returnObjects:true})},
          {title:t("settings.guide_salon_title"), steps:t("settings.guide_salon_steps",{returnObjects:true})},
        ].map(({title,steps})=>(
          <div key={title} style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:8}}>{title}</div>
            {Array.isArray(steps)&&steps.map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"var(--p)",color:"#000",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:12,color:"#ccc",lineHeight:1.6}}>{s}</div>
              </div>
            ))}
          </div>
        ))}
      </div>}

      {sec==="faq"&&<div style={box}>
        <div style={hdr}>{t("settings.faq_header")}</div>
        {(t("settings.faqs",{returnObjects:true})||[]).map(({q,a},i)=>(
          <FAQItem key={i} q={q} a={a}/>
        ))}
      </div>}

      {sec==="danger"&&<div style={{background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid #c0392b33"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:6,borderBottom:"1px solid #c0392b33"}}>{t("settings.danger_header")}</div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:12}}>{t("settings.danger_hint")}</div>
        <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{if(confirm(t("settings.danger_confirm"))){localStorage.clear();window.location.reload();}}}>{t("settings.danger_btn")}</button>
      </div>}

      <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:13,padding:14,border:"1px solid var(--pa25)",marginTop:4,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:900,color:"var(--p)",letterSpacing:1}}>دورك ✂</div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{t("settings.version")}</div>
      </div>
    </div></div>
  );
}

function FAQItem({q,a}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:8,borderRadius:10,border:"1px solid var(--border-ui)",overflow:"hidden"}}>
      <button style={{width:"100%",padding:"11px 14px",background:"var(--bg-input)",border:"none",color:"#fff",fontSize:13,fontWeight:700,textAlign:"right",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>setOpen(p=>!p)}>
        <span>{q}</span><span style={{color:"var(--p)",fontSize:14,transform:open?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>v</span>
      </button>
      {open&&<div style={{padding:"10px 14px",background:"var(--surface-1)",fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>{a}</div>}
    </div>
  );
}

// ==============================================
//  HELPERS
// ==============================================
function SL({children}){return <div style={G.sl2}>{children}</div>;}
function F({label,error,children,style}){return <div style={{marginBottom:11,...style}}>{label&&<label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:3,fontWeight:600}}>{label}</label>}{children}{error&&<div style={G.err}>{error}</div>}</div>;}
const fi=(err)=>({width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${err?"#e74c3c":"var(--border-ui)"}`,background:"var(--surface-1)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"});

// ==============================================
//  GLOBAL STYLES
// ==============================================
const CSS=`
  :root {
    --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23;
    --pa5: rgba(var(--gold-rgb),.05); --pa07: rgba(var(--gold-rgb),.07); --pa08: rgba(var(--gold-rgb),.08);
    --pa12: rgba(var(--gold-rgb),.12); --pa15: rgba(var(--gold-rgb),.15); --pa18: rgba(var(--gold-rgb),.18);
    --pa2: rgba(var(--gold-rgb),.2); --pa25: rgba(var(--gold-rgb),.25); --pa3: rgba(var(--gold-rgb),.3);
    --pa4: rgba(var(--gold-rgb),.45);
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
  html.dork-dark input[type=date]::-webkit-calendar-picker-indicator,
  html.dork-dark input[type=time]::-webkit-calendar-picker-indicator,
  html.dork-dim input[type=date]::-webkit-calendar-picker-indicator,
  html.dork-dim input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;}
  html.dork-light select option,html.dork-lgray select option{background:#ffffff;color:#1c1c1e;}
  html.dork-dim select option{background:#28282f;color:#ededf2;}
  html.dork-light body,html.dork-light body *{scrollbar-color:#e0e0e0 #f7f7f7;}
  html.dork-lgray body,html.dork-lgray body *{scrollbar-color:#5a5a5c #9e9b98;}
  html.dork-lgray body{font-weight:500;}
  html.dork-light{color-scheme:light;}
  html.dork-lgray{color-scheme:light;}
  html.dork-dim{color-scheme:dark;}
  html.dork-light input,html.dork-light textarea,html.dork-light select,
  html.dork-lgray input,html.dork-lgray textarea,html.dork-lgray select{
    background:var(--bg-input)!important;color:var(--text-primary)!important;
    border-color:var(--border-ui)!important;}
  html.dork-dim input,html.dork-dim textarea,html.dork-dim select{
    background:var(--bg-input)!important;color:var(--text-primary)!important;
    border-color:var(--border-ui)!important;}
  button:active{opacity:.82;}
`;

const G={
  searchRow:{display:"flex",alignItems:"center",gap:8,background:"var(--surface-1)",borderRadius:10,border:"1.5px solid var(--border-ui)",padding:"9px 12px"},
  searchInput:{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontSize:14,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  searchClear:{background:"var(--border-ui)",border:"none",color:"var(--text-muted)",cursor:"pointer",borderRadius:"50%",width:22,height:22,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  sortChip:{padding:"6px 12px",borderRadius:20,border:"1.5px solid var(--chip-border)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0},
  sortChipOn:{background:"var(--pa15)",border:"1.5px solid var(--p)",color:"var(--p)"},
  app:{minHeight:"100vh",background:"var(--shell-bg)",color:"var(--text-primary)",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  page:{maxWidth:480,margin:"0 auto",minHeight:"100vh",paddingBottom:30},
  toast:{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",padding:"10px 22px",borderRadius:11,color:"#fff",fontWeight:700,zIndex:9999,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"},

  // TOP BAR
  topBar:{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"var(--shell-bg)",borderBottom:"1px solid var(--border-ui)",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",maxWidth:480,margin:"0 auto"},
  roleBtn:{width:36,height:36,borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--text-muted)",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  roleBtnActive:{border:"1.5px solid var(--p)",color:"var(--p)",background:"rgba(var(--pr),.1)"},
  roleDot:{position:"absolute",top:-4,right:-4,background:"#e74c3c",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  registerTopBtn:{background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"7px 13px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  fRow:{display:"flex",alignItems:"center",background:"var(--surface-1)",borderRadius:9,border:"1.5px solid var(--border-ui)",padding:"7px 11px",gap:7},
  fSel:{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},

  toggleBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  toggleOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},

  section:{padding:"10px 14px 0"},
  badge:{background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700},
  empty:{textAlign:"center",color:"var(--text-muted)",padding:"36px 0",fontSize:13},

  card:{background:"rgba(19,19,31,0.82)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:14,padding:13,border:"1px solid var(--border-ui)",boxShadow:"0 4px 16px rgba(0,0,0,.3)"},
  cav:{width:38,height:38,borderRadius:10,background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0},
  tag:{background:"var(--surface-2)",color:"var(--p)",padding:"2px 8px",borderRadius:20,fontSize:10,border:"1px solid var(--border-ui)"},
  favBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"var(--text-muted)",padding:0,lineHeight:1},
  favOn:{color:"#e74c3c"},

  mapsBtn:{background:"rgba(42,109,217,.12)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  pageBtn:{background:"rgba(100,60,180,.15)",border:"1.5px solid #7c4dff",color:"#b39ddb",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  bookBtn:{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"8px 0",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},
  delBtn:{background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"5px 9px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  accBtn:{flex:1,background:"rgba(39,174,96,.15)",border:"1.5px solid #27ae60",color:"#4caf50",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},
  rejBtn:{flex:1,background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},

  fp:{padding:"0 13px 24px"},
  fh:{display:"flex",alignItems:"center",gap:8,padding:"12px 0 13px",position:"sticky",top:64,background:"var(--shell-bg)",zIndex:10},
  bb:{background:"rgba(var(--gold-rgb),.08)",border:"1.5px solid rgba(var(--gold-rgb),.3)",color:"var(--p)",fontSize:12,fontWeight:700,cursor:"pointer",padding:"6px 14px",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"'Cairo',sans-serif",flexShrink:0,WebkitAppearance:"none",appearance:"none"},
  ft:{fontSize:17,fontWeight:700,color:"var(--text-primary)"},
  fc:{background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10},
  sl2:{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:9,paddingBottom:5,borderBottom:"1px solid var(--border-ui)"},
  err:{color:"#e74c3c",fontSize:11,marginTop:2},
  sub:{width:"100%",background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,fontFamily:"'Cairo',sans-serif"},

  salonBadge:{display:"flex",alignItems:"center",gap:8,background:"rgba(var(--pr),.06)",border:"1px solid var(--pa2)",borderRadius:10,padding:"10px 12px",marginBottom:11},
  tabRow:{display:"flex",gap:6,marginBottom:11},
  tabBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3},
  tabOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  notifDot:{background:"#e74c3c",color:"#fff",borderRadius:20,fontSize:9,padding:"1px 5px",fontWeight:700},

  steps:{display:"flex",marginBottom:11},
  si:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.3,transition:"opacity .2s"},
  sd:{width:24,height:24,borderRadius:"50%",background:"var(--p)",color:"#000",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"},

  chip:{padding:"5px 11px",borderRadius:20,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  chipOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  totalBox:{background:"var(--pa07)",border:"1px solid var(--pa2)",borderRadius:8,padding:"7px 11px",fontSize:12,color:"var(--text-primary)",marginBottom:10},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10},
  ts:{padding:"8px 3px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",textAlign:"center"},
  tsF:{background:"var(--surface-2)",color:"var(--text-muted)",borderColor:"var(--border-ui)",cursor:"not-allowed",opacity:.5},
  tsS:{background:"var(--pa15)",borderColor:"var(--p)",color:"var(--p)",fontWeight:700},

  bItem:{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)"},
  pmBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--p)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0},

  locTab:{flex:1,padding:"7px 0",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  locTabOn:{background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff"},
  detectBtn:{width:"100%",background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"10px 0",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  otherBtn:{marginTop:6,width:"100%",background:"transparent",border:"1.5px dashed #2a6dd9",color:"#6aadff",padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  addBarberBtn:{width:"100%",background:"transparent",border:"1.5px dashed var(--p)",color:"var(--p)",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",marginBottom:3},
  ratingBadge:{background:"var(--pa15)",border:"1px solid rgba(var(--pr),.4)",borderRadius:8,padding:"3px 8px",fontSize:12,fontWeight:700,color:"var(--p)",flexShrink:0,display:"flex",alignItems:"center",gap:3},
  heartCardBtn:{width:36,height:36,borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cairo',sans-serif"},
  heartCardOn:{border:"1.5px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c"},
  xBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #c0392b",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
};
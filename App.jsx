import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTranslation } from 'react-i18next';
import i18n, { SALON_LANGS, CLIENT_LANGS } from './src/i18n.js';
import {
  IconTrash, IconShare, IconDragHandle, IconHeart, IconError, IconSuccess, IconScissors, IconClose,
  IconPin, IconBell, IconStar, IconBlocked, IconWarning, IconFire, IconCheck, IconCalendar, IconBarberPole,
  IconLightning, IconUser, IconPencil, IconRefresh, IconClipboard, IconLock, IconChart, IconGlobe,
  IconMobile, IconChat, IconCall, IconMoneyBag, IconCash, IconMoon, IconQuestion, IconLogout,
  IconGroup, IconXLogo, IconTelegram, IconCamera, IconGear, IconPalette, IconImagePic, IconFontSize,
  IconTag, IconGift, IconBook, IconRadioFilled, IconTrendUp, IconRocket, IconBulb, IconCard,
  IconMail, IconClock, IconThumbtack, IconSearch, IconSave, IconFileExport, IconDiscountSeal,
  IconStarOutline, IconScale, IconNone, IconSun, IconSparkle, IconGridLines, IconWaves, IconCrown,
  IconDiamond, IconLeaf, IconGemCut, IconVaseHandles, IconBlossom, IconCoral, IconWineGlass,
  IconTree, IconCrystalBall, IconStarRadiant, IconCalendarGrid, IconMedal, IconCoinArrow, IconOverlapCircles,
  IconPebble, IconReceipt, IconCircuitNodes, IconArrowLeft, IconArrowRight, IconArrowUp, IconArrowDown,
  IconArrowReturn, IconChevronLeft, IconChevronRight, IconChevronDown, IconSwapHorizontal, IconEye,
  IconEyeOff, IconRazor, IconMusicNote, IconMusicNotes, IconTrumpet, IconConfetti, IconSteam,
  IconWaterDrops, NotifIcon, LabelWithIcon
} from "./src/components/icons.jsx";
import {
  APP_VERSION, SLOT_STEP, SLOT_MIN, BUFFER_MIN, DEFAULT_SOCIAL_LINKS, TONES, THEMES, BACKGROUNDS,
  BG_LIGHT_STYLES, NOTIF_TEXTS, BASE_LOC, DEFAULT_SERVICES, ALL_LANG_INFO
} from "./src/constants.js";
import {
  getTodayDateInRiyadh, IMG_FMT, hashPin, toAppSalon, toAppCustomer, normalizeBgId,
  buildDorkBgStyle, playTone, getCustomerClassification, makeSlots, getSlotsForSalon,
  getSlotsForBarber, todayStr, to12h, toM, openMaps, calcTotal, normPhone, icsEscape,
  icsDateTime, buildICS, downloadICS, optimizeImageUrl, getCachedData
} from "./src/utils.js";
import { CSS, G } from "./src/styles.js";
import { ErrorBoundary } from "./src/components/ErrorBoundary.jsx";
import { DorkLogoSvg, ShareBtn, SL, F, fi } from "./src/components/ui.jsx";
import { CustomerDrawer } from "./src/components/CustomerDrawer.jsx";
import { SalonDrawer } from "./src/components/SalonDrawer.jsx";
import { EntryView, TopBar } from "./src/components/nav.jsx";
import { SalonReviewsView, SalonCard } from "./src/components/SalonCard.jsx";
import { SalonPage, BookView } from "./src/components/SalonPage.jsx";
import { StatsPanel, NotifPanel } from "./src/components/OwnerPanels.jsx";

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

// ==============================================
//  CHAT CONTEXT — يحتفظ بالرسائل في localStorage مع تنظيف 30 يوم
// ==============================================
const ChatCtx = React.createContext(null);
const CHAT_STORAGE_KEY = "dork_chats";
const THIRTY_DAYS_MS   = 30 * 24 * 60 * 60 * 1000;

function loadChatsFromStorage() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const cleaned = {};
    for (const [key, msgs] of Object.entries(parsed)) {
      const recent = (msgs || []).filter(m => (now - new Date(m.created_at).getTime()) < THIRTY_DAYS_MS);
      if (recent.length > 0) cleaned[key] = recent;
    }
    return cleaned;
  } catch { return {}; }
}

export function ChatProvider({ children }) {
  const [chats, setChats] = React.useState(loadChatsFromStorage);

  React.useEffect(() => {
    try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats)); } catch {}
  }, [chats]);

  const setMessages = React.useCallback((key, msgs) => {
    setChats(prev => ({ ...prev, [key]: msgs }));
  }, []);

  const addMessage = React.useCallback((key, msg) => {
    setChats(prev => {
      const existing = prev[key] || [];
      if (existing.some(m => m.id === msg.id)) return prev;
      return { ...prev, [key]: [...existing, msg] };
    });
  }, []);

  const value = React.useMemo(
    () => ({ chats, setMessages, addMessage }),
    [chats, setMessages, addMessage]
  );

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

function useChat(key) {
  const ctx = React.useContext(ChatCtx);
  const msgs = ctx?.chats[key] || [];
  const sm = ctx?.setMessages;
  const am = ctx?.addMessage;
  const setMsgs = React.useCallback((m) => sm?.(key, m), [sm, key]);
  const addMsg  = React.useCallback((m) => am?.(key, m), [am, key]);
  return { msgs, setMsgs, addMsg };
}

// ==============================================
//  SUPABASE CLIENT
// ==============================================
const SUPABASE_URL    = import.meta.env.VITE_SUPABASE_URL  || "https://kowotztbxgoodvnjyxyq.supabase.co";
const SUPABASE_ANON   = import.meta.env.VITE_SUPABASE_ANON || "sb_publishable_FZoSBhhAiKi8cefVUyg2eQ_GqUTlTg2";

// Supabase JS client — autoRefreshToken يُجدّد JWT تلقائياً قبل انتهائه
// إعدادات Dashboard المطلوبة: Auth → JWT expiry = 3600s، Enable reuse detection = ON
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Circuit Breaker — نقطة 25: توقف بعد 3 فشل متتاليين، انتظر 30 ثانية
const _cb = { fails: 0, openUntil: 0 };

export async function sb(table, method, body, query = "", authToken = null) {
  if (_cb.openUntil > Date.now()) {
    throw new Error("circuit_open");
  }
  if (!authToken) {
    try {
      const { data } = await supabase.auth.getSession();
      authToken = data?.session?.access_token || null;
    } catch {}
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${authToken || SUPABASE_ANON}`,
        "Content-Type": "application/json",
        "Prefer": method === "POST" ? "return=representation" : "return=minimal",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (++_cb.fails >= 3) { _cb.openUntil = Date.now() + 30_000; _cb.fails = 0; }
    throw e;
  }
  if (!res.ok) {
    const err = await res.text();
    if (++_cb.fails >= 3) { _cb.openUntil = Date.now() + 30_000; _cb.fails = 0; }
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }
  _cb.fails = 0;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}


async function ownerApi(method, body) {
  const res = await fetch("/api/owner-salon", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `owner-salon ${method} failed`);
  return data;
}

// ========== Web Push Notifications (بدون Firebase) ==========

const VAPID_PUBLIC_KEY = "BAiPrlWpzRxfgx_BJoi0SX46F6ZwuJNnl20nmPwO3KcCedIUq5ghPqE6qSDSpye3Ogx7OQT-51jAUwdibazE8g4";

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function _callRegisterPushSub(userType, userId, sub) {
  if (!sub || !userType || !userId) return;
  await supabase.functions.invoke("register-push-sub", {
    body: { subscription: sub, user_type: userType, user_id: userId },
  }).catch(() => {});
}

async function requestNotificationPermission() {
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      localStorage.setItem("fcm_debug", "permission-denied");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      localStorage.setItem("fcm_debug", "permission-" + permission);
      return false;
    }
    return true;
  } catch (err) {
    localStorage.setItem("fcm_debug", "permission-error:" + err.message);
    return false;
  }
}

export async function initializeWebPushNotifications() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const swReg = await navigator.serviceWorker.register("/push-sw.js", { updateViaCache: "none", scope: "/" });
    await navigator.serviceWorker.ready;

    let sub = await swReg.pushManager.getSubscription();
    if (sub) {
      const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const currentKey = sub.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
      const keyMatches = currentKey && currentKey.length === expectedKey.length && currentKey.every((v, i) => v === expectedKey[i]);
      if (!keyMatches) { await sub.unsubscribe().catch(() => {}); sub = null; }
    }
    if (!sub) {
      localStorage.setItem("fcm_debug", "subscribing...");
      sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = sub.toJSON();
    localStorage.setItem("fcm_debug", "ok:" + sub.endpoint.slice(-16));
    localStorage.setItem("fcm_token", sub.endpoint);
    localStorage.setItem("fcm_registered_at", String(Date.now()));

    const ow = localStorage.getItem("dork_owner");
    const cu = localStorage.getItem("dork_customer");
    if (ow) await _callRegisterPushSub("salon", +ow, subJson);
    if (cu) { try { const cp = JSON.parse(cu); await _callRegisterPushSub("customer", cp.id, subJson); } catch {} }

  } catch (error) {
    if (error.message?.includes("permission") || error.message?.includes("blocked")) {
      localStorage.removeItem("fcm_token");
    }
    localStorage.setItem("fcm_debug", "ERROR:" + error.message);
    console.error("Push Error:", error.message);
  }
}

async function registerPushSubForUser(userType, userId) {
  try {
    const swReg = await navigator.serviceWorker.getRegistration("/push-sw.js").catch(() => null);
    if (!swReg) return;
    const sub = await swReg.pushManager.getSubscription().catch(() => null);
    if (!sub) return;
    await _callRegisterPushSub(userType, userId, sub.toJSON());
  } catch {}
}

async function smartPushRefresh() {
  try {
    const swReg = await navigator.serviceWorker.getRegistration("/push-sw.js").catch(() => null);
    if (!swReg) return;
    const sub = await swReg.pushManager.getSubscription().catch(() => null);
    if (!sub) return;
    const cachedEndpoint = localStorage.getItem("fcm_token");
    const lastReg = parseInt(localStorage.getItem("fcm_registered_at") || "0");
    const hoursSince = (Date.now() - lastReg) / 3_600_000;
    if (sub.endpoint === cachedEndpoint && hoursSince < 24) return;
    const subJson = sub.toJSON();
    localStorage.setItem("fcm_token", sub.endpoint);
    localStorage.setItem("fcm_registered_at", String(Date.now()));
    const ow = localStorage.getItem("dork_owner");
    const cu = localStorage.getItem("dork_customer");
    if (ow) await _callRegisterPushSub("salon", +ow, subJson);
    if (cu) { try { const cp = JSON.parse(cu); await _callRegisterPushSub("customer", cp.id, subJson); } catch {} }
  } catch {}
}

// ==============================================
//  PUSH NOTIFICATIONS
// ==============================================

async function requestNotifPermission(){
  if(!("Notification" in window))return false;
  if(Notification.permission==="granted")return true;
  const p=await Notification.requestPermission();
  return p==="granted";
}

const ntxt=(lang)=>NOTIF_TEXTS[lang]||NOTIF_TEXTS.ar;

function sendNotif(title,body,icon="✂",targetType="all",targetId=null){
  // زيادة عداد الجرس
  const count=parseInt(localStorage.getItem("dork_notif_count")||"0");
  localStorage.setItem("dork_notif_count",String(count+1));
  // حفظ الإشعار محلياً
  try{
    const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
    notifs.unshift({id:Date.now(),title,body,icon,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),read:false});
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

// ==============================================
//  ROOT
// ==============================================
export { ErrorBoundary };
export default function App(){
  const[salons,setSalons]=useState(()=>{
    try{
      const c=localStorage.getItem("dork_salons_cache");
      if(!c)return[];
      const p=JSON.parse(c);
      return Array.isArray(p)?p:Array.isArray(p?.data)?p.data:[];
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
  const[themeMode,setThemeMode]=useState(()=>{try{const t=localStorage.getItem("dork_theme");if(t==="dark"||t==="dim"||t==="light"||t==="lgray")return t;return localStorage.getItem("dork_dark")==="0"?"light":"dark";}catch{return"dark";}});
  const darkMode=themeMode==="dark"||themeMode==="dim";
  const setDarkMode=useCallback((v)=>setThemeMode(v?"dark":"light"),[]);
  const[compareSalons,setCompareSalons]=useState([]); // مقارنة صالونين
  const[pullRefreshing,setPullRefreshing]=useState(false); // Pull to refresh
  const[rescheduleId,setRescheduleId]=useState(null);
  const[quickBookSeed,setQuickBookSeed]=useState(null);

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
      setProp("--p-text","#ffffff");
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


  useEffect(() => {
    initializeWebPushNotifications().catch(() => {});
  }, []);

  // -- تسجيل الدخول المستمر --
  const[ownerSession,setOwnerSession]=useState(()=>{try{const v=localStorage.getItem("dork_owner");return v?+v:null;}catch{return null;}});
  const[customerSession,setCustomerSession]=useState(()=>{try{const v=localStorage.getItem("dork_customer");return v?JSON.parse(v):null;}catch{return null;}});

  const bookingStatusSnapRef=useRef(null);
  const updatingBookingsRef=useRef(new Set());
  const customerNotifyPrimedRef=useRef(false);

  useEffect(()=>{try{if(ownerSession)localStorage.setItem("dork_owner",String(ownerSession));else localStorage.removeItem("dork_owner");}catch{}},[ownerSession]);
  useEffect(()=>{try{if(customerSession)localStorage.setItem("dork_customer",JSON.stringify(customerSession));else localStorage.removeItem("dork_customer");}catch{}},[customerSession]);

  const{t,i18n:appI18n}=useTranslation();
  useEffect(()=>{
    const lng=appI18n.language;
    if(ownerSession)sb("salons","PATCH",{lang:lng},`?id=eq.${ownerSession}`).catch(()=>{});
    if(customerSession?.id)sb("customers","PATCH",{lang:lng},`?id=eq.${customerSession.id}`).catch(()=>{});
  },[appI18n.language]);

  const[socialLinks,setSocialLinks]=useState({...DEFAULT_SOCIAL_LINKS});
  const[appSettingsId,setAppSettingsId]=useState(null);
  const appSettingsIdRef=useRef(null);
  useEffect(()=>{appSettingsIdRef.current=appSettingsId;},[appSettingsId]);

  const loadAppSettings=useCallback(async(opts)=>{
    const silent=opts&&opts.silent;
    try{
      try{localStorage.removeItem('cache_app_settings');}catch{}
      const rows=await getCachedData("app_settings",()=>sb("app_settings","GET",null,"?order=id.asc&limit=1"),0);
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
            // localStorage (user preference) takes priority over admin defaults
            let local={};try{const v=localStorage.getItem("dork_ui");if(v)local=JSON.parse(v);}catch{}
            const hasLocal=Object.keys(local).length>0;
            setSettings(s=>({
              ...s,
              theme:hasLocal?(local.theme??u.theme??s.theme):(u.theme??s.theme),
              fontSize:hasLocal?(local.fontSize??u.fontSize??s.fontSize):(u.fontSize??s.fontSize),
              defaultTone:hasLocal?(local.defaultTone??u.defaultTone??s.defaultTone):(u.defaultTone??s.defaultTone),
              bg:normalizeBgId(hasLocal?(local.bg??u.bg??s.bg??"none"):(u.bg??s.bg??"none")),
            }));
            const resolvedMode=hasLocal?(local.themeMode??u.themeMode):(u.themeMode);
            if(resolvedMode&&["dark","dim","light","lgray"].includes(resolvedMode))setThemeMode(resolvedMode);
          }catch{}
        }
      }
    }catch{
      if(!silent){
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
  const[fPriceMin,setFPriceMin]=useState("");
  const[fPriceMax,setFPriceMax]=useState("");
  const[userLoc,setUserLoc]=useState(null);
  const[homeResetKey,setHomeResetKey]=useState(0);
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

  const toast$=(msg,type="ok",ms=3200)=>{setToast({msg,type});setTimeout(()=>setToast(null),ms);};

  // فحص صلاحية كوكي جلسة صاحب الصالون عند تحميل التطبيق - لو كانت منتهية أو
  // غير صالحة (مثلاً بعد 30 يوم أو حذف الكوكي يدويًا) نرجّعه لتسجيل الدخول
  // بدل عرض لوحة تحكم ستفشل كل عملية حفظ فيها.
  useEffect(()=>{
    if(!ownerSession)return;
    (async()=>{
      try{
        await ownerApi("GET");
      }catch{
        setOwnerSession(null);
        setView("ownerLogin");
        toast$(i18n.t('ui.session_expired'),"err");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // poll خلفي: عدد رسائل العملاء غير المقروءة (للصالون) — يُغذّي badge الدرج + toast
  const[salonMsgUnread,setSalonMsgUnread]=useState(0);
  const _prevSMUnreadRef=useRef(-1);
  const _ownerTabRef=useRef(null);
  useEffect(()=>{_ownerTabRef.current=ownerTab;},[ownerTab]);
  useEffect(()=>{
    if(!ownerSession){_prevSMUnreadRef.current=-1;setSalonMsgUnread(0);return;}
    _prevSMUnreadRef.current=-1;
    const poll=async()=>{
      try{
        const res=await fetch("/api/owner-chat?list=1",{credentials:"include"});
        const data=await res.json();
        if(!Array.isArray(data))return;
        const total=data.reduce((a,c)=>a+(c.unread_count||0),0);
        setSalonMsgUnread(total);
        if(_prevSMUnreadRef.current>=0&&total>_prevSMUnreadRef.current&&_ownerTabRef.current!=="messages"){
          toast$("💬 رسالة جديدة من عميل","info");
        }
        _prevSMUnreadRef.current=total;
      }catch{}
    };
    poll();
    const id=setInterval(poll,20000);
    const ch=supabase.channel(`app-owner-msgs-${ownerSession}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${ownerSession}`},(payload)=>{
        if(payload?.new?.from_customer)poll();
      })
      .subscribe();
    return()=>{clearInterval(id);supabase.removeChannel(ch);};
  },[ownerSession]);

  // -- تحميل البيانات من Supabase --
  const loadData = useCallback(async (opts) => {
    const silent=opts&&opts.silent;
    try {
      if(!silent)setLoading(true);
      const [salonRows,bookingRows,custRows]=await Promise.all([
        sb("salons","GET",null,"?select=id,name,owner,owner_phone,owner_email,region,gov,center,village,phone,address,location_url,services,prices,shift_enabled,shift1_start,shift1_end,shift2_start,shift2_end,work_start,work_end,barbers,tone,rating,status,paused,frozen,banned,welcome_msg,closed_days,slot_min,cancellation_window,total_paid,social,created_at&status=eq.approved&frozen=eq.false&order=created_at.desc&limit=500"),
        sb("bookings","GET",null,"?select=id,salon_id,customer_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,slot_duration_minutes,created_at&order=created_at.desc&limit=1000").catch(()=>[]),
        sb("customers","GET",null,"?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at,blocked&limit=500").catch(()=>[]),
      ]);
      const reviewRows=await sb("reviews","GET",null,"?select=id,salon_id,customer_id,customer_name,rating,comment,owner_reply,booking_date,created_at&order=created_at.desc&limit=20").catch(()=>[]);
      const promoRows=await sb("promotions","GET",null,"?select=id,salon_id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&status=eq.active&order=created_at.desc&limit=200").catch(()=>[]);
      const now=new Date();
      const activePromoRows=(promoRows||[]).filter(r=>!r.ends_at||new Date(r.ends_at)>now);
      const toBooking=b=>({
        id:b.id,salonId:b.salon_id,customer_id:b.customer_id||null,
        name:b.customer_name||"",phone:b.customer_phone||"",
        services:(()=>{try{return JSON.parse(b.service||"[]");}catch{return b.service?[b.service]:[]}})(),
        barberId:b.barber_id||"any",barberName:b.barber_name||"",
        date:b.date||"",time:b.time||"",total:b.total||0,
        status:b.status||"pending",attendance:b.attendance||null,
        slotDuration:b.slot_duration_minutes||null,
      });
      const salonsWithBookings=salonRows.map(row=>{
        const salon=toAppSalon(row);
        salon.bookings=bookingRows.filter(b=>String(b.salon_id)===String(row.id)).map(toBooking);
        return salon;
      });
      setSalons(salonsWithBookings);
      try{
        // حفظ نسخة مصغرة للكاش (بدون services/prices/barbers) لضمان النجاح في Safari
        const slim=salonsWithBookings.map(s=>({id:s.id,name:s.name,region:s.region,gov:s.gov,center:s.center,village:s.village,phone:s.phone,address:s.address,locationUrl:s.locationUrl,tone:s.tone,rating:s.rating,status:s.status,paused:s.paused,frozen:s.frozen,banned:s.banned,workStart:s.workStart,workEnd:s.workEnd,closedDays:s.closedDays,shiftEnabled:s.shiftEnabled,shift1Start:s.shift1Start,shift1End:s.shift1End,shift2Start:s.shift2Start,shift2End:s.shift2End,slotMin:s.slotMin,bookings:s.bookings,services:[],prices:{},barbers:[]}));
        localStorage.setItem("dork_salons_cache",JSON.stringify({ts:Date.now(),data:slim}));
      }catch{}
      setCustomers(custRows.map(toAppCustomer));
      setReviews(reviewRows||[]);
      setPromotions(activePromoRows);
      setDbError(null);
    } catch(e) {
      console.error(e);
      setDbError(e.message==="circuit_open"?"الخدمة متوقفة مؤقتاً — سيُعاد المحاولة خلال 30 ثانية":e.message);
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
    const SALONS_CACHE_TTL=24*60*60*1000;
    let isCacheFresh=false;
    try{
      const raw=localStorage.getItem("dork_salons_cache");
      if(raw){const cached=JSON.parse(raw);isCacheFresh=!!(cached.ts&&(Date.now()-cached.ts)<SALONS_CACHE_TTL&&Array.isArray(cached.data));}
    }catch{}
    loadData(isCacheFresh?{silent:true}:{});
    loadAppSettings();
  },[loadData,loadAppSettings]);

  // تحديث البيانات لما يرجع المستخدم للتطبيق من الخلفية
  useEffect(()=>{
    const onVisible=()=>{
      if(document.visibilityState==="visible"){
        loadData({silent:true});
        loadAppSettings({silent:true});
        smartPushRefresh();
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
  const pollBookings=useCallback(async(salonId)=>{
    if(!salonId)return;
    try{
      const rows=await sb("bookings","GET",null,
        `?select=id,salon_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,slot_duration_minutes,created_at&salon_id=eq.${salonId}&order=created_at.desc&limit=500`
      );
      setSalons(prev=>prev.map(salon=>
        String(salon.id)!==String(salonId)?salon:{
          ...salon,
          bookings:rows.map(b=>({
            id:b.id,salonId:b.salon_id,
            name:b.customer_name||"",phone:b.customer_phone||"",
            services:(()=>{try{return JSON.parse(b.service||"[]");}catch{return b.service?[b.service]:[]}})(),
            barberId:b.barber_id||"any",barberName:b.barber_name||"",
            date:b.date||"",time:b.time||"",total:b.total||0,status:b.status||"pending",attendance:b.attendance||null,
            slotDuration:b.slot_duration_minutes||null,
          })),
        }
      ));
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
      const nowP=new Date();
      setPromotions((rows||[]).filter(r=>!r.ends_at||new Date(r.ends_at)>nowP));
    }catch{}
  },[]);

  useEffect(()=>{
    // حجوزات — لحظي في كل الاتجاهات (عميل ↔ صالون)
    const bookingChannel=supabase.channel('realtime-bookings')
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings'},(payload)=>{
        const sId=payload?.new?.salon_id||payload?.old?.salon_id;
        if(sId)pollBookings(sId);
      })
      .subscribe();

    // إشعارات الإدارة
    const notifChannel=supabase.channel('realtime-notifications')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},(payload)=>{
        const n=payload.new;
        if(!n)return;
        if(n.target_type==="customer"){
          try{
            const cu=localStorage.getItem("dork_customer");
            if(!cu)return;
            const cp=JSON.parse(cu);
            if(String(n.target_id)!==String(cp.id))return;
            const newNotif={id:n.id||Date.now(),title:n.title,body:n.body,icon:n.icon||"🔔",time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),read:false};
            const stored=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
            stored.unshift(newNotif);
            localStorage.setItem("dork_notifs",JSON.stringify(stored.slice(0,50)));
            window.dispatchEvent(new CustomEvent("dork-customer-notif",{detail:newNotif}));
          }catch{}
          return;
        }
        if(n.target_type==="broadcast"){
          try{
            const cu=localStorage.getItem("dork_customer");
            if(!cu)return;
            const cp=JSON.parse(cu);
            const history=JSON.parse(localStorage.getItem(`hist_${cp.id}`)||"[]");
            const hasBooked=history.some(h=>String(h.salonId)===String(n.target_id));
            if(!hasBooked)return;
            const newNotif={id:n.id||Date.now(),title:n.title,body:n.body,icon:n.icon||"🔥",time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),read:false};
            const stored=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
            stored.unshift(newNotif);
            localStorage.setItem("dork_notifs",JSON.stringify(stored.slice(0,50)));
            window.dispatchEvent(new CustomEvent("dork-customer-notif",{detail:newNotif}));
          }catch{}
          return;
        }
        const count=parseInt(localStorage.getItem("dork_notif_count")||"0");
        localStorage.setItem("dork_notif_count",String(count+1));
        try{
          const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
          notifs.unshift({id:n.id||Date.now(),title:n.title,body:n.body,icon:n.icon||"🔔",time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),read:false});
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
  },[loadAppSettings,pollBookings,pollReviews,pollPromotions,ownerSession]);

  useEffect(()=>{
    if(!customerSession?.id)return;
    const cust=customerSession;
    if(!cust)return;
    const phoneN=normPhone(cust.phone||"");
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
        toast$(i18n.t('ui.booking_accepted_at',{salon:salon?.name||""}));
        try{playTone("bell",0.55);}catch{}
      }else if(was==="pending"&&now==="rejected"){
        toast$(i18n.t('ui.booking_rejected_at',{salon:salon?.name||""}),"warn");
      }
    }
    bookingStatusSnapRef.current=snap;
  },[salons,customerSession]);

  const refreshSalonBookings=useCallback(async(salonId,customerId)=>{
    try{
      const custFilter=customerId?`&customer_id=eq.${customerId}`:"";
      const rows=await sb("bookings","GET",null,
        `?salon_id=eq.${salonId}${custFilter}&select=id,salon_id,customer_id,customer_name,customer_phone,barber_id,barber_name,service,date,time,total,status,attendance,slot_duration_minutes,created_at&order=created_at.desc&limit=500`
      );
      const bookings=rows.map(b=>({
        id:b.id,
        salonId:b.salon_id,
        customer_id:b.customer_id||null,
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
        slotDuration:b.slot_duration_minutes||null,
      }));
      setSalons(prev=>prev.map(s=>{
        if(String(s.id)!==String(salonId))return s;
        if(!customerId)return {...s,bookings};
        // نطاق عميل محدد: ندمج بدل الاستبدال — يمنع تضييق بيانات مشتركة (عدد الحجوزات بمقارنة الصالونات، إحصاءات لوحة الصالون)
        const others=(s.bookings||[]).filter(b=>String(b.customer_id)!==String(customerId));
        return {...s,bookings:[...others,...bookings]};
      }));
    }catch(e){console.error(e);}
  },[]);

  // Polling — fallback للـ Realtime كل 10 ثواني
  useEffect(()=>{
    const id=setInterval(()=>{if(ownerSession)pollBookings(ownerSession);pollReviews();pollPromotions();},10000);
    return()=>clearInterval(id);
  },[pollBookings,pollReviews,pollPromotions,ownerSession]);

  // إشعار التذكير التلقائي + طلب التقييم
  useEffect(()=>{
    if(!customerSession)return;
    const check=()=>{
      const cust=customerSession;
      if(!cust)return;
      const now=new Date();
      const globalReminderMins=parseInt(localStorage.getItem("dork_reminder")||"60");
      const reminded=JSON.parse(localStorage.getItem("dork_auto_reminded")||"[]");
      const reviewed=JSON.parse(localStorage.getItem("dork_auto_review")||"[]");
      for(const h of (cust.history||[])){
        if(!h.date||!h.time||h.status==="rejected"||h.status==="cancelled")continue;
        if(h.reminderMins===0)continue;
        const reminderMins=(typeof h.reminderMins==="number"&&h.reminderMins>0)?h.reminderMins:globalReminderMins;
        const dt=new Date(`${h.date}T${h.time}`);
        const minsUntil=(dt-now)/60000;
        const minsAfter=(now-dt)/60000;
        const key=`${h.salonId}-${h.date}-${h.time}`;
        // تذكير قبل الموعد
        if(minsUntil>0&&minsUntil<=reminderMins&&!reminded.includes(key)){
          const _rn=ntxt(appI18n.language).reminder(h.salonName||"",to12h(h.time));sendNotif(_rn.title,_rn.body,"⏰","customer",customerSession.id);
          reminded.push(key);
          localStorage.setItem("dork_auto_reminded",JSON.stringify(reminded.slice(-50)));
        }
        // طلب تقييم بعد الموعد بساعة
        if(minsAfter>=60&&minsAfter<=120&&!reviewed.includes(key)&&h.status==="approved"&&!h.rating){
          const _rv=ntxt(appI18n.language).review(h.salonName||"");sendNotif(_rv.title,_rv.body,"⭐","customer",customerSession.id);
          reviewed.push(key);
          localStorage.setItem("dork_auto_review",JSON.stringify(reviewed.slice(-50)));
        }
      }
    };
    check();
    const id=setInterval(check,60000);
    return()=>clearInterval(id);
  },[customerSession]);


  // العميل لما يسجل دخول يروح للصفحة الرئيسية مباشرة
  const handleCustomerLogin=(c)=>{setCustomerSession(c);setView("home");registerPushSubForUser("customer",c.id);};
  // customer helpers
  const getCustomer=()=>customerSession?customers.find(c=>c.id===customerSession.id)||customerSession:null;
  const toggleFav=async(salonId)=>{
    if(!customerSession){toast$(i18n.t('ui.login_first'),"warn");return;}
    const c=getCustomer(); if(!c)return;
    const favs=c.favs||[];
    const newFavs=favs.includes(salonId)?favs.filter(x=>x!==salonId):[...favs,salonId];
    try{
      await sb("customers","PATCH",{favs:newFavs},`?id=eq.${c.id}`);
      // تحديث محلي
      setCustomers(p=>p.map(x=>x.id===c.id?{...x,favs:newFavs}:x));
      setCustomerSession(s=>({...s,favs:newFavs}));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };
  const customerFavs=()=>{const c=getCustomer();return c?.favs||[];};

  // -- CRUD operations > Supabase --
  const addSalon=async(s)=>{
    try{
      const res=await fetch("/api/register-salon",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(s),
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"register-salon failed");
      toast$(i18n.t('ui.salon_reg_sent'));
      setView("ownerLogin");
      await loadData();
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
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
        reminder_minutes:bk.reminderMins??60,
        slot_duration_minutes:bk.totalDuration||(salon?.slotMin||SLOT_MIN),
        idempotency_key:crypto.randomUUID(),
      },"");
      if(isReschedule){
        await sb("bookings","PATCH",{status:"cancelled"},"?id=eq."+rescheduleOldId).catch(()=>{});
        {const _be=ntxt(salon?.lang||'ar').booking_edited(bk.name||"",bk.date,to12h(bk.time));sb("notifications","POST",{target_type:"all",title:_be.title,body:_be.body,icon:"🔄"}).catch(()=>{});}
        setRescheduleId(null);
      }
      const newBooking=inserted[0]||{};
      // post-insert conflict check — يتحقق بعد الإدراج لضمان عدم التعارض
      if(newBooking.id&&!isReschedule){
        await new Promise(r=>setTimeout(r,300));
        const nowBks=await sb("bookings","GET",null,`?salon_id=eq.${sid}&date=eq.${bk.date}&status=not.in.(rejected,cancelled)&select=id,barber_id,time,slot_duration_minutes,created_at&limit=100`).catch(()=>[]);
        const slM2=toM(bk.time||"00:00");
        const bkDef=bk.totalDuration||(salon.slotMin||SLOT_MIN);
        const bMin2=salon.bufferMin??BUFFER_MIN;
        const bc2=(salon.barbers||[]).filter(b=>b.active!==false).length||1;
        const rivals=(Array.isArray(nowBks)?nowBks:[]).filter(b=>{
          if(b.id===newBooking.id)return false;
          if(bk.barberId!=="any"&&b.barber_id!==bk.barberId&&b.barber_id!=="any")return false;
          const bM=toM(b.time||"00:00");
          const bDur2=b.slot_duration_minutes||(salon.slotMin||SLOT_MIN);
          return bM<slM2+bkDef&&slM2<bM+bDur2;
        });
        const capacity=bk.barberId!=="any"?1:bc2;
        if(rivals.length>=capacity){
          await sb("bookings","PATCH",{status:"rejected"},`?id=eq.${newBooking.id}`).catch(()=>{});
          throw new Error("تم حجز هذا الوقت للتو، يرجى اختيار وقت آخر");
        }
      }
      if(newBooking&&newBooking.id){
        const _d={type:"new_booking",salon_id:String(sid),booking_id:String(newBooking.id)};
        // notify salon owner (بلغة الصالون)
        {const sLang=salons.find(s=>s.id===sid)?.lang||'ar';const _nb=ntxt(sLang).new_booking_salon(bk.name||"عميل",bk.date,to12h(bk.time));
        supabase.functions.invoke('send-push-notification',{body:{
          target_type:"single",user_id:sid,user_type:"salon",
          title:_nb.title,body:_nb.body,data:_d,
        }}).catch(()=>{});}
        // notify customer (بلغة العميل)
        if(newBooking.customer_id){
          const cLang=customers.find(c=>c.id===newBooking.customer_id)?.lang||appI18n.language||'ar';
          const _br=ntxt(cLang).booking_received(salon?.name||"",bk.date,to12h(bk.time));
          supabase.functions.invoke('send-push-notification',{body:{
            target_type:"single",user_id:newBooking.customer_id,user_type:"customer",
            title:_br.title,body:_br.body,data:_d,
          }}).catch(()=>{});
        }
      }
      if(customerSession){
        const c=customers.find(x=>x.id===customerSession.id)||customerSession;
        {
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
            barberId:bk.barberId||"any",
            barberName:bk.barberName||"",
            slotDuration:bk.totalDuration||null,
            reminderMins:typeof bk.reminderMins==="number"?bk.reminderMins:null,
          };
          const hist=[...(c.history||[]),histItem];
          // نحفظ في localStorage كحل احتياطي
          try{localStorage.setItem(`hist_${c.id}`,JSON.stringify(hist));}catch{}
          // نجرب Supabase - لو فشل نكمل بدونه
          try{await sb("customers","PATCH",{history:hist,favs:c.favs||[]},`?id=eq.${c.id}`);}catch{}
          setCustomers(p=>p.map(x=>x.id===c.id?{...x,history:hist}:x));
          setCustomerSession(p=>p&&p.id===c.id?{...p,history:hist}:p);
        }
      }
      toast$(i18n.t('ui.booking_sent'));
      setView("home");
      await loadData();
    }catch(e){
      if(e.message&&(e.message.includes("23505")||e.message.includes("unique")||e.message.includes("duplicate")||e.message.includes("booking_overlap"))){
        toast$(i18n.t('ui.time_taken'),"err");
      }else{
        toast$(i18n.t('ui.error_prefix')+e.message,"err");
      }
      throw e;
    }
  };
  const updateBookingStatus=async(sid,bid,status)=>{
    const _ubKey=`${sid}-${bid}`;
    if(updatingBookingsRef.current.has(_ubKey))return;
    updatingBookingsRef.current.add(_ubKey);
    try{
      const salon=salons.find(s=>s.id===sid);
      if(!salon)return;
      const bk=salon.bookings.find(b=>b.id===bid);
      if(!bk||bk.status===status)return;
      await sb("bookings","PATCH",{status},`?id=eq.${bid}`);
      if(status==="cancelled"){
        sb("waiting_list","GET",null,`?select=id,name,phone,customer_id&salon_id=eq.${sid}&slot_date=eq.${bk.date}&slot_time=eq.${bk.time}&status=eq.waiting&limit=10`)
          .then(waiters=>{
            if(!Array.isArray(waiters)||!waiters.length)return;
            for(const w of waiters){
              const wLang=w.customer_id?customers.find(c=>c.id===w.customer_id)?.lang||'ar':'ar';
              const _sa=ntxt(wLang).slot_available(to12h(bk.time),salon.name,bk.date);
              sb("notifications","POST",{target_type:"all",title:_sa.title,body:_sa.body,icon:"✅"}).catch(()=>{});
              if(w.customer_id){supabase.functions.invoke('send-push-notification',{body:{target_type:"single",user_id:w.customer_id,user_type:"customer",title:_sa.title,body:_sa.body,data:{type:"slot_available",salon_id:String(sid)}}}).catch(()=>{});}
            }
          }).catch(()=>{});
      }
      const bkn=normPhone(bk.phone);
      const targets=[];
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
      if((status==="approved"||status==="rejected")&&bk.customer_id){
        const cLang=customers.find(c=>c.id===bk.customer_id)?.lang||'ar';
        const _ar=status==="approved"?ntxt(cLang).booking_approved(salon.name,bk.date,to12h(bk.time)):ntxt(cLang).booking_rejected(salon.name,bk.date);
        supabase.functions.invoke('send-push-notification',{body:{
          target_type:"single",user_id:bk.customer_id,user_type:"customer",
          title:_ar.title,body:_ar.body,
          data:{type:status==="approved"?"booking_approved":"booking_rejected",salon_id:String(sid),booking_id:String(bid)},
        }}).catch(()=>{});
        sb("notifications","POST",{target_type:"customer",target_id:bk.customer_id,title:_ar.title,body:_ar.body,icon:status==="approved"?"✅":"❌"}).catch(()=>{});
      }
      toast$(status==="approved"?i18n.t('ui.booking_accepted_toast'):i18n.t('ui.booking_status_updated'));
      await loadData();
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    finally{updatingBookingsRef.current.delete(_ubKey);}
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
    if(fPriceMin!==""||fPriceMax!==""){
      const prices=Object.values(s.prices||{});
      const min=fPriceMin!==""?Number(fPriceMin):-Infinity;
      const max=fPriceMax!==""?Number(fPriceMax):Infinity;
      if(!prices.some(p=>p>=min&&p<=max))return false;
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
    setFPriceMin("");setFPriceMax("");
    setShowFavs(false);
    setHomeResetKey(k=>k+1);
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
    quickBookSeed,setQuickBookSeed,
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
    fPriceMin,setFPriceMin,fPriceMax,setFPriceMax,
    socialLinks,setSocialLinks:updateSocial,
    handleCustomerLogin,
    darkMode,setDarkMode,themeMode,setThemeMode,
    compareSalons,setCompareSalons,
    handlePullRefresh,pullRefreshing,
    resetHome,homeResetKey,
    persistUiToSupabase,
    loading,
    showDrawer,setShowDrawer,
    showSalonDrawer,setShowSalonDrawer,
    ownerTab,setOwnerTab,
    promotions,setPromotions,pollPromotions,
    setCustDashNav,
  };

  return(
    <div style={G.app}>
      <div id="dork-bg" style={dorkBgStyle}/>
      <style>{CSS}</style>
      {/* بانر خطأ الاتصال - يظهر فقط عند الخطأ */}
      {dbError&&!loading&&<div style={{position:"fixed",top:64,left:0,right:0,zIndex:998,background:"rgba(231,76,60,.12)",borderBottom:"1px solid rgba(231,76,60,.3)",color:"#e74c3c",padding:"8px 16px",fontSize:12,textAlign:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><IconError size={14}/>{dbError.startsWith("الخدمة متوقفة")?dbError:t('ui.db_error')}</div>}
      {toast&&<div style={{...G.toast,background:toast.type==="warn"?"#7a3a10":toast.type==="err"?"#7a1a1a":toast.type==="info"?"rgba(150,110,0,.9)":"#1a5c34",display:"flex",alignItems:"center",gap:8}}>{toast.type==="err"?<IconError size={16}/>:toast.type==="warn"?null:<IconSuccess size={16}/>}<span>{toast.msg}</span></div>}
      {view!=="entry"&&view!=="custLogin"&&view!=="ownerLogin"&&<TopBar {...sharedProps} showDrawer={showDrawer} setShowDrawer={setShowDrawer}/>}
      <CustomerDrawer open={showDrawer} onClose={()=>setShowDrawer(false)} customer={customer} setCustomers={sharedProps.setCustomers} setCustomerSession={sharedProps.setCustomerSession} setView={setView} setCustDashKey={setCustDashKey} setCustDashNav={setCustDashNav} activeDrawerItem={activeDrawerItem} setActiveDrawerItem={setActiveDrawerItem} settings={sharedProps.settings} setSettings={sharedProps.setSettings} darkMode={darkMode} setDarkMode={setDarkMode} themeMode={themeMode} setThemeMode={setThemeMode} persistUiToSupabase={sharedProps.persistUiToSupabase} socialLinks={sharedProps.socialLinks} setSocialLinks={sharedProps.setSocialLinks} toast$={toast$} salons={salons} favSet={sharedProps.favSet}/>
      <SalonDrawer open={showSalonDrawer} onClose={()=>setShowSalonDrawer(false)} salon={salons.find(s=>s.id===ownerSession)} ownerTab={ownerTab} setOwnerTab={setOwnerTab} view={view} setView={setView} setOwnerSession={sharedProps.setOwnerSession} settings={sharedProps.settings} setSettings={sharedProps.setSettings} persistUiToSupabase={sharedProps.persistUiToSupabase} toast$={toast$} salonUnreadMsgs={salonMsgUnread}/>
      <div style={{paddingTop:(view==="entry"||view==="custLogin"||view==="ownerLogin")?0:64}}>
        {view==="entry"&&     <EntryView setView={setView}/>}
        {view==="home"&&      <HomeView {...sharedProps}/>}
        {view==="register"&&  <RegisterView {...sharedProps}/>}
        {view==="book"&&selSalon&&<BookView salon={selSalon} {...sharedProps}/>}
        {view==="salon"&&selSalon&&<SalonPage salon={salons.find(s=>s.id===selSalon.id)||selSalon} {...sharedProps}/>}
        {view==="ownerLogin"&&<OwnerLogin {...sharedProps}/>}
        {view==="ownerDash"&& <OwnerDash  salon={salons.find(s=>s.id===ownerSession)} ownerTab={ownerTab} setOwnerTab={setOwnerTab} showSalonDrawer={showSalonDrawer} setShowSalonDrawer={setShowSalonDrawer} {...sharedProps}/>}
        {(view==="ownerInfo"||view==="ownerHours"||view==="ownerServices"||view==="ownerBarbers"||view==="ownerSocial"||view==="ownerTone"||view==="ownerPin")&&<OwnerSettings key={view} salon={salons.find(s=>s.id===ownerSession)} setSalons={sharedProps.setSalons} toast$={toast$} socialLinks={sharedProps.socialLinks} setSocialLinks={sharedProps.updateSocial} setView={setView} setShowSalonDrawer={setShowSalonDrawer} setOwnerTab={setOwnerTab} onlySec={view.replace("owner","").toLowerCase()}/>}
        {view==="ownerTheme"&&<SettingsView {...sharedProps} onlySec="theme" backFn={()=>{setOwnerTab(null);setShowSalonDrawer(true);}}/>}
        {view==="ownerDark"&&<SettingsView {...sharedProps} onlySec="dark" backFn={()=>{setOwnerTab(null);setShowSalonDrawer(true);}}/>}
        {view==="ownerLang"&&<OwnerLangView setView={setView} setOwnerTab={setOwnerTab} setShowSalonDrawer={setShowSalonDrawer}/>}
        {view==="ownerFaq"&&<OwnerFaqView setView={setView} setOwnerTab={setOwnerTab} setShowSalonDrawer={setShowSalonDrawer}/>}
        {view==="ownerPrivacy"&&<OwnerPrivacyView setView={setView} setShowSalonDrawer={setShowSalonDrawer}/>}
        {view==="custLang"&&<CustLangView setView={setView} setShowDrawer={setShowDrawer}/>}
        {view==="custEditData"&&customer&&<CustEditDataView customer={customer} setCustomers={sharedProps.setCustomers} setCustomerSession={sharedProps.setCustomerSession} setView={setView} setShowDrawer={setShowDrawer} toast$={toast$}/>}
        {view==="custSettingsTheme"&&<SettingsView {...sharedProps} onlySec="theme" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsDark"&&<SettingsView {...sharedProps} onlySec="dark" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsFont"&&<SettingsView {...sharedProps} onlySec="font" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsBg"&&<SettingsView {...sharedProps} onlySec="bg" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="custSettingsTone"&&<SettingsView {...sharedProps} onlySec="tone" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="social"&&<SettingsView {...sharedProps} onlySec="social" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="faq"&&<SettingsView {...sharedProps} onlySec="faq" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
        {view==="privacy"&&<SettingsView {...sharedProps} onlySec="privacy" backFn={()=>{setView("home");setShowDrawer(true);}}/>}
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
//  HOME
// ==============================================
function HomeView({displaySalons,approvedSalons,allLoc,fRegion,setFRegion,fGov,setFGov,fCenter,setFCenter,fVillage,setFVillage,govList,villageList,centerList2,showFavs,setShowFavs,favSet,toggleFav,setView,setSelSalon,customer,search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,toast$,customers,salons,reviews,compareSalons,setCompareSalons,handlePullRefresh,pullRefreshing,loading,promotions,homeResetKey,setQuickBookSeed,fPriceMin,setFPriceMin,fPriceMax,setFPriceMax}){
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
// ==============================================
//  REGISTER  (salon + custom services)
// ==============================================
function RegisterView({allLoc,addSalon,setView,addExtraLoc}){
  const{t}=useTranslation();
  const[form,setForm]=useState({name:"",owner:"",ownerPhone:"",ownerEmail:"",region:"",gov:"",center:"",village:"",phone:"",address:"",locationUrl:"",services:[],prices:{},shiftEnabled:false,shift1Start:"08:00",shift1End:"13:00",shift2Start:"16:00",shift2End:"23:00",workStart:"09:00",workEnd:"22:00",barbers:[{id:"b"+Date.now(),name:""}],tone:"bell",pin:"",pinConfirm:""});
  const[errors,setErrors]=useState({});
  const[locMethod,setLocMethod]=useState("link");
  const[detecting,setDetecting]=useState(false);
  const[newSvc,setNewSvc]=useState("");
  // extra-loc add state
  const[newR,setNewR]=useState(""); const[newG,setNewG]=useState(""); const[newC,setNewC]=useState(""); const[newV,setNewV]=useState("");
  const[showAddLoc,setShowAddLoc]=useState(false);
  const[step,setStep]=useState(1);
  const[submitting,setSubmitting]=useState(false);
  const BtnBack=({toStep})=><button style={{background:"var(--surface-2)",color:"var(--text-muted)",border:"none",padding:"12px 16px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",flexShrink:0}} onClick={()=>setStep(toStep)}>{t("salon_page.back")}</button>;

  const govList=form.region?(allLoc.find(r=>r.region===form.region)?.govs||[]):[];
  const centerList=form.gov?(govList.find?.(g=>(g.name||g)===form.gov)?.centers||[]):[];

  const applyNewLoc=()=>{
    const r=newR.trim()||form.region; const g=newG.trim()||form.gov; const v=newV.trim();
    if(!r||!g){alert(i18n.t('ui.enter_region_gov'));return;}
    addExtraLoc(r,g,"",v);
    setForm(p=>({...p,region:r,gov:g,village:v||p.village}));
    setNewR("");setNewG("");setNewC("");setNewV("");setShowAddLoc(false);
  };

  const detect=async()=>{
    if(!navigator.geolocation){
      alert(i18n.t('ui.browser_no_geo_alt'));
      return;
    }
    setDetecting(true);
    // Check permission state first
    try {
      if(navigator.permissions){
        const perm=await navigator.permissions.query({name:"geolocation"});
        if(perm.state==="denied"){
          alert(i18n.t('ui.location_denied_steps'));
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
      reader.onload=ev=>{
        const img=new Image();
        img.onload=()=>{
          const MAX=150;let w=img.width,h=img.height;
          if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}
          const c=document.createElement("canvas");c.width=w;c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          upBarberPhoto(id,c.toDataURL(IMG_FMT,0.75));
        };
        img.src=ev.target.result;
      };
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
    if(!/^\d{6}$/.test(form.pin))e.pin=t("register.err_pin");
    else if(form.pin!==form.pinConfirm)e.pinConfirm=t("register.err_pin_mismatch");
    setErrors(e); return!Object.keys(e).length;
  };

  const validateStep=n=>{
    const e={};
    if(n===1){
      if(!form.name.trim())e.name=t("register.err_required"); if(!form.owner.trim())e.owner=t("register.err_required");
      if(!form.ownerPhone.trim())e.ownerPhone=t("register.err_required");
      if(!form.phone.trim())e.phone=t("register.err_required"); if(!form.address.trim())e.address=t("register.err_required");
      if(!form.region)e.region=t("register.err_required"); if(!form.gov)e.gov=t("register.err_required");
    }else if(n===2){
      if(!form.locationUrl.trim())e.locationUrl=t("register.err_location");
    }else if(n===3){
      if(!form.services.length)e.services=t("register.err_service");
      if(form.barbers.some(b=>!b.name.trim()))e.barbers=t("register.err_barbers");
    }
    setErrors(e); return!Object.keys(e).length;
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>step===1?setView("home"):setStep(step-1)}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("register.title")}</h2></div>

      {/* pending notice */}
      <div style={{background:"var(--pa08)",border:"1px solid var(--pa3)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
        {t("register.pending_notice")}
      </div>

      <div style={{...G.steps,gap:2}}>{[t("register.step1"),t("register.step2"),t("register.step3"),t("register.step4")].map((l,i)=><div key={i} style={{...G.si,...(step>=i+1?{opacity:1}:{})}}><div style={G.sd}>{i+1}</div><span style={{fontSize:10,color:"var(--p)",textAlign:"center",lineHeight:1.1}}>{l}</span></div>)}</div>

      {step===1&&<>
      <div style={G.fc}>
        <SL>{t("register.salon_info")}</SL>
        <F label={t("register.salon_name")} error={errors.name}><input style={fi(errors.name)} placeholder="صالون النخبة" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label={t("register.owner_name")} error={errors.owner}><input style={fi(errors.owner)} placeholder="الاسم الكامل" value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))}/></F>
        <F label={t("register.owner_phone")} error={errors.ownerPhone}><input style={fi(errors.ownerPhone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.ownerPhone} onChange={e=>setForm(p=>({...p,ownerPhone:e.target.value}))}/></F>
        <F label={t("register.owner_email")}><input style={fi()} type="email" inputMode="email" placeholder={t("register.owner_email_ph")} value={form.ownerEmail} onChange={e=>setForm(p=>({...p,ownerEmail:e.target.value}))}/><div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>{t("register.owner_email_hint")}</div></F>
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
          {showAddLoc?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconClose size={12}/>{t('ui.close')}</span>:t("register.add_location_btn")}
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
              if(!val){alert(i18n.t('ui.enter_neighborhood'));return;}
              // منع إضافة اسم منطقة أو محافظة أو مركز موجود
              const allRegions=allLoc.map(r=>r.region);
              const allGovs=allLoc.flatMap(r=>r.govs.map(g=>g.name||g));
              const allCenters=allLoc.flatMap(r=>r.govs.flatMap(g=>g.centers||[]));
              if(allRegions.includes(val)||allGovs.includes(val)||allCenters.includes(val)){
                alert(i18n.t('ui.name_duplicate_warning'));
                return;
              }
              try{
                await sb("centers","POST",{name:val,governorate_id:null},"");
              }catch(e){}
              addExtraLoc(form.region,form.gov,form.center,val);
              setForm(p=>({...p,village:val}));
              setNewC("");setShowAddLoc(false);
              alert(i18n.t('ui.neighborhood_added'));
            }}>{t("register.add_confirm")}</button>
          </div>
        </div>}
        {!form.center&&form.gov&&<F label={t("register.village_detail_label")}>
          <input style={fi()} placeholder={t("register.village_ph")} value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
        </F>}
      </div>

      <button style={G.sub} onClick={()=>{if(validateStep(1))setStep(2);}}>{t("book.next")}</button>
      </>}

      {step===2&&<>
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

      <div style={{display:"flex",gap:8,marginTop:8}}><BtnBack toStep={1}/><button style={{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}} onClick={()=>{if(validateStep(2))setStep(3);}}>{t("book.next")}</button></div>
      </>}

      {step===3&&<>
      <div style={G.fc}>
        <SL>{t("register.barbers_section")} {errors.barbers&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>- {errors.barbers}</span>}</SL>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{t("register.barbers_hint")}</div>
        {form.barbers.map((b,i)=>(
          <div key={b.id} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <div style={{position:"relative",flexShrink:0}} onClick={()=>pickPhoto(b.id)}>
              <div style={{width:44,height:44,borderRadius:"50%",background:b.photo?"transparent":"var(--surface-2)",border:`2px dashed var(--p)`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                {b.photo?<img src={optimizeImageUrl(b.photo,44,44)} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<NotifIcon icon="📷" size={18}/>}
              </div>
              <div style={{position:"absolute",bottom:-2,right:-2,background:"var(--p)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"var(--p-text)",cursor:"pointer"}}>+</div>
            </div>
            <input style={{...fi(),...{flex:1}}} placeholder={`${t("register.barber_ph")} ${i+1}`} value={b.name} onChange={e=>upBarber(b.id,e.target.value)}/>
            {form.barbers.length>1&&<button style={G.xBtn} onClick={()=>rmBarber(b.id)}><IconTrash size={14}/></button>}
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

      <div style={{display:"flex",gap:8,marginTop:8}}><BtnBack toStep={2}/><button style={{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}} onClick={()=>{if(validateStep(3))setStep(4);}}>{t("book.next")}</button></div>
      </>}

      {step===4&&<>
      <div style={G.fc}>
        <SL>{t("register.tone_section")}</SL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:5}}>
          {TONES.map(tn=><div key={tn.id} style={{...G.chip,...(form.tone===tn.id?G.chipOn:{}),display:"flex",alignItems:"center",gap:5}} onClick={()=>{setForm(p=>({...p,tone:tn.id}));playTone(tn.id,0.8);}}><NotifIcon icon={tn.icon} size={13}/>{tn.label}</div>)}
        </div>
        <div style={{fontSize:11,color:"var(--text-muted)"}}>{t("register.tone_hint")}</div>
      </div>

      <div style={G.fc}>
        <SL>{t("register.pin_section")}</SL>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{t("register.pin_hint")}</div>
        <F label={t("register.pin_label")} error={errors.pin}><input style={fi(errors.pin)} type="password" inputMode="numeric" placeholder="••••••" value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value.replace(/\D/g,"").slice(0,6)}))}/></F>
        <F label={t("register.pin_confirm_label")} error={errors.pinConfirm}><input style={fi(errors.pinConfirm)} type="password" inputMode="numeric" placeholder="••••••" value={form.pinConfirm} onChange={e=>setForm(p=>({...p,pinConfirm:e.target.value.replace(/\D/g,"").slice(0,6)}))}/></F>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:30}}><BtnBack toStep={3}/><button disabled={submitting} style={{flex:1,background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:submitting?"not-allowed":"pointer",fontFamily:"'Cairo',sans-serif",opacity:submitting?.6:1}} onClick={async()=>{if(submitting||!validate())return;setSubmitting(true);await addSalon(form);setSubmitting(false);}}>{submitting?"⏳":t("register.submit")}</button></div>
      </>}
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
          <button onClick={()=>setView("home")} style={{background:"transparent",border:"none",color:gold,fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1,display:"flex",alignItems:"center"}}><IconArrowLeft size={18} color={gold}/></button>
          <DorkLogoSvg size={26}/>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"var(--text-primary)"}}>{t("all_reviews.title")}</div>
            <div style={{fontSize:10,color:gold,opacity:.8,display:"flex",alignItems:"center",gap:3}}>{feed.length} {t("all_reviews.rating_unit")} — {t("all_reviews.avg_prefix")} {globalAvg} <IconStar size={10} color={gold}/></div>
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
              {Array.from({length:star}).map((_,i)=><IconStar key={i} size={9}/>)} ({count})
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
              <div style={{fontSize:12,fontWeight:800,color:gold,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                <IconScissors size={12} color={gold}/>{r.salonName}
              </div>
              <div style={{display:"flex",gap:1,flexShrink:0,marginRight:8}}>
                {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=r.rating?goldStar:dimStar}/>)}
              </div>
            </div>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:r.comment?8:0,display:"flex",alignItems:"center",gap:4}}><IconUser size={10}/>{r.customerName}</div>
            {r.comment&&(
              <>
                <div style={{height:1,background:"rgba(var(--gold-rgb),.1)",margin:"8px 0"}}/>
                <div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.55}}>«{r.comment}»</div>
              </>
            )}
            <div style={{fontSize:9,color:"var(--text-muted)",marginTop:10,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.date||"—"}</div>
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
        time:new Date(n.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),
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
        <button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button>
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
                <span style={{flexShrink:0,display:"flex"}}><NotifIcon icon={n.icon} size={20}/></span>
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
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("compare.title")}</h2></div>
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
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("compare.title")}</h2></div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        <div/>
        {[a,b].map(s=>(
          <div key={s.id} style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid var(--pa25)",cursor:"pointer"}} onClick={()=>{setSelSalon(s);setView("salon");}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><IconScissors size={24} color="var(--p)"/></div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",lineHeight:1.3}}>{s.name}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",gap:3}}><IconPin size={9}/>{s.gov||s.region}</div>
          </div>
        ))}
      </div>

      {rows.map(({l,av,bv,better})=>(
        <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center"}}>{l}</div>
          {[{v:av,side:"a"},{v:bv,side:"b"}].map(({v,side})=>(
            <div key={side} style={{background:better===side?"var(--pa12)":"var(--surface-1)",border:`1px solid ${better===side?"var(--p)":"var(--border-ui)"}`,borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:better===side?900:400,color:better===side?"var(--p)":"var(--text-muted)"}}>{v}</div>
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
                <span style={{color:"var(--text-primary)"}}>{sv}</span>
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

// ==============================================
//  OWNER LOGIN + DASHBOARD
// ==============================================
function OwnerLogin({setOwnerSession,setOwnerTab,setView,toast$}){
  const{t}=useTranslation();
  const[phone,setPhone]=useState(()=>{ try{return localStorage.getItem("dork_owner_saved_phone")||"";}catch{return"";}});
  const[pin,setPin]=useState("");
  const[showPin,setShowPin]=useState(false);
  const[rememberPhone,setRememberPhone]=useState(()=>{ try{return!!localStorage.getItem("dork_owner_saved_phone");}catch{return false;}});
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  // استعادة الرمز السري
  const[resetStep,setResetStep]=useState(null); // null | "phone" | "otp" | "pin"
  const[resetPhone,setResetPhone]=useState("");
  const[resetEmail,setResetEmail]=useState("");
  const[resetOtp,setResetOtp]=useState("");
  const[resetNewPin,setResetNewPin]=useState("");
  const[resetConfirmPin,setResetConfirmPin]=useState("");
  const[resetErr,setResetErr]=useState("");
  const[resetLoading,setResetLoading]=useState(false);
  const[resetOtpSent,setResetOtpSent]=useState(false);
  const[resetAccessToken,setResetAccessToken]=useState("");
  const[resendTimer,setResendTimer]=useState(0);

  useEffect(()=>{
    if(resendTimer<=0)return;
    const interval=setInterval(()=>setResendTimer(prev=>Math.max(prev-1,0)),1000);
    return()=>clearInterval(interval);
  },[resendTimer]);

  const handleRemember=(checked)=>{
    setRememberPhone(checked);
    try{if(checked)localStorage.setItem("dork_owner_saved_phone",phone);else localStorage.removeItem("dork_owner_saved_phone");}catch{}
  };

  const login=async()=>{
    if(!phone.trim()||pin.length!==6){setErr(t("owner_login.err_pin_wrong"));return;}
    setLoading(true); setErr("");
    try{
      const res=await fetch("/api/owner-auth",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:phone.trim(),pin}),
      });
      const data=await res.json();
      if(!res.ok){
        if(data.code==="err_locked"&&data.remainingMinutes){
          setErr(`تم قفل الدخول مؤقتاً — أعد المحاولة بعد ${data.remainingMinutes} ${data.remainingMinutes===1?"دقيقة":"دقائق"}`);
        }else{
          setErr(t(`owner_login.${data.code||"err_generic"}`));
        }
        setLoading(false); return;
      }
      if(data.access_token&&data.refresh_token){
        await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token}).catch(()=>{});
      }
      setOwnerSession(data.id); setOwnerTab(null); setView("ownerDash"); registerPushSubForUser("salon",data.id);
    }catch{
      setErr(t("owner_login.err_generic"));
    }
    setLoading(false);
  };
  const sendResetOtp=async()=>{
    if(resendTimer>0){setResetErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة الإرسال`);return;}
    setResetErr(""); setResetLoading(true);
    try{
      const res=await fetch("/api/salon-reset-pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify",phone:resetPhone.trim(),email:resetEmail.trim()})});
      const d=await res.json();
      if(!res.ok){setResetErr(d.error||"خطأ");setResetLoading(false);return;}
      const{data,error}=await supabase.auth.signInWithOtp({email:resetEmail.trim(),options:{shouldCreateUser:false}});
      if(error){setResetErr(error.message);setResetLoading(false);return;}
      setResendTimer(170);
      setResetOtpSent(true);setResetStep("otp");
      toast$&&toast$(t("owner_login.reset_otp_sent"));
    }catch(e){setResetErr(e.message);}
    setResetLoading(false);
  };

  const verifyResetOtp=async()=>{
    setResetErr(""); setResetLoading(true);
    try{
      const otp=resetOtp.replace(/\D/g,"").slice(0,6);
      if(otp.length<6){setResetErr(t("owner_login.reset_err_6digits"));setResetLoading(false);return;}
      const{data,error}=await supabase.auth.verifyOtp({email:resetEmail.trim(),token:otp,type:"email"});
      if(error){setResetErr(error.message);setResetLoading(false);return;}
      setResetAccessToken(data.session?.access_token||"");
      setResetStep("pin");
    }catch(e){setResetErr(e.message);}
    setResetLoading(false);
  };

  const saveResetPin=async()=>{
    setResetErr("");
    if(!/^\d{6}$/.test(resetNewPin)){setResetErr(t("owner_login.reset_err_6digits"));return;}
    if(resetNewPin!==resetConfirmPin){setResetErr(t("owner_login.reset_err_mismatch"));return;}
    setResetLoading(true);
    try{
      const res=await fetch("/api/salon-reset-pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset",phone:resetPhone.trim(),accessToken:resetAccessToken,newPin:resetNewPin})});
      const d=await res.json();
      if(!res.ok){setResetErr(d.error||"خطأ");setResetLoading(false);return;}
      await supabase.auth.signOut().catch(()=>{});
      toast$&&toast$(t("owner_login.reset_success"));
      setResetStep(null);setResetPhone("");setResetEmail("");setResetOtp("");setResetNewPin("");setResetConfirmPin("");setResetAccessToken("");
    }catch(e){setResetErr(e.message);}
    setResetLoading(false);
  };

  if(resetStep){
    return(
      <div style={G.page}><div style={G.fp}>
        <div style={G.fh}><button style={G.bb} onClick={()=>{setResetStep(null);setResetErr("");}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("owner_login.reset_title")}</h2></div>
        <div style={G.fc}>
          {resetStep==="phone"&&<>
            <SL>{t("owner_login.reset_step1_hint")}</SL>
            <F label={t("owner_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={resetPhone} onChange={e=>{setResetPhone(e.target.value);setResetErr("");}}/></F>
            <F label={t("owner_login.reset_email_label")} error={resetErr}><input style={fi(resetErr)} type="email" inputMode="email" placeholder="example@email.com" value={resetEmail} onChange={e=>{setResetEmail(e.target.value);setResetErr("");}}/></F>
            <button style={{...G.sub,opacity:resetLoading?0.7:1}} disabled={resetLoading} onClick={sendResetOtp}>{resetLoading?t("owner_login.reset_sending"):t("owner_login.reset_send_otp")}</button>
          </>}
          {resetStep==="otp"&&<>
            <SL>{t("owner_login.reset_otp_sent")}</SL>
            <F label={t("owner_login.reset_otp_label")} error={resetErr}><OtpInput value={resetOtp} onChange={val=>{setResetOtp(val);setResetErr("");}} error={!!resetErr} use6Boxes={true} disabled={resetLoading}/></F>
            <button style={{...G.sub,opacity:resetLoading?0.7:1}} disabled={resetLoading} onClick={verifyResetOtp}>{resetLoading?t("owner_login.reset_verifying"):t("owner_login.reset_verify_btn")}</button>
            {resendTimer>0
              ?<div style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginTop:8}}>⏳ إعادة الإرسال متاحة بعد {Math.floor(resendTimer/60)}:{String(resendTimer%60).padStart(2,"0")}</div>
              :<button onClick={sendResetOtp} disabled={resetLoading} style={{width:"100%",marginTop:8,padding:"8px 0",background:"transparent",border:"none",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:12,textDecoration:"underline"}}>إعادة إرسال الكود</button>}
          </>}
          {resetStep==="pin"&&<>
            <SL>✅ تم التحقق — أدخل رمزاً سرياً جديداً</SL>
            <F label={t("owner_login.reset_new_pin_label")} error={resetErr}><input style={{...fi(resetErr),letterSpacing:4,textAlign:"center"}} type="password" inputMode="numeric" placeholder="••••••" maxLength={6} value={resetNewPin} onChange={e=>{setResetNewPin(e.target.value.replace(/\D/g,"").slice(0,6));setResetErr("");}}/></F>
            <F label={t("owner_login.reset_confirm_pin_label")}><input style={{...fi(),letterSpacing:4,textAlign:"center"}} type="password" inputMode="numeric" placeholder="••••••" maxLength={6} value={resetConfirmPin} onChange={e=>{setResetConfirmPin(e.target.value.replace(/\D/g,"").slice(0,6));setResetErr("");}}/></F>
            <button style={{...G.sub,opacity:resetLoading?0.7:1}} disabled={resetLoading} onClick={saveResetPin}>{resetLoading?t("owner_login.reset_saving"):t("owner_login.reset_save_btn")}</button>
          </>}
        </div>
      </div></div>
    );
  }

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fc}>
        <SL>{t("owner_login.phone_hint")}</SL>
        <F label={t("owner_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");if(rememberPhone)try{localStorage.setItem("dork_owner_saved_phone",e.target.value);}catch{}}}/></F>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--text-muted)",cursor:"pointer",marginTop:-6,marginBottom:8}}>
          <input type="checkbox" checked={rememberPhone} onChange={e=>handleRemember(e.target.checked)} style={{width:15,height:15,accentColor:"var(--p)",cursor:"pointer"}}/>
          {t("owner_login.remember_phone")}
        </label>
        <F label={t("owner_login.pin_label")} error={err}><div style={{position:"relative"}}><input style={{...fi(err),paddingLeft:36}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" value={pin} onChange={e=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setPin(val);setErr("");}}/><button type="button" onClick={()=>setShowPin(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0}}>{showPin?<IconEyeOff size={17}/>:<IconEye size={17}/>}</button></div></F>
        <button onClick={()=>{setResetStep("phone");setResetPhone(phone);setResetErr("");}} style={{background:"transparent",border:"none",color:"var(--p)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:"4px 0",textAlign:"center",width:"100%",textDecoration:"underline",marginBottom:6}}>{t("owner_login.forgot_pin")}</button>
        <button style={{...G.sub,opacity:loading?0.7:1}} disabled={loading} onClick={login}>{t("owner_login.login_btn")}</button>
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
  const[showTomorrow,setShowTomorrow]=useState(false);
  const[ownerNotifs,setOwnerNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}});
  const[dashCashEntries,setDashCashEntries]=useState(()=>{try{return JSON.parse(localStorage.getItem(`dork_cash_${salon?.id}`)||"[]");}catch{return[];}});
  const[showDashCash,setShowDashCash]=useState(false);
  const[dashCashAmt,setDashCashAmt]=useState("");
  const[dashCashBarber,setDashCashBarber]=useState("");
  useEffect(()=>{if(salon?.id)refreshSalonBookings(salon.id);},[salon?.id]);
  const _shownAdminRef=useRef(null);if(!_shownAdminRef.current){try{_shownAdminRef.current=new Set(JSON.parse(localStorage.getItem("dork_shown_admin")||"[]"));}catch{_shownAdminRef.current=new Set();}}
  useEffect(()=>{
    const adminNotifs=ownerNotifs.filter(n=>n.title&&(n.title.includes("إدارة")||n.title.includes("اشتراك")||n.title.includes("تحذير")||n.title.includes("إعلان")));
    for(const n of adminNotifs){
      if(_shownAdminRef.current.has(String(n.id)))continue;
      _shownAdminRef.current.add(String(n.id));
      try{localStorage.setItem("dork_shown_admin",JSON.stringify([..._shownAdminRef.current]));}catch{}
      toast$&&toast$(`${n.icon||"📢"} ${n.title}: ${n.body||""}`.trim(),"info",5000);
    }
  },[ownerNotifs]);
  const _oPtStartY=useRef(0);const _oPtActive=useRef(false);const _oPtYRef=useRef(0);
  const[_oPtY,_setOPtY]=useState(0);const[_oPtRefreshing,_setOPtRefreshing]=useState(false);const _OPT=65;
  useEffect(()=>{
    const onTS=(e)=>{if(window.scrollY>2)return;_oPtStartY.current=e.touches[0].clientY;_oPtActive.current=true;_oPtYRef.current=0;};
    const onTM=(e)=>{if(!_oPtActive.current)return;const dy=e.touches[0].clientY-_oPtStartY.current;if(dy>0){const y=Math.min(dy*.45,80);_oPtYRef.current=y;_setOPtY(y);}else{_oPtActive.current=false;_oPtYRef.current=0;_setOPtY(0);}};
    const onTE=async()=>{if(_oPtActive.current&&_oPtYRef.current>=_OPT&&!_oPtRefreshing){_setOPtRefreshing(true);if(salon?.id)await refreshSalonBookings(salon.id).catch(()=>{});setTimeout(()=>_setOPtRefreshing(false),800);}_oPtActive.current=false;_oPtYRef.current=0;_setOPtY(0);};
    window.addEventListener('touchstart',onTS,{passive:true});
    window.addEventListener('touchmove',onTM,{passive:true});
    window.addEventListener('touchend',onTE,{passive:true});
    return()=>{window.removeEventListener('touchstart',onTS);window.removeEventListener('touchmove',onTM);window.removeEventListener('touchend',onTE);};
  },[salon?.id,_oPtRefreshing,refreshSalonBookings]);
  if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("owner_dash.page_title")}</h2></div><div style={G.empty}>{t("owner_dash.not_found")}</div></div></div>;

  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const statusColor=salon.status==="approved"?"#27ae60":salon.status==="rejected"?"#e74c3c":"var(--pl)";
  const statusLabel=salon.status==="approved"?t("owner_dash.status_active"):salon.status==="rejected"?t("owner_dash.status_rejected"):t("owner_dash.status_pending");

  const approvedBookings=salon.bookings.filter(b=>b.status==="approved");
  const totalEarned=approvedBookings.length;
  const totalPaid=salon.totalPaid||0;
  const balance=totalEarned-totalPaid;


  // ── حسابات ملخص اليوم (بتوقيت السعودية AST/GMT+3) ──
  const _td=getTodayDateInRiyadh();
  const _tdBks=salon.bookings.filter(b=>b.date===_td&&b.status!=="cancelled");
  const _tdApproved=_tdBks.filter(b=>b.status==="approved");
  const _tdPending=_tdBks.filter(b=>b.status==="pending");
  const _tdRejected=_tdBks.filter(b=>b.status==="rejected");
  const _tdRevenue=_tdApproved.reduce((s,b)=>s+(b.total||0),0);
  const _tdCash=dashCashEntries.filter(e=>e.date===_td).reduce((s,e)=>s+(e.amount||0),0);
  const _tdTotal=_tdRevenue+_tdCash;
  const addDashCash=()=>{
    const amt=parseFloat(dashCashAmt);
    if(!amt||amt<=0)return;
    const selB=salon.barbers?.find(b=>b.id===dashCashBarber);
    const updated=[...dashCashEntries,{id:Date.now(),amount:amt,note:"",date:_td,barberId:dashCashBarber||null,barberName:selB?.name||""}];
    setDashCashEntries(updated);
    try{localStorage.setItem(`dork_cash_${salon.id}`,JSON.stringify(updated));}catch{}
    setDashCashAmt("");setDashCashBarber("");setShowDashCash(false);
  };
  const _now=new Date();
  const _nowMins=_now.getHours()*60+_now.getMinutes();
  const _nextBk=_tdApproved
    .filter(b=>{const[h,m]=(b.time||"0:0").split(":").map(Number);return h*60+m>_nowMins;})
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""))[0];
  const _allSlots=getSlotsForSalon(salon);
  const _bookedSlotCount=new Set(_tdApproved.map(b=>b.time)).size;
  const _occ=Math.min(100,Math.round(_bookedSlotCount/Math.max(_allSlots.length,1)*100));
  const _dNames=t("owner_dash.days",{returnObjects:true});
  const _mNames=t("owner_dash.months",{returnObjects:true});
  const _dayLabel=`${_dNames[_now.getDay()]}، ${_now.getDate()} ${_mNames[_now.getMonth()]}`;

  // ── حسابات حجوزات غداً ──
  const _tmrDate=new Date(_now);_tmrDate.setDate(_tmrDate.getDate()+1);
  const _tmr=_tmrDate.toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"});
  const _tmrBks=salon.bookings.filter(b=>b.date===_tmr&&b.status!=="cancelled");
  const _tmrApproved=_tmrBks.filter(b=>b.status==="approved");
  const _tmrPending=_tmrBks.filter(b=>b.status==="pending");

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
      {(_oPtY>8||_oPtRefreshing)&&<div style={{position:"fixed",top:64,left:"50%",transform:`translate(-50%,${_oPtRefreshing?10:Math.max(_oPtY-16,0)}px)`,zIndex:100,transition:_oPtRefreshing?"transform .2s":"none",width:34,height:34,borderRadius:"50%",background:"var(--p)",color:"var(--p-text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 2px 10px rgba(0,0,0,.35)",pointerEvents:"none"}}>{_oPtRefreshing?<span style={{animation:"spin .7s linear infinite",display:"inline-block"}}><NotifIcon icon="↻" size={17}/></span>:<NotifIcon icon={_oPtY>=_OPT?"↑":"↓"} size={17}/>}</div>}

      {/* ── الواجهة الرئيسية (لوحتي) ── */}
      {ownerTab===null&&(
        <>

      {/* ── بادج الصالون المحسّن (ثابت في لوحتي فقط) ── */}
      <div style={{background:"var(--surface-1)",borderRadius:16,padding:16,border:"1px solid var(--border-ui)",marginBottom:18}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* صف 1: اسم الصالون + التقييم */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <div style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-flex",alignItems:"center",maxWidth:"65%",overflow:"hidden"}}>
              <span style={{fontSize:14,fontWeight:800,color:"var(--p)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{salon.name}</span>
            </div>
            <div style={{background:"var(--pa08)",border:"1.5px solid rgba(var(--gold-rgb),.4)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0,minWidth:74}}>
              <span style={{fontSize:14,fontWeight:900,color:"var(--gold)",display:"inline-flex",alignItems:"center",gap:4}}><IconStar size={13}/>{(salon.rating||0).toFixed(1)}</span>
            </div>
          </div>
          {/* الجوال */}
          <div style={{fontSize:15,color:"var(--p)",fontWeight:800,display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="📞" size={15}/> {salon.phone||t("owner_dash.not_available")}</div>
          {/* الموقع */}
          <div style={{fontSize:14,color:"var(--p)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><IconPin size={13}/>{salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div>
          {/* صف أخير: تاريخ الانضمام + نشط */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,color:"var(--p)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><IconCalendar size={13}/>{salon.createdAt?new Date(salon.createdAt).toLocaleDateString("ar-SA"):t("owner_dash.not_available")}</div>
            {salon.status==="approved"&&<div style={{background:"rgba(39,174,96,.10)",border:"1.5px solid rgba(39,174,96,.4)",borderRadius:10,padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:4,flexShrink:0,fontSize:14,fontWeight:900,color:"#27ae60",minWidth:74}}>{t("owner_dash.salon_active")}</div>}
          </div>
        </div>
      </div>

      {salon.status!=="approved"&&(
        <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.25)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12,color:"var(--pl)"}}>
          {t("owner_dash.pending_notice")}
        </div>
      )}

      {/* ── بطاقة ملخص اليوم ── */}
      <div className="today-card" style={{background:"rgba(var(--pr),.20)",borderRadius:18,padding:"16px",marginBottom:18,border:"1.5px solid rgba(var(--pr),.60)",boxShadow:"0 4px 20px rgba(var(--pr),.12)"}}>

        {/* التاريخ */}
        <div style={{fontSize:14,fontWeight:800,color:"var(--p)",marginBottom:14,display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="🌅" size={14}/> {_dayLabel}</div>

        {/* الإجمالي - الرقم الأهم، بارز فوق التفاصيل */}
        <div style={{background:"rgba(241,196,15,.10)",borderRadius:12,padding:"14px 8px",border:"1.5px solid rgba(241,196,15,.4)",textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:32,fontWeight:900,color:"#f1c40f",lineHeight:1}}>{_tdTotal}</div>
          <div style={{fontSize:11,color:"#f1c40f",marginTop:5,fontWeight:700}}>{t('ui.total_today')}</div>
        </div>

        {/* إيرادات التطبيق + الكاش */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div style={{background:"rgba(var(--pr),.12)",borderRadius:12,padding:"9px 8px",border:"1px solid rgba(var(--pr),.3)",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:"var(--p)",lineHeight:1}}>{_tdRevenue}</div>
            <div style={{fontSize:9,color:"var(--p)",marginTop:4,opacity:.8,fontWeight:700}}>{t('ui.app_revenue')}</div>
          </div>
          <div style={{background:"rgba(39,174,96,.10)",borderRadius:12,padding:"9px 8px",border:"1px solid rgba(39,174,96,.3)",textAlign:"center",position:"relative"}}>
            <button onClick={()=>setShowDashCash(v=>!v)} style={{position:"absolute",top:4,left:4,background:"rgba(39,174,96,.2)",border:"1px solid rgba(39,174,96,.4)",color:"#27ae60",borderRadius:6,fontSize:10,fontWeight:800,padding:"1px 5px",cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>+</button>
            <div style={{fontSize:16,fontWeight:800,color:"#27ae60",lineHeight:1}}>{_tdCash}</div>
            <div style={{fontSize:9,color:"#27ae60",marginTop:4,fontWeight:700}}>{t('ui.cash_revenue')}</div>
          </div>
        </div>

        {/* نموذج إضافة الكاش */}
        {showDashCash&&(
          <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:10}}>
            <div style={{flex:"0 0 90px",position:"relative"}}>
              <input type="number" value={dashCashAmt} onChange={e=>setDashCashAmt(e.target.value)} placeholder="0" onKeyDown={e=>e.key==="Enter"&&addDashCash()}
                style={{width:"100%",padding:"9px 28px 9px 8px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",fontSize:14,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",direction:"ltr",textAlign:"right",fontWeight:700}}/>
              <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--text-muted)",pointerEvents:"none",fontWeight:600}}>{t('ui.sar_short')}</span>
            </div>
            {salon.barbers?.length>0&&(
              <div style={{flex:1,position:"relative"}}>
                <select value={dashCashBarber} onChange={e=>setDashCashBarber(e.target.value)}
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${dashCashBarber?"var(--p)":"var(--border-ui)"}`,background:"var(--surface-2)",color:dashCashBarber?"var(--p)":"var(--text-muted)",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl",appearance:"none",WebkitAppearance:"none",cursor:"pointer",boxSizing:"border-box"}}>
                  <option value="">{t('ui.no_barber')}</option>
                  {salon.barbers.map(b=><option key={b.id} value={b.id}>{b.name||t('ui.barber_unit')}</option>)}
                </select>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--text-muted)",pointerEvents:"none"}}>▼</span>
              </div>
            )}
            <button onClick={addDashCash}
              style={{flex:"0 0 auto",padding:"9px 14px",borderRadius:9,border:"none",background:"var(--grad)",color:"var(--p-text,#000)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}><IconCheck size={12} color="var(--p-text,#000)"/>{t('ui.save')}</button>
            <button onClick={()=>{setShowDashCash(false);setDashCashBarber("");setDashCashAmt("");}}
              style={{flex:"0 0 auto",padding:"9px 10px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center"}}><IconClose size={14}/></button>
          </div>
        )}

        {/* الحجز القادم */}
        {_nextBk&&(
          <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(var(--pr),.15)",borderRadius:11,padding:"10px 12px",border:"1px solid rgba(var(--pr),.3)"}}>
            <div style={{width:32,height:32,borderRadius:9,background:"rgba(var(--pr),.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>⏰</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:"var(--p)",opacity:.7,marginBottom:2}}>{t("owner_dash.next_booking")}</div>
              <div style={{fontSize:13,fontWeight:800,color:"var(--p)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {_nextBk.name||t("owner_dash.customer")} — {to12h(_nextBk.time)}
              </div>
            </div>
            <div style={{fontSize:11,fontWeight:800,color:"var(--p)",background:"rgba(var(--pr),.2)",padding:"4px 9px",borderRadius:8,flexShrink:0,whiteSpace:"nowrap"}}>
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
      </div>

      {/* نسبة حجز اليوم + حجوزات غداً - جنب بعض */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18,alignItems:"start"}}>
        <div style={{background:`rgba(${_occ>=80?"231,76,60":_occ>=50?"var(--pr)":"39,174,96"},.08)`,border:`1px solid rgba(${_occ>=80?"231,76,60":_occ>=50?"var(--pr)":"39,174,96"},.25)`,borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:900,color:_occ>=80?"#e74c3c":_occ>=50?"var(--p)":"#27ae60"}}>{_occ}%</span>
          <span style={{flex:1,fontSize:11,color:"var(--text-muted)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t('ui.today_occupancy')}</span>
          <div style={{width:40,height:7,background:"rgba(var(--pr),.12)",borderRadius:10,overflow:"hidden"}}>
            <div className="occ-bar" style={{height:"100%",width:`${_occ}%`,background:_occ>=80?"linear-gradient(90deg,#c0392b,#e74c3c)":_occ>=50?"linear-gradient(90deg,var(--pd),var(--pl))":"linear-gradient(90deg,#1e8449,#27ae60)",borderRadius:10,transformOrigin:"right center"}}/>
          </div>
        </div>
        <div onClick={()=>setShowTomorrow(v=>!v)} style={{background:"var(--surface-2)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          <span style={{display:"flex"}}><IconCalendar size={14}/></span>
          <span style={{flex:1,fontSize:11,color:"var(--text-primary)",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t('ui.tomorrow_bookings',{count:_tmrBks.length})}</span>
          <span style={{fontSize:9,color:"var(--text-muted)"}}>{showTomorrow?"▲":"▼"}</span>
        </div>
      </div>

      {/* تفاصيل حجوزات غداً */}
      {showTomorrow&&(
        <div style={{border:"1px solid var(--border-ui)",borderRadius:12,marginBottom:18,overflow:"hidden",padding:_tmrBks.length?"6px 0":"12px 14px"}}>
          {_tmrBks.length===0?
            <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>{t('ui.no_tomorrow')}</div>
          :_tmrBks.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map((b,i)=>(
            <div key={b.id||i} style={{padding:"7px 14px",borderBottom:i<_tmrBks.length-1?"1px solid var(--border-ui)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:800,color:"var(--p)",minWidth:48}}>{to12h(b.time)}</span>
                <span style={{flex:1,fontSize:12,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name||t("owner_dash.customer")}</span>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8,background:b.status==="approved"?"rgba(39,174,96,.15)":b.status==="rejected"?"rgba(231,76,60,.15)":"rgba(243,156,18,.15)",color:b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"#f39c12"}}>{b.status==="approved"?t("owner_dash.filter_approved"):b.status==="rejected"?t("owner_dash.filter_rejected"):t("owner_dash.filter_pending")}</span>
              </div>
              {b.status==="pending"&&<div style={{display:"flex",gap:6,marginTop:6}}><button style={{...G.accBtn,padding:"3px 8px",fontSize:10,borderRadius:8}} onClick={()=>updateBookingStatus(salon.id,b.id,"approved")}>{t("notif.approve")}</button><button style={{...G.rejBtn,padding:"3px 8px",fontSize:10,borderRadius:8}} onClick={()=>updateBookingStatus(salon.id,b.id,"rejected")}>{t("notif.reject")}</button></div>}
            </div>
          ))}
        </div>
      )}

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
                  <div style={{fontSize:8,color:isOpen?color:"var(--text-muted)",lineHeight:1,display:"flex",alignItems:"center",gap:2}}>
                    {isOpen?"إخفاء":"التفاصيل"}
                    <span style={{transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* قائمة الحجوزات المنسدلة */}
          {activeCard&&(
            <div style={{animation:"fadeInUp .3s ease-out",marginBottom:14,border:`1.5px solid ${activeCard==="all"?"var(--gold)":activeCard==="pending"?"#f39c12":activeCard==="approved"?"#27ae60":"#e74c3c"}33`,borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden",background:"rgba(255,255,255,.02)"}}>
              <NotifPanel key={activeCard} salon={salon} onUpdate={updateBookingStatus} customers={customers} defaultFilter={activeCard} refreshSalonBookings={refreshSalonBookings} dateFilter={_td}/>
            </div>
          )}
        </>
      )}
      {ownerTab!==null&&(
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setShowSalonDrawer(true)}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,...(ownerTab==="calendar"||ownerTab==="messages"||ownerTab==="reviews"||ownerTab==="stats"?{}:{display:"flex",alignItems:"center",gap:6})}}>{ownerTab==="calendar"?t("salon_drawer.bookings"):ownerTab==="messages"?t("salon_drawer.messages"):ownerTab==="reviews"?t("salon_drawer.reviews"):ownerTab==="stats"?t("salon_drawer.stats"):<><IconFire size={16}/>{t('ui.send_offer')}</>}</h2>
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
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    finally{setSaving(null);}
  };

  const deleteReply=async(reviewId)=>{
    try{
      await sb("reviews","PATCH",{owner_reply:null},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:null}:r));
      toast$(t("owner_dash.reply_deleted"));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };

  return(
    <div style={{paddingTop:8}}>
      {/* ملخص */}
      <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:900,color:goldStar,lineHeight:1}}>{avg||"—"}</div>
          <div style={{display:"flex",gap:1,justifyContent:"center",margin:"4px 0"}}>
            {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=Math.round(avg)?goldStar:"rgba(var(--gold-rgb),.2)"}/>)}
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
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><IconUser size={11}/>{r.customer_name||t("owner_dash.customer_fallback")}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=r.rating?goldStar:"rgba(var(--gold-rgb),.18)"}/>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:4}}>«{r.comment}»</div>}
              <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.booking_date||r.created_at?.split("T")[0]||"—"}</div>

              {/* رد موجود */}
              {hasReply&&!(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply)&&(
                <div style={{padding:"8px 10px",background:"rgba(var(--pr),.07)",borderRight:"3px solid var(--p)",borderRadius:"0 8px 8px 0",marginBottom:6}}>
                  <div style={{fontSize:10,color:gold,fontWeight:700,marginBottom:2}}>{t("owner_dash.reply_label")}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{r.owner_reply}</div>
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
  const todayDateStr=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"});

  const[expandedDate,setExpandedDate]=useState(null);
  const[localAttendance,setLocalAttendance]=useState({});
  const[viewMonth,setViewMonth]=useState(()=>new Date().getMonth());
  const[viewYear,setViewYear]=useState(()=>new Date().getFullYear());

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
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8,display:"flex",alignItems:"center",gap:5}}><IconClipboard size={11}/>{expandedDate} • {selBks.length} {t("owner_dash.booking_unit")}</div>
          {selBks.length===0
            ?<div style={G.empty}>{t("owner_dash.calendar_no_bookings")}</div>
            :selBks.map(b=>(
              <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><IconUser size={12}/>{b.name||t("owner_dash.customer_fallback")}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><NotifIcon icon="📞" size={11}/> {b.phone}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4}}><IconScissors size={11}/>{Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` - ${b.barberName}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)",display:"flex",alignItems:"center",gap:4}}><IconCalendar size={10}/>{b.date} {to12h(b.time)} - {b.total||0} ر</div>
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
  const{t}=useTranslation();
  const PACKAGES=[
    {id:"bronze",label:"برونز",medal:"🥉",color:"#cd7f32",bg:"rgba(205,127,50,.08)",border:"rgba(205,127,50,.4)",
     icon:"🔔",service:"إشعار push يذهب لعملائك فقط الذين فعّلوا الإشعارات في التطبيق",
     prices:{1:5,3:12,7:20}},
    {id:"silver",label:"فضي",medal:"🥈",color:"#9e9e9e",bg:"rgba(158,158,158,.08)",border:"rgba(158,158,158,.4)",
     icon:"🔥",service:"العرض يظهر في بطاقة صالونك في الصفحة الرئيسية يشاهده جميع العملاء",
     prices:{1:10,3:25,7:40}},
    {id:"gold",label:"ذهبي",medal:"🥇",color:"#d4a017",bg:"rgba(212,160,23,.08)",border:"rgba(212,160,23,.4)",
     icon:"💬",service:"رسائل WhatsApp مباشرة لعملائك",
     prices:null},
  ];
  const DURATIONS=[{days:1,label:"يوم واحد"},{days:3,label:"3 أيام"},{days:7,label:"أسبوع"},{days:0,label:"⚠️ 5 دقائق (اختبار)"}];
  const CUSTOMER_GROUPS=[
    {key:"recent",label:"آخر العملاء الذين زاروا الصالون",subtitle:"العملاء الذين زاروك مؤخراً"},
    {key:"frequent",label:"أكثر العملاء زيارة للصالون",subtitle:"العملاء الذين يترددون عليك باستمرار"},
    {key:"all",label:"جميع العملاء",subtitle:"جميع من حجز عبر التطبيق"},
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
  const[waCredits,setWaCredits]=useState(null);
  const[appliedCodeRow,setAppliedCodeRow]=useState(null);
  const[customerGroup,setCustomerGroup]=useState("recent");
  const[targetCount,setTargetCount]=useState(null);
  const[templateType,setTemplateType]=useState("discount");
  const[tmplService1,setTmplService1]=useState("");
  const[tmplService2,setTmplService2]=useState("");
  const[tmplPercent,setTmplPercent]=useState(20);
  const[saving,setSaving]=useState(false);
  const[myPromos,setMyPromos]=useState([]);
  const[loadingPromos,setLoadingPromos]=useState(true);

  const selectedPkg=PACKAGES.find(p=>p.id===pkg);
  const salonCustomers=customers.filter(c=>(c.history||[]).some(h=>String(h.salonId)===String(salon.id)));
  const totalCustomers=salonCustomers.length;
  const minCount=Math.max(1,Math.floor(totalCustomers*0.3));
  const effectiveTarget=targetCount===null?minCount:Math.max(minCount,Math.min(totalCustomers,targetCount));
  const effectiveCustomerCount=waCredits?Math.min(effectiveTarget,waCredits):effectiveTarget;
  const smartTemplate=
    templateType==="discount"&&tmplService1&&tmplPercent?`خصم ${tmplPercent}% على ${tmplService1} 🎉`:
    templateType==="free"&&tmplService1?`احصل على ${tmplService1} مجاناً مع كل حجز ✂`:
    templateType==="double"&&tmplService1&&tmplService2?`${tmplService1} + ${tmplService2} بسعر خدمة واحدة فقط ⚡`:
    templateType==="second"&&tmplPercent?`احجز ثانية واحصل على خصم ${tmplPercent}% 💈`:
    "";
  const promoText=useTemplate?smartTemplate:customText;
  const basePrice=!selectedPkg?0:pkg==="gold"
    ? parseFloat((effectiveCustomerCount*WHATSAPP_RATE).toFixed(2))
    : (selectedPkg.prices[durationDays]||0);
  const totalPrice=codeApplied?0:basePrice;

  useEffect(()=>{
    if(!salon?.id)return;
    const deletedKey=`dork_del_promos_${salon.id}`;
    const deletedIds=new Set(JSON.parse(localStorage.getItem(deletedKey)||"[]"));
    sb("promotions","GET",null,`?salon_id=eq.${salon.id}&select=id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&order=created_at.desc&limit=20`)
      .then(rows=>{
        const nowM=new Date();
        setMyPromos((rows||[]).filter(r=>!deletedIds.has(r.id)).map(r=>({...r,_expired:!!(r.ends_at&&new Date(r.ends_at)<=nowM)})));
      }).catch(()=>{}).finally(()=>setLoadingPromos(false));
  },[salon?.id]);

  useEffect(()=>{
    const id=setInterval(()=>{
      setMyPromos(prev=>prev.map(r=>({...r,_expired:!!(r.ends_at&&new Date(r.ends_at)<=new Date())})));
    },5000);
    return()=>clearInterval(id);
  },[]);

  const[checkingCode,setCheckingCode]=useState(false);
  const applyCode=async()=>{
    const c=codeInput.trim().toUpperCase();
    if(!c){setCodeError(i18n.t('ui.code_enter_first'));return;}
    setCheckingCode(true);
    try{
      const res=await fetch("/api/redeem-promo-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"check",code:c,pkg})});
      const row=await res.json().catch(()=>({}));
      if(!res.ok){setCodeError(row.error||i18n.t('ui.code_invalid_expired'));setCodeApplied(false);return;}
      // كود WhatsApp يحدد عدد عملاء مجانيين
      if(row.code_type==="whatsapp"&&row.wa_credits){setWaCredits(row.wa_credits);}
      setAppliedCodeRow(row);
      setCodeApplied(true);setDiscountCode(c);setCodeError("");
    }catch{setCodeError(i18n.t('ui.code_verify_failed'));}
    finally{setCheckingCode(false);}
  };

  const submitPromo=async()=>{
    if(!pkg){toast$(i18n.t('ui.select_package_err'),"err");return;}
    if(!promoText.trim()){toast$(i18n.t('ui.select_offer_text_err'),"err");return;}
    if(myPromos.some(p=>p.status==="active"&&!p._expired&&p.package===pkg)){
      toast$(i18n.t('ui.active_promo_exists'),"err");return;
    }
    setSaving(true);
    try{
      const now=new Date();
      const ends=new Date(now);
      if(durationDays===0){ends.setMinutes(ends.getMinutes()+5);}
      else{ends.setDate(ends.getDate()+(pkg==="gold"?7:durationDays));}
      await sb("promotions","POST",{
        salon_id:salon.id,package:pkg,promo_text:promoText.trim(),
        customer_count:pkg==="gold"?effectiveCustomerCount:null,
        duration_days:pkg==="gold"?7:durationDays,
        price:totalPrice,
        status:"active",
        discount_code:discountCode||null,
        ends_at:ends.toISOString(),
      },"");
      if(appliedCodeRow?.id){
        await fetch("/api/redeem-promo-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"redeem",id:appliedCodeRow.id})}).catch(()=>{});
      }
      toast$(i18n.t('ui.promo_sent'));
      if(pkg==="bronze"){
        supabase.functions.invoke('send-push-notification',{body:{
          target_type:"broadcast",salon_id:salon.id,
          title:`🔥 عرض خاص من ${salon.name}`,
          body:promoText.trim(),
          data:{type:"promo_broadcast",salon_id:String(salon.id)},
        }}).catch(()=>{});
        sb("notifications","POST",{
          target_type:"broadcast",
          target_id:String(salon.id),
          title:`🔥 عرض خاص من ${salon.name}`,
          body:promoText.trim(),
          icon:"🔥",
        }).catch(()=>{});
      }
      const rows=await sb("promotions","GET",null,`?salon_id=eq.${salon.id}&select=id,package,promo_text,customer_count,duration_days,price,status,discount_code,starts_at,ends_at,created_at&order=created_at.desc&limit=20`).catch(()=>[]);
      const delIds=new Set(JSON.parse(localStorage.getItem(`dork_del_promos_${salon.id}`)||"[]"));
      const nowRl=new Date();
      setMyPromos((rows||[]).filter(r=>!delIds.has(r.id)).map(r=>({...r,_expired:!!(r.ends_at&&new Date(r.ends_at)<=nowRl)})));
      setPkg(null);setSelectedTemplate("");setCustomText("");setCodeInput("");setCodeApplied(false);setDiscountCode("");setAppliedCodeRow(null);setTemplateType("discount");setTmplService1("");setTmplService2("");setTmplPercent(20);setTargetCount(null);
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    finally{setSaving(false);}
  };

  const cancelPromo=async(promoId)=>{
    try{
      await sb("promotions","PATCH",{status:"cancelled"},`?id=eq.${promoId}`);
      setMyPromos(p=>p.map(x=>x.id===promoId?{...x,status:"cancelled"}:x));
      toast$(i18n.t('ui.promo_cancelled'));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };

  const deletePromo=async(promoId)=>{
    const deletedKey=`dork_del_promos_${salon.id}`;
    try{await sb("promotions","PATCH",{status:"cancelled"},`?id=eq.${promoId}`);}catch{}
    const ids=new Set(JSON.parse(localStorage.getItem(deletedKey)||"[]"));
    ids.add(promoId);
    localStorage.setItem(deletedKey,JSON.stringify([...ids]));
    setMyPromos(p=>p.filter(x=>x.id!==promoId));
    toast$(i18n.t('ui.promo_deleted'));
  };

  const pkgColor=(p)=>PACKAGES.find(x=>x.id===p)?.color||"var(--text-muted)";
  const statusLabel=(s)=>s==="active"?"✅ نشط":s==="pending"?"⚠️ لم تكتمل":s==="expired"?"⌛ منتهي":"❌ ملغي";
  const statusColor=(s)=>s==="active"?"#27ae60":s==="pending"?"#e74c3c":s==="expired"?"#666":"#e74c3c";

  const[wizStep,setWizStep]=useState(1);
  const TOTAL_STEPS=4;
  const stepLabels=[t('ui.package'),pkg==="gold"?"العملاء":t('ui.duration'),"النص","التأكيد"];

  const canNext=wizStep===1?!!pkg:wizStep===2?true:wizStep===3?!!promoText.trim():false;

  const goNext=()=>{if(canNext&&wizStep<TOTAL_STEPS)setWizStep(s=>s+1);};
  const goBack=()=>{
    if(wizStep>1){
      if(wizStep===4){setCodeApplied(false);setCodeInput("");setDiscountCode("");setCodeError("");setAppliedCodeRow(null);}
      setWizStep(s=>s-1);
    }
  };
  const reset=()=>{setPkg(null);setSelectedTemplate("");setCustomText("");setCodeInput("");setCodeApplied(false);setDiscountCode("");setCodeError("");setWaCredits(null);setAppliedCodeRow(null);setWizStep(1);setTemplateType("discount");setTmplService1("");setTmplService2("");setTmplPercent(20);setTargetCount(null);};
  const renewPromo=(pr)=>{
    setPkg(pr.package);
    if(pr.package!=="gold")setDurationDays(pr.duration_days||7);
    setUseTemplate(false);setCustomText(pr.promo_text||"");
    setCodeInput("");setCodeApplied(false);setDiscountCode("");setCodeError("");setAppliedCodeRow(null);
    setWizStep(2);
  };

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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--p)"}}>{t('ui.my_offers')}</div>
            <div style={{display:"flex",gap:6}}>
              {myPromos.filter(p=>p.status==="active"&&!p._expired).length>0&&(
                <span style={{fontSize:10,background:"rgba(39,174,96,.15)",color:"#27ae60",padding:"2px 9px",borderRadius:10,fontWeight:700}}>{myPromos.filter(p=>p.status==="active"&&!p._expired).length} نشط</span>
              )}
              {myPromos.filter(p=>p.status==="pending").length>0&&(
                <span style={{fontSize:10,background:"rgba(231,76,60,.12)",color:"#e74c3c",padding:"2px 9px",borderRadius:10,fontWeight:700}}>{myPromos.filter(p=>p.status==="pending").length} لم تكتمل</span>
              )}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {myPromos.filter(pr=>!pr._expired).map(pr=>{
              const pkgInfo=PACKAGES.find(p=>p.id===pr.package);
              const ms=pr.ends_at?new Date(pr.ends_at)-Date.now():null;
              const hrsLeft=ms!==null?Math.max(0,Math.ceil(ms/3600000)):null;
              const minsLeft=ms!==null?Math.max(0,Math.ceil(ms/60000)):null;
              const isExpired=pr._expired||false;
              const urgent=hrsLeft!==null&&hrsLeft<=24&&pr.status==="active"&&!isExpired;
              const isPending=pr.status==="pending";
              return(
              <div key={pr.id} style={{background:isPending?"rgba(231,76,60,.05)":"var(--surface-1)",border:`1.5px solid ${isPending?"rgba(231,76,60,.3)":urgent?"#e67e22":pkgColor(pr.package)}44`,borderRadius:12,padding:"12px 14px",transition:"border .3s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:isPending?"#e74c3c":pkgColor(pr.package),display:"flex",alignItems:"center",gap:6}}>{pkgInfo?.label} {pkgInfo&&<IconMedal size={13} color={pkgInfo.color}/>}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2}}>
                      {pr.package==="gold"?`${pr.customer_count||"--"} عميل`:pr.duration_days===0?<LabelWithIcon label="⚠️ 5 دقائق" size={10}/>:`${pr.duration_days||1} يوم`}
                      {" · "}<span style={{color:pr.price===0?"#27ae60":"var(--text-muted)"}}>{pr.price===0?"مجاني":`${pr.price} ريال`}</span>
                    </div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:isExpired?"#95a5a6":statusColor(pr.status),background:isExpired?"rgba(149,165,166,.15)":`${statusColor(pr.status)}18`,padding:"3px 9px",borderRadius:20}}>{isExpired?"منتهي":<LabelWithIcon label={statusLabel(pr.status)} size={10}/>}</span>
                </div>
                {isPending&&<div style={{fontSize:10,color:"#e74c3c",marginBottom:8,lineHeight:1.5}}>{t('ui.incomplete_promo')}</div>}
                <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.6,padding:"8px 10px",background:"rgba(255,255,255,.03)",borderRadius:8,marginBottom:8}}>{pr.promo_text}</div>
                {!isPending&&pr.ends_at&&(
                  <div style={{fontSize:10,color:urgent?"#e67e22":"var(--text-muted)",marginBottom:8,fontWeight:urgent?700:400,display:"flex",alignItems:"center",gap:4}}>
                    {urgent?<LabelWithIcon label={ms<3600000?`⚡ ينتهي خلال ${minsLeft} دقيقة`:`⚡ ينتهي خلال ${hrsLeft} ساعة`} size={10}/>:pr.status==="active"?`⏳ ينتهي: ${new Date(pr.ends_at).toLocaleDateString("ar-SA")}`:`انتهى: ${new Date(pr.ends_at).toLocaleDateString("ar-SA")}`}
                  </div>
                )}
                <div style={{display:"flex",gap:6}}>
                  {pr.status==="active"&&!isExpired&&(
                    <button onClick={()=>cancelPromo(pr.id)} style={{flex:1,background:"transparent",border:"1px solid #e74c3c44",color:"#e74c3c",borderRadius:8,padding:"6px 0",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{t('ui.cancel_promo')}</button>
                  )}
                  {isPending&&(
                    <button onClick={()=>deletePromo(pr.id)} style={{flex:1,background:"rgba(231,76,60,.1)",border:"1px solid rgba(231,76,60,.4)",color:"#e74c3c",borderRadius:8,padding:"6px 0",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{t('ui.delete_btn')}</button>
                  )}
                  {(pr.status==="expired"||pr.status==="cancelled")&&(<>
                    <button onClick={()=>renewPromo(pr)} style={{flex:2,background:"var(--pa12)",border:"1px solid rgba(var(--pr),.3)",color:"var(--p)",borderRadius:8,padding:"6px 0",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{t('ui.renew_promo')} <NotifIcon icon="↩" size={11}/></button>
                    <button onClick={()=>deletePromo(pr.id)} style={{flex:1,background:"transparent",border:"1px solid rgba(231,76,60,.35)",color:"#e74c3c",borderRadius:8,padding:"6px 0",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑</button>
                  </>)}
                </div>
              </div>
              );
            })}
          </div>
          <div style={{height:1,background:"var(--border-ui)",margin:"16px 0"}}/>
        </div>
      )}

      {/* ─── Wizard ─── */}
      <div style={{fontSize:13,fontWeight:800,color:"var(--p)",marginBottom:14,paddingBottom:10,borderBottom:"1px solid var(--border-ui)"}}>{t('ui.new_promo')}</div>

      <Progress/>

      {/* ── الخطوة 1: الباقة ── */}
      {wizStep===1&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {PACKAGES.map(p=>{
            const sel=pkg===p.id;
            return(
              <button key={p.id} onClick={()=>{setPkg(p.id);if(p.id!=="gold")setDurationDays(7);}} style={{background:sel?p.bg:"var(--surface-1)",border:`2px solid ${sel?p.color:p.border}`,borderRadius:16,padding:"14px",textAlign:"right",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",boxShadow:sel?`0 4px 16px ${p.color}22`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:p.bg,border:`1.5px solid ${p.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}><NotifIcon icon={p.icon} size={22}/></div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <span style={{fontSize:15,fontWeight:800,color:sel?p.color:"var(--text-primary)"}}>{p.label}</span>
                      <span style={{display:"flex"}}><IconMedal size={15} color={p.color}/></span>
                    </div>
                    <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5,marginBottom:5}}>{p.service}</div>
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
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:12,textAlign:"center"}}>{t('ui.select_duration')}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {DURATIONS.map(d=>{
                const sel=durationDays===d.days;
                const p=selectedPkg;
                return(
                  <button key={d.days} onClick={()=>setDurationDays(d.days)} style={{padding:"16px",borderRadius:14,border:`2px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa12)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:sel?"0 4px 14px rgba(var(--gold-rgb),.12)":"none"}}>
                    <span style={{fontSize:14,fontWeight:700,color:sel?"var(--p)":"var(--text-muted)"}}><LabelWithIcon label={d.label} size={13}/></span>
                    <span style={{fontSize:16,fontWeight:900,color:sel?"var(--p)":"var(--text-muted)"}}>{p?.prices[d.days]} ر</span>
                  </button>
                );
              })}
            </div>
          </div>
        ):(
          <div>
            {/* فئات الاستهداف */}
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8,textAlign:"center"}}>{t('ui.select_target')}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {CUSTOMER_GROUPS.map(g=>{
                const sel=customerGroup===g.key;
                return(
                  <button key={g.key} onClick={()=>setCustomerGroup(g.key)} style={{padding:"13px 16px",borderRadius:14,border:`2px solid ${sel?"#d4a017":"var(--border-ui)"}`,background:sel?"rgba(212,160,23,.08)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:sel?"0 4px 14px rgba(212,160,23,.1)":"none"}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontWeight:700,color:sel?"#d4a017":"var(--text-primary)",marginBottom:2}}>{g.label}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>{g.subtitle}</div>
                    </div>
                    <div style={{width:20,height:20,borderRadius:"50%",border:`2.5px solid #d4a017`,background:sel?"#d4a017":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {sel&&<span style={{fontSize:9,color:"#000",fontWeight:900}}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* بطاقة موحدة: الإجمالي ⇄ المستهدف */}
            <div style={{background:"rgba(212,160,23,.06)",border:"1.5px solid rgba(212,160,23,.3)",borderRadius:14,padding:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t('ui.total_customers')}</div>
                  <button onClick={()=>setTargetCount(totalCustomers)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    <div style={{fontSize:30,fontWeight:900,color:"rgba(212,160,23,.55)",lineHeight:1}}>{totalCustomers}</div>
                  </button>
                </div>
                <div style={{display:"flex",alignItems:"center"}}><IconSwapHorizontal size={18} color="rgba(212,160,23,.4)"/></div>
                <div style={{flex:1,textAlign:"center"}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t('ui.target_count')}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <button onClick={()=>setTargetCount(t=>Math.max(minCount,(t??effectiveTarget)-1))} style={{width:30,height:30,borderRadius:"50%",border:"2px solid rgba(212,160,23,.5)",background:"rgba(212,160,23,.1)",color:"#d4a017",fontSize:18,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>−</button>
                    <div style={{fontSize:28,fontWeight:900,color:"#d4a017",minWidth:40,textAlign:"center"}}>{effectiveTarget}</div>
                    <button onClick={()=>setTargetCount(t=>Math.min(totalCustomers,(t??effectiveTarget)+1))} style={{width:30,height:30,borderRadius:"50%",border:"2px solid rgba(212,160,23,.5)",background:"rgba(212,160,23,.1)",color:"#d4a017",fontSize:18,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>+</button>
                  </div>
                </div>
              </div>
              <div style={{borderTop:"1px solid rgba(212,160,23,.2)",paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:10,color:"var(--text-muted)"}}>{t('ui.wa_min_clients',{count:minCount})}</div>
                <div style={{fontSize:13,fontWeight:800,color:"#d4a017"}}>{t('ui.wa_cost',{amount:parseFloat((effectiveCustomerCount*WHATSAPP_RATE).toFixed(2))})}</div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── الخطوة 3: نص العرض ── */}
      {wizStep===3&&(
        <div>
          <div style={{display:"flex",gap:6,marginBottom:14,background:"var(--surface-1)",borderRadius:10,padding:4,border:"1px solid var(--border-ui)"}}>
            <button onClick={()=>setUseTemplate(true)} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:useTemplate?"var(--pa15)":"transparent",color:useTemplate?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t('ui.ready_template')}</button>
            <button onClick={()=>setUseTemplate(false)} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:!useTemplate?"var(--pa15)":"transparent",color:!useTemplate?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t('ui.custom_text')}</button>
          </div>
          {useTemplate?(
            <div>
              {/* أنواع القوالب */}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                {[
                  {id:"discount",icon:"🏷",label:"خصم نسبي",desc:"خصم % على خدمة محددة"},
                  {id:"free",icon:"🎁",label:"خدمة مجانية",desc:"خدمة مجانية مع كل حجز"},
                  {id:"double",icon:"✌️",label:"باقة مزدوجة",desc:"خدمتان بسعر خدمة واحدة"},
                  {id:"second",icon:"🔄",label:"الحجز الثاني",desc:"خصم على حجزك القادم"},
                ].map(tp=>{
                  const sel=templateType===tp.id;
                  return(
                    <button key={tp.id} onClick={()=>{setTemplateType(tp.id);setTmplService1("");setTmplService2("");}} style={{padding:"12px 14px",borderRadius:12,border:`2px solid ${sel?"var(--p)":"var(--border-ui)"}`,background:sel?"var(--pa08)":"var(--surface-1)",cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .15s",display:"flex",alignItems:"center",gap:12,textAlign:"right",boxShadow:sel?"0 4px 14px rgba(var(--gold-rgb),.1)":"none"}}>
                      <span style={{flexShrink:0,display:"flex"}}><NotifIcon icon={tp.icon} size={22}/></span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:sel?"var(--p)":"var(--text-primary)",marginBottom:2}}>{tp.label}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{tp.desc}</div>
                      </div>
                      <div style={{width:20,height:20,borderRadius:"50%",border:`2.5px solid var(--p)`,background:sel?"var(--p)":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {sel&&<span style={{fontSize:9,color:"var(--p-text)",fontWeight:900}}>✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* مدخلات القالب */}
              <div style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                {(templateType==="discount"||templateType==="second")&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:5}}>{t('ui.discount_pct')}</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <button onClick={()=>setTmplPercent(p=>Math.max(1,p-5))} style={{width:34,height:34,borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:16,fontFamily:"inherit"}}>−</button>
                      <div style={{flex:1,textAlign:"center",fontSize:22,fontWeight:900,color:"var(--p)"}}>{tmplPercent}%</div>
                      <button onClick={()=>setTmplPercent(p=>Math.min(99,p+5))} style={{width:34,height:34,borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:16,fontFamily:"inherit"}}>+</button>
                    </div>
                  </div>
                )}
                {(templateType==="discount"||templateType==="free"||templateType==="double")&&(
                  <div style={{marginBottom:templateType==="double"?10:0}}>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:5}}>{templateType==="double"?"الخدمة الأولى":t('ui.service_col')}</div>
                    <select value={tmplService1} onChange={e=>setTmplService1(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:tmplService1?"var(--text-primary)":"var(--text-muted)",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl"}}>
                      <option value="">{t('ui.choose_service')}</option>
                      {(salon.services||[]).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {templateType==="double"&&(
                  <div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:5}}>{t('ui.second_service')}</div>
                    <select value={tmplService2} onChange={e=>setTmplService2(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:tmplService2?"var(--text-primary)":"var(--text-muted)",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl"}}>
                      <option value="">{t('ui.choose_service')}</option>
                      {(salon.services||[]).map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* معاينة */}
              {smartTemplate&&(
                <div style={{background:"rgba(var(--gold-rgb),.06)",border:"1px dashed rgba(var(--gold-rgb),.35)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>{t('ui.preview_text')}</div>
                  <div style={{fontSize:13,color:"var(--text-primary)",lineHeight:1.7}}>{smartTemplate}</div>
                </div>
              )}
            </div>
          ):(
            <div>
              <div style={{background:"rgba(var(--gold-rgb),.06)",border:"1px solid rgba(var(--gold-rgb),.2)",borderRadius:10,padding:"9px 12px",fontSize:11,color:"var(--text-muted)",lineHeight:1.7,marginBottom:12}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="💡" size={12}/> اكتب عرضاً واضحاً: الخدمة، الخصم، والمدة. اجعله موجزاً وجذاباً</span>
              </div>
              {(salon.services||[]).length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:5}}>{t('ui.add_service_opt')}</div>
                  <select value={tmplService1} onChange={e=>{setTmplService1(e.target.value);if(e.target.value)setCustomText(t=>t?t+" "+e.target.value:e.target.value);}} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:tmplService1?"var(--text-primary)":"var(--text-muted)",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"rtl"}}>
                    <option value="">--</option>
                    {(salon.services||[]).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <textarea value={customText} onChange={e=>setCustomText(e.target.value)} placeholder={t('ui.offer_text_ph')} rows={4} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",direction:"rtl",boxSizing:"border-box",marginBottom:6}}/>
              {customText&&(
                <div style={{background:"rgba(var(--gold-rgb),.06)",border:"1px dashed rgba(var(--gold-rgb),.35)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>{t('ui.preview')}</div>
                  <div style={{fontSize:13,color:"var(--text-primary)",lineHeight:1.7}}>
                    {customText.split(/(\d+%?)/).map((part,i)=>
                      /^\d+%?$/.test(part)?<span key={i} style={{color:"var(--p)",fontWeight:800}}>{part}</span>:<span key={i}>{part}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── الخطوة 4: التأكيد ── */}
      {wizStep===4&&selectedPkg&&(
        <div>
          {/* ملخص */}
          <div style={{background:"linear-gradient(135deg,rgba(var(--gold-rgb),.1),rgba(var(--gold-rgb),.04))",border:"1.5px solid rgba(var(--gold-rgb),.3)",borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:"var(--p)",marginBottom:12}}>{t('ui.order_summary')}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.package')}</span>
                <span style={{fontSize:13,fontWeight:800,color:selectedPkg.color,display:"flex",alignItems:"center",gap:6}}>{selectedPkg.label} <IconMedal size={13} color={selectedPkg.color}/></span>
              </div>
              {pkg==="gold"?(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.account')}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{effectiveCustomerCount} عميل × {WHATSAPP_RATE} ر = <span style={{color:"var(--gold)"}}>{basePrice} ر</span></span>
                </div>
              ):(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.duration')}</span>
                  <span style={{fontSize:12,fontWeight:700}}>{DURATIONS.find(d=>d.days===durationDays)?.label}</span>
                </div>
              )}
              <div style={{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)"}}>
                <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>{t('ui.offer_text')}</div>
                <div style={{fontSize:12,color:"var(--text-primary)",lineHeight:1.6}}>{promoText}</div>
              </div>
              {codeApplied&&(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#27ae60"}}>{t('ui.code_applied',{code:discountCode})}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#27ae60"}}>- {basePrice} ريال</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,borderTop:"1px solid rgba(var(--gold-rgb),.2)",marginTop:12}}>
              <span style={{fontSize:14,fontWeight:700}}>{t('ui.total')}</span>
              <span style={{fontSize:26,fontWeight:900,color:totalPrice===0?"#27ae60":"var(--gold)"}}>{totalPrice} <span style={{fontSize:13}}>{t('ui.sar')}</span></span>
            </div>
          </div>

          {/* كود الخصم */}
          <div style={{background:"var(--surface-1)",border:`1px solid ${codeApplied?"#27ae60":"var(--border-ui)"}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="🎟" size={13}/> كود الخصم</div>
            <div style={{display:"flex",gap:8}}>
              <input value={codeInput} onChange={e=>{setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,""));setCodeApplied(false);setCodeError("");}} placeholder={t('ui.enter_code_ph')} maxLength={20} disabled={codeApplied} style={{flex:1,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${codeApplied?"#27ae60":codeError?"#e74c3c":"var(--border-ui)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",direction:"ltr",textAlign:"center",boxSizing:"border-box",letterSpacing:2}}/>
              <button onClick={codeApplied?()=>{setCodeApplied(false);setCodeInput("");setDiscountCode("");setCodeError("");setAppliedCodeRow(null);}:applyCode} disabled={checkingCode} style={{padding:"10px 16px",borderRadius:9,border:"none",background:codeApplied?"rgba(39,174,96,.15)":"var(--pa15)",color:codeApplied?"#27ae60":"var(--p)",cursor:checkingCode?"not-allowed":"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,flexShrink:0,WebkitAppearance:"none",appearance:"none"}}>
                {checkingCode?"...":codeApplied?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconSuccess size={12}/>{t('ui.active_status')}</span>:"تطبيق"}
              </button>
            </div>
            {codeError&&<div style={{fontSize:11,color:"#e74c3c",marginTop:4}}>{codeError}</div>}
            {codeApplied&&<div style={{fontSize:11,color:"#27ae60",marginTop:4,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={12}/>{t('ui.free_promo')}</div>}
          </div>

          {/* زر الإرسال */}
          {!codeApplied&&(
            <div style={{background:"rgba(231,76,60,.08)",border:"1px solid rgba(231,76,60,.25)",borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:11,color:"#e74c3c",textAlign:"center",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              <NotifIcon icon="🎟" size={13}/> أدخل كود الخصم لتفعيل الإرسال
            </div>
          )}
          <button onClick={submitPromo} disabled={saving||!codeApplied} style={{width:"100%",background:saving||!codeApplied?"var(--surface-1)":totalPrice===0?"linear-gradient(135deg,#27ae60,#2ecc71)":"linear-gradient(135deg,#c0392b,#e74c3c)",color:saving||!codeApplied?"var(--text-muted)":"#fff",border:codeApplied?"none":"1.5px solid var(--border-ui)",borderRadius:14,padding:"16px",fontSize:15,fontWeight:800,cursor:saving||!codeApplied?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:8,transition:"all .2s"}}>
            {saving?t('ui.sending_offer'):codeApplied?<span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconRocket size={15} color="#fff"/> إرسال العرض</span>:"أدخل كود الخصم أولاً"}
          </button>
          <button disabled style={{width:"100%",background:"var(--surface-1)",color:"var(--text-muted)",border:"1.5px solid var(--border-ui)",borderRadius:14,padding:"13px",fontSize:13,fontWeight:700,cursor:"not-allowed",fontFamily:"inherit",marginBottom:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:.6}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="💳" size={14}/> ادفع وأرسل</span>
            <span style={{fontSize:10,background:"rgba(255,255,255,.08)",padding:"2px 8px",borderRadius:8,display:"inline-flex",alignItems:"center",gap:4}}>{t('ui.coming_soon')} <NotifIcon icon="🔒" size={10}/></span>
          </button>
        </div>
      )}

      {/* ─── أزرار التنقل ─── */}
      <div style={{display:"flex",gap:10,marginTop:20}}>
        {wizStep>1?(
          <button onClick={goBack} style={{flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <IconArrowRight size={20}/>
          </button>
        ):(
          <button onClick={reset} style={{flex:1,padding:"13px 0",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",WebkitAppearance:"none",appearance:"none"}}>
            مسح
          </button>
        )}
        {wizStep<TOTAL_STEPS&&(
          <button onClick={goNext} disabled={!canNext} style={{flex:2,padding:"13px 0",borderRadius:12,border:"none",background:canNext?"var(--pa15)":"var(--surface-1)",color:canNext?"var(--p)":"var(--text-muted)",cursor:canNext?"pointer":"not-allowed",fontSize:13,fontWeight:800,fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            التالي <NotifIcon icon="←" size={13}/>
          </button>
        )}
      </div>

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
  const adminBoxRef=useRef(null);
  const[msgTab,setMsgTab]=useState("customers"); // "admin" | "customers"
  const[selCust,setSelCust]=useState(null); // {customerId,bookingId,customerName}
  const[convList,setConvList]=useState([]);
  const[loadingConv,setLoadingConv]=useState(false);
  const[custMsgs,setCustMsgs]=useState([]);
  const[ownerTxt,setOwnerTxt]=useState("");
  const[ownerSending,setOwnerSending]=useState(false);
  const custBoxRef=useRef(null);
  const custMsgsEndRef=useRef(null);
  const prevAdminCount=useRef(-1);
  const prevCustCount=useRef(-1);
  const needScrollRef=useRef(false);
  const prevUnreadRef=useRef(-1);
  const isFirstLoadConv=useRef(true);
  const[clearConfirm,setClearConfirm]=useState(false);
  const[searchTxt,setSearchTxt]=useState("");
  const[searchResults,setSearchResults]=useState(null); // null=لم يُبحث, array=نتائج
  const[searching,setSearching]=useState(false);
  const[clearAllConfirm,setClearAllConfirm]=useState(false);

  // تحميل الرسائل من Supabase
  const loadMsgs=useCallback(async()=>{
    try{
      const data=await sb("messages","GET",null,`?select=id,salon_id,from_admin,text,created_at,read_at&salon_id=eq.${salon.id}&order=created_at.asc&limit=50`);
      if(Array.isArray(data)&&data.length>0){
        const converted=data.map(m=>({id:m.id,from:m.from_admin?"admin":"owner",text:m.text,readAt:m.read_at||null,time:new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})}));
        setMsgs(converted);
        try{localStorage.setItem(KEY,JSON.stringify(converted));}catch{}
      }
    }catch{}
  },[salon.id,KEY]);

  useEffect(()=>{loadMsgs();},[loadMsgs]);

  useEffect(()=>{
    fetch("/api/customer-messages?markAdminRead=1",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({salonId:salon.id})}).catch(()=>{});
  },[salon.id]);

  useEffect(()=>{
    const channel=supabase.channel(`msgs-${salon.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`salon_id=eq.${salon.id}`},()=>{loadMsgs();})
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[salon.id,loadMsgs]);

  useEffect(()=>{const el=adminBoxRef.current;if(!el)return;if(prevAdminCount.current<0||msgs.length>prevAdminCount.current)el.scrollTop=el.scrollHeight;prevAdminCount.current=msgs.length;},[msgs]);

  const send=async()=>{
    if(!txt.trim()||sending)return;
    setSending(true);
    const msgText=txt.trim();
    setTxt("");
    try{
      await sb("messages","POST",{salon_id:salon.id,from_admin:false,text:msgText});
      await loadMsgs();
    }catch{
      const m={id:Date.now(),from:"owner",text:msgText,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})};
      const newMsgs=[...msgs,m];
      setMsgs(newMsgs);
      try{localStorage.setItem(KEY,JSON.stringify(newMsgs));}catch{}
    }
    setSending(false);
  };

  // تحميل قائمة محادثات العملاء
  const loadConvList=useCallback(async()=>{
    if(isFirstLoadConv.current)setLoadingConv(true);
    try{
      const res=await fetch("/api/owner-chat?list=1",{credentials:"include"});
      const data=await res.json();
      if(Array.isArray(data)){
        setConvList(data);
        const newTotal=data.reduce((a,c)=>a+(c.unread_count||0),0);
        if(prevUnreadRef.current>=0&&newTotal>prevUnreadRef.current){
          toast$&&toast$("💬 رسالة جديدة من عميل","info");
        }
        prevUnreadRef.current=newTotal;
        isFirstLoadConv.current=false;
      }
    }catch{}
    setLoadingConv(false);
  },[selCust,toast$]);

  // تحميل رسائل محادثة عميل محدد
  const loadOwnerChat=useCallback(async(cId,bId)=>{
    try{
      const url=bId?`/api/owner-chat?customerId=${cId}&bookingId=${bId}`:`/api/owner-chat?customerId=${cId}`;
      const res=await fetch(url,{credentials:"include"});
      const data=await res.json();
      if(Array.isArray(data))setCustMsgs(data);
      else setCustMsgs([]);
    }catch{setCustMsgs([]);}
  },[]);

  const searchCustomer=useCallback(async()=>{
    const q=searchTxt.trim();
    if(!q)return;
    setSearching(true);
    try{
      const res=await fetch(`/api/owner-chat?searchPhone=${encodeURIComponent(q)}`,{credentials:"include"});
      const data=await res.json();
      setSearchResults(Array.isArray(data)?data:[]);
    }catch{setSearchResults([]);}
    setSearching(false);
  },[searchTxt]);

  useEffect(()=>{if(msgTab==="customers")loadConvList();},[msgTab,loadConvList]);
  // تحديث القائمة دورياً (كل 10 ثوانٍ) لتحديث عداد غير المقروء حتى بدون دخول المحادثة
  useEffect(()=>{
    if(msgTab!=="customers")return;
    const id=setInterval(loadConvList,10000);
    return()=>clearInterval(id);
  },[msgTab,loadConvList]);
  // Realtime: تحديث القائمة فورياً عند وصول رسالة جديدة من أي عميل
  useEffect(()=>{
    if(msgTab!=="customers"||!salon?.id)return;
    const ch=supabase.channel(`convlist-${salon.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${salon.id}`},()=>{
        loadConvList();
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[msgTab,salon?.id,loadConvList]);
  useEffect(()=>{if(selCust){needScrollRef.current=true;prevCustCount.current=-1;setClearConfirm(false);setCustMsgs([]);loadOwnerChat(selCust.customerId,selCust.bookingId);}},[selCust,loadOwnerChat]);
  useEffect(()=>{
    if(!selCust)return;
    const id=setInterval(()=>loadOwnerChat(selCust.customerId,selCust.bookingId),3000);
    return()=>clearInterval(id);
  },[selCust,loadOwnerChat]);
  // Realtime: الصالون يستقبل رسائل العميل فورياً بدون انتظار الـ polling
  useEffect(()=>{
    if(!selCust||!salon?.id)return;
    const ch=supabase.channel(`owner-cm-${salon.id}-${selCust.customerId}-${selCust.bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${salon.id}`},()=>{
        loadOwnerChat(selCust.customerId,selCust.bookingId);
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[selCust,salon?.id,loadOwnerChat]);
  useEffect(()=>{if(needScrollRef.current||prevCustCount.current<0||custMsgs.length>prevCustCount.current){requestAnimationFrame(()=>{custMsgsEndRef.current?.scrollIntoView({block:"end"});});needScrollRef.current=false;}prevCustCount.current=custMsgs.length;},[custMsgs]);

  const sendOwnerReply=async()=>{
    if(!ownerTxt.trim()||ownerSending||!selCust)return;
    setOwnerSending(true);
    const msgText=ownerTxt.trim();
    setOwnerTxt("");
    try{
      const res=await fetch("/api/owner-chat",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:selCust.customerId,bookingId:selCust.bookingId,text:msgText})});
      if(res.ok){
        await loadOwnerChat(selCust.customerId,selCust.bookingId);
      }else{
        setOwnerTxt(msgText);
        let errMsg=i18n.t('ui.send_failed');
        try{const j=await res.json();if(j?.error)errMsg=j.error;}catch{}
        toast$&&toast$(errMsg,"err");
      }
    }catch{
      setOwnerTxt(msgText);
      toast$&&toast$(i18n.t('ui.connection_error'),"err");
    }
    setOwnerSending(false);
  };

  const unreadCustTotal=convList.reduce((a,c)=>a+(c.unread_count||0),0);
  const tabBtn=(v,l,badge)=>(
    <button onClick={()=>setMsgTab(v)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${msgTab===v?"var(--p)":"var(--border-ui)"}`,background:msgTab===v?"var(--pa08)":"transparent",color:msgTab===v?"var(--p)":"var(--text-muted)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
      {l}
      {badge>0&&<span style={{background:"var(--p)",color:"#fff",borderRadius:999,fontSize:10,fontWeight:900,minWidth:17,height:17,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{badge>99?"99+":badge}</span>}
    </button>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:440,overflow:"hidden"}}>
      {/* تبويبات */}
      <div style={{display:"flex",gap:6,marginBottom:10}}>{tabBtn("customers","العملاء",unreadCustTotal)}{tabBtn("admin","الإدارة",0)}</div>

      {/* تبويب الإدارة */}
      {msgTab==="admin"&&<>
        <div ref={adminBoxRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {msgs.length===0&&<div style={G.empty}>{t("messages.empty")}</div>}
          {msgs.map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:m.from==="owner"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:m.from==="owner"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.from==="owner"?"var(--pa25)":"var(--surface-2)",border:`1px solid ${m.from==="owner"?"var(--pa4)":"var(--border-ui)"}`}}>
                <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:3}}>{m.from==="owner"?t("messages.from_you"):t("messages.from_admin")}</div>
                <div style={{fontSize:13,color:"var(--text-primary)"}}>{m.text}</div>
                <div style={{fontSize:9,color:"var(--text-muted)",marginTop:3,display:"flex",alignItems:"center",justifyContent:m.from==="owner"?"flex-start":"flex-end",gap:3}}>{m.time}{m.from==="owner"&&<span style={{color:m.readAt?"#34B7F1":"#888888"}}>✓✓</span>}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input style={{flex:1,padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
            placeholder={t("messages.placeholder")} value={txt} onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}/>
          <button style={{...G.sub,width:"auto",padding:"0 16px",marginTop:0,opacity:sending?.5:1}} onClick={send} disabled={sending}>{sending?t("messages.sending"):t("messages.send")}</button>
        </div>
      </>}

      {/* تبويب العملاء */}
      {msgTab==="customers"&&<>
        {!selCust?(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* شريط البحث */}
            <div style={{display:"flex",gap:5,marginBottom:7}}>
              <input
                style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",direction:"rtl"}}
                placeholder="بحث بالاسم أو رقم الجوال..."
                value={searchTxt}
                onChange={e=>{setSearchTxt(e.target.value);if(!e.target.value){setSearchResults(null);}}}
                onKeyDown={e=>e.key==="Enter"&&searchCustomer()}
              />
              <button onClick={searchCustomer} style={{background:"var(--pa08)",border:"1px solid var(--pa4)",borderRadius:8,cursor:"pointer",padding:"0 9px",color:"var(--p)",fontSize:13}} title="بحث">🔍</button>
              {searchTxt&&<button onClick={()=>{setSearchTxt("");setSearchResults(null);}} style={{background:"none",border:"1px solid var(--border-ui)",borderRadius:8,cursor:"pointer",padding:"0 8px",color:"var(--text-muted)",fontSize:11}}>✕</button>}
            </div>
            {/* زر مسح الكل */}
            {convList.length>0&&!clearAllConfirm&&!searchTxt&&(
              <button onClick={()=>setClearAllConfirm(true)} style={{background:"none",border:"1px solid #ef444430",borderRadius:7,color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer",padding:"4px 10px",fontFamily:"inherit",marginBottom:7,alignSelf:"flex-end"}}>مسح الكل 🗑</button>
            )}
            {clearAllConfirm&&(
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:7,padding:"6px 10px",borderRadius:8,background:"#ef444415",border:"1px solid #ef444430"}}>
                <span style={{fontSize:11,color:"var(--text-muted)",flex:1}}>مسح جميع المحادثات نهائياً؟</span>
                <button onClick={async()=>{
                  try{await fetch("/api/owner-chat?clearAll=1",{method:"DELETE",credentials:"include"});}catch{}
                  setConvList([]);setClearAllConfirm(false);
                }} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",padding:"3px 9px",fontFamily:"inherit"}}>نعم</button>
                <button onClick={()=>setClearAllConfirm(false)} style={{background:"none",border:"1px solid var(--border-ui)",borderRadius:5,fontSize:10,cursor:"pointer",padding:"3px 8px",color:"var(--text-muted)",fontFamily:"inherit"}}>لا</button>
              </div>
            )}
            {/* القائمة */}
            <div style={{flex:1,overflowY:"auto"}}>
              {searchResults!==null?(
                <>
                  {searching&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,padding:20}}>{t('ui.loading')}</div>}
                  {!searching&&searchResults.length===0&&<div style={G.empty}>لا يوجد عميل بهذا الرقم أو الاسم</div>}
                  {searchResults.map(c=>(
                    <div key={c.id} onClick={()=>{setSelCust({customerId:c.id,bookingId:null,customerName:c.name||c.phone||`عميل #${c.id}`});setSearchTxt("");setSearchResults(null);}}
                      style={{padding:"10px 12px",borderBottom:"1px solid var(--border-ui)",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{c.name||`عميل #${c.id}`}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>{c.phone}</div>
                    </div>
                  ))}
                </>
              ):(
                <>
                  {loadingConv&&isFirstLoadConv.current&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,padding:20}}>{t('ui.loading')}</div>}
                  {!loadingConv&&convList.length===0&&<div style={G.empty}>{t('ui.no_cust_messages')}</div>}
                  {convList.filter(c=>!searchTxt||(c.customer_name||"").toLowerCase().includes(searchTxt.toLowerCase())||(c.customer_phone||"").includes(searchTxt)).map((c,i)=>(
                    <div key={i} onClick={()=>setSelCust({customerId:c.customer_id,bookingId:c.booking_id,customerName:c.customer_name||`عميل #${c.customer_id}`})}
                      style={{padding:"10px 12px",borderBottom:"1px solid var(--border-ui)",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{c.customer_name||t('ui.customer_prefix',{id:c.customer_id})} {c.booking_id&&<span style={{fontSize:11,color:"var(--text-muted)",fontWeight:400}}>· {t('ui.booking_prefix',{id:c.booking_id})}</span>}</div>
                        <div style={{fontSize:11,color:(c.unread_count||0)>0?"var(--text-primary)":"var(--text-muted)",fontWeight:(c.unread_count||0)>0?600:400,marginTop:2,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.text}</div>
                      </div>
                      {(c.unread_count||0)>0
                        ?<span style={{background:"var(--p)",color:"#fff",borderRadius:999,fontSize:10,fontWeight:900,minWidth:19,height:19,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 5px",flexShrink:0}}>{c.unread_count>99?"99+":c.unread_count}</span>
                        :null}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ):(
          <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexShrink:0,background:"var(--surface-1)",borderRadius:6,padding:"4px 2px"}}>
              <button onClick={()=>{setSelCust(null);loadConvList();}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--p)",fontSize:12,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <IconArrowRight size={12}/>{t('ui.back_label')}
              </button>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{selCust.customerName}</div>
              {!clearConfirm
                ?<button onClick={()=>setClearConfirm(true)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:11,fontFamily:"inherit",padding:"2px 6px",borderRadius:6}} title="مسح الدردشة">🗑</button>
                :<div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:"var(--text-muted)"}}>تأكيد المسح؟</span>
                  <button onClick={async()=>{
                    try{
                      const url=selCust.bookingId
                        ?`/api/owner-chat?customerId=${selCust.customerId}&bookingId=${selCust.bookingId}`
                        :`/api/owner-chat?customerId=${selCust.customerId}`;
                      await fetch(url,{method:"DELETE",credentials:"include"});
                      setCustMsgs([]);
                      loadConvList();
                    }catch{}
                    setClearConfirm(false);
                  }} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",padding:"2px 7px",fontFamily:"inherit"}}>نعم</button>
                  <button onClick={()=>setClearConfirm(false)} style={{background:"none",border:"1px solid var(--border-ui)",borderRadius:5,fontSize:10,cursor:"pointer",padding:"2px 6px",color:"var(--text-muted)",fontFamily:"inherit"}}>لا</button>
                </div>
              }
            </div>
            <div ref={custBoxRef} style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
              {custMsgs.length===0&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,marginTop:20}}>{t('ui.no_messages')}</div>}
              {custMsgs.map(m=>(
                <div key={m.id} style={{display:"flex",justifyContent:m.from_customer?"flex-start":"flex-end"}}>
                  <div style={{maxWidth:"80%",padding:"7px 11px",borderRadius:m.from_customer?"12px 12px 12px 2px":"12px 12px 2px 12px",
                    background:m.from_customer?"var(--surface-2)":"var(--pa25)",
                    border:`1px solid ${m.from_customer?"var(--border-ui)":"var(--pa4)"}`}}>
                    <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{m.from_customer?"العميل":"أنت"}</div>
                    <div style={{fontSize:13,color:"var(--text-primary)"}}>{m.text}</div>
                    <div style={{fontSize:9,color:"var(--text-muted)",marginTop:2,display:"flex",alignItems:"center",gap:3}}>
                      {new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})}
                      {!m.from_customer&&<span style={{color:m.read_at?"#34B7F1":"#888888"}}>✓✓</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={custMsgsEndRef}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <input style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
                placeholder={t('ui.reply_ph')} value={ownerTxt} onChange={e=>setOwnerTxt(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&sendOwnerReply()}/>
              <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0,opacity:ownerSending?.5:1}} onClick={sendOwnerReply} disabled={ownerSending}>{ownerSending?"...":"إرسال"}</button>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

// ==============================================

function CustomerSalonChat({salonId,customerId,bookingId,salonName,onClose,toast$}){
  const{t}=useTranslation();
  const cKey=`cm_${salonId}-${customerId}-${bookingId}`;
  const{msgs,setMsgs,addMsg}=useChat(cKey);
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const chatBoxRef=useRef(null);
  const prevMsgCount=useRef(-1);
  const prevFromSalonRef=useRef(-1);
  const didMarkReadRef=useRef(false);

  const load=useCallback(async()=>{
    if(!salonId||!customerId)return;
    try{
      let url=`/api/customer-messages?salonId=${salonId}&customerId=${customerId}`;
      if(bookingId)url+=`&bookingId=${bookingId}`;
      const res=await fetch(url);
      const data=await res.json();
      if(Array.isArray(data)){
        setMsgs(data);
        const salonMsgsCount=data.filter(m=>!m.from_customer).length;
        if(prevFromSalonRef.current>=0&&salonMsgsCount>prevFromSalonRef.current){
          toast$&&toast$("💬 رسالة جديدة من الصالون","info");
        }
        prevFromSalonRef.current=salonMsgsCount;
      }
      if(!didMarkReadRef.current){didMarkReadRef.current=true;fetch(url,{method:"PATCH"}).catch(()=>{});}
    }catch{}
  },[salonId,customerId,bookingId,setMsgs,toast$]);

  useEffect(()=>{load();},[load]);

  useEffect(()=>{
    const id=setInterval(()=>load(),3000);
    return()=>clearInterval(id);
  },[load]);

  useEffect(()=>{
    const ch=supabase.channel(`cm-${salonId}-${customerId}-${bookingId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'customer_messages',filter:`salon_id=eq.${salonId}`},(payload)=>{
        load();
      })
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[salonId,customerId,bookingId,load]);

  useEffect(()=>{const el=chatBoxRef.current;if(!el)return;if(prevMsgCount.current<0||msgs.length>prevMsgCount.current){requestAnimationFrame(()=>{if(chatBoxRef.current)chatBoxRef.current.scrollTop=chatBoxRef.current.scrollHeight;});}prevMsgCount.current=msgs.length;},[msgs]);

  const send=async()=>{
    if(!txt.trim()||sending)return;
    setSending(true);
    const msgText=txt.trim();
    setTxt("");
    const tempId=`tmp-${Date.now()}`;
    addMsg({id:tempId,from_customer:true,text:msgText,created_at:new Date().toISOString(),read_at:null});
    try{
      await sb("customer_messages","POST",{
        salon_id:Number(salonId),customer_id:Number(customerId),booking_id:bookingId?Number(bookingId):null,
        from_customer:true,text:msgText
      });
      await load();
    }catch(e){
      setTxt(msgText);
      await load();
      toast$&&toast$(i18n.t('ui.send_error_check'),"err");
    }
    setSending(false);
  };

  return(
    <div style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:12,marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",display:"flex",alignItems:"center",gap:5}}><IconChat size={13}/>{t('ui.contact_salon',{salon:salonName||""})}</div>
        <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:0}} onClick={onClose}><IconClose size={14}/></button>
      </div>
      <div ref={chatBoxRef} style={{height:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
        {msgs.length===0&&<div style={{textAlign:"center",color:"var(--text-muted)",fontSize:12,marginTop:40}}>{t('ui.no_messages_yet')}</div>}
        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:m.from_customer?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"80%",padding:"7px 11px",borderRadius:m.from_customer?"12px 12px 2px 12px":"12px 12px 12px 2px",
              background:m.from_customer?"var(--pa25)":"var(--surface-2)",
              border:`1px solid ${m.from_customer?"rgba(var(--pr),.3)":"var(--border-ui)"}`}}>
              <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:2}}>{m.from_customer?"أنت":salonName||"الصالون"}</div>
              <div style={{fontSize:13,color:"var(--text-primary)"}}>{m.text}</div>
              <div style={{fontSize:9,color:"var(--text-muted)",marginTop:2,display:"flex",alignItems:"center",gap:3}}>
                {new Date(m.created_at).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true})}
                {m.from_customer&&<span style={{color:String(m.id).startsWith("tmp-")?"#888":(m.read_at?"#34B7F1":"#888888")}}>{String(m.id).startsWith("tmp-")?"✓":"✓✓"}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <input style={{flex:1,padding:"9px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl"}}
          placeholder={t('ui.message_ph')} value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0,opacity:sending?.5:1}} onClick={send} disabled={sending}>{sending?"...":"إرسال"}</button>
      </div>
    </div>
  );
}

// ==============================================

function OwnerSettings({salon,setSalons,toast$,socialLinks,setSocialLinks,onlySec,setView,setShowSalonDrawer,setOwnerTab}){
  const{t}=useTranslation();
  const[saving,setSaving]=useState(false);
  const[sec,setSec]=useState(onlySec||"info");
  const SEC_TITLES={info:t("owner_settings.tab_info"),hours:t("owner_settings.tab_hours"),services:t("owner_settings.tab_services"),barbers:t("owner_settings.tab_barbers"),tone:t("owner_settings.tab_tone"),social:t("owner_settings.tab_social"),pin:t("owner_settings.tab_pin")};
  const[draftSocial,setDraftSocial]=useState({...DEFAULT_SOCIAL_LINKS,...(socialLinks||{})});
  const[socialSaved,setSocialSaved]=useState(false);
  const saveSocial=()=>{setSocialLinks&&setSocialLinks(draftSocial);setSocialSaved(true);setTimeout(()=>setSocialSaved(false),2500);};
  const effectiveSec=onlySec==="hours"?"barbers":sec;
  const[showHoursInBarbers,setShowHoursInBarbers]=useState(false);
  const[sortMode,setSortMode]=useState(false);
  const[sortSvcMode,setSortSvcMode]=useState(false);
  const[expandedBarberDur,setExpandedBarberDur]=useState(null);
  const[dragActive,setDragActive]=useState(null); // {list,index}
  const dragIndexRef=useRef(null);
  const startDrag=(list,index)=>(e)=>{
    e.preventDefault();
    const isTouch=e.type==="touchstart";
    const row=e.currentTarget.closest(`[data-drag-list="${list}"]`);
    if(!row)return;
    const rowH=row.getBoundingClientRect().height||1;
    const container=row.parentElement;
    const rowCount=container.querySelectorAll(`[data-drag-list="${list}"]`).length;
    const startY=isTouch?e.touches[0].clientY:e.clientY;
    let lastIndex=index;
    dragIndexRef.current=index;
    setDragActive({list,index});
    row.style.position="relative";
    row.style.zIndex="50";
    row.style.boxShadow="0 6px 18px rgba(0,0,0,.35)";
    row.style.transition="none";
    const point=ev=>isTouch?ev.touches[0]:ev;
    let rafId=null;
    let pendingPt=null;
    const flush=()=>{
      rafId=null;
      const pt=pendingPt;
      if(!pt)return;
      const dy=pt.clientY-startY;
      row.style.transform=`translateY(${dy}px)`;
      const rawIndex=index+Math.round(dy/rowH);
      lastIndex=Math.max(0,Math.min(rowCount-1,rawIndex));
    };
    const onMove=(ev)=>{
      const pt=point(ev);
      if(!pt)return;
      if(isTouch)ev.preventDefault();
      pendingPt=pt;
      if(rafId==null)rafId=requestAnimationFrame(flush);
    };
    const cleanupStyles=()=>{
      row.style.position="";
      row.style.zIndex="";
      row.style.boxShadow="";
      row.style.transition="";
      row.style.transform="";
    };
    const onEnd=()=>{
      if(rafId!=null){cancelAnimationFrame(rafId);rafId=null;}
      cleanupStyles();
      dragIndexRef.current=null;
      setDragActive(null);
      if(lastIndex!==index){
        setF(p=>{
          const arr=[...p[list]];
          const[moved]=arr.splice(index,1);
          arr.splice(lastIndex,0,moved);
          return{...p,[list]:arr};
        });
      }
      if(isTouch){
        window.removeEventListener("touchmove",onMove);
        window.removeEventListener("touchend",onEnd);
        window.removeEventListener("touchcancel",onEnd);
      }else{
        window.removeEventListener("mousemove",onMove);
        window.removeEventListener("mouseup",onEnd);
      }
    };
    if(isTouch){
      window.addEventListener("touchmove",onMove,{passive:false});
      window.addEventListener("touchend",onEnd);
      window.addEventListener("touchcancel",onEnd);
    }else{
      window.addEventListener("mousemove",onMove);
      window.addEventListener("mouseup",onEnd);
    }
  };
  const[f,setF]=useState({
    name:salon.name||"",
    phone:salon.phone||"",
    address:salon.address||"",
    ownerEmail:salon.owner_email||"",
    locationUrl:salon.locationUrl||"",
    shiftEnabled:salon.shiftEnabled||false,
    shift1Start:salon.shift1Start||"08:00",
    shift1End:salon.shift1End||"13:00",
    shift2Start:salon.shift2Start||"16:00",
    shift2End:salon.shift2End||"23:00",
    workStart:salon.workStart||"09:00",
    workEnd:salon.workEnd||"22:00",
    _savedWorkStart:(!salon.shiftEnabled&&salon.workStart==="00:00"&&salon.workEnd==="23:59")?"09:00":(salon.workStart||"09:00"),
    _savedWorkEnd:(!salon.shiftEnabled&&salon.workStart==="00:00"&&salon.workEnd==="23:59")?"22:00":(salon.workEnd||"22:00"),
    services:[...(salon.services||[])],
    prices:{...(salon.prices||{})},
    durations:{...(salon.prices?.__durations||{})},
    barbers:JSON.parse(JSON.stringify(salon.barbers||[])).map(b=>({...b,shiftStart:b.shiftStart??"09:00",shiftEnd:b.shiftEnd??"22:00"})),
    tone:salon.tone||"bell",
  });
  const _sbLen=salon?.barbers?.length||0;
  useEffect(()=>{
    if(_sbLen>0&&f.barbers.length===0){
      setF(p=>({...p,barbers:JSON.parse(JSON.stringify(salon.barbers)).map(b=>({...b,shiftStart:b.shiftStart??"09:00",shiftEnd:b.shiftEnd??"22:00"}))}));
    }
  },[_sbLen]);
  const[newSvc,setNewSvc]=useState("");
  const[newBarber,setNewBarber]=useState("");
  const[detecting,setDetecting]=useState(false);
  const dragIdx=useRef(null);
  const dragOverIdx=useRef(null);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const savePin=async()=>{
    try{
      await ownerApi("PATCH",{new_pin:f._editTempPin});
      toast$&&toast$(t("owner_settings.success_pin"));
      setF(p=>({...p,_editPinStep:null,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}));
    }catch{
      setF(p=>({...p,_editPinErr:"تعذر حفظ PIN، حاول مرة أخرى"}));
    }
  };
  const detectSalonLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      p=>{const lat=p.coords.latitude.toFixed(6),lng=p.coords.longitude.toFixed(6);upd("locationUrl",`https://maps.google.com/?q=${lat},${lng}`);setDetecting(false);toast$&&toast$(i18n.t('ui.location_found_save'));},
      ()=>{setDetecting(false);toast$&&toast$(i18n.t('ui.detect_failed'),"err");},
      {enableHighAccuracy:true,timeout:15000}
    );
  };

  const save=async()=>{
    setSaving(true);
    try{
      const compressPhoto=(dataUrl)=>new Promise(resolve=>{
        if(!dataUrl||!dataUrl.startsWith("data:")||dataUrl.length<40000){resolve(dataUrl);return;}
        const img=new Image();
        img.onload=()=>{
          const MAX=150;let w=img.width,h=img.height;
          if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}
          const c=document.createElement("canvas");c.width=w;c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          resolve(c.toDataURL(IMG_FMT,0.75));
        };
        img.onerror=()=>resolve(dataUrl);
        img.src=dataUrl;
      });
      const compressedBarbers=await Promise.all(f.barbers.map(async b=>({...b,photo:await compressPhoto(b.photo)})));
      const patch={
        name:f.name,phone:f.phone,address:f.address,location_url:f.locationUrl,owner_email:f.ownerEmail||null,
        shift_enabled:f.shiftEnabled,
        shift1_start:f.shift1Start,shift1_end:f.shift1End,
        shift2_start:f.shift2Start,shift2_end:f.shift2End,
        work_start:f.workStart,work_end:f.workEnd,
        services:f.services,prices:{...f.prices,__durations:f.durations},
        barbers:compressedBarbers,tone:f.tone,
      };
      await ownerApi("PATCH",patch);
      setSalons(p=>p.map(s=>s.id===salon.id?{...s,name:f.name,phone:f.phone,address:f.address,owner_email:f.ownerEmail||null,locationUrl:f.locationUrl,shiftEnabled:f.shiftEnabled,shift1Start:f.shift1Start,shift1End:f.shift1End,shift2Start:f.shift2Start,shift2End:f.shift2End,workStart:f.workStart,workEnd:f.workEnd,services:f.services,prices:{...f.prices,__durations:f.durations},barbers:compressedBarbers,tone:f.tone}:s));
      toast$&&toast$(t("owner_settings.success"));
    }catch(e){toast$&&toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    setSaving(false);
  };

  const saveBarberDurations=async(barberIdx)=>{
    try{
      await ownerApi("PATCH",{barbers:f.barbers});
      setSalons(p=>p.map(s=>s.id===salon.id?{...s,barbers:f.barbers}:s));
      toast$&&toast$(i18n.t('ui.durations_saved'));
    }catch(e){toast$&&toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4,fontWeight:600};
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};

  return(
    <div style={onlySec?G.page:undefined}><div style={onlySec?G.fp:undefined}>
      {onlySec&&<div style={G.fh}><button style={G.bb} onClick={()=>{setOwnerTab&&setOwnerTab(null);setShowSalonDrawer&&setShowSalonDrawer(true);}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{SEC_TITLES[onlySec]||t("owner_settings.settings_title")}</h2></div>}
      {!onlySec&&<div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        {[{id:"info",icon:"📋",label:t("owner_settings.tab_info")},{id:"services",icon:"✂",label:t("owner_settings.tab_services")},{id:"barbers",icon:"💈",label:t("owner_settings.tab_barbers")},{id:"tone",icon:"🔔",label:t("owner_settings.tab_tone")},{id:"social",icon:"📱",label:t("owner_settings.tab_social")},{id:"pin",icon:"🔐",label:t("owner_settings.tab_pin")}].map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"var(--border-ui)"}`,background:sec===s.id?"var(--pa12)":"var(--surface-2)",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            <NotifIcon icon={s.icon} size={11}/> {s.label}
          </button>
        ))}
      </div>}

      {sec==="info"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.info_title")}</div>
        {[{l:t("owner_settings.salon_name"),k:"name"},{l:t("owner_settings.phone"),k:"phone"},{l:t("owner_settings.address"),k:"address"}].map(({l,k})=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={lbl}>{l}</label>
            <input style={inp} value={f[k]} onChange={e=>upd(k,e.target.value)}/>
          </div>
        ))}
        <div style={{marginBottom:10}}>
          <label style={lbl}>{t("register.owner_email")}</label>
          <input style={inp} type="email" inputMode="email" placeholder="example@email.com" value={f.ownerEmail} onChange={e=>upd("ownerEmail",e.target.value)}/>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>{t("register.owner_email_hint")}</div>
        </div>
        {/* قسم الموقع */}
        <div style={{background:"rgba(var(--pr),.06)",borderRadius:12,padding:12,border:"1px solid rgba(var(--pr),.2)"}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={12}/>{t("owner_settings.map_url")}</div>
          {f.locationUrl?(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.loc_saved_map')}</div>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",opacity:detecting?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5}} disabled={detecting} onClick={detectSalonLocation}>{detecting?"⏳ جاري التحديد...":<><IconRefresh size={11}/>{t('ui.update_location')}</>}</button>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={()=>upd("locationUrl","")}>{t('ui.delete_location')}</button>
              </div>
            </>
          ):(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{t('ui.no_location')}</div>
              <button style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:"1.5px dashed rgba(var(--pr),.4)",color:"var(--p)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",marginBottom:8,opacity:detecting?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5}} disabled={detecting} onClick={detectSalonLocation}>{detecting?"⏳ جاري التحديد...":<><IconPin size={12}/>{t('ui.detect_location')}</>}</button>
            </>
          )}
          <input style={{...inp,fontSize:11}} placeholder={t('ui.maps_link_ph')} value={f.locationUrl} onChange={e=>upd("locationUrl",e.target.value)}/>
        </div>
      </div>}


      {sec==="services"&&<div style={box}>
        <div style={{...hdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>{t("owner_settings.services_title")}</span>
          {f.services.length>0&&<button onClick={()=>setSortSvcMode(p=>!p)} style={{fontSize:11,padding:"3px 10px",borderRadius:7,border:`1.5px solid ${sortSvcMode?"var(--p)":"var(--border-ui)"}`,background:sortSvcMode?"var(--pa12)":"transparent",color:sortSvcMode?"var(--p)":"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
            {sortSvcMode?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.done')}</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconPencil size={11}/>{t('ui.edit')}</span>}
          </button>}
        </div>
        {f.services.length>0&&<>
          {!sortSvcMode&&(
            <div style={{borderRadius:9,overflow:"hidden",border:"1px solid var(--border-ui)",marginBottom:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px",padding:"6px 10px",background:"var(--surface-2)",borderBottom:"1px solid var(--border-ui)"}}>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700}}>{t('ui.service_col')}</span>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,textAlign:"center"}}>{t('ui.time_col')}</span>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,textAlign:"center"}}>{t('ui.price_col')}</span>
              </div>
              {f.services.map((svc,i)=>(
                <div key={svc} style={{display:"grid",gridTemplateColumns:"1fr 90px 80px",gap:6,alignItems:"center",padding:"8px 10px",background:"var(--bg-input)",borderBottom:i<f.services.length-1?"1px solid var(--border-ui)":"none"}}>
                  <span style={{fontSize:13,color:"var(--text-primary)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc}</span>
                  <input type="number" min="1" max="480" placeholder="—" style={{padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"#27ae60",fontSize:12,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr",width:"100%",boxSizing:"border-box"}}
                    value={f.durations[svc]||""} onChange={e=>setF(p=>({...p,durations:{...p.durations,[svc]:+e.target.value||undefined}}))}/>
                  <input type="number" min="0" style={{padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--p)",fontSize:12,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr",width:"100%",boxSizing:"border-box"}}
                    value={f.prices[svc]||0} onChange={e=>setF(p=>({...p,prices:{...p.prices,[svc]:+e.target.value}}))}/>
                </div>
              ))}
            </div>
          )}
          {sortSvcMode&&f.services.map((svc,i)=>(
            <div key={svc} data-drag-list="services" data-drag-index={i} style={{display:"grid",gridTemplateColumns:"1fr",gap:6,marginBottom:6,alignItems:"center",background:"var(--bg-input)",borderRadius:9,padding:"6px 8px",border:"1px solid var(--border-ui)",opacity:dragActive?.list==="services"&&dragActive.index===i?.5:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span onTouchStart={startDrag("services",i)} onMouseDown={startDrag("services",i)} style={{cursor:"grab",display:"flex",color:"var(--text-muted)",touchAction:"none",WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none",padding:"10px 8px"}}><IconDragHandle size={16}/></span>
                <span style={{flex:1,fontSize:13,color:"var(--text-primary)",fontWeight:600}}>{svc}</span>
                <button style={G.xBtn} onClick={()=>setF(p=>{const sv=p.services.filter(s=>s!==svc);const pr={...p.prices};delete pr[svc];const dr={...p.durations};delete dr[svc];return{...p,services:sv,prices:pr,durations:dr};})}><IconTrash size={14}/></button>
              </div>
            </div>
          ))}
        </>}
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

      {(sec==="barbers"||effectiveSec==="barbers")&&<div style={box}>
        {/* ── ساعات عمل الصالون (مدموجة هنا) ── */}
        <div style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid var(--border-ui)"}}>
          <button onClick={()=>setShowHoursInBarbers(p=>!p)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:"none",padding:0,cursor:"pointer",marginBottom:showHoursInBarbers?10:0}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--p)",display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="🕐" size={13}/> {t("owner_settings.hours_title")}</span>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{showHoursInBarbers?"▲":"▼"}</span>
          </button>
          {showHoursInBarbers&&<>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${(!f.shiftEnabled&&!(f.workStart==="00:00"&&f.workEnd==="23:59"))?"var(--p)":"var(--border-ui)"}`,background:(!f.shiftEnabled&&!(f.workStart==="00:00"&&f.workEnd==="23:59"))?"var(--pa12)":"var(--surface-2)",color:(!f.shiftEnabled&&!(f.workStart==="00:00"&&f.workEnd==="23:59"))?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>setF(p=>{const from24h=p.workStart==="00:00"&&p.workEnd==="23:59";return{...p,shiftEnabled:false,workStart:from24h?(p._savedWorkStart||"09:00"):p.workStart,workEnd:from24h?(p._savedWorkEnd||"22:00"):p.workEnd};})}>{t("owner_settings.single_shift")}</button>
            <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${f.shiftEnabled?"var(--p)":"var(--border-ui)"}`,background:f.shiftEnabled?"var(--pa12)":"var(--surface-2)",color:f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",true)}>{t("owner_settings.double_shift")}</button>
            <button style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${(!f.shiftEnabled&&f.workStart==="00:00"&&f.workEnd==="23:59")?"var(--p)":"var(--border-ui)"}`,background:(!f.shiftEnabled&&f.workStart==="00:00"&&f.workEnd==="23:59")?"var(--pa12)":"var(--surface-2)",color:(!f.shiftEnabled&&f.workStart==="00:00"&&f.workEnd==="23:59")?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700,whiteSpace:"nowrap"}} onClick={()=>setF(p=>{const already24h=p.workStart==="00:00"&&p.workEnd==="23:59";return{...p,shiftEnabled:false,_savedWorkStart:already24h?p._savedWorkStart:p.workStart,_savedWorkEnd:already24h?p._savedWorkEnd:p.workEnd,workStart:"00:00",workEnd:"23:59"};})}><span style={{display:"inline-flex",alignItems:"center",gap:4}}><NotifIcon icon="🕐" size={11}/> 24h</span></button>
          </div>
          {!f.shiftEnabled
            ?<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={lbl}>{t("owner_settings.from")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.workStart} onChange={e=>upd("workStart",e.target.value)}/>
              <span style={lbl}>{t("owner_settings.to")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.workEnd} onChange={e=>upd("workEnd",e.target.value)}/>
            </div>
            :<>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.morning")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={lbl}>{t("owner_settings.from")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift1Start} onChange={e=>upd("shift1Start",e.target.value)}/>
                <span style={lbl}>{t("owner_settings.to")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift1End} onChange={e=>upd("shift1End",e.target.value)}/>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.evening")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={lbl}>{t("owner_settings.from")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift2Start} onChange={e=>upd("shift2Start",e.target.value)}/>
                <span style={lbl}>{t("owner_settings.to")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift2End} onChange={e=>upd("shift2End",e.target.value)}/>
              </div>
            </>
          }
          </>}
        </div>
        <div style={{...hdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>{t("owner_settings.barbers_title")}</span>
          {f.barbers.length>0&&<button onClick={()=>setSortMode(p=>!p)} style={{fontSize:11,padding:"3px 10px",borderRadius:7,border:`1.5px solid ${sortMode?"var(--p)":"var(--border-ui)"}`,background:sortMode?"var(--pa12)":"transparent",color:sortMode?"var(--p)":"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
            {sortMode?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.done')}</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconPencil size={11}/>{t('ui.edit')}</span>}
          </button>}
        </div>
        {f.barbers.length===0&&<div style={G.empty}>{t("owner_settings.barbers_empty")}</div>}
        {f.barbers.map((b,i)=>(
          <div key={b.id} data-drag-list="barbers" data-drag-index={i}
            style={{marginBottom:10,background:"var(--bg-input)",borderRadius:10,padding:"10px 12px",border:`1px solid ${sortMode?"var(--p)33":"var(--border-ui)"}`,overflow:"hidden",opacity:dragActive?.list==="barbers"&&dragActive.index===i?.5:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:sortMode?0:8}}>
              {sortMode&&<span onTouchStart={startDrag("barbers",i)} onMouseDown={startDrag("barbers",i)} style={{cursor:"grab",display:"flex",color:"var(--text-muted)",touchAction:"none",WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none",padding:"10px 8px",flexShrink:0}}><IconDragHandle size={16}/></span>}
              {/* صورة الحلاق */}
              <div style={{position:"relative",flexShrink:0}}>
                {b.photo
                  ?<img src={optimizeImageUrl(b.photo,44,44)} alt={b.name} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--p)"}}/>
                  :<div style={{width:44,height:44,borderRadius:"50%",background:"var(--surface-2)",border:"2px dashed #2a2a3a",display:"flex",alignItems:"center",justifyContent:"center"}}><IconBarberPole size={18}/></div>
                }
                <label style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--p)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10}}>
                  <IconCamera size={11} color="#fff"/>
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    const reader=new FileReader();
                    reader.onload=ev=>{
                      const img=new Image();
                      img.onload=()=>{
                        const MAX=150;
                        let w=img.width,h=img.height;
                        if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}
                        const canvas=document.createElement("canvas");
                        canvas.width=w;canvas.height=h;
                        canvas.getContext("2d").drawImage(img,0,0,w,h);
                        const compressed=canvas.toDataURL(IMG_FMT,0.75);
                        setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,photo:compressed}:x)}));
                      };
                      img.src=ev.target.result;
                    };
                    reader.readAsDataURL(file);
                  }}/>
                </label>
              </div>
              <input style={{...inp,flex:1,padding:"6px 10px"}} placeholder={t("owner_settings.barber_name_ph")} value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
              {/* زر التفعيل/التعطيل بنمط iPhone */}
              <button onClick={()=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,active:x.active===false}:x)}))}
                style={{width:38,height:22,borderRadius:11,border:"none",cursor:"pointer",position:"relative",flexShrink:0,
                  background:b.active!==false?"var(--p)":"#555",transition:"background .2s"}}>
                <div style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",
                  transition:"left .2s",left:b.active!==false?19:3}}/>
              </button>
              {sortMode&&<button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}><IconTrash size={14}/></button>}
            </div>
            {!sortMode&&b.active===false&&<div style={{fontSize:10,color:"#e74c3c",marginBottom:6,textAlign:"center",fontWeight:600}}>{t('ui.closed_traveling')}</div>}
            {!sortMode&&b.active!==false&&<>
            {f.services.length>0&&(
              <div style={{marginBottom:10}}>
                <button onClick={()=>setExpandedBarberDur(expandedBarberDur===i?null:i)}
                  style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--surface-2)",border:"1px solid var(--border-ui)",borderRadius:9,padding:"7px 10px",cursor:"pointer",fontFamily:"inherit"}}>
                  <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:600}}>⏱ مدد الخدمات ({f.services.filter(svc=>(b.durations||{})[svc]).length}/{f.services.length})</span>
                  <span style={{fontSize:11,color:"var(--p)"}}>{expandedBarberDur===i?"▲":"▼"}</span>
                </button>
                {expandedBarberDur===i&&<div style={{marginTop:6,background:"var(--bg-input)",borderRadius:9,border:"1px solid var(--border-ui)",overflow:"hidden"}}>
                  {/* رأس */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:6,padding:"6px 10px",borderBottom:"1px solid var(--border-ui)"}}>
                    <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:700}}>{t('ui.service_col')}</span>
                    <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:700,textAlign:"center"}}>{t('ui.default_col')}</span>
                    <span style={{fontSize:10,color:"var(--p)",fontWeight:700,textAlign:"center"}}>{t('ui.barber_time')}</span>
                  </div>
                  {f.services.map(svc=>{
                    const defaultDur=f.durations[svc]||"—";
                    const barberDur=(b.durations||{})[svc];
                    return(
                      <div key={svc} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:6,padding:"7px 10px",borderBottom:"1px solid rgba(var(--pr),.05)",alignItems:"center"}}>
                        <span style={{fontSize:12,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc}</span>
                        <div style={{padding:"4px 6px",borderRadius:6,border:"1px solid var(--border-ui)",background:"var(--surface-2)",fontSize:11,color:"var(--text-muted)",textAlign:"center",minWidth:38}}>{defaultDur}{defaultDur!=="—"?" د":""}</div>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <input type="number" min="1" max="480" placeholder={String(defaultDur)}
                            style={{flex:1,width:0,padding:"4px 4px",borderRadius:6,border:`1.5px solid ${barberDur?"var(--p)":"var(--border-ui)"}`,background:"var(--surface-1)",color:"var(--p)",fontSize:11,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
                            value={barberDur||""} onChange={e=>{const v=+e.target.value||undefined;setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,durations:{...(x.durations||{}),[svc]:v}}:x)}));}}/>
                          <span style={{fontSize:9,color:"var(--text-muted)"}}>{t('ui.min_short')}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{padding:"8px 10px",borderTop:"1px solid var(--border-ui)"}}>
                    <button onClick={()=>saveBarberDurations(i)}
                      style={{width:"100%",padding:"8px",borderRadius:8,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="💾" size={12}/> حفظ المدد</span>
                    </button>
                  </div>
                </div>}
              </div>
            )}
            <div style={{marginBottom:6}}>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>{t("owner_settings.barber_shift")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:10,color:"var(--text-muted)",flexShrink:0}}>{t("owner_settings.from")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={b.shiftStart||"09:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftStart:e.target.value}:x)}))}/>
              <span style={{fontSize:10,color:"var(--text-muted)",flexShrink:0}}>{t("owner_settings.to")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={b.shiftEnd||"22:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftEnd:e.target.value}:x)}))}/>
            </div>
            </>}
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder={t("owner_settings.new_barber_ph")} value={newBarber} onChange={e=>setNewBarber(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00",active:true}]}));setNewBarber("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00",active:true}]}));setNewBarber("");}}}>{t("owner_settings.add_btn")}</button>
        </div>
      </div>}

      {sec==="tone"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.tone_title")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(tn=>{
            const active=f.tone===tn.id;
            return(
              <button key={tn.id} onClick={()=>{upd("tone",tn.id);playTone(tn.id,0.8);}}
                style={{padding:"11px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"var(--surface-2)",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                {t("settings.tones."+tn.id)} {active&&<IconCheck size={11}/>}
              </button>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>{t("owner_settings.tone_hint")}</div>
      </div>}

      {sec==="social"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.social_title")}</div>
        {socialLinks?.enabled
          ?<div>
            {socialLinks.email&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📧" size={13}/> البريد الإلكتروني</label>
              <a href={`mailto:${socialLinks.email}`} style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.email}</a>
            </div>}
            {socialLinks.whatsapp&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="💬" size={13}/> واتساب</label>
              <a href={`https://wa.me/966${socialLinks.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.whatsapp}</a>
            </div>}
            {socialLinks.twitter&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="🐦" size={13}/> تويتر / X</label>
              <a href={`https://twitter.com/${socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.twitter}</a>
            </div>}
            {(socialLinks.telegram||socialLinks.telegramUser)&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="✈" size={13}/> تيليغرام</label>
              <a href={`https://t.me/${(socialLinks.telegramUser||socialLinks.telegram).replace(/^0/,"").replace("@","")}`} target="_blank" rel="noreferrer" style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.telegramUser||socialLinks.telegram}</a>
            </div>}
            {(socialLinks.customFields||[]).filter(f=>f&&f.label&&(f.value||"").trim()).map((f,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📌" size={12}/> {f.label}</label>
                <div style={{...inp}}>{f.value}</div>
              </div>
            ))}
          </div>
          :<div style={G.empty}>{t("settings.social_empty")}</div>
        }
      </div>}

      {sec==="pin"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.pin_title")}</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14,lineHeight:1.6}}>{t("owner_settings.pin_hint")}</div>
        <button onClick={()=>setF(p=>({...p,_editPinStep:"enter",_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--p)",background:"rgba(var(--pr),.1)",color:"var(--p)",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
          {t("owner_settings.change_pin")}
        </button>
        {f._editPinStep&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
              {f._editPinStep==="enter"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_enter")} (6)</div>
                <input type="password" maxLength={6} value={f._editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setF(p=>({...p,_editTempPin:val}));if(val.length===6)setTimeout(()=>setF(p=>({...p,_editPinStep:"confirm"})),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="••••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editTempPin.length===6)setF(p=>({...p,_editPinStep:"confirm"}));}} />
              </>:f._editPinStep==="confirm"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_confirm_title")}</div>
                <input type="password" maxLength={6} value={f._editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setF(p=>({...p,_editPinConfirm:val}));if(val.length===6&&f._editTempPin!==val){setF(p=>({...p,_editPinErr:t("owner_settings.pin_mismatch")}));}else{setF(p=>({...p,_editPinErr:""}));}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${f._editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="••••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm){savePin();}}} />
                {f._editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{f._editPinErr}</div>}
                <div style={{display:"flex",gap:8,marginTop:16}}>
                  <button onClick={()=>{if(f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm){savePin();}}} disabled={f._editPinConfirm.length!==6||f._editTempPin!==f._editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm?"var(--p)":"var(--border-ui)",color:f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm?"#000":"#555",cursor:f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    {t("owner_settings.save")}
                  </button>
                  <button onClick={()=>setF(p=>({...p,_editPinStep:null,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
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
  const[showLocUrl,setShowLocUrl]=useState(false);
  const[locUrlInput,setLocUrlInput]=useState("");
  const inp={width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const saveLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
        setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession(s=>({...s,locationLat:lat,locationLng:lng}));
        toast$&&toast$(i18n.t('ui.location_saved'));
      }catch{toast$&&toast$(i18n.t('ui.location_save_failed'),"err");}
    },()=>{toast$&&toast$(i18n.t('ui.location_denied'),"warn");},{enableHighAccuracy:true,timeout:15000});
  };
  const clearLocation=async()=>{
    try{
      await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));
      setCustomerSession(s=>({...s,locationLat:null,locationLng:null}));
      toast$&&toast$(i18n.t('ui.location_deleted'));
    }catch{toast$&&toast$(i18n.t('ui.location_delete_failed'),"err");}
  };
  const saveLocationFromUrl=async()=>{
    const m=locUrlInput.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)||locUrlInput.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if(!m){toast$&&toast$(i18n.t('ui.loc_url_invalid'),"err");return;}
    const lat=parseFloat(m[1]),lng=parseFloat(m[2]);
    try{
      await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
      setCustomerSession(s=>({...s,locationLat:lat,locationLng:lng}));
      setShowLocUrl(false);setLocUrlInput("");
      toast$&&toast$(i18n.t('ui.location_saved'));
    }catch{toast$&&toast$(i18n.t('ui.location_save_failed'),"err");}
  };
  const save=async()=>{
    if(!name.trim())return;
    try{
      await sb("customers","PATCH",{name:name.trim(),phone:phone.trim(),email:email.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:name.trim(),phone:phone.trim(),email:email.trim()}:c));
      setCustomerSession(s=>({...s,name:name.trim(),phone:phone.trim(),email:email.trim()}));
      toast$(""+t("cust_drawer.save"));
      setView("home");setShowDrawer&&setShowDrawer(true);
    }catch(e){toast$(""+e.message,"err");}
  };
  const savePin=async()=>{
    if(tempPin!==pinConfirm){setPinErr(t("cust_drawer.pin_mismatch"));return;}
    try{
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:customer.id,pin:tempPin})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok){setPinErr(d.error||t("cust_drawer.pin_mismatch"));if(d.code==="err_same_pin"){setPinStep("enter");setTempPin("");}return;}
      localStorage.setItem(`dork_customer_pin_${customer.id}`,await hashPin(tempPin));
      toast$(""+t("cust_drawer.pin_success"));setPinStep(null);setTempPin("");setPinConfirm("");setPinErr("");
    }catch(e){setPinErr(""+e.message);}
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}>
        <button style={G.bb} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}><IconArrowRight size={20}/></button>
        <h2 style={{...G.ft,display:"flex",alignItems:"center",gap:6}}><IconPencil size={16}/>{t("cust_drawer.edit_data")}</h2>
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
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.email_label")}</label>
          <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        {/* موقعي المحفوظ */}
        <div style={{background:"rgba(var(--pr),.06)",borderRadius:12,padding:14,border:"1px solid rgba(var(--pr),.2)",marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={12}/>{t('ui.my_location')}</div>
          {customer?.locationLat&&customer?.locationLng?(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.loc_saved_offers')}</div>
              <div style={{display:"flex",gap:8}}>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveLocation}><IconRefresh size={11}/>{t('ui.update_location')}</button>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={clearLocation}>{t('ui.delete_location')}</button>
              </div>
            </>
          ):(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>{t('ui.no_location_long')}</div>
              <button style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:"1.5px dashed rgba(var(--pr),.4)",color:"var(--p)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveLocation}><IconPin size={12}/>{t('ui.save_location')}</button>
            </>
          )}
          <button type="button" onClick={()=>setShowLocUrl(v=>!v)} style={{width:"100%",marginTop:10,padding:0,border:"none",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:11,textDecoration:"underline"}}>{t('ui.loc_url_manual_toggle')}</button>
          {showLocUrl&&(
            <div style={{marginTop:8,display:"flex",gap:8}}>
              <input style={{...inp,flex:1,fontSize:12,direction:"ltr",textAlign:"left"}} placeholder={t('ui.loc_url_ph')} value={locUrlInput} onChange={e=>setLocUrlInput(e.target.value)} dir="ltr"/>
              <button type="button" onClick={saveLocationFromUrl} style={{flexShrink:0,padding:"0 14px",borderRadius:8,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>{t('ui.loc_url_save')}</button>
            </div>
          )}
        </div>
        <button style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",marginBottom:10}} onClick={()=>setPinStep("select")}>{t("cust_drawer.change_pin")}</button>
        <div style={{display:"flex",gap:10}}>
          <button style={{flex:1,padding:"13px",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}>{t("cust_drawer.cancel")}</button>
          <button style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}} onClick={save}>{t("cust_drawer.save")}</button>
        </div>
      </>)}
      {pinStep==="select"&&(
        <div style={{textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconLock size={30}/></div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_select_title")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>{t("cust_drawer.pin_select_hint")}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${pinLen===4?"var(--p)":"var(--border-ui)"}`,background:pinLen===4?"var(--pa15)":"transparent",color:pinLen===4?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setPinLen(4)}>{t("cust_drawer.pin_4")}</button>
            <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${pinLen===6?"var(--p)":"var(--border-ui)"}`,background:pinLen===6?"var(--pa15)":"transparent",color:pinLen===6?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setPinLen(6)}>{t("cust_drawer.pin_6")}</button>
          </div>
          <div style={{marginTop:16,display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep(null)}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>{setPinStep("enter");setTempPin("");}}>{t("cust_drawer.pin_enter")}</button>
          </div>
        </div>
      )}
      {pinStep==="enter"&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_enter")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>{pinLen} {t("cust_drawer.pin_digits_hint")}</div>
          <input type="password" inputMode="numeric" maxLength={pinLen} value={tempPin} onChange={e=>{setTempPin(e.target.value.replace(/\D/g,"").slice(0,pinLen));setPinErr("");}} style={{...inp,textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:pinErr?6:16}}/>
          {pinErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10}}>{pinErr}</div>}
          <div style={{display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep("select")}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>{if(tempPin.length===pinLen)setPinStep("confirm");}}>{t("cust_drawer.pin_enter")}</button>
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
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={savePin}>{t("cust_drawer.pin_save")}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}
// ==============================================
//  OWNER LANG VIEW - صفحة اختيار اللغة للمالك
// ==============================================
function OwnerLangView({setView,setShowSalonDrawer,setOwnerTab}){
  const{t,i18n}=useTranslation();
  const dir=['ar','ur'].includes(i18n.language)?'rtl':'ltr';
  const LANGS=ALL_LANG_INFO.filter(l=>SALON_LANGS.includes(l.code));
  return(
    <div style={{...G.page,direction:dir}}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>{setOwnerTab&&setOwnerTab(null);setShowSalonDrawer&&setShowSalonDrawer(true);}}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,display:"flex",alignItems:"center",gap:8}}><NotifIcon icon="🌐" size={18}/> {t("salon_drawer.language")}</h2>
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
          <button style={G.bb} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}><IconArrowRight size={20}/></button>
          <h2 style={{...G.ft,display:"flex",alignItems:"center",gap:8}}><NotifIcon icon="🌐" size={18}/> {t("cust_drawer.language")}</h2>
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
//  OWNER PRIVACY VIEW - سياسة الخصوصية لصاحب الصالون
// ==============================================
function OwnerPrivacyView({setView,setShowSalonDrawer}){
  const{t}=useTranslation();
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const sections=t("settings.privacy_sections",{returnObjects:true})||[];
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setShowSalonDrawer&&setShowSalonDrawer(true);setView("ownerDash");}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("settings.privacy_header")}</h2></div>
      <div style={box}>
        <div style={hdr}>{t("settings.privacy_header")}</div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:12}}>{t("settings.privacy_updated")}</div>
        {sections.map(({title,content},i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:5}}>{title}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.8}}>{content}</div>
          </div>
        ))}
      </div>
    </div></div>
  );
}

// ==============================================
//  OWNER FAQ VIEW - أسئلة شائعة لصاحب الصالون
// ==============================================
function OwnerFaqView({setView,setShowSalonDrawer,setOwnerTab}){
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
    {q:"كيف تعمل قائمة الانتظار للعملاء؟",a:"عندما تمتلئ مواعيدك المتاحة يمكن للعميل الانضمام لقائمة انتظار. ستظهر طلباتهم في قسم الحجوزات ويمكنك قبولها أو رفضها عند توفر مكان."},
    {q:"هل يمكن للعملاء مراسلتي مباشرةً؟",a:"نعم. من قسم الرسائل (💬) في لوحة التحكم يمكنك التواصل المباشر مع العملاء، ويُشعَر العميل بوصول ردّك فوراً."},
    {q:"كيف تعمل العروض الترويجية؟",a:"من الدرج ← إرسال عرض. اختر مستوى العرض (برونزي/فضي/ذهبي) والمدة وشريحة العملاء (أحدث/أكثر حجوزاً/الكل) ثم أرسل."},
    {q:"كيف أسجّل مدفوعات نقدية؟",a:"من لوحة التحكم الرئيسية، أدخل المبلغ في حقل \"إضافة إيرادات\" واختر الحلاق المسؤول ثم احفظ."},
    {q:"ماذا أفعل لو نسيت رمز PIN؟",a:"تواصل مع إدارة دورك مباشرةً وستساعدك في إعادة تعيين رمز PIN الخاص بحسابك."},
    {q:"هل يحق لدورك تجميد حسابي أو حظره؟",a:"نعم. تحتفظ إدارة دورك بحق تجميد أو حظر أي صالون يخالف شروط الاستخدام أو يتأخر في تسوية العمولات المستحقة."},
    {q:"هل يمكن تغيير عمولة الحجز؟",a:"لا. العمولة (1 ريال لكل حجز مكتمل) تحددها إدارة دورك. يحتفظ دورك بحق مراجعة الأسعار وتعديلها مستقبلاً مع إشعار مسبق."},
    {q:"كيف أتحقق من حضور العملاء؟",a:"من تقويم الحجوزات، اختر الحجز وعدّل حالة الحضور (حاضر / لم يحضر). يُستخدم هذا في احتساب نسبة الحضور بتقاريرك."},
  ];
  const filtered=faqQ.trim()?ALL.filter(f=>(f.q+f.a).includes(faqQ.trim())):ALL;
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setOwnerTab&&setOwnerTab(null);setShowSalonDrawer&&setShowSalonDrawer(true);}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("faq.title")}</h2></div>
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
function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$,setCustDashNav}){
  const{t}=useTranslation();
  const[tab,setTab]=useState("login");
  const[phone,setPhone]=useState(()=>{try{return localStorage.getItem("dork_customer_saved_phone")||"";}catch{return "";}});
  const[name,setName]=useState("");
  const[email,setEmail]=useState(""); const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[pin,setPin]=useState(""); const[showPin,setShowPin]=useState(false);
  const[pinConfirm,setPinConfirm]=useState("");
  const[googleStep,setGoogleStep]=useState(null);
  const[gPhone,setGPhone]=useState("");
  const[gPin,setGPin]=useState("");
  const[gPinConfirm,setGPinConfirm]=useState("");
  const[gErr,setGErr]=useState("");
  const[gSaving,setGSaving]=useState(false);
  const[phoneLoginLoading,setPhoneLoginLoading]=useState(false);
  // حفظ الموقع تلقائياً فور إنشاء الحساب (طلب أحمد) — صامت تماماً، لا يوقف
  // أو يؤخر أي خطوة تالية بالتسجيل؛ لو رُفض الإذن يقدر العميل يضيفه لاحقاً
  // يدوياً من "تعديل البيانات" (رابط الخرائط اليدوي المضاف بـL164)
  const autoSaveLocation=(customerId)=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customerId}`);
        setCustomers(prev=>prev.map(c=>c.id===customerId?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession(s=>s&&s.id===customerId?{...s,locationLat:lat,locationLng:lng}:s);
      }catch{/* فشل صامت */}
    },()=>{/* رفض/تعذّر — فشل صامت، العميل يقدر يضيفه لاحقاً يدوياً */},{enableHighAccuracy:true,timeout:15000});
  };
  const[otpSent,setOtpSent]=useState(false);
  const[otpCode,setOtpCode]=useState("");
  const[otpTimer,setOtpTimer]=useState(0);
  const[otpExpired,setOtpExpired]=useState(false);
  const[sending,setSending]=useState(false);
  const[verifying,setVerifying]=useState(false);
  const[attempts,setAttempts]=useState(0);
  const[resendTimer,setResendTimer]=useState(0);
  const[rememberPhone,setRememberPhone]=useState(()=>{try{return !!localStorage.getItem("dork_customer_saved_phone");}catch{return false;}});
  const[resetStep,setResetStep]=useState(null);
  const[resetEmail,setResetEmail]=useState("");
  const[resetOtp,setResetOtp]=useState("");
  const[resetErr,setResetErr]=useState("");
  const[resetLoading,setResetLoading]=useState(false);
  const[resetCustomer,setResetCustomer]=useState(null);
  const[resetPinLen,setResetPinLen]=useState(4);
  const[resetTempPin,setResetTempPin]=useState("");
  const[resetPinConfirm,setResetPinConfirm]=useState("");

  const handleRemember=(checked)=>{
    setRememberPhone(checked);
    try{
      if(checked&&phone.trim()) localStorage.setItem("dork_customer_saved_phone",phone.trim());
      else localStorage.removeItem("dork_customer_saved_phone");
    }catch{}
  };

  const sendResetOtp=async()=>{
    if(resetLoading)return;
    if(resendTimer>0){setResetErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة الإرسال`);return;}
    const emailTrimmed=resetEmail.trim();
    if(!emailTrimmed){setResetErr(t("cust_login.err_email"));return;}
    const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRx.test(emailTrimmed)){setResetErr(t("cust_login.err_email_invalid"));return;}
    try{
      setResetLoading(true);setResetErr("");
      const{error}=await supabase.auth.signInWithOtp({email:emailTrimmed,options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:""}});
      if(error){
        const isRate=error.message.includes("rate")||error.message.includes("too many")||error.message.includes("security");
        setResetErr(isRate?i18n.t('ui.wait_two_mins'):i18n.t('ui.error_prefix')+error.message.substring(0,40));
        if(isRate)setResendTimer(170);
        return;
      }
      setResendTimer(170);
      setResetStep("otp");
    }catch(e){setResetErr(i18n.t('ui.connection_internet'));}
    finally{setResetLoading(false);}
  };

  const verifyResetOtp=async()=>{
    if(resetLoading)return;
    const otpClean=String(resetOtp||"").replace(/\D/g,"").slice(0,6);
    if(otpClean.length<6){setResetErr(t("cust_login.err_6digits"));return;}
    try{
      setResetLoading(true);setResetErr("");
      const{data,error}=await supabase.auth.verifyOtp({email:resetEmail.trim(),token:otpClean,type:"email"});
      if(error){setResetErr(i18n.t('ui.code_wrong_check'));setResetOtp("");return;}
      const lookupRes=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"by_email",email:resetEmail.trim(),accessToken:data?.session?.access_token||null})});
      const lookupData=await lookupRes.json().catch(()=>({}));
      if(!lookupRes.ok||!lookupData.customer){setResetErr(t("cust_login.err_not_found"));return;}
      const c=toAppCustomer(lookupData.customer);
      if(c.blocked){setResetErr(i18n.t('ui.account_banned'));return;}
      try{localStorage.removeItem(`dork_customer_pin_${c.id}`);}catch{}
      // نطلب رمز سري جديد فعلياً بدل تسجيل الدخول مباشرة — وإلا يبقى pin_hash
      // بالسيرفر فاضياً للأبد وتتكرر رسالة "يلزم ضبط رمز سري" بكل محاولة دخول قادمة
      setResetCustomer(c);setResetTempPin("");setResetPinConfirm("");setResetPinLen(4);
      setResetStep("pin-select");
    }catch(e){setResetErr(i18n.t('ui.op_error_retry')+e.message.substring(0,40));}
    finally{setResetLoading(false);}
  };

  const finishResetPin=async()=>{
    if(resetLoading||!resetCustomer)return;
    if(resetTempPin.length!==resetPinLen||resetPinConfirm.length!==resetPinLen){return;}
    if(resetTempPin!==resetPinConfirm){setResetErr(t("cust_drawer.pin_mismatch"));return;}
    try{
      setResetLoading(true);setResetErr("");
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:resetCustomer.id,pin:resetTempPin})});
      if(!res.ok){
        const d=await res.json().catch(()=>({}));
        if(d.code==="err_same_pin"){setResetErr(d.error);setResetStep("pin-enter");setResetTempPin("");return;}
        throw new Error(d.error||`HTTP ${res.status}`);
      }
      localStorage.setItem(`dork_customer_pin_${resetCustomer.id}`,await hashPin(resetTempPin));
      setCustomerSession(resetCustomer);setView("home");
      localStorage.setItem("dork_biometric_id",String(resetCustomer.id));
      toast$&&toast$(t("cust_login.reset_success"),"success");
    }catch(e){setResetErr(i18n.t('ui.op_error_retry')+e.message.substring(0,40));}
    finally{setResetLoading(false);}
  };

  // تسجيل دخول بالبصمة
  const loginWithBiometric=async()=>{
    if(!window.PublicKeyCredential){toast$&&toast$(i18n.t('ui.biometric_unsupported'),"err");return;}
    try{
      const savedId=localStorage.getItem("dork_biometric_id");
      if(!savedId){toast$&&toast$(i18n.t('ui.biometric_not_registered'),"err");return;}
      const c=customers.find(x=>String(x.id)===savedId);
      if(!c){toast$&&toast$(i18n.t('ui.account_not_found'),"err");return;}
      if(c.blocked){toast$&&toast$(i18n.t('ui.account_banned'),"err");return;}
      setCustomerSession(c);setView("home");
      toast$&&toast$(i18n.t('ui.biometric_success'));
    }catch(e){toast$&&toast$(i18n.t('ui.verification_failed'),"err");}
  };

  const loginWithPhone=async()=>{
    if(!phone.trim()){setErr(t("cust_login.err_phone"));return;}
    if(pin.length!==6){setErr(t("cust_login.err_pin_wrong"));return;}
    setPhoneLoginLoading(true);setErr("");
    try{
      const res=await fetch("/api/customer-auth",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:phone.trim(),pin}),
      });
      const data=await res.json();
      if(!res.ok){
        if(data.code==="err_locked"&&data.remainingMinutes){
          setErr(`تم قفل الدخول مؤقتاً — أعد المحاولة بعد ${data.remainingMinutes} ${data.remainingMinutes===1?"دقيقة":"دقائق"}`);
        }else if(data.code==="err_no_pin"){
          setErr("يلزم ضبط رمز سري لهذا الحساب أول مرة — استخدم 'نسيت الرمز السري؟' لضبطه");
        }else{
          setErr(data.error||t("cust_login.err_pin_wrong"));
        }
        setPhoneLoginLoading(false);return;
      }
      if(data.access_token&&data.refresh_token){
        await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token}).catch(()=>{});
      }
      const rows=await sb("customers","GET",null,`?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at,blocked&id=eq.${data.id}&limit=1`).catch(()=>[]);
      const c=rows?.length?toAppCustomer(rows[0]):{id:data.id,name:data.name,phone:data.phone,email:data.email,history:[],favs:[]};
      setCustomerSession(c);setView("home");
      localStorage.setItem("dork_biometric_id",String(c.id));
    }catch(e){setErr(i18n.t('ui.error_prefix')+e.message);}
    setPhoneLoginLoading(false);
  };

  // مؤقت صلاحية الكود (2:50 — يطابق إعداد Email OTP Expiration بـSupabase)
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

  // مؤقت انتظار إعادة الإرسال — يطابق مدة صلاحية الكود (2:50) عمداً، يمنع كسر كود لسا صالح
  useEffect(()=>{
    if(resendTimer<=0)return;
    const interval=setInterval(()=>{
      setResendTimer(prev=>Math.max(prev-1,0));
    },1000);
    return()=>clearInterval(interval);
  },[resendTimer]);

 const sendOtpCode=async()=>{
  if(sending)return;
  if(!/^\d{6}$/.test(pin)){setErr(t("cust_login.err_6digits"));return;}
  if(pin!==pinConfirm){setErr(t("owner_login.reset_err_mismatch"));return;}
  if(!email.trim()){setErr(t("cust_login.err_email"));return;}
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email.trim())){setErr(t("cust_login.err_email_invalid"));return;}
  if(resendTimer>0){setErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة المحاولة`);return;}
  try{
    setSending(true);
    setErr("");
    setOtpExpired(false);
    setOtpCode("");
    setOtpTimer(170);
    setResendTimer(170);
    setOtpSent(true);
    setAttempts(0);
    const {data,error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:""}});
    if(error){
      console.error("OTP Error:",error.message);
      setOtpExpired(false);
      const isRateLimit=error.message.includes("rate")||error.message.includes("too many")||error.message.includes("limit")||error.message.includes("security");
      if(isRateLimit){
        setOtpSent(true);
        setResendTimer(170);
        setErr(i18n.t('ui.wait_two_mins'));
      }else{
        setOtpSent(false);
        setOtpTimer(0);
        if(error.message.includes("invalid")||error.message.includes("format")){
          setErr(i18n.t('ui.email_invalid'));
        }else if(error.message.includes("disabled")||error.message.includes("not enabled")){
          setErr(i18n.t('ui.auth_disabled'));
        }else{
          setErr(i18n.t('ui.error_prefix')+error.message.substring(0,40));
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
    setErr(i18n.t('ui.connection_internet'));
  }finally{
    setSending(false);
  }
};

  const register=async()=>{
    if(verifying)return;
    if(!name.trim()||!phone.trim()){setErr(t("cust_login.err_name_phone"));return;}
    if(!email.trim()){setErr(t("cust_login.err_email"));return;}
    if(!/^\d{6}$/.test(pin)){setErr(t("cust_login.err_6digits"));return;}
    if(pin!==pinConfirm){setErr(t("owner_login.reset_err_mismatch"));return;}
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
          setErr(i18n.t('ui.code_wrong_check'));
        }else if((msg.includes("timeout")||msg.includes("expired")||msg.includes("used"))&&otpTimer<=0){
          setOtpExpired(true);
          setOtpTimer(0);
          setErr(i18n.t('ui.code_expired_resend'));
        }else if(msg.includes("blocked")||msg.includes("denied")){
          setErr(i18n.t('ui.email_banned'));
        }else{
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr(i18n.t('ui.code_wrong_retry'));
        }
        return;
      }
      const existsRes=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"phone_exists",phone:phone.trim()})});
      const existsData=await existsRes.json().catch(()=>({}));
      if(existsData.exists){setErr(t("cust_login.err_exists"));return;}
      let isBlacklisted=false;
      try{const bl=await supabase.rpc("is_blacklisted",{p_phone:phone.trim(),p_email:email.trim()});isBlacklisted=bl?.data||false;}catch{}
      if(isBlacklisted){setErr(i18n.t('ui.account_blacklisted'));return;}
      const authUid=data?.user?.id||null;
      const rows=await sb("customers","POST",{name:name.trim(),phone:phone.trim(),email:email.trim(),history:[],favs:[],auth_uid:authUid},"?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at,blocked");
      const nc=toAppCustomer(rows[0]);
      await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:nc.id,pin})}).catch(()=>{});
      setCustomerSession(nc);setView("home");
      localStorage.setItem("dork_biometric_id",String(nc.id));
      autoSaveLocation(nc.id);
      setOtpSent(false);setOtpCode("");setOtpTimer(0);setOtpExpired(false);
      toast$&&toast$(t("cust_login.success_reg"),"success");
    }catch(e){setErr(i18n.t('ui.op_error_retry')+e.message.substring(0,50));
    }finally{setVerifying(false);}
  };

  return(
    <div style={G.page}><div style={G.fp}>

      {/* شاشة استعادة الرمز السري */}
      {resetStep!==null?<>
        <div style={G.fc}>
          <SL>{t("cust_login.reset_title")}</SL>
          {resetStep==="email"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:12,lineHeight:1.6}}>{t("cust_login.reset_hint")}</div>
            <F label={t("cust_login.email_label")} error={resetErr}>
              <input style={{...fi(resetErr),direction:"ltr",textAlign:"left"}} type="email" inputMode="email" placeholder="example@email.com" value={resetEmail} onChange={e=>{setResetEmail(e.target.value);setResetErr("");}} dir="ltr"/>
            </F>
            <button style={{...G.sub,opacity:resetLoading?.6:1,cursor:resetLoading?"not-allowed":"pointer"}} onClick={sendResetOtp} disabled={resetLoading}>
              {resetLoading?t("cust_login.reset_sending"):t("cust_login.reset_send_otp")}
            </button>
          </>:null}
          {resetStep==="otp"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:12,lineHeight:1.6}}>{t("cust_login.reset_otp_sent")} <strong dir="ltr">{resetEmail}</strong></div>
            <F label={t("cust_login.reset_otp_label")} error={resetErr}>
              <OtpInput value={resetOtp} onChange={val=>{setResetOtp(val);setResetErr("");}} error={false} use6Boxes={true} disabled={resetLoading}/>
            </F>
            <button style={{...G.sub,opacity:resetLoading?.6:1,cursor:resetLoading?"not-allowed":"pointer"}} onClick={verifyResetOtp} disabled={resetLoading}>
              {resetLoading?t("cust_login.reset_verifying"):t("cust_login.reset_verify_btn")}
            </button>
            {resendTimer>0
              ?<div style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginTop:8}}>⏳ إعادة الإرسال متاحة بعد {Math.floor(resendTimer/60)}:{String(resendTimer%60).padStart(2,"0")}</div>
              :<button onClick={sendResetOtp} disabled={resetLoading} style={{width:"100%",marginTop:8,padding:"8px 0",background:"transparent",border:"none",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:12,textDecoration:"underline"}}>إعادة إرسال الكود</button>}
          </>:null}
          {resetStep==="pin-select"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16,lineHeight:1.6,textAlign:"center"}}>{t("cust_drawer.pin_select_hint")}</div>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
              <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${resetPinLen===4?"var(--p)":"var(--border-ui)"}`,background:resetPinLen===4?"var(--pa15)":"transparent",color:resetPinLen===4?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setResetPinLen(4)}>{t("cust_drawer.pin_4")}</button>
              <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${resetPinLen===6?"var(--p)":"var(--border-ui)"}`,background:resetPinLen===6?"var(--pa15)":"transparent",color:resetPinLen===6?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setResetPinLen(6)}>{t("cust_drawer.pin_6")}</button>
            </div>
            <button style={G.sub} onClick={()=>{setResetTempPin("");setResetStep("pin-enter");}}>{t("cust_drawer.pin_enter")}</button>
          </>:null}
          {resetStep==="pin-enter"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:10,textAlign:"center"}}>{resetPinLen} {t("cust_drawer.pin_digits_hint")}</div>
            <input type="password" inputMode="numeric" maxLength={resetPinLen} value={resetTempPin} onChange={e=>{setResetTempPin(e.target.value.replace(/\D/g,"").slice(0,resetPinLen));setResetErr("");}} style={{...fi(resetErr),textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:resetErr?6:16}} autoFocus/>
            {resetErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10,textAlign:"center"}}>{resetErr}</div>}
            <button style={{...G.sub,opacity:resetTempPin.length===resetPinLen?1:.5,cursor:resetTempPin.length===resetPinLen?"pointer":"not-allowed"}} disabled={resetTempPin.length!==resetPinLen} onClick={()=>{setResetErr("");setResetPinConfirm("");setResetStep("pin-confirm");}}>{t("cust_drawer.pin_enter")}</button>
          </>:null}
          {resetStep==="pin-confirm"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:10,textAlign:"center"}}>{t("cust_drawer.pin_confirm_title")}</div>
            <input type="password" inputMode="numeric" maxLength={resetPinLen} value={resetPinConfirm} onChange={e=>{setResetPinConfirm(e.target.value.replace(/\D/g,"").slice(0,resetPinLen));setResetErr("");}} style={{...fi(resetErr),textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:resetErr?6:16}} autoFocus/>
            {resetErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10,textAlign:"center"}}>{resetErr}</div>}
            <button style={{...G.sub,opacity:(resetLoading||resetPinConfirm.length!==resetPinLen)?.6:1,cursor:(resetLoading||resetPinConfirm.length!==resetPinLen)?"not-allowed":"pointer"}} disabled={resetLoading||resetPinConfirm.length!==resetPinLen} onClick={finishResetPin}>
              {resetLoading?t("cust_login.reset_verifying"):t("cust_drawer.pin_save")}
            </button>
          </>:null}
          <button onClick={()=>{setResetStep(null);setResetEmail("");setResetOtp("");setResetErr("");setResetCustomer(null);setResetTempPin("");setResetPinConfirm("");}} style={{width:"100%",marginTop:10,padding:"10px 0",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
            {t("cust_login.reset_back")}
          </button>
        </div>
        <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:20,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_login.back")}</button>
      </>:googleStep?<>
        {/* إضافة جوال + رمز سري اختيارية بعد أول تسجيل بجوجل — الاثنان معاً أو ولا شي */}
        <div style={G.fc}>
          <SL>{t('ui.google_phone_setup_title')}</SL>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14,lineHeight:1.6}}>{t('ui.google_phone_setup_hint')}</div>
          <F label={t("cust_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={gPhone} onChange={e=>{setGPhone(e.target.value);setGErr("");}}/></F>
          <F label={t("cust_login.pin_label")}><input style={{...fi(),direction:"ltr",textAlign:"center",letterSpacing:4}} type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={gPin} onChange={e=>{setGPin(e.target.value.replace(/\D/g,"").slice(0,6));setGErr("");}}/></F>
          <F label={t("owner_login.reset_confirm_pin_label")} error={gErr}><input style={{...fi(gErr),direction:"ltr",textAlign:"center",letterSpacing:4}} type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={gPinConfirm} onChange={e=>{setGPinConfirm(e.target.value.replace(/\D/g,"").slice(0,6));setGErr("");}}/></F>
          <button style={{...G.sub,opacity:gSaving?.6:1,cursor:gSaving?"not-allowed":"pointer"}} disabled={gSaving} onClick={async()=>{
            if(!gPhone.trim()){setGErr(t("cust_login.err_name_phone"));return;}
            if(!/^\d{6}$/.test(gPin)){setGErr(t("cust_login.err_6digits"));return;}
            if(gPin!==gPinConfirm){setGErr(t("owner_login.reset_err_mismatch"));return;}
            setGSaving(true);
            try{
              const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_google_phone_pin",customerId:googleStep.id,phone:gPhone.trim(),pin:gPin})});
              const d=await res.json().catch(()=>({}));
              if(!res.ok){setGErr(d.error||i18n.t('ui.error_prefix'));setGSaving(false);return;}
              setCustomers(p=>p.map(c=>c.id===googleStep.id?{...c,phone:gPhone.trim()}:c));
              setCustomerSession(s=>({...s,phone:gPhone.trim()}));
              toast$&&toast$(t('ui.data_saved'));
              setView("home");
            }catch(e){setGErr(e.message);}
            setGSaving(false);
          }}>{gSaving?t("cust_login.verifying"):t('ui.save')}</button>
          <button onClick={()=>setView("home")} style={{width:"100%",marginTop:10,padding:"10px 0",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>{t('ui.google_phone_setup_skip')}</button>
        </div>
      </>:<>

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
          <SL>{t("cust_login.login_title")}</SL>
          <F label={t("cust_login.phone_label")} error={err}><input style={fi(err)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");if(rememberPhone){try{localStorage.setItem("dork_customer_saved_phone",e.target.value.trim());}catch{}}}}/></F>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--text-muted)",cursor:"pointer",margin:"4px 0 10px",userSelect:"none"}}>
            <input type="checkbox" checked={rememberPhone} onChange={e=>handleRemember(e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:"var(--p)"}}/>
            {t("cust_login.remember_phone")}
          </label>
          <F label={t("cust_login.pin_label")}><div style={{position:"relative"}}><input style={{...fi(),paddingLeft:36}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}} maxLength={6}/><button type="button" onClick={()=>setShowPin(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0}}>{showPin?<IconEyeOff size={17}/>:<IconEye size={17}/>}</button></div></F>
          <button onClick={()=>{setResetStep("email");setResetEmail("");setResetOtp("");setResetErr("");}} style={{width:"100%",marginTop:-4,marginBottom:10,padding:"4px 0",border:"none",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:13,textDecoration:"underline",textAlign:"center"}}>
            {t("cust_login.forgot_pin")}
          </button>
          <button style={{...G.sub,opacity:phoneLoginLoading?.6:1,cursor:phoneLoginLoading?"not-allowed":"pointer"}} disabled={phoneLoginLoading} onClick={()=>{if(rememberPhone&&phone.trim()){try{localStorage.setItem("dork_customer_saved_phone",phone.trim());}catch{}}loginWithPhone();}}>{phoneLoginLoading?"...":t("cust_login.login_btn")}</button>
        </>:<>
          <SL>{t("cust_login.reg_title")}</SL>
          <F label={t("cust_login.name_label")}><input style={fi()} placeholder={t("cust_login.name_ph")} value={name} onChange={e=>setName(e.target.value)}/></F>
          <F label={t("cust_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <F label={t("cust_login.pin_label")}><div style={{position:"relative"}}><input style={{...fi(),paddingLeft:36}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}} maxLength={6}/><button type="button" onClick={()=>setShowPin(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0}}>{showPin?<IconEyeOff size={17}/>:<IconEye size={17}/>}</button></div></F>
          <F label={t("owner_login.reset_confirm_pin_label")} error={pinConfirm&&pin!==pinConfirm?t("owner_login.reset_err_mismatch"):""}><input style={{...fi(pinConfirm&&pin!==pinConfirm?"x":""),letterSpacing:4,textAlign:"center"}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" maxLength={6} value={pinConfirm} onChange={e=>{setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}/></F>
          <F label={t("cust_login.email_label")} error={err}><div style={{display:"flex",gap:8}}>
            <input style={{...fi(err),flex:1,direction:"ltr",textAlign:"left"}} placeholder="example@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} type="email" disabled={otpSent||sending} dir="ltr"/>
            <button style={{...G.sub,flex:0,padding:"12px 16px",fontSize:13,opacity:(sending||resendTimer>0||pin.length!==6||pin!==pinConfirm)?.6:1,cursor:(sending||resendTimer>0||pin.length!==6||pin!==pinConfirm)?"not-allowed":"pointer"}} onClick={sendOtpCode} disabled={sending||resendTimer>0||pin.length!==6||pin!==pinConfirm}>
              {sending?t("cust_login.sending"):resendTimer>0?`${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")}`:otpSent?t("cust_login.resend_btn"):t("cust_login.send_btn")}
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
          <button style={{...G.sub,opacity:(verifying||!otpSent||pin.length!==6)?.6:1,cursor:(verifying||!otpSent||pin.length!==6)?"not-allowed":"pointer"}} onClick={register} disabled={!otpSent||verifying||otpExpired||pin.length!==6}>
            {verifying?t("cust_login.verifying"):t("cust_login.reg_btn")}
          </button>
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
              if(!fb.apps.length) fb.initializeApp({apiKey:"AIzaSyD2apyCKbR8tczHA-62Cl3R_2THHut7Jo0",authDomain:"dork-app-c1011.firebaseapp.com",projectId:"dork-app-c1011",storageBucket:"dork-app-c1011.firebasestorage.app",messagingSenderId:"341759447687",appId:"1:341759447687:web:148ba8f895d6aa7f271e22",measurementId:"G-4BXDWKXYQ2"});
              const provider=new fb.auth.GoogleAuthProvider();
              provider.setCustomParameters({prompt:"select_account"});
              const result=await fb.auth().signInWithPopup(provider);
              const gUser={name:result.user.displayName||"مستخدم",email:result.user.email||"",googleUid:result.user.uid};
              const glRes=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"google_login",googleUid:gUser.googleUid,name:gUser.name,email:gUser.email})});
              const glData=await glRes.json().catch(()=>({}));
              if(!glRes.ok||!glData.customer){toast$&&toast$(glData.error||i18n.t('ui.error_prefix'),"err");return;}
              if(glData.access_token&&glData.refresh_token){
                await supabase.auth.setSession({access_token:glData.access_token,refresh_token:glData.refresh_token}).catch(()=>{});
              }
              const c=toAppCustomer(glData.customer);
              setCustomerSession(c);
              localStorage.setItem("dork_biometric_id",String(c.id));
              if(glData.isNewCustomer){autoSaveLocation(c.id);setGoogleStep(c);}else{setView("home");}
            }catch(e){setErr(e.message===i18n.t('ui.google_window_closed')?i18n.t('ui.window_closed'):i18n.t('ui.error_prefix')+e.message);}
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t("cust_login.google_btn")}
          </button>
        </>}
      </div>
      <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:20,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_login.back")}</button>
    </>}
    </div></div>
  );
}
function AttendanceView({customer,salons}){
  const{t}=useTranslation();
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
              background:filter===f.key?`${f.color}22`:"var(--surface-2)",
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
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{t('ui.total_score')}</span>
            <span style={{fontSize:14,fontWeight:800,color:classification.color}}><LabelWithIcon label={classification.label} size={13}/></span>
          </div>
          <div style={{background:"var(--surface-1)",borderRadius:12,padding:"12px 16px",border:"1px solid var(--border-ui)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.attendance_rate')}</span>
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
        ?<div style={{textAlign:"center",color:"var(--text-muted)",padding:24}}>{t('ui.loading')}</div>
        :displayed.length===0
          ?<div style={{textAlign:"center",color:"var(--text-muted)",padding:24}}>{t('ui.no_records')}</div>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {displayed.map((r,i)=>{
              const st=getStatus(r);
              return(
                <div key={r.id||i} style={{background:"var(--surface-1)",borderRadius:10,padding:"12px 14px",
                  borderRight:`3px solid ${st.color}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:5}}><IconScissors size={13} color="var(--p)"/>{getSalonName(r)}</div>
                  <div style={{fontSize:12,fontWeight:700,color:st.color,background:`${st.color}22`,
                    padding:"4px 10px",borderRadius:20}}>{st.label}</div>
                </div>
              );
            })}
          </div>}
    </div>
  );
}
function CustomerDash({customer,salons,setSalons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers,reviews,setReviews,setRescheduleId,loadData,refreshSalonBookings,toast$,initTab="settings",initSection=false,setShowDrawer}){
  const{t}=useTranslation();
  const[tab,setTab]=useState(initTab);
  const[sectionMode,setSectionMode]=useState(initSection);
  const[editMode,setEditMode]=useState(false);
  const[custNotifs,setCustNotifs]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}
  });
  useEffect(()=>{
    const handler=(e)=>setCustNotifs(prev=>[e.detail,...prev].slice(0,50));
    window.addEventListener("dork-customer-notif",handler);
    return()=>window.removeEventListener("dork-customer-notif",handler);
  },[]);
  // جلب حجوزات صالونات العميل عند فتح الصفحة لتفعيل أزرار التعديل والإلغاء
  useEffect(()=>{
    if(!refreshSalonBookings)return;
    const ids=[...new Set((customer.history||[]).map(h=>h.salonId).filter(Boolean))];
    ids.slice(0,5).forEach(sid=>refreshSalonBookings(sid,customer.id));
  },[customer.id]);
  const[editName,setEditName]=useState(customer?.name||"");
  const[editPhone,setEditPhone]=useState(customer?.phone||"");
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[editEmail,setEditEmail]=useState(customer?.email||"");
  const[reminderMins,setReminderMins]=useState(()=>parseInt(localStorage.getItem("dork_reminder")||"60"));
  useEffect(()=>{localStorage.setItem("dork_reminder",String(reminderMins));},[reminderMins]);
  const[myWaiting,setMyWaiting]=useState([]);
  const[openChatBookingId,setOpenChatBookingId]=useState(()=>{try{const v=sessionStorage.getItem("dork_chat_bid");return v?JSON.parse(v):null;}catch{return null;}});
  const[cancellingId,setCancellingId]=useState(null);
  const cancellingLockRef=useRef(null);
  useEffect(()=>{if(openChatBookingId!=null)sessionStorage.setItem("dork_chat_bid",JSON.stringify(openChatBookingId));else sessionStorage.removeItem("dork_chat_bid");},[openChatBookingId]);
  const[chatUnread,setChatUnread]=useState({});
  const _prevChatTotalRef=useRef(-1);
  const _openChatBidRef=useRef(openChatBookingId);
  useEffect(()=>{_openChatBidRef.current=openChatBookingId;},[openChatBookingId]);
  useEffect(()=>{
    if(!customer?.id)return;
    _prevChatTotalRef.current=-1;
    const fetchUnread=async()=>{
      try{
        const res=await fetch(`/api/customer-messages?customerId=${customer.id}&unreadByBooking=1`);
        const data=await res.json();
        if(data&&typeof data==="object"&&!Array.isArray(data)){
          setChatUnread(data);
          const total=Object.values(data).reduce((a,b)=>a+(b||0),0);
          if(_prevChatTotalRef.current>=0&&total>_prevChatTotalRef.current&&_openChatBidRef.current==null){
            toast$&&toast$("💬 رسالة جديدة من الصالون","info");
          }
          _prevChatTotalRef.current=total;
        }
      }catch{}
    };
    fetchUnread();
    const id=setInterval(fetchUnread,15000);
    return()=>clearInterval(id);
  },[customer?.id]);
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
  const saveEditPin=async()=>{
    if(editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm)return;
    try{
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:customer.id,pin:editTempPin})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok){setEditPinErr(d.error||i18n.t('cust_drawer.pin_mismatch'));if(d.code==="err_same_pin"){setEditPinStep("enter");setEditTempPin("");}return;}
      const customerIdStr=String(customer.id);
      localStorage.setItem(`dork_customer_pin_${customerIdStr}`,await hashPin(editTempPin));
      localStorage.setItem(`dork_customer_pin_length_${customerIdStr}`,String(editPinLength));
      setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");
      toast$&&toast$(i18n.t('ui.pin_updated'));
    }catch(e){setEditPinErr(""+e.message);}
  };
  if(!customer)return null;

  // حفظ موقع العميل
  const saveCustomerLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
        setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession({...customer,locationLat:lat,locationLng:lng});
        setShowLocPrompt(false);
        toast$&&toast$(i18n.t('ui.location_saved'));
      }catch{toast$&&toast$(i18n.t('ui.location_save_failed'),"err");}
    },()=>{toast$&&toast$(i18n.t('ui.location_detect_failed'),"err");},{enableHighAccuracy:true,timeout:15000});
  };

  // حذف موقع العميل
  const clearCustomerLocation=async()=>{
    try{
      await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));
      setCustomerSession({...customer,locationLat:null,locationLng:null});
      toast$&&toast$(i18n.t('ui.location_deleted'));
    }catch{toast$&&toast$(i18n.t('ui.location_delete_failed'),"err");}
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
    }catch(e){alert(i18n.t('ui.error_prefix')+e.message);}
  };

  const confirmDeleteAccount=async()=>{
    try{
      const res=await fetch("/api/delete-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:customer.id})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(d.error||"فشل حذف الحساب");
      await supabase.auth.signOut().catch(()=>{});
      setCustomerSession(null);setView("entry");
    }catch(e){alert(i18n.t('ui.error_prefix')+e.message);}
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
    if(diff<=0){alert(i18n.t('ui.appt_too_close'));return;}
    setTimeout(()=>{
      if(Notification.permission==="granted"){
        new Notification(i18n.t('ui.reminder_notif_title'),{body:i18n.t('ui.reminder_notif_body',{salon:h.salonName||"",time:to12h(h.time)}),icon:"/favicon.ico"});
      }else{alert(i18n.t('ui.reminder_alert_body',{salon:h.salonName||"",time:to12h(h.time)}));}
    },diff);
    Notification.requestPermission();
    const timeStr=reminderMins>=60?`${reminderMins/60} ${i18n.t('ui.hour_unit')}`:`${reminderMins} ${i18n.t('ui.min_unit')}`;
    alert(i18n.t('ui.reminder_set_for',{time:timeStr}));
  };

  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};

  const sectionTitle=tab==="notif"?t("cust_dash.section_notif"):tab==="hist"?t("cust_dash.section_hist"):tab==="favs"?t("cust_dash.section_favs"):tab==="remind"?t("cust_dash.section_remind"):tab==="attend"?t("cust_dash.section_attend"):t("cust_dash.section_settings");

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>{setView("home");setShowDrawer(true);}}><IconArrowRight size={20}/></button><h2 style={{...G.ft,flex:1}}>{sectionMode?sectionTitle:t("cust_dash.title")}</h2>{!sectionMode&&<button style={{...G.delBtn,border:"1.5px solid #888",color:"var(--text-muted)",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("entry");}}>{t("cust_dash.exit")}</button>}</div>

      {/* نافذة طلب الموقع — تظهر مرة واحدة لمن ليس عنده موقع */}
      {!sectionMode&&showLocPrompt&&!customer?.locationLat&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:340,width:"100%",border:"1.5px solid rgba(var(--gold-rgb),.3)",textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><IconPin size={40}/></div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--p)",marginBottom:10}}>{t("cust_dash.loc_title")}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>{t("cust_dash.loc_body")}</div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,padding:13,borderRadius:12,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}} onClick={saveCustomerLocation}>{t("cust_dash.loc_yes")}</button>
              <button style={{flex:1,padding:13,borderRadius:12,border:"1px solid #444",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}} onClick={()=>setShowLocPrompt(false)}>{t("cust_dash.loc_later")}</button>
            </div>
          </div>
        </div>
      )}

      {/* بروفايل العميل - Premium */}
      {!sectionMode&&(!editMode?(
        <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1.5px solid var(--gold)",marginBottom:12,position:"relative",boxShadow:"0 4px 16px rgba(var(--gold-rgb),.1)"}}>
          {/* البادج في الزاوية اليسرى */}
          <div style={{position:"absolute",top:12,left:12,background:`${classification.color}22`,border:`1px solid ${classification.color}`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:classification.color}}><LabelWithIcon label={badge} size={10}/></div>

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
            <label style={{display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{t('ui.location_label')}</label>
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
                    <div style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-block",fontSize:13,fontWeight:800,color:"var(--p)",fontFamily:"'Cairo',sans-serif",marginBottom:4}}>{s.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:3}}><IconPin size={10}/>{s.gov||s.region}{s.village?` - ${s.village}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)",display:"flex",alignItems:"center",gap:3}}><IconStar size={10}/>{s.rating}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={G.bookBtn} onClick={()=>{setSelSalon(s);setView("book");}}>{t("cust_dash.book_btn")}</button>
                    <button style={{...G.favBtn,color:"#e74c3c",display:"inline-flex",alignItems:"center",justifyContent:"center"}} onClick={()=>toggleFav(s.id)}><IconHeart size={18} filled/></button>
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
                    <div style={{fontSize:12,color:"var(--text-primary)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><IconScissors size={12} color="var(--p)"/>{s?.name||"صالون"}</div>
                    <div style={{fontSize:11,color:"#f39c12"}}>⏰ {w.slot_date} - {w.slot_time}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>{t("cust_dash.waiting_confirm")}</div>
                  </div>
                  <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}
                    onClick={async()=>{
                      if(!window.confirm(i18n.t('ui.confirm_cancel_wait')))return;
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
              const realBooking=
                (h.bookingId?s?.bookings?.find(b=>Number(b.id)===Number(h.bookingId)):null)||
                s?.bookings?.find(b=>b.date===h.date&&b.time===h.time&&(b.phone===h.phone||b.name===customer.name))||
                s?.bookings?.find(b=>b.date===h.date&&b.time===h.time);
              const status=realBooking?.status||h.status||"pending";
              const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":status==="cancelled"?"#888":"#f39c12";
              const stLabel=status==="approved"?t("cust_dash.status_approved"):status==="rejected"?t("cust_dash.status_rejected"):status==="cancelled"?t("cust_dash.status_cancelled"):t("cust_dash.status_pending");
              const _pb_barber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));
              const _pb_dur=realBooking?.slotDuration||h.slotDuration||(Array.isArray(h.services)?h.services.reduce((a,svc)=>a+((_pb_barber?.durations?.[svc])||s?.prices?.__durations?.[svc]||0),0):0)||(s?.slotMin||40);
              const _pb_end=new Date(new Date(`${h.date}T${(h.time||"00:00")}:00`).getTime()+_pb_dur*60000);
              const isPast=new Date()>=_pb_end;
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{background:"var(--pa08)",border:"1px solid rgba(var(--pr),.3)",borderRadius:20,padding:"5px 14px",display:"inline-block",fontSize:13,fontWeight:800,color:"var(--p)",fontFamily:"'Cairo',sans-serif",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s?.name||h.salonName||"صالون"}</span>
                        <span style={{fontSize:12,color:"var(--text-muted)",display:"inline-flex",alignItems:"center",gap:4}}><IconCalendar size={11}/><span style={{fontWeight:700,color:"var(--p)"}}>{h.date}</span></span>
                      </div>
                      <div style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.service_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</span></div>
                      <div style={{fontSize:12,color:"var(--text-muted)"}}>{t('ui.price_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{h.total||0} {t("cust_dash.sar")}</span></div>
                      {(()=>{const bBarber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));const svcDur=Array.isArray(h.services)?h.services.reduce((a,svc)=>a+((bBarber?.durations?.[svc])||s?.prices?.__durations?.[svc]||0),0):0;const dur=realBooking?.slotDuration||h.slotDuration||svcDur||(s?.slotMin||40);const[hh,mm]=(h.time||"00:00").split(":").map(Number);const endM=hh*60+mm+dur;const eH=Math.floor(endM/60)%24;const eM=endM%60;const endStr=`${eH%12||12}:${String(eM).padStart(2,"0")} ${eH<12?"ص":"م"}`;return<div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{i18n.t('ui.time_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{to12h(h.time)} – {endStr} ({dur} {i18n.t('ui.min_unit')})</span></div>;})()}
                      {(()=>{const bBarber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));const barberLabel=realBooking?.barberName||h.barberName||bBarber?.name||"";return barberLabel?<div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{i18n.t('ui.barber_label')} <span style={{fontWeight:700,color:"var(--p)"}}>{barberLabel}</span></div>:null;})()}                      <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><IconStar key={n} size={12} color={n<=h.rating?"var(--p)":"#333"}/>)}</div>}
                      {!isPast&&<button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>{t("cust_dash.remind_btn")}</button>}
                      {!isPast&&status==="approved"&&<button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{
                        const title=i18n.t('ui.ics_booking_title',{salon:s?.name||h.salonName||""});
                        const desc=i18n.t('ui.service_label')+' '+(Array.isArray(h.services)?h.services.join(" + "):h.service||"");
                        downloadICS(buildICS({title,date:h.date,time:h.time,durationMins:_pb_dur,location:s?.address||"",description:desc}),`booking-${h.date}.ics`);
                      }}>{t("cust_dash.add_calendar")}</button>}
                      {!isPast&&(status==="pending"||status==="approved")&&realBooking?.id&&(<>
                        <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>{if(window.confirm(i18n.t('ui.confirm_edit_booking'))){setRescheduleId(realBooking.id);setSelSalon(s);setView("book");}}}><IconPencil size={10}/>{t('ui.edit')}</button>
                        <button disabled={cancellingId===realBooking.id} style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:cancellingId===realBooking.id?"not-allowed":"pointer",opacity:cancellingId===realBooking.id?0.6:1,fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}} onClick={async()=>{
                          if(cancellingLockRef.current===realBooking.id)return;
                          if(!window.confirm(i18n.t('ui.confirm_cancel_booking')))return;
                          if(cancellingLockRef.current===realBooking.id)return;
                          cancellingLockRef.current=realBooking.id;
                          setCancellingId(realBooking.id);
                          try{
                            const bookDT=new Date(`${h.date}T${h.time}`);
                            const hoursUntil=(bookDT-new Date())/(1000*60*60);
                            const window_h=s?.cancellationWindow||2;
                            const lateCancel=hoursUntil>=0&&hoursUntil<window_h;
                            await sb("bookings","PATCH",{status:"cancelled",...(lateCancel?{attendance:"no_show"}:{})},"?id=eq."+realBooking.id);
                            {const _bc=ntxt(s?.lang||'ar').booking_cancelled(customer?.name||"",h.date,to12h(h.time),lateCancel);sb("notifications","POST",{target_type:"all",title:_bc.title,body:_bc.body,icon:"🚫"}).catch(()=>{});}
                            await loadData({silent:true});
                          }catch(e){toast$(i18n.t('ui.cancel_error'),"err");}
                          finally{cancellingLockRef.current=null;setCancellingId(null);}
                        }}><IconBlocked size={13}/> {cancellingId===realBooking.id?"...":"إلغاء"}</button>
                      </>)}
                      {!isPast&&h.bookingId&&s&&<button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>setOpenChatBookingId(openChatBookingId===h.bookingId?null:h.bookingId)}><IconChat size={10}/>{t('ui.contact')}{(chatUnread[h.salonId]||0)>0&&<span style={{background:"#e74c3c",color:"#fff",borderRadius:999,fontSize:9,fontWeight:900,minWidth:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 3px",marginLeft:2}}>{chatUnread[h.salonId]>9?"9+":chatUnread[h.salonId]}</span>}</button>}
                    </div>
                  </div>
                  {/* التقييم فقط بعد انتهاء وقت الحجز */}
                  {status==="approved"&&(()=>{const _bBarber=s?.barbers?.find(x=>x.id===(realBooking?.barberId||h.barberId));const _svcDur=Array.isArray(h.services)?h.services.reduce((a,svc)=>a+((_bBarber?.durations?.[svc])||s?.prices?.__durations?.[svc]||0),0):0;const _dur=realBooking?.slotDuration||h.slotDuration||_svcDur||(s?.slotMin||40);const _start=new Date(`${h.date}T${(h.time||"00:00")}:00`);const _end=new Date(_start.getTime()+_dur*60000);if(new Date()<_end)return null;return<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                    // تحديث history العميل محلياً (لعرضه في "حجوزاتي")
                    const rev=[...history].reverse();
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated}:c));
                    try{await sb("customers","PATCH",{history:updated},`?id=eq.${customer.id}`);}catch{}
                    // كتابة التقييم في جدول reviews المستقل عبر السيرفر (يتحقق من وجود حجز معتمد فعلي)
                    try{
                      const salonId=Number(h.salonId);
                      const existing=(reviews||[]).find(rv=>Number(rv.salon_id)===salonId&&Number(rv.customer_id)===Number(customer.id)&&rv.booking_date===h.date);
                      const apiRes=await fetch("/api/submit-review",{
                        method:"POST",headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({salonId,customerId:Number(customer.id),customerName:customer.name,rating:r,comment,bookingDate:h.date}),
                      });
                      const data=await apiRes.json();
                      if(!apiRes.ok)throw new Error(data.error||"submit-review failed");
                      if(data.review){
                        if(existing)setReviews(p=>p.map(rv=>rv.id===existing.id?data.review:rv));
                        else setReviews(p=>[...p,data.review]);
                      }
                      setSalons(p=>p.map(s=>Number(s.id)===salonId?{...s,rating:data.rating}:s));
                    }catch(e){console.error(e);}
                  }}/>;})()}
                  {!isPast&&openChatBookingId===h.bookingId&&h.bookingId&&<CustomerSalonChat salonId={Number(h.salonId)} customerId={customer.id} bookingId={Number(h.bookingId)} salonName={s?.name||h.salonName} onClose={()=>setOpenChatBookingId(null)} toast$={toast$}/>}
                </div>
              );
            })}
          </div>}
      </>}

      {/* إشعارات العميل */}
      {tab==="notif"&&(()=>{
        const notifs=custNotifs;
        const clearAll=()=>{setCustNotifs([]);localStorage.setItem("dork_notifs","[]");localStorage.setItem("dork_notif_count","0");};
        return(
          <div>
            {notifs.length>0&&<button style={{...G.pageBtn,width:"100%",marginBottom:10,color:"#e74c3c",border:"1px solid #e74c3c"}} onClick={clearAll}>{t('ui.clear_all')}</button>}
            {notifs.length===0
              ?<div style={{...G.empty,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><IconBell size={14} dot={false}/>{t('ui.no_notifs')}</div>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {notifs.map(n=>(
                  <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"var(--border-ui)":"var(--p)"}`}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{display:"flex"}}><NotifIcon icon={n.icon} size={20}/></span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text-primary)"}}>{n.title}</div>
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
          <div style={{fontSize:13,color:"var(--p)",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:5}}><IconBell size={13}/>{t('ui.reminder_time')}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {[{v:30,l:"30 د"},{v:60,l:"ساعة"},{v:120,l:"ساعتين"},{v:1440,l:"يوم"}].map(({v,l})=>(
              <button key={v} onClick={()=>setReminderMins(v)}
                style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${reminderMins===v?"var(--p)":"var(--border-ui)"}`,background:reminderMins===v?"var(--pa12)":"var(--surface-2)",color:reminderMins===v?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"var(--text-muted)",flexShrink:0}}>{t('ui.or_enter_mins')}</span>
            <input type="number" min="1" max="10080"
              style={{width:90,padding:"8px 12px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--p)",fontSize:14,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
              value={reminderMins} onChange={e=>setReminderMins(Math.max(1,+e.target.value))}/>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{reminderMins>=1440?"يوم":reminderMins>=60?(reminderMins%60===0?`${reminderMins/60} ساعة`:`${Math.floor(reminderMins/60)} ساعة و${reminderMins%60} دقيقة`):"دقيقة"}</span>
          </div>
        </div>
      )}

      {tab==="attend"&&<AttendanceView customer={customer} salons={salons}/>}

      {/* إعدادات الحساب */}
      {tab==="settings"&&(
        <div style={{background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid var(--border-ui)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid var(--border-ui)",display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="⚙" size={16}/> إعدادات الحساب</div>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>{setTab("settings");setEditMode(true);}}><IconPencil size={13}/>{t('ui.edit_data')}</button>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>setEditPinStep("select")}><IconLock size={13}/>{t('ui.change_pin')}</button>

          {/* قسم الموقع */}
          <div style={{background:"rgba(var(--gold-rgb),.06)",borderRadius:10,padding:12,border:"1px solid rgba(var(--gold-rgb),.2)",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={12}/>{t('ui.my_location')}</div>
            {customer?.locationLat&&customer?.locationLng?(
              <>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.loc_saved_offers')}</div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveCustomerLocation}><IconRefresh size={11}/>{t('ui.update_location')}</button>
                  <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={clearCustomerLocation}>{t('ui.delete_location')}</button>
                </div>
              </>
            ):(
              <>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>{t('ui.no_location_long')}</div>
                <button style={{...G.sub,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveCustomerLocation}><IconPin size={12}/>{t('ui.save_location')}</button>
              </>
            )}
          </div>

          <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>{t('ui.delete_account_btn')}</button>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:8,textAlign:"center"}}>{t('ui.delete_warning')}</div>
        </div>
      )}

      {/* حوار تغيير PIN */}
      {editPinStep&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
          <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
            {editPinStep==="select"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><IconLock size={15}/>{t('ui.change_pin')}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",marginBottom:20}}>{t('ui.select_pin_digits')}</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <button onClick={()=>{setEditPinLength(4);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===4?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  4 أرقام
                </button>
                <button onClick={()=>{setEditPinLength(6);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===6?"rgba(var(--gold-rgb),.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  6 أرقام
                </button>
              </div>
            </>:editPinStep==="enter"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t('ui.enter_new_pin',{length:editPinLength})}</div>
              <input type="password" maxLength={editPinLength} value={editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditTempPin(val);setEditPinErr("");if(val.length===editPinLength)setTimeout(()=>setEditPinStep("confirm"),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editTempPin.length===editPinLength)setEditPinStep("confirm");}} />
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
            </>:editPinStep==="confirm"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t('ui.confirm_pin')}</div>
              <input type="password" maxLength={editPinLength} value={editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditPinConfirm(val);if(val.length===editPinLength&&editTempPin!==val){setEditPinErr(i18n.t('cust_drawer.pin_mismatch'));}else{setEditPinErr("");}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm)saveEditPin();}} />
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={saveEditPin} disabled={editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"var(--p)":"var(--border-ui)",color:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"#000":"#555",cursor:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
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
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconWarning size={36}/></div>
              <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:6}}>{t('ui.delete_account')}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>{t('ui.delete_confirm_msg')}</div>
            </div>
            <div style={{background:"rgba(var(--gold-rgb),.08)",border:"1px solid rgba(var(--gold-rgb),.2)",borderRadius:12,padding:14,marginBottom:16,fontSize:12,color:"#ddd",lineHeight:1.8}}>
              <div style={{marginBottom:6,fontWeight:700,color:"var(--gold)"}}>{t('ui.will_delete')}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="✗" size={11}/> حسابك بشكل نهائي</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><NotifIcon icon="✗" size={11}/> جميع معلوماتك الشخصية</div>
            </div>
            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:10,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700,display:"flex",justifyContent:"center"}}>
              <LabelWithIcon label="⚡ تنبيه: لا يمكن استرجاع البيانات بعد الحذف" size={11}/></div>
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid var(--border-ui)",color:"var(--text-muted)",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",WebkitAppearance:"none",appearance:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={()=>setShowDeleteConfirm(false)}><NotifIcon icon="↩️" size={13}/> إلغاء</button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"13px",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",border:"none",WebkitAppearance:"none",appearance:"none"}} onClick={confirmDeleteAccount}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><IconTrash size={14} color="#fff"/>{t('ui.delete_final')}</span></button>
            </div>
          </div>
        </div>
      )}

    </div></div>
  );
}



function InlineStarRating({rated,comment,onRate}){
  const{t}=useTranslation();
  const[hover,setHover]=useState(0);
  const[sel,setSel]=useState(0);
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const sendingLockRef=useRef(false);
  const labels=["","ضعيف","مقبول","جيد","جيد جداً","ممتاز"];
  if(rated>0) return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{display:"flex",gap:1,marginBottom:comment?4:0}}>
        {[1,2,3,4,5].map(n=><IconStar key={n} size={18} color={n<=rated?"var(--gold)":"#333"}/>)}
        <span style={{fontSize:11,color:"var(--text-muted)",marginRight:6,alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment&&<div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );
  return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{fontSize:11,color:"#666",marginBottom:5}}>{t('ui.rate_experience')}</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{cursor:"pointer",transition:"color .1s",lineHeight:1,userSelect:"none"}}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}><IconStar size={28} color={n<=(hover||sel)?"var(--gold)":"var(--border-ui)"}/></span>
        ))}
        {(hover||sel)>0&&<span style={{fontSize:11,color:"var(--p)",marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel>0&&<>
        <textarea
          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"none",minHeight:60,marginBottom:8}}
          placeholder={t('ui.add_comment_ph')}
          value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button disabled={sending} style={{...G.sub,padding:"8px 0",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5,opacity:sending?0.6:1,cursor:sending?"not-allowed":"pointer"}} onClick={async()=>{if(sendingLockRef.current)return;sendingLockRef.current=true;setSending(true);try{await onRate(sel,txt);}finally{sendingLockRef.current=false;setSending(false);}}}>
          {sending?"...":"إرسال التقييم"} <IconStar size={12}/>
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
    {id:"faq",     icon:"❓",label:t("settings.sec_faq")},
    {id:"privacy", icon:"🔒",label:t("settings.sec_privacy")},
    {id:"danger",  icon:"⚠", label:t("settings.sec_danger")},
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
      <div style={G.fh}><button style={G.bb} onClick={()=>{if(backFn){backFn();}else{setView("home");setShowDrawer&&setShowDrawer(true);}}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{onlySec?({social:t("settings.title_social"),faq:t("settings.title_faq"),privacy:t("settings.title_privacy"),theme:t("settings.title_theme")}[onlySec]||t("settings.title")):t("settings.title")}</h2></div>
      {!onlySec&&<div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {SECS.map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"var(--border-ui)"}`,background:sec===s.id?"var(--pa12)":"var(--surface-2)",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            <NotifIcon icon={s.icon} size={11}/> {s.label}
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
                style={{padding:"14px 6px",borderRadius:12,border:`2px solid ${active?t.color:"var(--border-ui)"}`,background:active?t.color+"22":"var(--surface-2)",color:"var(--text-primary)",cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)"}}>
                <span style={{fontSize:22,display:"flex"}}><NotifIcon icon={t.emoji} size={22}/></span>
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
                style={{flex:1,padding:"14px 6px",borderRadius:12,border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"var(--surface-2)",color:active?"var(--p)":"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,fontSize:size,transform:active?"scale(1.04)":"scale(1)"}}>
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
                style={{padding:"18px 6px",borderRadius:12,border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)",minHeight:80,background:active?"var(--pa12)":"var(--surface-2)"}}>
                <span style={{fontSize:26,display:"flex"}}><NotifIcon icon={bg.emoji} size={26}/></span>
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
                  border:`2px solid ${active?"var(--p)":"var(--border-ui)"}`,
                  background:active?"var(--pa08)":"var(--surface-1)",
                  boxShadow:active?"0 0 18px rgba(var(--gold-rgb),.18)":"none",
                  cursor:"pointer",fontFamily:"inherit",outline:"none",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:5,
                  transition:"all .2s",WebkitTapHighlightColor:"transparent"}}>
                <div style={{width:44,height:30,borderRadius:8,background:shell,border:`1.5px solid ${card}`,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4,fontSize:18}}>
                  <NotifIcon icon={icon} size={16}/>
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
                style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"var(--surface-2)",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                {t("settings.tones."+tn.id)} {active&&<IconCheck size={11}/>}
              </button>
            );
          })}
        </div>
      </div>}

      {sec==="social"&&<div style={box}>
        <div style={hdr}>{t("settings.social_header")}</div>
        {socialLinks?.enabled
          ?<div>
            {socialLinks.email&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📧" size={13}/> البريد الإلكتروني</label>
              <a href={`mailto:${socialLinks.email}`} style={{...inp2,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.email}</a>
            </div>}
            {socialLinks.whatsapp&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="💬" size={13}/> واتساب</label>
              <a href={`https://wa.me/966${socialLinks.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{...inp2,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.whatsapp}</a>
            </div>}
            {socialLinks.twitter&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="🐦" size={13}/> تويتر / X</label>
              <a href={`https://twitter.com/${socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{...inp2,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.twitter}</a>
            </div>}
            {(socialLinks.telegram||socialLinks.telegramUser)&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="✈" size={13}/> تيليغرام</label>
              <a href={`https://t.me/${(socialLinks.telegramUser||socialLinks.telegram).replace(/^0/,"").replace("@","")}`} target="_blank" rel="noreferrer" style={{...inp2,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.telegramUser||socialLinks.telegram}</a>
            </div>}
            {(socialLinks.customFields||[]).filter(f=>f&&f.label&&(f.value||"").trim()).map((f,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📌" size={12}/> {f.label}</label>
                <div style={{...inp2}}>{f.value}</div>
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
                <div style={{width:20,height:20,borderRadius:"50%",background:"var(--p)",color:"var(--p-text)",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>{s}</div>
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

      {sec==="privacy"&&<PrivacyPolicyContent/>}

      {sec==="danger"&&<div style={{background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid #c0392b33"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:6,borderBottom:"1px solid #c0392b33"}}>{t("settings.danger_header")}</div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:12}}>{t("settings.danger_hint")}</div>
        <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{if(confirm(t("settings.danger_confirm"))){localStorage.clear();window.location.reload();}}}>{t("settings.danger_btn")}</button>
      </div>}

      <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:13,padding:14,border:"1px solid var(--pa25)",marginTop:4,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:900,color:"var(--p)",letterSpacing:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{t('ui.your_turn')} <IconScissors size={20} color="var(--p)"/></div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{t("settings.version")}</div>
      </div>
    </div></div>
  );
}

function PrivacyPolicyContent(){
  const{t}=useTranslation();
  const box={background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid var(--border-ui)",marginBottom:12};
  const hdr={fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const sections=t("settings.privacy_sections",{returnObjects:true})||[];
  return(
    <div style={box}>
      <div style={hdr}>{t("settings.privacy_header")}</div>
      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:12}}>{t("settings.privacy_updated")}</div>
      {sections.map(({title,content},i)=>(
        <div key={i} style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:5}}>{title}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.8}}>{content}</div>
        </div>
      ))}
    </div>
  );
}

function FAQItem({q,a}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:8,borderRadius:10,border:"1px solid var(--border-ui)",overflow:"hidden"}}>
      <button style={{width:"100%",padding:"11px 14px",background:"var(--bg-input)",border:"none",color:"var(--text-primary)",fontSize:13,fontWeight:700,textAlign:"right",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>setOpen(p=>!p)}>
        <span>{q}</span><span style={{color:"var(--p)",fontSize:14,transform:open?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>v</span>
      </button>
      {open&&<div style={{padding:"10px 14px",background:"var(--surface-1)",fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>{a}</div>}
    </div>
  );
}


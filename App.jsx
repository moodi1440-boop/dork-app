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
} from "./src/components/shared/Icons.jsx";
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
import { ErrorBoundary } from "./src/components/shared/ErrorBoundary.jsx";
import { DorkLogoSvg, ShareBtn, SL, F, fi } from "./src/components/shared/Ui.jsx";
import { CustomerDrawer } from "./src/components/customer/CustomerDrawer.jsx";
import { SalonDrawer } from "./src/components/owner/SalonDrawer.jsx";
import { EntryView, TopBar } from "./src/components/shared/Nav.jsx";
import { SalonReviewsView, SalonCard } from "./src/components/shared/SalonCard.jsx";
import { SalonPage, BookView } from "./src/components/shared/SalonPage.jsx";
import { AllReviewsView, NotifsView, CompareSalonsView, NearMapView } from "./src/components/shared/MiscViews.jsx";
import { OwnerLangView, CustLangView, OwnerPrivacyView, OwnerFaqView } from "./src/components/shared/LegalViews.jsx";
import { OwnerLogin } from "./src/components/owner/OwnerLogin.jsx";
import { OwnerDash } from "./src/components/owner/OwnerDash.jsx";
import { CustomerLogin } from "./src/components/customer/CustomerLogin.jsx";
import { OwnerSettings, CustEditDataView } from "./src/components/shared/SettingsViews.jsx";
import { SettingsView } from "./src/components/shared/AttendanceSettings.jsx";
import { HomeView } from "./src/components/shared/HomeView.jsx";
import { RegisterView } from "./src/components/owner/RegisterView.jsx";
import { CustomerDash } from "./src/components/customer/CustomerDash.jsx";

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

export function useChat(key) {
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


export async function ownerApi(method, body) {
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

export async function registerPushSubForUser(userType, userId) {
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

export const ntxt=(lang)=>NOTIF_TEXTS[lang]||NOTIF_TEXTS.ar;

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


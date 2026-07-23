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
import { AllReviewsView, NotifsView, CompareSalonsView, NearMapView } from "./src/components/MiscViews.jsx";
import { OtpInput, InlineStarRating, PrivacyPolicyContent, FAQItem } from "./src/components/misc.jsx";
import { OwnerLangView, CustLangView, OwnerPrivacyView, OwnerFaqView } from "./src/components/LegalViews.jsx";
import { CustomerSalonChat } from "./src/components/Chat.jsx";
import { OwnerLogin } from "./src/components/OwnerLogin.jsx";
import { OwnerDash } from "./src/components/OwnerDash.jsx";
import { OwnerSettings, CustEditDataView } from "./src/components/SettingsViews.jsx";
import { AttendanceView, SettingsView } from "./src/components/AttendanceSettings.jsx";
import { HomeView } from "./src/components/HomeView.jsx";
import { RegisterView } from "./src/components/RegisterView.jsx";

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

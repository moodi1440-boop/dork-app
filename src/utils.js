// دوال مساعدة عامة (بلا حالة/جلسة) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import { BACKGROUNDS, BG_LIGHT_STYLES, SLOT_STEP } from "./constants.js";

export const getTodayDateInRiyadh = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });

export const IMG_FMT = (() => { try { return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg"; } catch { return "image/jpeg"; } })();

export async function hashPin(pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dork:" + pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function toAppSalon(row) {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    ownerPhone: row.owner_phone,
    owner_email: row.owner_email,
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
    totalPaid: row.total_paid || 0,
    social: row.social || null,
    bookings: [],
  };
}

export function toAppCustomer(row) {
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
    blocked: row.blocked||false,
  };
}

export function normalizeBgId(id){
  if(BACKGROUNDS.some(b=>b.id===id))return id;
  return"none";
}

export function buildDorkBgStyle(bgId,darkMode){
  const id=normalizeBgId(bgId);
  const base={position:"fixed",inset:0,zIndex:-1,pointerEvents:"none"};
  if(!darkMode){
    const L=BG_LIGHT_STYLES[id]||BG_LIGHT_STYLES.none;
    return{...base,...L};
  }
  const bg=BACKGROUNDS.find(b=>b.id===id)||BACKGROUNDS[0];
  return{...base,...bg.style};
}

export function playTone(id, vol=0.7){
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

export function getCustomerClassification(customer){
  const history=(customer?.history||[]);
  const total=history.filter(h=>h.status!=="rejected").length;
  if(total===0)return{label:"🆕 جديد",color:"#3498db",key:"new"};
  const completed=history.filter(h=>h.status==="approved").length;
  const cancelled=history.filter(h=>h.status==="cancelled").length;
  const evalTotal=completed+cancelled;
  const attendRate=evalTotal>0?Math.round((completed/evalTotal)*100):null;
  if(cancelled>=3||(attendRate!==null&&attendRate<50))return{label:"⚠️ غير ملتزم",color:"#e74c3c",key:"unreliable"};
  if(completed>=5&&cancelled===0)return{label:"🌟 مميز",color:"var(--gold)",key:"vip"};
  if(attendRate!==null&&attendRate>=70)return{label:"✅ منتظم",color:"#27ae60",key:"regular"};
  return{label:"🆕 جديد",color:"#3498db",key:"new"};
}

export function makeSlots(s,e,slotMin=40){
  const r=[]; let[h,m]=s.split(":").map(Number); const[eh,em]=e.split(":").map(Number);
  while(h<eh||(h===eh&&m<em)){r.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);m+=slotMin;if(m>=60){h++;m-=60;}} return r;
}

export function getSlotsForSalon(s){
  if(s.shiftEnabled){
    return[...(s.shift1Start&&s.shift1End?makeSlots(s.shift1Start,s.shift1End,SLOT_STEP):[]),...(s.shift2Start&&s.shift2End?makeSlots(s.shift2Start,s.shift2End,SLOT_STEP):[])];
  }
  return makeSlots(s.workStart||"09:00",s.workEnd||"22:00",SLOT_STEP);
}

export function getSlotsForBarber(salon,barber){
  if(barber?.shiftStart&&barber?.shiftEnd){
    return makeSlots(barber.shiftStart,barber.shiftEnd,SLOT_STEP);
  }
  return getSlotsForSalon(salon);
}

export function todayStr(){return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"});}

export function to12h(tt){if(!tt)return tt;const[h,m]=tt.split(":").map(Number);return`${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"ص":"م"}`; }

export function toM(tt){const[h,m]=(tt||"").split(":").map(Number);return(h||0)*60+(m||0);}

export function openMaps(url,name,addr){window.open(url?.trim()||`https://www.google.com/maps/search/${encodeURIComponent(name+" "+addr)}`,"_blank");}

export function calcTotal(svcs,prices){return(svcs||[]).reduce((a,s)=>a+(prices?.[s]||0),0);}

export function normPhone(p){return String(p||"").replace(/\D/g,"");}

export function icsEscape(s){return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}

export function icsDateTime(dateStr,timeStr,addMin=0){
  const[y,mo,d]=(dateStr||todayStr()).split("-").map(Number);
  const[h,mi]=(timeStr||"00:00").split(":").map(Number);
  const dt=new Date(y,mo-1,d,h,mi,0);
  dt.setMinutes(dt.getMinutes()+addMin);
  return`${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,"0")}${String(dt.getDate()).padStart(2,"0")}T${String(dt.getHours()).padStart(2,"0")}${String(dt.getMinutes()).padStart(2,"0")}00`;
}

export function buildICS({title,date,time,durationMins,location,description}){
  const dtStart=icsDateTime(date,time);
  const dtEnd=icsDateTime(date,time,durationMins||40);
  const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const uid=`dork-${date}-${(time||"").replace(":","")}-${Math.random().toString(36).slice(2,8)}@dork-app`;
  return[
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dork//Booking//AR","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(title)}`,
    description?`DESCRIPTION:${icsEscape(description)}`:null,
    location?`LOCATION:${icsEscape(location)}`:null,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM","TRIGGER:-PT30M","ACTION:DISPLAY",`DESCRIPTION:${icsEscape(title)}`,"END:VALARM",
    "END:VEVENT","END:VCALENDAR"
  ].filter(Boolean).join("\r\n");
}

export function downloadICS(content,filename){
  const blob=new Blob([content],{type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function optimizeImageUrl(url, width=100, height=100){
  if(!url)return null;
  // إذا كانت الصورة من Supabase
  if(url.includes('supabase'))return `${url}?w=${width}&h=${height}&fit=crop`;
  // إذا كانت من CDN آخر
  if(url.includes('cloudinary'))return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
  // صور محلية - بدون تعديل
  return url;
}

export function getCachedData(key, fetcher, cacheDuration=86400000){
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


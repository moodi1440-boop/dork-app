import React, { useState, useEffect, useCallback } from “react”;

// ══════════════════════════════════════════════
//  SUPABASE CLIENT
// ══════════════════════════════════════════════
const SUPABASE_URL    = “https://ywrlhvzfefvyogfxfdhl.supabase.co”;
const SUPABASE_ANON   = “sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs”;

async function sb(table, method, body, query = “”) {
const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
const res = await fetch(url, {
method,
headers: {
“apikey”: SUPABASE_ANON,
“Authorization”: `Bearer ${SUPABASE_ANON}`,
“Content-Type”: “application/json”,
“Prefer”: method === “POST” ? “return=representation” : “return=representation”,
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

// تحويل بيانات Supabase → شكل التطبيق
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
bookings: [], // تُحمَّل بشكل منفصل
};
}

// تحويل بيانات التطبيق → Supabase
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
// لو ما في history في Supabase نجيبها من localStorage
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
password: row.password,
favs,
history,
};
}

// ══════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════
const ADMIN_PWD = “admin123”;
const SLOT_MIN  = 40;
const MONTHS_AR = [“يناير”,“فبراير”,“مارس”,“أبريل”,“مايو”,“يونيو”,“يوليو”,“أغسطس”,“سبتمبر”,“أكتوبر”,“نوفمبر”,“ديسمبر”];

// ══════════════════════════════════════════════
//  TONES  – louder + barbershop themed
// ══════════════════════════════════════════════
const TONES = [
{ id:“scissors”,  label:“مقص ✂”          },
{ id:“razor”,     label:“ماكينة 🪒”       },
{ id:“bell”,      label:“جرس الباب 🔔”    },
{ id:“cash”,      label:“صندوق النقد 💰”  },
{ id:“welcome”,   label:“أهلاً وسهلاً 🎉” },
{ id:“chime3”,    label:“جرس ثلاثي 🎶”   },
{ id:“alert”,     label:“تنبيه عاجل ⚡”   },
{ id:“classic”,   label:“كلاسيك 🎵”       },
{ id:“barberpole”,label:“عمود الحلاق 💈”  },
{ id:“clippers”,  label:“ماكينة كهربائية ⚡”},
{ id:“towel”,     label:“منشفة ساخنة 🧖”  },
{ id:“mirror”,    label:“المرايا ✨”       },
{ id:“spray”,     label:“رشاش الماء 💦”   },
{ id:“magazine”,  label:“مجلة انتظار 📖”  },
{ id:“fanfare”,   label:“فانفاري 🎺”       },
{ id:“vip”,       label:“VIP دخول 👑”      },
];

const THEMES = {
gold:     {primary:”#d4a017”, light:”#f0c040”, dark:”#a07810”, lightest:”#f5d76e”, rgb:“212,160,23”},
emerald:  {primary:”#10b981”, light:”#34d399”, dark:”#047857”, lightest:”#6ee7b7”, rgb:“16,185,129”},
sapphire: {primary:”#3b82f6”, light:”#60a5fa”, dark:”#1e40af”, lightest:”#93c5fd”, rgb:“59,130,246”},
rose:     {primary:”#ec4899”, light:”#f472b6”, dark:”#9d174d”, lightest:”#f9a8d4”, rgb:“236,72,153”},
violet:   {primary:”#8b5cf6”, light:”#a78bfa”, dark:”#5b21b6”, lightest:”#c4b5fd”, rgb:“139,92,246”},
crimson:  {primary:”#ef4444”, light:”#f87171”, dark:”#991b1b”, lightest:”#fca5a5”, rgb:“239,68,68”},
};

const BACKGROUNDS=[
{id:“none”,    label:“بلا خلفية”,    emoji:“⬛”, style:{background:”#0d0d1a”}},
{id:“stars”,   label:“نجوم”,          emoji:“✨”, style:{background:“radial-gradient(ellipse at top,#1a1a3a 0%,#0d0d1a 70%)”,backgroundImage:“radial-gradient(circle,rgba(255,255,255,.08) 1px,transparent 1px)”,backgroundSize:“40px 40px”}},
{id:“grid”,    label:“شبكة”,          emoji:“🔲”, style:{background:”#0d0d1a”,backgroundImage:“linear-gradient(rgba(212,160,23,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.05) 1px,transparent 1px)”,backgroundSize:“30px 30px”}},
{id:“waves”,   label:“أمواج”,         emoji:“🌊”, style:{background:“linear-gradient(180deg,#0d0d1a 0%,#0a1628 50%,#0d0d1a 100%)”}},
{id:“marble”,  label:“رخام”,          emoji:“🪨”, style:{background:“linear-gradient(135deg,#111118 25%,#1a1a2a 25%,#1a1a2a 50%,#111118 50%,#111118 75%,#1a1a2a 75%)”,backgroundSize:“20px 20px”}},
{id:“circuit”, label:“دوائر”,         emoji:“🔌”, style:{background:”#0d0d1a”,backgroundImage:“radial-gradient(circle at 50% 50%,rgba(212,160,23,.03) 0%,transparent 60%)”}},
];

function applyBackground(id){
const bg=BACKGROUNDS.find(b=>b.id===id)||BACKGROUNDS[0];
const el=document.getElementById(“dork-bg”);
if(el)Object.assign(el.style,{…bg.style,position:“fixed”,inset:0,zIndex:-1,pointerEvents:“none”});
try{localStorage.setItem(“dork_bg”,id);}catch{}
}

function playTone(id, vol=0.7){
try{
const A=window.AudioContext||window.webkitAudioContext;
if(!A)return;
const ctx=new A();
const g=ctx.createGain(); g.gain.value=vol; g.connect(ctx.destination);
const beep=(freq,start,dur,type=“sine”,v=vol)=>{
const o=ctx.createOscillator(),gn=ctx.createGain();
o.type=type; o.frequency.value=freq;
gn.gain.setValueAtTime(v,ctx.currentTime+start);
gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+start+dur);
o.connect(gn); gn.connect(ctx.destination);
o.start(ctx.currentTime+start); o.stop(ctx.currentTime+start+dur);
};
const plays={
scissors:   ()=>{ beep(1200,0,.05,“square”,.6); beep(900,0.08,.05,“square”,.6); beep(1200,0.16,.05,“square”,.6); beep(900,0.24,.05,“square”,.6); },
razor:      ()=>{ [0,.06,.12,.18,.24].forEach(t=>beep(80+Math.random()*40,t,.07,“sawtooth”,.7)); },
bell:       ()=>{ beep(880,0,.6,“sine”,.8); beep(1100,.15,.5,“sine”,.6); beep(1320,.3,.8,“sine”,.5); },
cash:       ()=>{ beep(1800,0,.04,“square”,.7); beep(2400,.05,.04,“square”,.6); beep(1200,.12,.3,“triangle”,.5); },
welcome:    ()=>{ [523,659,784,1047].forEach((f,i)=>beep(f,i*.12,.25,“sine”,.7)); },
chime3:     ()=>{ [[880,.0],[1100,.18],[1320,.36],[1100,.54],[880,.72]].forEach(([f,t])=>beep(f,t,.25,“sine”,.7)); },
alert:      ()=>{ [0,.1,.2].forEach(t=>beep(1400,t,.08,“square”,.8)); },
classic:    ()=>{ [[440,0],[554,.15],[659,.3],[880,.5]].forEach(([f,t])=>beep(f,t,.3,“triangle”,.7)); },
barberpole: ()=>{ [440,550,660,770,880,770,660,550].forEach((f,i)=>beep(f,i*.1,.15,“sine”,.6)); },
clippers:   ()=>{ [0,.04,.08,.12,.16,.20,.24,.28].forEach(t=>beep(150+Math.random()*50,t,.05,“sawtooth”,.5)); },
towel:      ()=>{ beep(300,0,.2,“sine”,.4); beep(400,.2,.3,“sine”,.5); beep(500,.4,.4,“sine”,.6); },
mirror:     ()=>{ [[1047,0],[1319,.1],[1568,.2],[2093,.35]].forEach(([f,t])=>beep(f,t,.2,“sine”,.7)); },
spray:      ()=>{ [0,.05,.1,.15,.2,.25,.3].forEach(t=>beep(2000+Math.random()*500,t,.04,“square”,.3)); },
magazine:   ()=>{ beep(440,0,.1,“triangle”,.5); beep(330,.15,.1,“triangle”,.5); beep(440,.3,.3,“triangle”,.6); },
fanfare:    ()=>{ [[523,0],[659,.1],[784,.2],[1047,.3],[784,.5],[1047,.65]].forEach(([f,t])=>beep(f,t,.2,“square”,.6)); },
vip:        ()=>{ [[1047,0],[880,.15],[659,.3],[784,.45],[1047,.6],[1319,.8]].forEach(([f,t])=>beep(f,t,.25,“sine”,.7)); },
};
plays[id]?.();
}catch(e){}
}

// ══════════════════════════════════════════════
//  PUSH NOTIFICATIONS
// ══════════════════════════════════════════════
async function requestNotifPermission(){
if(!(“Notification” in window))return false;
if(Notification.permission===“granted”)return true;
const p=await Notification.requestPermission();
return p===“granted”;
}

function sendNotif(title,body,icon=“✂”){
// زيادة عداد الجرس
const count=parseInt(localStorage.getItem(“dork_notif_count”)||“0”);
localStorage.setItem(“dork_notif_count”,String(count+1));
// حفظ الإشعار
try{
const notifs=JSON.parse(localStorage.getItem(“dork_notifs”)||”[]”);
notifs.unshift({id:Date.now(),title,body,icon,time:new Date().toLocaleTimeString(“ar”,{hour:“2-digit”,minute:“2-digit”}),read:false});
localStorage.setItem(“dork_notifs”,JSON.stringify(notifs.slice(0,50)));
}catch{}
if(!(“Notification” in window)||Notification.permission!==“granted”)return;
try{new Notification(`${icon} ${title}`,{body,icon:”/favicon.ico”,dir:“rtl”,lang:“ar”});}catch{}
}

// طلب الإذن عند تحميل التطبيق
if(typeof window!==“undefined”){
setTimeout(()=>requestNotifPermission(),3000);
}
//  المصدر: الخطة الموحدة للمراكز الإدارية ١٤٤٧هـ
//  كل منطقة → محافظات → مراكز إدارية
// ══════════════════════════════════════════════
const BASE_LOC=[
{region:“الرياض”,govs:[
{name:“الرياض”,centers:[“عرقة”,“الحاير”,“هيت”,“العماجية”,“لبن”,“بنبان”,“العزة بالحائر”,“دبيان”]},
{name:“الدرعية”,centers:[“العيينه والجبيله”,“سدوس”,“العمارية”,“بوضه”,“سلطانه”,“حزوى”]},
{name:“الخرج”,centers:[“الهياثم”,“السلمية”,“اليمامة”,“الوسيطاء”,“الرفيعة”,“الرفايع”,“البديعة”,“سميح”,“الناصفة”,“بدع ابن عرفج”,“السهباء”,“مقبولة”,“البديع”,“الشكرة”,“التوضحية”,“البره”,“الشديدة”,“الفيحاء”,“العزيزية”,“الشمال”,“النايفية”]},
{name:“الدوادمي”,centers:[“ساجر”,“نفي”,“عروى”,“الجمش”,“القاعية”,“ماسل”,“رفائع الجمش”,“عرجاء”,“الحفيرة”,“خف”,“مصده”,“ارطاوي حليت”,“القرارة”,“أبو جلال”,“كبشان”,“عسيلة”,“شبيرمة”,“أوضاخ”,“منيفة جلوي”,“الأرطاوي الجديد”,“جهام”,“زخام”,“أم سليم بالسر”,“الدمثي”,“عريفجان”,“الشعراء”,“البجادية”,“السر”,“الأرطاوي”,“حاضرة نفي”,“السكران”,“القرين”,“البرود”,“الأثلة”,“أفقره”,“الرشاوية”,“عين القنور”,“مغيراء”,“العقلة”,“العبل”,“الحيد”,“ارطاوي الحماميد”,“بدائع ابن نجم”,“الفقارة”,“الحفنة”,“علياء”,“الشفلحية”,“مشرفة نفي”,“منية”,“العاذرية”,“الخالدية”,“خريمان”,“عشيران”,“المستجدة”,“المطاوي”,“النبوان”,“فيضة المفص”,“الودي”,“عريبدة”,“عواضة”,“عصام”,“عنز”,“أم رضمة”,“جفناء”,“حديجة”,“سرورة”,“نجخ”,“مغيب”,“عين الصوينع”,“ارطاوي الرقاص”,“عصماء”,“أم زموع”,“جفن”,“الخفيفية”,“اونيلان بالسر”,“عشيرة المخامر”,“البراحة”,“العلوه”,“الظلماوي”,“أبو ركب”,“الصالحية”,“الوطاة”,“عسيلة الوسطى”,“العازمية”]},
{name:“المجمعة”,centers:[“حوطه سدير”,“جلاجل”,“روضة سدير”,“الأرطاوية”,“تمير”,“حرمه”,“الفروثي”,“جراب”,“أم الجماجم”,“القاعية بسدير”,“أم رجوم”,“عودة سدير”,“مشاش عوض”,“العطار”,“الجنوبية بسدير”,“عشيرة سدير”,“التويم”,“الخيس”,“الحصون”,“العمار بسدير”,“الرويضة بسدير”,“الداخلة”,“الخطامة”,“مبايض”,“الجنيفي”,“المعشبه”,“الحاير بسدير”,“وشي”,“الحفص”,“بويضة بسدير”,“الشعب”,“مهدة”,“حويمية”,“البرزة”,“الشحمة”,“أم سدرة”,“أم سديرة”,“مشذوبة”]},
{name:“القويعية”,centers:[“الخاصرة”,“الرويضه بالعرض”,“سنام”,“الحرملية”,“الرفايع”,“حلبان”,“الفويلق”,“مزعل”,“الخروعيه”,“صبحاء”,“أم سريحه”,“روضة الشيابين”,“بدائع العصمه”,“المليحاء”,“أم نخله”,“الخنبقية”,“طمي”,“البدع بسنام”,“صبحاء الشعيب”,“لجعه”,“تبراك والجله”,“الفهيدات”,“الخرائق بحلبان”,“نخيلان”,“حجيلاء”,“محيرقه”,“وادي عصيل”,“حلاة الجله”,“تبراك”,“وادي الخنقه”,“قنيفذه”,“الجفاره”,“جزالا”,“الامار”,“جزيل”,“دسمان”,“الخروعية القديمه”,“الفويلق الشمالي”,“الخاصرة القديمة”,“الخالدية”,“الجلة القديم”,“المديفع”,“أم جدير”,“الجله الجنوبي”,“الجلة الشمالي”,“العدامة”,“الجله”,“فيضة أعبلية”,“صبحاء القديمة”]},
{name:“وادي الدواسر”,centers:[“الخماسين”,“آل معدي”,“الصالحية”,“كمدة”,“آل أبوسباع”,“القويز”,“الولامين”,“آل وثيلة”,“الحرارشة”,“آل بريك”,“آل براز”,“الزويراء”,“الشرافاء”,“الفايزية”,“النويعمة”,“الفاو”,“الضيرين”,“المخاريم”,“الطوال”,“اللدام”,“نزوى”,“المعتلاء”,“الخماسين الشمالي”,“الحناتيش”,“آل عريمة”,“آل راشد”,“المعتلا القديم”,“آل عويمر”,“المصارير”,“مقابل”,“الريان”,“المعيذر الجنوبي”,“صبحاء بالولامين الجنوبي”,“بهجه”,“صيحه”,“العسيلة”,“بلثقاء”,“طويق”,“الثمامية”,“النميص”,“الحزم”,“الحمره”]},
{name:“الأفلاج”,centers:[“الهدار”,“الحمر”,“البديع الشمالي”,“البديع الجنوبي”,“السيح الشمالي”,“حراضه”,“واسط”,“السيح الجنوبي”,“رفاع السيح الشمالي”,“ستاره”,“الغيل”,“الروضه”,“الصغو”,“العمار”,“السيج”,“مروان”,“سويدان”,“قصر القاسم”,“الهدار الجنوبي”,“الوداعين”,“وسيله”,“الخرفه”,“الخالدية”,“الفيصليه”,“العجلية”,“الصالحية”,“الهمجة”]},
{name:“الزلفي”,centers:[“علقه”,“سمنان”,“الثويرات”,“الحمودية”,“الروضه”,“البعيثه”,“المستوي”]},
{name:“شقراء”,centers:[“القصب”,“أشيقر”,“الجريفه”,“الوقف”,“الصوح”,“الحريق بالوشم”,“بادية الداهنه”,“حاضرة الداهنة”,“غسله”,“المشاش”,“الفرعه بالوشم”]},
{name:“حوطة بني تميم”,centers:[“الحلوة”,“العطيان”,“القبابنة”,“وادي برك”,“الحيانية”,“القويع”,“مصده”,“آل بريك”,“الفرشة”]},
{name:“عفيف”,centers:[“الحوميات”,“الجمانية”,“ابرقية”,“عبلاء”,“أم ارطاء”,“بدائع العضيان”,“الخضاره”,“الأشعرية”,“الحنايج”,“المردمة”,“اللنسيات”,“الصقرة”,“محاماة بن زريبة”,“المكلاة”,“وبرة”,“البحرة”,“المعلق”,“محاماة ابن مصوي”,“الشواطن”,“أبو عشرة”,“الجثوم”,“بطاحة”,“الكفية”,“روضة عسعس”,“فيضة نومان”,“دارة المردمة”,“العسيبي”,“الصفوية”,“المنصورة”,“أم سرحه”,“الحمادة”]},
{name:“السليل”,centers:[“تمرة”,“أم العلقاء”,“آل حنيش”,“آل محمد”,“ريداء”,“خيران”,“فوار العريقات”,“آل هميل”,“آل حجي”,“آل خليف”,“الشيدية”,“الدواسية”,“الخالدية”]},
{name:“ضرما”,centers:[“قصور آل مقبل”,“جو”,“الغزيز”,“السيباني”,“الجافورة”,“البدائع”,“العليا”]},
{name:“المزاحمية”,centers:[“البخراء”,“الجفير”,“الحويرة بنساح”,“حفيرة نساح”,“آل حفيان”,“المشاعلة”,“الفيصلية”,“الزبائر”,“اللقف”,“الصدر الأعلى”]},
{name:“رماح”,centers:[“أبوثنين”,“شويه”,“الرمحية”,“العيطلية”,“حفر العتش”,“العمانية”,“بني عامر”,“الفراج”,“الصملة”,“آل عوجان”,“المزيرع”,“آل علي”,“الزيالانه”,“الحفنه”,“الشلاش”,“آل غرير”,“المجفلية”,“آل بليدان”,“سعد”,“الأزمع”,“الباني”,“العلا”,“الفيحانية”,“الطيري”]},
{name:“ثادق”,centers:[“رغبة”,“البير”,“الحسي”,“الصفرات”,“رويضة السهول”,“مشاش السهول”,“رويغب”,“دبيجة”,“الخاتلة”]},
{name:“حريملاء”,centers:[“ملهم”,“صلبوخ”,“البره”,“القرينة”,“العويند”,“غيانة”,“دقلة”,“البويردة”]},
{name:“الحريق”,centers:[“نعام”,“المفيجر”,“أبو رمل”,“الربواء”]},
{name:“الغاط”,centers:[“مليح”,“أبا الصلابيخ”,“العبدلية”]},
{name:“مرات”,centers:[“ثرمداء”,“أثيثيه”,“لبخه”,“حويته”]},
{name:“الدلم”,centers:[“المحمدي”,“ماوان”,“أوثيلان”,“العين”,“الرغيب”,“نعجان”,“الضبيعة”,“الحزم”,“السلمانية”]},
{name:“الرين”,centers:[“الرين الأعلى”,“الناصفة بالرين”,“البدائع بالرين”,“الرين القديم”,“عنان”,“العفج بالرين”,“العمق”,“الرجع بالرين”,“عبليه بالرين”,“الحصاة”,“قبيبان”,“المعيزيلة”,“المثناه بالرين”,“المجذمية”,“هجرة عشق”,“المليحه الطويلة”,“خيم الحصاة”,“الغريبية بالرين”,“عينينان”,“الحصاة القصوى”,“الفرعه بالرين”,“لجع”,“الرفايع بالرين”,“الرفاع بالرين”,“الهفهوف”,“حريملاء الحصاة”,“الربواء”,“الحلوة بالرين”,“الحجاجي”,“السحيمية”,“الرقمية”,“السيح”,“مويسل”,“الرواماء”,“المغزالية”,“جاحد”,“شلاح”,“حفاير الوهوهي”,“حفبرة صماخ”,“ذعيفان”,“حميمان”,“متعبة”,“الفوارة”,“أم سلم”]},
]},
{region:“مكة المكرمة”,govs:[
{name:“مكة المكرمة”,centers:[“المضيق”,“الزيمة”,“المطارفة”,“جعرانة”,“بني عمير”,“البجيدي”,“وادي نخله”]},
{name:“جدة”,centers:[“ثول”,“ذهبان”]},
{name:“الطائف”,centers:[“الهدا”,“المحاني”,“السيل”,“الشفا”,“عشيرة”,“السديرة”,“الفيصلية”,“قيا”,“الفريع”,“آل مشعان”,“العطيف”,“الفيضة”,“شقصان”,“الحفاير”,“العاند”,“العقيق”,“وادي كلاخ”,“دزبج”]},
{name:“القنفذة”,centers:[“القوز”,“حلي”,“المضيلف”,“سبت الجاره”,“دوقة”,“كنانة”,“أحد بني زيد”,“ثلاثاء الخرم”,“خميس حرب”]},
{name:“الليث”,centers:[“غميقه”,“الشواق”,“يلملم”,“الغالة”,“السعدية”,“بني يزيد”,“خذم”,“سعيا”,“الرهوة”,“حفار”,“صلاق”,“مجيرمة”]},
{name:“رابغ”,centers:[“حجر”,“مستورة”,“النويبع”,“القضيمة”,“الأبواء”,“مغينية”]},
{name:“الجموم”,centers:[“عسفان”,“مدركة”,“هدى الشام”,“رهط”,“بني مسعود”,“عين شمس”,“الريان”,“القفيف”]},
{name:“خليص”,centers:[“الظلبية والجمعة”,“أم الجرم”,“الخوار”,“البرزه”,“وادي قديد”,“ستارة”,“حشاش”,“السهم”,“النخيل”]},
{name:“الكامل”,centers:[“الغريف”,“الحرة”,“شمنصير”,“الحنو”]},
{name:“الخرمة”,centers:[“أبو مروة”,“الغريف”,“ظليم”,“الخبراء”]},
{name:“رنية”,centers:[“حدي”,“خدان”,“الأملح”,“ورشة”,“الغافه”,“العفيرية”,“العويلة”,“الشقران”]},
{name:“تربة”,centers:[“القوامة”,“الحشرج”,“شعر”,“العصلة”,“الخضيراء”,“العرقين”,“العلبة”,“الخالدية”,“العلاوة”,“الربع”]},
{name:“ميسان”,centers:[“بني سعد”,“حداد بني مالك”,“القريع بني مالك”,“ثقيف”,“الصور”,“أبو راكه”]},
{name:“المويه”,centers:[“الزربان”,“أم الدوم”,“رضوان”,“ظلم”,“ملحه”,“الرفايع”,“النصائف”,“البحره”,“الحفر”,“المزيرعة”,“الرويبية الصهلوج”,“الراغية”,“الركنه”,“دغيبجه”,“مشاش الطارف”,“العوالي”,“مران”]},
{name:“أضم”,centers:[“الجائزة”,“ربوع العين”,“حقال”,“المرقبان”]},
{name:“العرضيات”,centers:[“نمرة”,“ثريبان”,“الويد”,“الرايم”,“حلحال بثريبان”,“قنونا”]},
{name:“بحره”,centers:[“أم الراكه”,“الشعيبة”,“دفاق”,“البيضاء”]},
]},
{region:“المدينة المنورة”,govs:[
{name:“المدينة المنورة”,centers:[“المليليح”,“المندسه”,“شجوى”,“الفريش”,“أبيار الماشي”,“الفقرة”,“الراغية”,“الصويدرة”,“العوينة”,“الحار”,“الضميرية”,“ضعه”,“غراب”,“حزرة”,“المسبعة”,“دثير”,“اليتمه”]},
{name:“ينبع”,centers:[“ينبع النخل”,“الجابرية”,“تلعة نزا”,“رخو”,“نبط”,“خمال”,“السليم”,“الفقعلي”,“النباة”,“الهيم”,“الشرجة”]},
{name:“العلا”,centers:[“مغيراء”,“الحجر”,“فضلا”,“العذيب”,“شلال”,“البريكة”,“النجيل”,“الورد”,“العين الجديدة”,“الجديده”,“بئر الأراك”,“وقير”]},
{name:“المهد”,centers:[“السويرقية”,“أرن”,“صفينة”,“ثرب”,“العمق”,“الحره”,“حاذه”,“الأصيحر”,“المويهية”,“الصعبية”,“السريحية”,“هبا”,“القويعية”,“الهرارة”,“الرويضة”,“الركنة”]},
{name:“بدر”,centers:[“المسيجيد”,“الواسطة”,“القاحة”,“الرايس”,“الشفية”,“السديرة”,“طاشا”,“بئر الروحاء”]},
{name:“خيبر”,centers:[“العشاش”,“الصلصلة”,“العيينة”,“عشرة”,“الحفيرة”,“الثمد”,“جدعا”,“العرايد”]},
{name:“الحناكية”,centers:[“الحسو”,“النخيل”,“عرجاء”,“طلال”,“الهميج”,“هدبان”,“بلغه”,“صخيبره”,“الشقران”,“بطحى”]},
{name:“العيص”,centers:[“سليلة جهينه”,“المربع”,“المراميث”,“الأبرق”,“الهجر الثلاث”,“أميره”,“السليله”,“جراجر”,“البديع”,“المثلث”]},
{name:“وادي الفرع”,centers:[“الأكحل”,“أبو ضباع”,“الحمنه”,“الهندية”,“أم البرك”,“صوري”,“مغيسل”]},
]},
{region:“القصيم”,govs:[
{name:“بريدة”,centers:[“الشقة”,“البصر”,“الطرفية الشرقية”,“الهدية”,“خضيراء”,“رواق”,“الخضر والوجيعان”,“القصيعة”,“اللسيب”,“حويلان”,“المريديسية”,“جرية العمران وخب ثنيان”,“الدعيسة”,“العريمضي”,“الصباخ”,“المليداء”,“الغماس”,“خب روضان”,“ضراس”,“خب البريدي”]},
{name:“عنيزة”,centers:[“الروغاني”,“وادي الجناح”,“وادي أبوعلي”,“العوشزية”]},
{name:“الرس”,centers:[“الشبيكية”,“الخشيبي”,“قصر بن عقيل”,“دخنة”,“الشنانة”,“الخريشاء”,“الدحلة”,“المطية”,“الغيدانية”]},
{name:“المذنب”,centers:[“الثامرية”,“العمار”,“روضة الحسو”,“المريع”,“الخرماء”,“الخرماء الشمالية”,“سامودة”,“ربيق”,“الملقاء”]},
{name:“البكيرية”,centers:[“الهلالية”,“الشيحية”,“الفويلق”,“كحلة”,“الضلفعة”,“الأرطاوي”,“مشاش جرود”,“الفيضة”,“النجيبة”,“ساق”]},
{name:“البدائع”,centers:[“الأبرق”,“دهيماء”,“علباء”,“الأحمدية”]},
{name:“الأسياح”,centers:[“البطين”,“المدّرج”,“طلحة”,“خصيبة”,“أبا الورود”,“ضيدة”,“حنيظل”,“طريف الأسياح”,“البرود”,“التنومة”,“الجعلة”,“البندرية”,“البعيثة”,“قبه”]},
{name:“النبهانية”,centers:[“ثادج”,“اللغبية”,“القيصومة”,“البتراء”,“الروضة”,“عطاء”,“عطلي”,“الخطيم”,“مطربة”,“البصيري”,“البعجاء”,“البديعة”,“عريفجان ساحوق”,“الطرفية الغربية”,“الافيهد”,“دويج”]},
{name:“عيون الجواء”,centers:[“القرعاء”,“قصيباء”,“محير الترمس”,“شري”,“القوارة”,“الكدادية”,“البسيتين”,“غاف الجواء”,“روض الجواء”,“أوثال”,“الطراق”,“المخرم”,“كبد”]},
{name:“رياض الخبراء”,centers:[“الفوارة”,“الخبراء”,“القرين”,“الدليمية”,“الذيبية”,“النمرية”,“السيح والحجازيه”,“صبيح”,“المطيوي الشمالي”]},
{name:“الشماسية”,centers:[“الربيعية”,“أم حزم”,“النبقية”]},
{name:“عقلة الصقور”,centers:[“العقلة”,“الطرفاوي”,“قطن”,“المحيلاني”,“الحيسونية”,“النقرة”,“امباري”,“ذوقان الركايا”,“فيضة ذيبان”,“الهميلية”,“العماير”,“شقران الحاجر”,“الجفن”]},
{name:“ضرية”,centers:[“مسكة”,“الصمعورية”,“سالم”,“الظاهرية”,“بلقياء الجنوبية”,“بدائع الغبيان”,“العاقر”,“المطيوي الجنوبي”,“هرمولة”,“فيضة الريشية”,“القاعية”,“صعينين”,“ليم”]},
{name:“أبانات”,centers:[“الهمجة”,“خضراء”,“الحنينية”,“المرموثة”,“الزهيرية”,“الصليبي”,“الجرذاوية”,“الركنة”,“رفايع اللهيب”,“الغضياء والسلمات”,“فياضة”,“مظيفير”,“وادي النخيل”,“رفايع الحميمة”,“رفايع الحجرة”]},
]},
{region:“الشرقية”,govs:[
{name:“الدمام”,centers:[“أبو قميص”]},
{name:“الأحساء”,centers:[“سحمة”,“ذاعبلوتن”,“جودة”,“عريعرة”,“يبرين”,“الخن”,“الحفايير”,“الغويبة”,“أم ربيعة”,“أم أثلة”,“العيون”,“العضيلية”,“حرض”,“خريص”,“العقير”,“فضيلة”,“هجرة الزايدية”,“أم العراد”,“هجرة السيح”,“الطويلة”,“هجرة شجعه”,“مريطبة”,“الدهو”,“السالمية”]},
{name:“حفر الباطن”,centers:[“القيصومة”,“القلت”,“المتياهة الجنوبية”,“الرقعي”,“الصداوي”,“النظيم”,“أم قليب”,“الذيبية”,“السعيرة”,“الحماطيات”,“سامودة”,“النايفية”,“هجرة أم عشر”,“المطرقة”,“الشفاء”,“هجرة الصفيري”,“الفاو الشمالي”,“السلمانية”,“الحيرا”,“مناخ”,“خبيراء”,“معرج السوبان”,“أم كداد”]},
{name:“الجبيل”,centers:[“جزيرة جنة”,“رأس الخير”]},
{name:“القطيف”,centers:[“سيهات”,“صفوى”,“النابية”,“أم الساهك”,“جزيرة دارين وتاروث”]},
{name:“الخبر”,centers:[“الظهران”,“جسر الملك فهد”]},
{name:“الخفجي”,centers:[“السفانية”,“هجرة أبرق الكبريت”]},
{name:“أبقيق”,centers:[“يكرب”,“عين دار الجديدة”,“الراجحة”,“فودة”,“عين دار البلد”,“الدغيمية”,“صلاصل”,“الفردانية”,“خور الذيابة”,“الجيشية”]},
{name:“النعيرية”,centers:[“الصرار”,“مليجة”,“حنيذ”,“القليب”,“عتيق”,“الكهفة”,“الحسي”,“الصحاف”,“تاج”,“الونان”,“العيينة”,“الزين”,“نطاع”,“السلمانية”,“هجرة النقيرة”,“غنوى”,“هجرة المليحة”,“أم السواد”,“الهليسية”,“مغطي”,“الحناه”,“شفيه”,“جنوب الصرار”,“أبو ميركه”,“عرج”]},
{name:“قرية العليا”,centers:[“الرفيعة”,“اللهابة”,“الشيط”,“مشله”,“العاذرية”,“الشيحية”,“الفريدة”,“الشامية”,“اللصافة”,“أم الشفلح”,“أم عقلا”,“أم غور”,“القرعاء”,“البويبيات”,“مطربة”,“هجرة المحوى”]},
{name:“العديد”,centers:[“النخلة”,“البطحاء”,“أنباك”,“وسيع”,“عردة”,“أم الزمول”]},
]},
{region:“عسير”,govs:[
{name:“أبها”,centers:[“السودة”,“مدينة سلطان”,“بلحمر”,“الشعف”,“بلسمر”,“مربه”,“طبب”,“تمنيه”,“الماوين”,“صدر وائلة”,“بيحان”,“الأثب”,“حوراء بلسمر”,“المروءة”,“الجهيفه”,“ردوم”]},
{name:“خميس مشيط”,centers:[“تندحة”,“وادي بن هشبل”,“يعرى”,“خيبر الجنوب”,“الحفاير”,“الرونه”,“العماره”,“الحيمة”,“الصفية”,“الجزيرة”,“السليل”]},
{name:“بيشة”,centers:[“النقيع”,“الحازمي”,“صمخ”,“الثنية”,“تبالة”,“الجعبة”,“وادي ترج”,“القوباء”,“العبلاء”,“الدحو”,“الجنينة”,“مهر”,“سد الملك فهد”,“الصور”,“الرس”,“العطف”]},
{name:“النماص”,centers:[“بني عمرو”,“السرح”,“وادي زيد”]},
{name:“محايل عسير”,centers:[“قنا”,“بحر أبو سكينة”,“تهامة بلسمر وبلأحمر”,“السعيدة”,“خلال”,“حميد العلايا”,“خيم”,“حبطن”,“وادي تيه”,“السلام”]},
{name:“سراة عبيدة”,centers:[“العرقين”,“العسران”,“سبت بني بشر”,“جوف آل معمر”,“عين اللوي”]},
{name:“تثليث”,centers:[“أبرق النعام”,“القبرة”,“حبية”,“الحمضة”,“الزرق”,“جاش”,“كحلان”,“واسط”]},
{name:“رجال ألمع”,centers:[“حسوة”,“الحبيل”,“الحريضة”,“روام”,“وسانب”,“مفرغ السيل والمجمعة”]},
{name:“أحد رفيدة”,centers:[“الواديين”,“الفرعين”,“شعف جارمه”]},
{name:“ظهران الجنوب”,centers:[“علب”,“الحماد”,“الحمرة”]},
{name:“بلقرن”,centers:[“البشائر”,“عفراء”,“خثعم”,“باشوت”,“آل سلمة”,“طلالا”,“شواص”,“شعف بلقرن”,“الشفاء”]},
{name:“المجاردة”,centers:[“ثريبان”,“عبس”,“أحد ثريبان”,“ختبه”,“خاط”]},
{name:“تنومة”,centers:[“منصبة”]},
{name:“طريب”,centers:[“العرين”,“المضه”,“الصبيخة”,“الغضاه”,“عرقة آل سليمان”,“الخنقة”,“ملحة الحباب”]},
{name:“بارق”,centers:[“سيالة والسليم”,“ثلوث المنظر”,“جمعة ربيعة المقاطره”]},
{name:“البرك”,centers:[“القحمه”,“المرصد”,“ذهبان”,“عمق”,“الفيض الساحلي”]},
{name:“الحرجة”,centers:[“الفيض”,“النعضاء”,“الغول”,“الرفغه”]},
{name:“الأمواه”,centers:[“العين”,“الفرع”,“ثجر سويدان”,“العمائر”,“النهدين”,“الرهوه”,“العزيزيه”,“بيضان”]},
{name:“الفرشة”,centers:[“الربوعه”,“كحلا”,“الجوه”,“وادي الحيا”,“وادي سريان”,“خشم عنقار”,“الغائل”]},
]},
{region:“تبوك”,govs:[
{name:“تبوك”,centers:[“شقري”,“حالة عمار”,“بجدة”,“بئر بن هرماس”,“رحيب”,“اللوز”,“الأخضر”,“البديعة”,“عيينة”,“حاج”,“السرو”,“الظلفة”,“ونعمى”]},
{name:“الوجه”,centers:[“المنجور”,“أبو القزاز”,“بداء”,“خرباء”,“النابع”,“الكر”,“عنتر”,“الخرار”,“السديد”,“الرس”,“أبو راكة”,“الفارعة”,“النشيفة”,“الجو”]},
{name:“ضباء”,centers:[“شواق”,“شرماء”,“صدر”,“الموبلح”,“صر”,“الديسه”,“شغب”,“رأس الخريطة”,“العمود”,“نابع داما”,“أبو سلمة”]},
{name:“تيماء”,centers:[“الجهراء”,“فجر”,“القليبة”,“الكتيب”,“عردة”,“المعظم”,“العسافية”,“أبيط”,“مديسيس”,“الحزم”,“الجديد”]},
{name:“أملج”,centers:[“الحرة الشمالية”,“الشبحة”,“الشدخ”,“العنبجة”,“مرخ”,“ذعفى”,“الرويضات”,“الشبعان”,“حراض”,“عمق”,“صروم”,“الحسي”,“الهجمية”,“الحائل”,“الشتات”]},
{name:“حقل”,centers:[“الدرة”,“أبو الحنشان”,“علقان”,“الزيتة”,“الوادي الجديد”,“علو القصير”]},
{name:“البدع”,centers:[“قبال”,“أبو رمانه”]},
]},
{region:“حائل”,govs:[
{name:“حائل”,centers:[“جبة”,“الخطة”,“قناء”,“أم القلبان”,“الروضة”,“عقدة”,“قفار”,“النيصية”,“قصر العشروات”,“الودي”,“العش”,“القاعد”,“الرديفة”,“التيم”,“عريجاء”]},
{name:“بقعاء”,centers:[“تربة”,“الزبيرة”,“الخوير”,“الأجفر”,“ضبيعة”,“الحيانية”,“أشيقر”,“شعيبة المياة”,“الشيحية”,“الجبيلي”,“أم ساروث”,“الناصرية”,“الشعلانية”,“جبله”,“الجثياثة”]},
{name:“الغزالة”,centers:[“ربع البكر”,“الهويدي”,“سقف”,“وسيطاء الجفن”,“المستجدة”,“بدع الحويط”]},
{name:“الشنان”,centers:[“الكهفة”,“طابة”,“السعيرة”,“العدوة”,“فيد”,“الساقية”,“رك”,“النعي”,“الجحفة”,“البير”,“السبعان”,“الصغوي”,“المطرفية”,“الأرشاوية”]},
{name:“السليمي”,centers:[“الذكرى”,“البعايث”,“النحيتية”,“العجاجة”,“الثمامية”,“مراغان”,“قاع حجلاء”,“العيثمة”,“البركة”]},
{name:“الحائط”,centers:[“عيال عبيد”,“الوسعه”,“الحليفة السفلى”,“روض بن هادي”,“انبوان”,“المرير”,“الخفيج”,“صفيط”,“الدابية”,“الشويمس”,“ضريغط”,“فيضة أثقب”,“الحليفة العليا”,“المناخ”,“بدع بن خلف”,“المغار”,“الخفج”,“الرقب”,“المعرش”,“جبال العلم”]},
{name:“سميراء”,centers:[“الجابرية”,“القصير”,“عقلة ابن طوله”,“عقلة ابن داني”,“العظيم”,“غمره”,“أشبرية”,“غسل”,“كتيفه”,“المضيح”,“الصفراء”]},
{name:“الشملي”,centers:[“بيضاء نحيل”,“فيضة بن سويلم”,“بئر الرفدي”,“غزلانه”,“عمائر بن صنعاء”,“الحفيرة”,“ساحوث”,“ضاحية الشملي الغربية”,“لبده”,“ضرغط”]},
{name:“موقق”,centers:[“المحفر”,“الشقيق”,“الصنينا”,“دلهان”,“الحفير”,“سعيدان”,“العويد”,“عقلة بن جبرين”]},
]},
{region:“الحدود الشمالية”,govs:[
{name:“عرعر”,centers:[“الجديدة”,“أم خنصر”,“حزم الجلاميد”]},
{name:“رفحاء”,centers:[“لينة”,“الشعبة”,“سماح”,“نصاب”,“لوقة”,“طلعة التمياط”,“بن شريم”,“بن هباس”,“أم رضمة”,“الخشيبي”,“زبالا”,“العجرمية”,“رغوه”,“الحدقة”,“الحدق”,“أعيوج لينه”,“الجميمة”]},
{name:“طريف”,centers:[“الجراني”]},
{name:“العويقيلة”,centers:[“الأيدية”,“المركوز”,“الكاسب”,“نعيجان”,“ابو رواث”,“الدويد”,“زهوة”]},
]},
{region:“جازان”,govs:[
{name:“جازان”,centers:[]},
{name:“صبيا”,centers:[“العالية”,“قوز الجعافرة”,“الكدمي”]},
{name:“أبو عريش”,centers:[“وادي جازان”,“وادي مقاب”]},
{name:“صامطة”,centers:[“القفل”,“السبى”]},
{name:“الحرث”,centers:[“الخشل”]},
{name:“ضمد”,centers:[“الشقيري”,“المشوف”]},
{name:“الريث”,centers:[“مقزع”,“وادي عمود”,“جبل القهر”,“الجبل الأسود”,“ملاطس”]},
{name:“بيش”,centers:[“الفطيحه”,“الحقو”,“مسلية”,“الخلاوية والنجوع”]},
{name:“جزر فرسان”,centers:[“السقيد”,“صير”]},
{name:“الدائر”,centers:[“جبال الحشر”,“آل زيدان”,“دفا”,“جبل عثوان”,“السلف”,“الجانبه”,“الشجعة”,“العزة”]},
{name:“أحد المسارحة”,centers:[“الحكامية”]},
{name:“العيدابي”,centers:[“بلغازي”,“ريع مصيدة”]},
{name:“العارضة”,centers:[“قيس”,“القصبة”,“الحميراء”]},
{name:“الدرب”,centers:[“ريم”,“الشقيق”,“عتود”,“سمرة”]},
{name:“هروب”,centers:[“جبل الجوين”,“منجد”,“وادي رزان”,“الضيعة”,“حجن”,“الأودية”]},
{name:“فيفا”,centers:[“الجوة”]},
{name:“الطوال”,centers:[“الموسم”]},
]},
{region:“نجران”,govs:[
{name:“نجران”,centers:[“رجلا”,“الحظن”,“المشعلية”,“أبا السعود”,“بئر عسكر”,“عاكفة”,“أبا الرشاف”,“خشم العان”,“الغويلة”,“الحصينية”,“الخرعاء”,“الموفجة”]},
{name:“شرورة”,centers:[“الوديعة”,“تماني”,“حمراء نثيل”,“قلمة خجيم”,“الأخاشيم”,“المعاطيف”,“أم غارب”,“البتراء”,“مجه”,“الأبرق”,“الحايره”,“بهجة”,“منفذ الوديعة”,“السطحية”,“المرطاء”,“سرداب”,“أم الملح”,“خور بن حمودة”,“الحرجة”,“البديع”]},
{name:“حبونا”,centers:[“المجمع”,“سلوة”,“الحرشف والجفة”]},
{name:“بدر الجنوب”,centers:[“الخانق”,“هداده”,“الرحاب”,“لدمه”,“العرج”]},
{name:“يدمة”,centers:[“سدير”,“سلطانة”,“أبرق شرقة”,“الوجيد”,“الخالدية”,“السبيل”,“منادي”,“المندفن”,“نجد سهى”,“العزيزية”]},
{name:“ثار”,centers:[“الساري”,“قطن”,“حمى”,“الصفاح”,“ثجر”,“الجوشن”,“المحمدية”]},
{name:“خباش”,centers:[“الخضراء”,“هويمل”,“النقيحاء”,“أبو شداد”,“أم الوهط”,“المحياش”,“شقة الكناور”,“المنخلي”]},
]},
{region:“الباحة”,govs:[
{name:“الباحة”,centers:[“الفرعة”,“بني ظبيان”]},
{name:“بلجرشي”,centers:[“بني كبير”,“بالشهم”,“بادية بني كبير”,“شرى”,“الجنابين”]},
{name:“المندق”,centers:[“بلخزمر”,“دوس”,“برحرح”,“دوس بني فهم”]},
{name:“المخواة”,centers:[“ناوان”,“شدا الأعلى”,“الجوه”,“نيرا”,“وادي ممنا”,“وادي الأحسبة”]},
{name:“العقيق”,centers:[“جرب”,“كرا الحائط”,“وراخ”,“البعيثة”,“الجاوة”,“بهر”]},
{name:“قلوه”,centers:[“الشعراء”,“باللسود”,“المحمدية”,“الشعب”,“وادي ريم”]},
{name:“القرى”,centers:[“بيدة”,“بني حرير وبني عدوان”,“نخال”,“معشوقة”,“تربة الخيالة”]},
{name:“بني حسن”,centers:[“بيضان”,“وادي الصدر”]},
{name:“غامد الزناد”,centers:[“يبس”,“بطاط”,“نصبة وجبال السودة”]},
{name:“الحجرة”,centers:[“الجرين”,“جرداء بني علي”,“وادي رما”,“بني عطا”]},
]},
{region:“الجوف”,govs:[
{name:“سكاكا”,centers:[“خوعاء”,“الفياض”,“عذفاء”,“المرير”,“أم إذن”,“مغيراء”]},
{name:“القريات”,centers:[“الحديثة”,“العيساوية”,“عين الجواس”,“الناصفة”,“الحماد”,“الوادي”,“قليب خضر”,“رديفة الجماجم”]},
{name:“دومة الجندل”,centers:[“أبو عجرم”,“الأضارع”,“أصفان”,“الشقيق”,“الرديفة والرافعية”]},
{name:“طبرجل”,centers:[“ميقوع”,“النبك أبو قصر”,“ثنيه أم نخيله”,“بسيطا”,“الثنيه”,“صبيحا”]},
{name:“صوير”,centers:[“طلعة عمار”,“زلوم”,“الشويحيطية”,“الرفيعة”,“هديب”,“الحرة”,“غدير الخيل”]},
]},
]
const DEFAULT_SERVICES=[“قص شعر”,“حلاقة لحية”,“تسريح”,“حلاقة كاملة”,“عناية بالبشرة”,“صبغة شعر”,“تنظيف بشرة”,“ماسك وجه”];

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function makeSlots(s,e,slotMin=40){
const r=[]; let[h,m]=s.split(”:”).map(Number); const[eh,em]=e.split(”:”).map(Number);
while(h<eh||(h===eh&&m<em)){r.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);m+=slotMin;if(m>=60){h++;m-=60;}} return r;
}
function getSlotsForSalon(s){
const sm=s.slotMin||SLOT_MIN;
if(s.shiftEnabled){
return[…(s.shift1Start&&s.shift1End?makeSlots(s.shift1Start,s.shift1End,sm):[]),…(s.shift2Start&&s.shift2End?makeSlots(s.shift2Start,s.shift2End,sm):[])];
}
return makeSlots(s.workStart||“09:00”,s.workEnd||“22:00”,sm);
}
function todayStr(){return new Date().toISOString().split(“T”)[0];}
function openMaps(url,name,addr){window.open(url?.trim()||`https://www.google.com/maps/search/${encodeURIComponent(name+" "+addr)}`,”_blank”);}
function calcTotal(svcs,prices){return(svcs||[]).reduce((a,s)=>a+(prices?.[s]||0),0);}

const DEMO_SALONS=[
{id:1,name:“صالون الأناقة”,owner:“أحمد محمد”,ownerPhone:“0501234567”,region:“منطقة مكة المكرمة”,gov:“محافظة جدة”,center:“مركز جدة”,village:“الروضة”,phone:“0501234567”,address:“شارع الملك عبدالعزيز”,locationUrl:“https://maps.google.com/?q=21.5433,39.1728”,services:[“قص شعر”,“حلاقة لحية”,“تسريح”],prices:{“قص شعر”:50,“حلاقة لحية”:30,“تسريح”:40},shiftEnabled:true,shift1Start:“08:00”,shift1End:“13:00”,shift2Start:“16:00”,shift2End:“23:00”,workStart:“08:00”,workEnd:“23:00”,barbers:[{id:“b1”,name:“أبو خالد”},{id:“b2”,name:“محمد”}],tone:“bell”,bookings:[],rating:4.8,status:“approved”},
{id:2,name:“بارشوب كلاسيك”,owner:“سالم العتيبي”,ownerPhone:“0559876543”,region:“منطقة الرياض”,gov:“محافظة الرياض”,center:“مركز الرياض”,village:“العليا”,phone:“0559876543”,address:“طريق الملك فهد”,locationUrl:“https://maps.google.com/?q=24.6877,46.7219”,services:[“قص شعر”,“حلاقة كاملة”,“عناية بالبشرة”],prices:{“قص شعر”:60,“حلاقة كاملة”:80,“عناية بالبشرة”:100},shiftEnabled:false,workStart:“10:00”,workEnd:“23:00”,barbers:[{id:“b3”,name:“يوسف”},{id:“b4”,name:“عبدالله”},{id:“b5”,name:“فهد”}],tone:“welcome”,bookings:[],rating:4.6,status:“approved”},
{id:3,name:“صالون النخبة”,owner:“فهد القحطاني”,ownerPhone:“0533445566”,region:“منطقة عسير”,gov:“محافظة أبها”,center:“مركز أبها”,village:“السودة”,phone:“0533445566”,address:“شارع الأمير سلطان”,locationUrl:“https://maps.google.com/?q=18.2164,42.5053”,services:[“قص شعر”,“تسريح”,“صبغة شعر”],prices:{“قص شعر”:45,“تسريح”:35,“صبغة شعر”:100},shiftEnabled:false,workStart:“09:00”,workEnd:“22:00”,barbers:[{id:“b6”,name:“عبدالرحمن”}],tone:“scissors”,bookings:[],rating:4.5,status:“pending”},
];

// ══════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════
export default function App(){
const[salons,setSalons]=useState([]);
const[customers,setCustomers]=useState([]);
const[extraLoc,setExtraLoc]=useState(()=>{
try{
localStorage.removeItem(“bbv6_loc”);
return [];
}catch{return[];}
});
const[loading,setLoading]=useState(true);
const[dbError,setDbError]=useState(null);
const[view,setView]=useState(“home”);
const[selSalon,setSelSalon]=useState(null);
const[toast,setToast]=useState(null);
const[splash,setSplash]=useState(true); // Splash Screen
const[darkMode,setDarkMode]=useState(()=>{try{return localStorage.getItem(“dork_dark”)!==“0”;}catch{return true;}});
const[compareSalons,setCompareSalons]=useState([]); // مقارنة صالونين
const[pullRefreshing,setPullRefreshing]=useState(false); // Pull to refresh

// تطبيق وضع الإضاءة
useEffect(()=>{
document.documentElement.style.setProperty(”–bg-main”,darkMode?”#0d0d1a”:”#f0f0f8”);
document.documentElement.style.setProperty(”–bg-card”,darkMode?”#13131f”:”#ffffff”);
document.documentElement.style.setProperty(”–bg-input”,darkMode?”#0d0d1a”:”#f5f5f5”);
document.documentElement.style.setProperty(”–txt-main”,darkMode?”#f0f0f0”:”#1a1a2e”);
document.documentElement.style.setProperty(”–txt-sub”,darkMode?”#888”:”#666”);
document.documentElement.style.setProperty(”–border”,darkMode?”#2a2a3a”:”#e0e0e0”);
try{localStorage.setItem(“dork_dark”,darkMode?“1”:“0”);}catch{}
},[darkMode]);

// Splash Screen — يختفي بعد ثانيتين
useEffect(()=>{
const t=setTimeout(()=>setSplash(false),2000);
return()=>clearTimeout(t);
},[]);

// Pull to refresh
const handlePullRefresh=async()=>{
setPullRefreshing(true);
await loadData();
setTimeout(()=>setPullRefreshing(false),800);
};

// ── تسجيل الدخول المستمر ──
const[adminSession,setAdminSession]=useState(()=>{try{return localStorage.getItem(“dork_admin”)===“1”;}catch{return false;}});
const[ownerSession,setOwnerSession]=useState(()=>{try{const v=localStorage.getItem(“dork_owner”);return v?+v:null;}catch{return null;}});
const[customerSession,setCustomerSession]=useState(()=>{try{const v=localStorage.getItem(“dork_customer”);return v?JSON.parse(v):null;}catch{return null;}});

useEffect(()=>{try{localStorage.setItem(“dork_admin”,adminSession?“1”:“0”);}catch{}},[adminSession]);
useEffect(()=>{try{if(ownerSession)localStorage.setItem(“dork_owner”,String(ownerSession));else localStorage.removeItem(“dork_owner”);}catch{}},[ownerSession]);
useEffect(()=>{try{if(customerSession)localStorage.setItem(“dork_customer”,JSON.stringify(customerSession));else localStorage.removeItem(“dork_customer”);}catch{}},[customerSession]);

// نقاط الولاء — إعدادات الإدارة
const[loyaltySettings,setLoyaltySettings]=useState(()=>{try{const v=localStorage.getItem(“dork_loyalty”);return v?JSON.parse(v):{enabled:false,pointsPerBooking:10,minRedeemPoints:50,redeemValue:5};}catch{return{enabled:false,pointsPerBooking:10,minRedeemPoints:50,redeemValue:5};}});
useEffect(()=>{try{localStorage.setItem(“dork_loyalty”,JSON.stringify(loyaltySettings));}catch{}},[loyaltySettings]);

// وسائل التواصل الاجتماعي
const[socialLinks,setSocialLinks]=useState(()=>{try{const v=localStorage.getItem(“dork_social”);return v?JSON.parse(v):{email:””,twitter:””,whatsapp:””,telegram:””,telegramUser:””,enabled:false};}catch{return{email:””,twitter:””,whatsapp:””,telegram:””,telegramUser:””,enabled:false};}});
useEffect(()=>{try{localStorage.setItem(“dork_social”,JSON.stringify(socialLinks));}catch{}},[socialLinks]);

// الشروط والأحكام
const[termsAccepted,setTermsAccepted]=useState(()=>{try{return localStorage.getItem(“dork_terms”)===“1”;}catch{return false;}});

// Filters
const[fRegion,setFRegion]=useState(””);
const[fGov,setFGov]=useState(””);
const[fVillage,setFVillage]=useState(””);
const[fCenter,setFCenter]=useState(””);
const[showFavs,setShowFavs]=useState(false);
const[search,setSearch]=useState(””);
const[sortBy,setSortBy]=useState(“default”);
const[userLoc,setUserLoc]=useState(null);
const[settings,setSettings]=useState(()=>{try{const s=localStorage.getItem(“bbv6_settings”);return s?JSON.parse(s):{theme:“gold”,defaultTone:“bell”,fontSize:“md”};}catch{return{theme:“gold”,defaultTone:“bell”,fontSize:“md”};}});
useEffect(()=>{localStorage.setItem(“bbv6_settings”,JSON.stringify(settings));},[settings]);

// حجم الخط
useEffect(()=>{
const sizes={sm:“13px”,md:“15px”,lg:“17px”};
document.documentElement.style.setProperty(”–base-font”,sizes[settings.fontSize||“md”]);
},[settings.fontSize]);
useEffect(()=>{
const t=THEMES[settings.theme]||THEMES.gold;
const r=document.documentElement.style;
r.setProperty(”–p”,  t.primary);
r.setProperty(”–pl”, t.light);
r.setProperty(”–pd”, t.dark);
r.setProperty(”–pll”,t.lightest);
r.setProperty(”–pr”, t.rgb);
r.setProperty(”–pa5”,  `rgba(${t.rgb},.05)`);
r.setProperty(”–pa07”, `rgba(${t.rgb},.07)`);
r.setProperty(”–pa08”, `rgba(${t.rgb},.08)`);
r.setProperty(”–pa12”, `rgba(${t.rgb},.12)`);
r.setProperty(”–pa15”, `rgba(${t.rgb},.15)`);
r.setProperty(”–pa18”, `rgba(${t.rgb},.18)`);
r.setProperty(”–pa2”,  `rgba(${t.rgb},.2)`);
r.setProperty(”–pa25”, `rgba(${t.rgb},.25)`);
r.setProperty(”–pa3”,  `rgba(${t.rgb},.3)`);
r.setProperty(”–pa4”,  `rgba(${t.rgb},.45)`);
r.setProperty(”–grad”, `linear-gradient(135deg,${t.primary},${t.light})`);
r.setProperty(”–grad2”,`linear-gradient(135deg,${t.light},${t.primary})`);
},[settings.theme]);

const allLoc=[…BASE_LOC,…extraLoc];
useEffect(()=>{localStorage.setItem(“bbv6_loc”,JSON.stringify(extraLoc));},[extraLoc]);

const toast$=(msg,type=“ok”)=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};

// ── تحميل البيانات من Supabase ──
const loadData = useCallback(async () => {
try {
setLoading(true);
const salonRows = await sb(“salons”, “GET”, null, “?order=id.desc”);
const salonsWithBookings = salonRows.map(row => {
const salon = toAppSalon(row);
salon.bookings = (row.bookings || []).map(b=>({
id: b.id||Date.now(),
salonId: b.salonId||row.id,
name: b.name||””,
phone: b.phone||””,
services: b.services||[],
barberId: b.barberId||“any”,
barberName: b.barberName||””,
date: b.date||””,
time: b.time||””,
total: b.total||0,
status: b.status||“pending”,
}));
return salon;
});
// تنبيه صوتي للإدارة عند وجود طلبات جديدة
if(adminSession){
const newPending=salonsWithBookings.reduce((a,s)=>a+s.bookings.filter(b=>b.status===“pending”).length,0);
const prevPending=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status===“pending”).length,0);
if(newPending>prevPending){
playTone(“bell”,0.6);
sendNotif(“دورك — طلب جديد”,`يوجد ${newPending} طلب بانتظار المراجعة`,“🔔”);
}
}
setSalons(salonsWithBookings);
const custRows = await sb(“customers”, “GET”, null, “”);
setCustomers(custRows.map(toAppCustomer));
setDbError(null);
} catch(e) {
console.error(e);
setDbError(e.message);
} finally {
setLoading(false);
}
}, [adminSession]);

useEffect(()=>{ loadData(); }, [loadData]);

// شاشة الشروط والأحكام
if(!termsAccepted) return <TermsView onAccept={()=>{setTermsAccepted(true);try{localStorage.setItem(“dork_terms”,“1”);}catch{}}} />;

// Splash Screen
if(splash) return(
<div style={{minHeight:“100vh”,background:“linear-gradient(135deg,#0d0d1a,#1a1a2e)”,display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Cairo’,sans-serif”,direction:“rtl”}}>
<div style={{animation:“splashPulse 1s ease-in-out infinite”,marginBottom:20}}>
<svg width="80" height="80" viewBox="0 0 60 60" fill="none">
<defs>
<linearGradient id="sg" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
<stop offset="0%" stopColor="#f0c040"/><stop offset="50%" stopColor="#d4a017"/><stop offset="100%" stopColor="#b8860b"/>
</linearGradient>
</defs>
<circle cx="30" cy="30" r="28" fill="url(#sg)"/>
<circle cx="30" cy="30" r="24" fill="#0d0d1a"/>
<g transform="translate(30 30) rotate(-30)">
<circle cx="-7" cy="-3" r="3.5" fill="none" stroke="#d4a017" strokeWidth="1.6"/>
<circle cx="-7" cy="3" r="3.5" fill="none" stroke="#d4a017" strokeWidth="1.6"/>
<line x1="-4" y1="-1.5" x2="9" y2="0" stroke="#f0c040" strokeWidth="1.6" strokeLinecap="round"/>
<line x1="-4" y1="1.5" x2="9" y2="0" stroke="#f0c040" strokeWidth="1.6" strokeLinecap="round"/>
</g>
</svg>
</div>
<div style={{fontSize:36,fontWeight:900,color:”#d4a017”,letterSpacing:3,marginBottom:6}}>دورك</div>
<div style={{fontSize:13,color:”#888”,letterSpacing:2}}>DORK · حلاقة وصالونات</div>
<style dangerouslySetInnerHTML={{__html:”@keyframes splashPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}”}} />
</div>
);

// العميل لما يسجل دخول يروح للصفحة الرئيسية مباشرة
const handleCustomerLogin=(c)=>{setCustomerSession(c);setView(“home”);};
// customer helpers
const getCustomer=()=>customerSession?customers.find(c=>c.id===customerSession.id)||customerSession:null;
const toggleFav=async(salonId)=>{
if(!customerSession){toast$(“سجّل دخولك كعميل أولاً”,“warn”);return;}
const c=getCustomer(); if(!c)return;
const favs=c.favs||[];
const newFavs=favs.includes(salonId)?favs.filter(x=>x!==salonId):[…favs,salonId];
try{
await sb(“customers”,“PATCH”,{favs:newFavs},`?id=eq.${c.id}`);
// تحديث محلي
setCustomers(p=>p.map(x=>x.id===c.id?{…x,favs:newFavs}:x));
setCustomerSession(s=>({…s,favs:newFavs}));
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};
const customerFavs=()=>{const c=getCustomer();return c?.favs||[];};

// ── CRUD operations → Supabase ──
const addSalon=async(s)=>{
try{
const dbData=toDbSalon(s);
await sb(“salons”,“POST”,dbData,””);
toast$(“✅ تم إرسال طلب تسجيل الصالون — في انتظار موافقة الإدارة”);
setView(“home”);
await loadData();
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};
const deleteSalon=async(id)=>{
try{
await sb(“salons”,“DELETE”,null,`?id=eq.${id}`);
toast$(“🗑 تم الحذف”,“warn”);
await loadData();
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};
const approveSalon=async(id,st)=>{
try{
await sb(“salons”,“PATCH”,{status:st},`?id=eq.${id}`);
toast$(st===“approved”?“✅ تم قبول الصالون”:“❌ تم رفض الصالون”);
await loadData();
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};
const addBooking=async(sid,bk)=>{
try{
const salon=salons.find(s=>s.id===sid);
if(salon?.tone)playTone(salon.tone,0.8);
const newBooking={
id:Date.now(),
salonId:sid,
name:bk.name,
phone:bk.phone,
services:bk.services,
barberId:bk.barberId||“any”,
barberName:bk.barberName||””,
date:bk.date,
time:bk.time,
total:bk.total,
status:“pending”,
};
const updatedBookings=[…(salon.bookings||[]),newBooking];
await sb(“salons”,“PATCH”,{bookings:updatedBookings},`?id=eq.${sid}`);
if(customerSession){
const c=customers.find(x=>x.id===customerSession.id);
if(c){
const histItem={
salonId:sid,
salonName:salon?.name||””,
date:bk.date,
time:bk.time,
services:bk.services,
total:bk.total,
rating:0,
comment:””,
};
const hist=[…(c.history||[]),histItem];
// نحفظ في localStorage كحل احتياطي
try{localStorage.setItem(`hist_${c.id}`,JSON.stringify(hist));}catch{}
// نجرب Supabase — لو فشل نكمل بدونه
try{await sb(“customers”,“PATCH”,{history:hist,favs:c.favs||[]},`?id=eq.${c.id}`);}catch{}
setCustomers(p=>p.map(x=>x.id===c.id?{…x,history:hist}:x));
}
}
toast$(“🎉 تم إرسال طلب الحجز!”);
setView(“home”);
await loadData();
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};
const updateBookingStatus=async(sid,bid,status)=>{
try{
const salon=salons.find(s=>s.id===sid);
if(!salon)return;
const updatedBookings=salon.bookings.map(b=>b.id===bid?{…b,status}:b);
await sb(“salons”,“PATCH”,{bookings:updatedBookings},`?id=eq.${sid}`);
// إشعار للعميل
const bk=salon.bookings.find(b=>b.id===bid);
if(bk){
const msg=status===“approved”?`✅ تم قبول حجزك في ${salon.name}`:` تم رفض حجزك في ${salon.name}`;
sendNotif(“دورك — تحديث الحجز”,msg,“✂”);
}
await loadData();
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};

const addExtraLoc=(r,g,c,v)=>{
setExtraLoc(p=>{
const copy=[…p];let ri=copy.find(x=>x.region===r);
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

const approvedSalons=salons.filter(s=>s.status===“approved”);
const parseLatLng=url=>{ if(!url)return null; const m=url.match(/[?&q=]*(-?\d+.?\d*),(-?\d+.?\d*)/); return m?{lat:+m[1],lng:+m[2]}:null; };
const distance=(a,b)=>{ if(!a||!b)return Infinity; const dx=a.lat-b.lat,dy=a.lng-b.lng; return Math.sqrt(dx*dx+dy*dy)*111; };
const minPrice=s=>{ const v=Object.values(s.prices||{}); return v.length?Math.min(…v):0; };
const maxPrice=s=>{ const v=Object.values(s.prices||{}); return v.length?Math.max(…v):0; };

let displaySalons=approvedSalons.filter(s=>{
if(fRegion&&s.region!==fRegion)return false;
if(fGov&&s.gov!==fGov)return false;
if(fCenter&&s.center!==fCenter)return false;
if(fVillage&&s.village!==fVillage)return false;
if(search.trim()){
const q=search.trim().toLowerCase();
const hay=[s.name,s.owner,s.region,s.gov,s.center,s.village,s.address,…(s.services||[])].join(” “).toLowerCase();
if(!hay.includes(q))return false;
}
return true;
});
// sort
if(sortBy===“ratingHigh”) displaySalons=[…displaySalons].sort((a,b)=>(b.rating||0)-(a.rating||0));
else if(sortBy===“ratingLow”) displaySalons=[…displaySalons].sort((a,b)=>(a.rating||0)-(b.rating||0));
else if(sortBy===“priceHigh”) displaySalons=[…displaySalons].sort((a,b)=>maxPrice(b)-maxPrice(a));
else if(sortBy===“priceLow”) displaySalons=[…displaySalons].sort((a,b)=>minPrice(a)-minPrice(b));
else if(sortBy===“nearest”&&userLoc) displaySalons=[…displaySalons].sort((a,b)=>distance(userLoc,parseLatLng(a.locationUrl))-distance(userLoc,parseLatLng(b.locationUrl)));

const resetHome=()=>{
setView(“home”);
setSearch(””);
setSortBy(“default”);
setFRegion(””);setFGov(””);setFCenter(””);setFVillage(””);
setShowFavs(false);
};

const sharedProps={
adminSession,setAdminSession,ownerSession,setOwnerSession,customerSession,setCustomerSession,
setView,toast$,allLoc,addExtraLoc,
salons,setSalons,approvedSalons,
addSalon,deleteSalon,approveSalon,
addBooking,updateBookingStatus,
customers,setCustomers,
toggleFav,favSet,customer,
selSalon,setSelSalon,
onEnter:()=>setAdminSession(true),
onPage:(s)=>{setSelSalon(s);setView(“salon”);},
fRegion,setFRegion:v=>{setFRegion(v);setFGov(””);setFCenter(””);setFVillage(””);},
fGov,setFGov:v=>{setFGov(v);setFCenter(””);setFVillage(””);},
fCenter,setFCenter,
fVillage,setFVillage,
govList,villageList,centerList2,
showFavs,setShowFavs,
displaySalons,
salons,
search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,settings,setSettings,
loyaltySettings,setLoyaltySettings,
socialLinks,setSocialLinks,
handleCustomerLogin,
darkMode,setDarkMode,
compareSalons,setCompareSalons,
handlePullRefresh,pullRefreshing,
resetHome,
};

if(loading)return(
<div style={{minHeight:“100vh”,background:”#0d0d1a”,display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,gap:16,fontFamily:”‘Cairo’,sans-serif”,direction:“rtl”}}>
<style>{CSS}</style>
<div style={{fontSize:48}}>✂</div>
<div style={{color:“var(–p)”,fontSize:18,fontWeight:700}}>جارٍ تحميل البيانات…</div>
<div style={{width:48,height:48,border:“4px solid #2a2a3a”,borderTop:“4px solid var(–p)”,borderRadius:“50%”,animation:“spin 0.8s linear infinite”}}/>
<style dangerouslySetInnerHTML={{__html:”@keyframes spin{to{transform:rotate(360deg)}}”}} />
{dbError&&<div style={{background:”#3a1a1a”,color:”#e74c3c”,padding:“12px 20px”,borderRadius:10,fontSize:12,maxWidth:320,textAlign:“center”,margin:“0 16px”}}>❌ خطأ في الاتصال بقاعدة البيانات:<br/><br/>{dbError}<br/><br/><small style={{color:”#aaa”}}>تحقق من الـ anon key في الكود</small></div>}
</div>
);

return(
<div style={G.app}>
<div id=“dork-bg” style={{position:“fixed”,inset:0,zIndex:-1,pointerEvents:“none”,background:”#0d0d1a”}}/>
<style>{CSS}</style>
{toast&&<div style={{…G.toast,background:toast.type===“warn”?”#7a3a10”:toast.type===“err”?”#7a1a1a”:”#1a5c34”}}>{toast.msg}</div>}
<TopBar {…sharedProps}/>
<div style={{paddingTop:56}}>
{view===“home”&&      <HomeView {…sharedProps}/>}
{view===“register”&&  <RegisterView {…sharedProps}/>}
{view===“book”&&selSalon&&<BookView salon={selSalon} {…sharedProps}/>}
{view===“salon”&&selSalon&&<SalonPage salon={salons.find(s=>s.id===selSalon.id)||selSalon} {…sharedProps}/>}
{view===“admin”&&     <AdminView {…sharedProps}/>}
{view===“ownerLogin”&&<OwnerLogin {…sharedProps}/>}
{view===“ownerDash”&& <OwnerDash  salon={salons.find(s=>s.id===ownerSession)} {…sharedProps}/>}
{view===“custLogin”&& <CustomerLogin {…sharedProps}/>}
{view===“custDash”&&  <CustomerDash customer={customer} {…sharedProps}/>}
{view===“settings”&&  <SettingsView {…sharedProps}/>}
{view===“nearMap”&&   <NearMapView salons={approvedSalons} setView={setView} setSelSalon={setSelSalon}/>}
{view===“compare”&&   <CompareSalonsView salons={compareSalons} setView={setView} setSelSalon={setSelSalon}/>}
{view===“notifs”&&    <NotifsView setView={setView}/>}
</div>
</div>
);
}

// ══════════════════════════════════════════════
//  TOP BAR – 3 role buttons on the LEFT
// ══════════════════════════════════════════════
function TopBar({adminSession,ownerSession,customerSession,setView,setAdminSession,setOwnerSession,setCustomerSession,salons,darkMode,setDarkMode,resetHome}){
const pendingCount=salons.filter(s=>s.status===“pending”).length;
return(
<div style={G.topBar}>
{/* LEFT: role buttons */}
<div style={{display:“flex”,gap:5,alignItems:“center”}}>
<button style={{…G.roleBtn,…(adminSession?G.roleBtnActive:{})}} onClick={()=>setView(“admin”)}>
🔐{pendingCount>0&&adminSession&&<span style={G.roleDot}>{pendingCount}</span>}
</button>
<button style={{…G.roleBtn,…(ownerSession?G.roleBtnActive:{})}} onClick={()=>setView(ownerSession?“ownerDash”:“ownerLogin”)}>✂</button>
<button style={{…G.roleBtn,…(customerSession?G.roleBtnActive:{})}} onClick={()=>setView(customerSession?“custDash”:“custLogin”)}>👤</button>
<button style={G.roleBtn} onClick={()=>setView(“settings”)}>⚙</button>
<button style={{…G.roleBtn,background:“var(–pa12)”,border:“1.5px solid var(–pa25)”,color:“var(–p)”}} onClick={()=>resetHome&&resetHome()}>🏠</button>
</div>
{/* RIGHT: شعار دورك */}
<div style={{display:“flex”,alignItems:“center”,gap:7,cursor:“pointer”}} onClick={()=>resetHome&&resetHome()}>
<svg width="30" height="30" viewBox="0 0 60 60" fill="none">
<defs>
<linearGradient id="goldG" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
<stop offset="0%" stopColor="var(--pll)"/><stop offset="50%" stopColor="var(--p)"/><stop offset="100%" stopColor="var(--pd)"/>
</linearGradient>
<linearGradient id="darkG" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
<stop offset="0%" stopColor="#1a1a2e"/><stop offset="100%" stopColor="#0d0d1a"/>
</linearGradient>
</defs>
<circle cx="30" cy="30" r="28" fill="url(#goldG)"/>
<circle cx="30" cy="30" r="24" fill="url(#darkG)"/>
<circle cx="30" cy="9" r="1.5" fill="var(--p)"/>
<g transform="translate(30 30) rotate(-30)">
<circle cx="-7" cy="-3" r="3.5" fill="none" stroke="var(--p)" strokeWidth="1.6"/>
<circle cx="-7" cy="3" r="3.5" fill="none" stroke="var(--p)" strokeWidth="1.6"/>
<line x1="-4" y1="-1.5" x2="9" y2="0" stroke="var(--pl)" strokeWidth="1.6" strokeLinecap="round"/>
<line x1="-4" y1="1.5" x2="9" y2="0" stroke="var(--pl)" strokeWidth="1.6" strokeLinecap="round"/>
</g>
<circle cx="30" cy="30" r="1.5" fill="var(--pll)"/>
</svg>
<div style={{display:“flex”,flexDirection:“column”,alignItems:“flex-start”,lineHeight:1}}>
<span style={{fontSize:19,fontWeight:900,color:“var(–pl)”,fontFamily:”‘Cairo’,sans-serif”,letterSpacing:1}}>دورك</span>
<span style={{fontSize:7,color:“var(–p)”,letterSpacing:1.2,marginTop:1,fontFamily:”‘Cairo’,sans-serif”,opacity:.85}}>DORK · حلاقة وصالونات</span>
</div>
</div>
</div>
);
}

// ══════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════
function HomeView({displaySalons,approvedSalons,allLoc,fRegion,setFRegion,fGov,setFGov,fCenter,setFCenter,fVillage,setFVillage,govList,villageList,centerList2,showFavs,setShowFavs,favSet,toggleFav,setView,setSelSalon,customer,search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,toast$,customers,salons,compareSalons,setCompareSalons,handlePullRefresh,pullRefreshing}){
const[urgentMode,setUrgentMode]=useState(false);

const getRealRating=(salonId)=>{
const id=Number(salonId);
const reviews=(customers||[]).flatMap(c=>
(c.history||[]).filter(h=>Number(h.salonId)===id&&h.rating>0).map(h=>h.rating)
);
if(!reviews.length)return null;
return Math.round(reviews.reduce((a,r)=>a+r,0)/reviews.length*10)/10;
};

const detectUserLoc=()=>{
if(!navigator.geolocation){alert(“⚠️ المتصفح لا يدعم تحديد الموقع”);return;}
navigator.geolocation.getCurrentPosition(
p=>{setUserLoc({lat:p.coords.latitude,lng:p.coords.longitude});setSortBy(“nearest”);toast$&&toast$(“✅ تم تحديد موقعك”);},
err=>{let m=“تعذّر تحديد موقعك”;if(err.code===1)m=“🚫 رفضت إذن الموقع”;alert(m);},
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
const m=s.locationUrl.match(/q=(-?\d+.?\d*),(-?\d+.?\d*)/);
return m?{lat:+m[1],lng:+m[2]}:null;
};

// وضع الاستعجال — الصالونات المفتوحة الآن
const now=new Date();
const curMins=now.getHours()*60+now.getMinutes();
const isOpenNow=(s)=>{
const toMins=(t)=>{const[h,m]=(t||“0:0”).split(”:”).map(Number);return h*60+m;};
if(s.shiftEnabled){
return(curMins>=toMins(s.shift1Start)&&curMins<=toMins(s.shift1End))||(curMins>=toMins(s.shift2Start)&&curMins<=toMins(s.shift2End));
}
return curMins>=toMins(s.workStart)&&curMins<=toMins(s.workEnd);
};

// ترتيب الأقرب
const sortedSalons=(()=>{
let list=urgentMode?displaySalons.filter(isOpenNow):displaySalons;
if(sortBy===“nearest”&&userLoc){
return[…list].sort((a,b)=>{
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
setCompareSalons(p=>[…p,s]);
if(compareSalons.length===1){
setTimeout(()=>setView(“compare”),300);
}
}
};

return(
<div style={G.page}>
{/* Pull to refresh */}
{pullRefreshing&&<div style={{position:“fixed”,top:56,left:“50%”,transform:“translateX(-50%)”,zIndex:100,background:“var(–p)”,color:”#000”,padding:“4px 16px”,borderRadius:20,fontSize:12,fontWeight:700}}>⟳ جاري التحديث…</div>}

```
  <div style={{background:"linear-gradient(160deg,#12122a,#1a1a3a)",borderBottom:"1px solid #2a2a3a",padding:"14px 14px 0"}}>
    <div style={{textAlign:"center",paddingBottom:10}}>
      <h1 style={{fontSize:24,fontWeight:900,color:"#fff",lineHeight:1.3}}>احجز وقتك<br/><span style={{color:"var(--p)"}}>بضغطة واحدة</span></h1>
      <p style={{color:"#777",fontSize:12,marginTop:4}}>أفضل صالونات الحلاقة في مدينتك</p>
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
            userLoc={userLoc}
            getSalonCoords={getSalonCoords}
            haversine={haversine}
            isOpenNow={isOpenNow(s)}
            inCompare={compareSalons.some(x=>x.id===s.id)}
            onCompare={()=>toggleCompare(s)}
            onBook={()=>{setSelSalon(s);setView("book");}}/>
        ))}
      </div>
    }
  </div>
</div>
```

);
}
function LocFilter({icon,label,value,onChange,options,all}){
return(
<div style={G.fRow}>
<span style={{fontSize:13,flexShrink:0}}>{icon}</span>
<span style={{fontSize:11,color:“var(–p)”,flexShrink:0,minWidth:50}}>{label}</span>
<select style={G.fSel} value={value} onChange={e=>onChange(e.target.value)}>
<option value="">{all}</option>
{options.map(o=><option key={o} value={o}>{o}</option>)}
</select>
</div>
);
}
function SalonCard({salon,fav,onFav,onBook,realRating,userLoc,getSalonCoords,haversine,isOpenNow,inCompare,onCompare}){
const slots=getSlotsForSalon(salon);
const displayRating=realRating||salon.rating||“5.0”;

// مسافة
let distance=null;
if(userLoc&&getSalonCoords&&haversine){
const coords=getSalonCoords(salon);
if(coords)distance=haversine(userLoc.lat,userLoc.lng,coords.lat,coords.lng).toFixed(1);
}

if(salon.frozen)return(
<div style={{…G.card,opacity:.5,position:“relative”}}>
<div style={{position:“absolute”,top:8,left:8,background:”#e74c3c”,color:”#fff”,fontSize:10,fontWeight:700,padding:“2px 8px”,borderRadius:20}}>🔒 مغلق مؤقتاً</div>
<div style={{fontSize:13,fontWeight:700,color:”#fff”,marginBottom:4}}>✂ {salon.name}</div>
<div style={{fontSize:11,color:”#888”}}>هذا الصالون مغلق مؤقتاً</div>
</div>
);

return(
<div style={{…G.card,border:inCompare?“2px solid var(–p)”:“1px solid #2a2a3a”}} className=“hcard”>
{salon.welcomeMsg&&<div style={{fontSize:11,color:“var(–p)”,fontStyle:“italic”,marginBottom:6,padding:“5px 8px”,background:“var(–pa08)”,borderRadius:7}}>💬 {salon.welcomeMsg}</div>}
<div style={{display:“flex”,gap:8,alignItems:“flex-start”,marginBottom:6}}>
<div style={G.cav}>✂</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:“flex”,alignItems:“center”,gap:6}}>
<div style={{fontSize:14,fontWeight:700,color:”#fff”}}>{salon.name}</div>
{isOpenNow&&<span style={{fontSize:9,background:“rgba(39,174,96,.2)”,color:”#27ae60”,padding:“1px 6px”,borderRadius:10,fontWeight:700}}>مفتوح</span>}
</div>
<div style={{fontSize:11,color:”#888”}}>📍 {salon.gov||salon.region}{salon.village?` · ${salon.village}`:””}</div>
{distance&&<div style={{fontSize:11,color:”#27ae60”}}>📡 {distance} كم</div>}
</div>
<div style={{…G.ratingBadge,background:realRating?“rgba(240,192,64,.2)”:“rgba(100,100,100,.2)”}}>⭐ {displayRating}</div>
</div>
{salon.shiftEnabled
?<div style={{fontSize:11,color:”#aaa”,marginBottom:2}}>⏰ {salon.shift1Start}–{salon.shift1End} | {salon.shift2Start}–{salon.shift2End}</div>
:<div style={{fontSize:11,color:”#aaa”,marginBottom:2}}>⏰ {salon.workStart}–{salon.workEnd}</div>}
<div style={{fontSize:11,color:”#aaa”,marginBottom:6}}>✂ {salon.barbers?.length||1} حلاق · {slots.length} وقت</div>
<div style={{display:“flex”,flexWrap:“wrap”,gap:4,marginBottom:9}}>
{salon.services.slice(0,3).map(s=><span key={s} style={G.tag}>{s}</span>)}
{salon.services.length>3&&<span style={{…G.tag,color:”#888”}}>+{salon.services.length-3}</span>}
</div>
<div style={{display:“flex”,gap:6,alignItems:“center”}}>
<button style={{…G.mapsBtn,fontSize:16}} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title=“الموقع”>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
</button>
<button style={{...G.heartCardBtn,...(fav?G.heartCardOn:{})}} onClick={onFav}>{fav?“♥”:“♡”}</button>
{onCompare&&<button style={{…G.mapsBtn,background:inCompare?“var(–pa25)”:“transparent”,border:`1px solid ${inCompare?"var(--p)":"#444"}`,color:inCompare?“var(–p)”:”#888”,fontSize:11}} onClick={onCompare}>⚖</button>}
<button style={G.bookBtn} onClick={onBook}>احجز الآن</button>
</div>
</div>
);
}

// ══════════════════════════════════════════════
//  SALON PAGE
// ══════════════════════════════════════════════
function SalonPage({salon,favSet,toggleFav,setView,addBooking,updateBookingStatus,adminSession,ownerSession,deleteSalon,customers}){
const[tab,setTab]=useState(“book”);
const fav=favSet.has(salon.id);
const pending=salon.bookings.filter(b=>b.status===“pending”).length;
const canManage=adminSession||(ownerSession===salon.id);

// جمع تقييمات هذا الصالون من كل العملاء
const reviews=(customers||[]).flatMap(c=>
(c.history||[]).filter(h=>Number(h.salonId)===Number(salon.id)&&h.rating>0)
.map(h=>({name:c.name,rating:h.rating,comment:h.comment||””,date:h.date}))
);
const avgRating=reviews.length?Math.round(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length*10)/10:salon.rating||0;

return(
<div style={G.page}>
<div style={G.fp}>
<div style={G.fh}>
<button style={G.bb} onClick={()=>setView(“home”)}>→</button>
<h2 style={{...G.ft,flex:1}}>{salon.name}</h2>
<button style={{…G.favBtn,…(fav?G.favOn:{}),fontSize:20}} onClick={()=>toggleFav(salon.id)}>{fav?“♥”:“♡”}</button>
<ShareBtn salon={salon}/>
{adminSession&&<button style={{…G.delBtn,marginRight:0}} onClick={()=>{deleteSalon(salon.id);setView(“home”);}}>🗑</button>}
</div>
<div style={G.salonBadge}>
<span style={{fontSize:20,color:“var(–p)”}}>✂</span>
<div style={{flex:1}}>
<div style={{fontSize:14,fontWeight:700,color:”#fff”}}>{salon.name}</div>
<div style={{fontSize:11,color:”#888”}}>{salon.gov||salon.region}{salon.village?` › ${salon.village}`:””}</div>
<div style={{fontSize:11,color:”#888”}}>👤 {salon.owner} · 📞 {salon.phone}</div>
{reviews.length>0&&<div style={{fontSize:12,color:”#f0c040”,marginTop:2}}>⭐ {avgRating} ({reviews.length} تقييم)</div>}
</div>
<button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)} title=“الموقع”>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
</button>
</div>
<div style={G.tabRow}>
<button style={{…G.tabBtn,…(tab===“book”?G.tabOn:{})}} onClick={()=>setTab(“book”)}>📅 حجز</button>
<button style={{…G.tabBtn,…(tab===“reviews”?G.tabOn:{})}} onClick={()=>setTab(“reviews”)}>⭐ تقييمات {reviews.length>0&&<span style={G.notifDot}>{reviews.length}</span>}</button>
{canManage&&<button style={{…G.tabBtn,…(tab===“notif”?G.tabOn:{})}} onClick={()=>setTab(“notif”)}>🔔{pending>0&&<span style={G.notifDot}>{pending}</span>}</button>}
{canManage&&<button style={{…G.tabBtn,…(tab===“stats”?G.tabOn:{})}} onClick={()=>setTab(“stats”)}>📊</button>}
</div>
{tab===“book”&&<BookView salon={salon} addBooking={addBooking} onBack={null} inline setView={setView}/>}
{tab===“reviews”&&(
<div>
{reviews.length===0
?<div style={G.empty}>لا توجد تقييمات بعد — كن أول من يقيّم!</div>
:<div style={{display:“flex”,flexDirection:“column”,gap:10}}>
{/* متوسط التقييم */}
<div style={{background:”#13131f”,borderRadius:13,padding:16,border:“1px solid #2a2a3a”,textAlign:“center”,marginBottom:4}}>
<div style={{fontSize:40,fontWeight:900,color:”#f0c040”}}>{avgRating}</div>
<div style={{display:“flex”,justifyContent:“center”,gap:3,margin:“6px 0”}}>
{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:20,color:n<=Math.round(avgRating)?”#f0c040”:”#333”}}>★</span>)}
</div>
<div style={{fontSize:12,color:”#888”}}>{reviews.length} تقييم</div>
</div>
{/* قائمة التقييمات */}
{reviews.map((r,i)=>(
<div key={i} style={{…G.bItem,borderRight:“3px solid #f0c040”}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:4}}>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>👤 {r.name}</div>
<div style={{display:“flex”,gap:1}}>
{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?”#f0c040”:”#333”}}>★</span>)}
</div>
</div>
{r.comment&&<div style={{fontSize:12,color:”#aaa”,fontStyle:“italic”}}>”{r.comment}”</div>}
{r.date&&<div style={{fontSize:10,color:”#555”,marginTop:3}}>📅 {r.date}</div>}
</div>
))}
</div>
}
</div>
)}
{tab===“notif”&&canManage&&<NotifPanel salon={salon} onUpdate={updateBookingStatus}/>}
{tab===“stats”&&canManage&&<StatsPanel salon={salon}/>}
</div>
</div>
);
}

// ══════════════════════════════════════════════
//  BOOK VIEW
// ══════════════════════════════════════════════
function BookView({salon,addBooking,onBack,inline,setView,customer}){
const[step,setStep]=useState(1);
const[form,setForm]=useState({
name: customer?.name||””,
phone: customer?.phone||””,
services:[], barberId:””, date:todayStr(), time:””
});
const[errors,setErrors]=useState({});
const allSlots=getSlotsForSalon(salon);
const bc=salon.barbers?.length||1;
// Hide past slots for today
const slots=form.date===todayStr()
? allSlots.filter(sl=>{
const[h,m]=sl.split(”:”).map(Number);
const now=new Date();
return h*60+m > now.getHours()*60+now.getMinutes();
})
: allSlots;
const slotUsed=sl=>salon.bookings.filter(b=>b.date===form.date&&b.time===sl&&b.status!==“rejected”&&(!form.barberId||b.barberId===form.barberId)).length;
const slotFull=sl=>slotUsed(sl)>=(form.barberId?1:bc);
const total=calcTotal(form.services,salon.prices);
const barber=salon.barbers?.find(b=>b.id===form.barberId);
const toggle=s=>setForm(p=>({…p,services:p.services.includes(s)?p.services.filter(x=>x!==s):[…p.services,s]}));
const v1=()=>{const e={};if(!form.name.trim())e.name=“مطلوب”;if(!form.phone.trim())e.phone=“مطلوب”;if(!form.services.length)e.services=“اختر خدمة”;if(salon.barbers?.length&&!form.barberId)e.barberId=“اختر الحلاق”;setErrors(e);return!Object.keys(e).length;};
const v2=()=>{const e={};if(!form.date)e.date=“مطلوب”;if(!form.time)e.time=“اختر وقتاً”;setErrors(e);return!Object.keys(e).length;};
const inner=(
<>
{!inline&&<div style={G.salonBadge}><span style={{fontSize:20,color:“var(–p)”}}>✂</span><div style={{flex:1}}><div style={{fontWeight:700,color:”#fff”}}>{salon.name}</div><div style={{fontSize:11,color:”#888”}}>{salon.gov||salon.region}</div></div><button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg></button></div>}
<div style={G.steps}>{[“بياناتك”,“الموعد”,“تأكيد”].map((l,i)=><div key={i} style={{...G.si,...(step>=i+1?{opacity:1}:{})}}><div style={G.sd}>{i+1}</div><span style={{fontSize:10,color:“var(–p)”}}>{l}</span></div>)}</div>
{step===1&&<div style={G.fc}>
<F label="اسمك الكريم" error={errors.name}><input style={fi(errors.name)} placeholder=“الاسم الكامل” value={form.name} onChange={e=>setForm(p=>({…p,name:e.target.value}))}/></F>
<F label="رقم الجوال" error={errors.phone}><input style={fi(errors.phone)} placeholder=“05XXXXXXXX” value={form.phone} onChange={e=>setForm(p=>({…p,phone:e.target.value}))}/></F>
<F label="الخدمات" error={errors.services}><div style={{display:“flex”,flexWrap:“wrap”,gap:6}}>{salon.services.map(s=><div key={s} style={{…G.chip,…(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggle(s)}>{s}{salon.prices?.[s]?` (${salon.prices[s]}ر)`:””}</div>)}</div></F>
{form.services.length>0&&<div style={G.totalBox}>الإجمالي: <strong style={{color:“var(–p)”}}>{total} ريال</strong></div>}
{salon.barbers?.length>0&&<F label="اختر الحلاق" error={errors.barberId}>
<div style={{display:“flex”,flexWrap:“wrap”,gap:8}}>
{salon.barbers.map(b=>{
const active=form.barberId===b.id;
// تحقق من وقت الدوام
const now=new Date();
const currentMins=now.getHours()*60+now.getMinutes();
const [sh,sm]=(b.shiftStart||“00:00”).split(”:”).map(Number);
const [eh,em]=(b.shiftEnd||“23:59”).split(”:”).map(Number);
const inShift=currentMins>=sh*60+sm&&currentMins<=eh*60+em;
return(
<div key={b.id}
style={{display:“flex”,flexDirection:“column”,alignItems:“center”,gap:4,padding:“8px 10px”,borderRadius:10,border:`1.5px solid ${active?"var(--p)":inShift?"#2a2a3a":"#1a1a1a"}`,background:active?“var(–pa12)”:inShift?”#1a1a2e”:”#0d0d0d”,cursor:inShift?“pointer”:“not-allowed”,opacity:inShift?1:.5,minWidth:60}}
onClick={()=>inShift&&setForm(p=>({…p,barberId:b.id,time:””}))}>
{b.photo
?<img src={b.photo} alt={b.name} style={{width:36,height:36,borderRadius:“50%”,objectFit:“cover”,border:`2px solid ${active?"var(--p)":"#2a2a3a"}`}}/>
:<div style={{width:36,height:36,borderRadius:“50%”,background:”#1a1a2e”,border:`2px solid ${active?"var(--p)":"#2a2a3a"}`,display:“flex”,alignItems:“center”,justifyContent:“center”,fontSize:16}}>💈</div>
}
<span style={{fontSize:11,color:active?“var(–p)”:”#aaa”,fontWeight:active?700:400,textAlign:“center”}}>{b.name}</span>
<span style={{fontSize:9,color:inShift?”#27ae60”:”#e74c3c”}}>{inShift?“متاح”:“غير متاح”}</span>
</div>
);
})}
</div>
</F>}
<button style={G.sub} onClick={()=>{if(v1())setStep(2);}}>التالي →</button>
</div>}
{step===2&&<div style={G.fc}>
<F label="التاريخ" error={errors.date}>
<input type=“date” style={fi(errors.date)} value={form.date} min={todayStr()}
onChange={e=>{
const d=new Date(e.target.value);
const dayOfWeek=d.getDay();
if(salon.closedDays?.includes(dayOfWeek)){
const DAYS=[“الأحد”,“الإثنين”,“الثلاثاء”,“الأربعاء”,“الخميس”,“الجمعة”,“السبت”];
alert(`⚠️ الصالون مغلق يوم ${DAYS[dayOfWeek]}`);
return;
}
setForm(p=>({…p,date:e.target.value,time:””}));
}}/>
{salon.closedDays?.length>0&&(
<div style={{fontSize:10,color:”#888”,marginTop:3}}>
🚫 مغلق أيام: {[“الأحد”,“الإثنين”,“الثلاثاء”,“الأربعاء”,“الخميس”,“الجمعة”,“السبت”].filter((_,i)=>salon.closedDays.includes(i)).join(” · “)}
</div>
)}
</F>
{salon.shiftEnabled&&<div style={{fontSize:11,color:“var(–p)”,background:“var(–pa07)”,borderRadius:8,padding:“6px 10px”,marginBottom:8}}>⏰ {salon.shift1Start}–{salon.shift1End} | {salon.shift2Start}–{salon.shift2End}</div>}
<div style={{fontSize:12,color:”#aaa”,marginBottom:7}}>اختر الوقت{form.barberId?` · ${barber?.name||""}`:””}</div>
{errors.time&&<div style={G.err}>{errors.time}</div>}
<div style={G.timeGrid}>{slots.map(sl=>{const used=slotUsed(sl);const full=slotFull(sl);const sel=form.time===sl;return(<button key={sl} disabled={full} onClick={()=>!full&&setForm(p=>({…p,time:sl}))} style={{…G.ts,…(full?G.tsF:{}),…(sel?G.tsS:{})}}><div>{sl}</div><div style={{fontSize:9,marginTop:1,color:full?”#555”:sel?“var(–p)”:”#666”}}>{full?“محجوز”:`${bc-used} متاح`}</div></button>);})}</div>
<button style={G.sub} onClick={()=>{if(v2())setStep(3);}}>التالي →</button>
</div>}
{step===3&&<div style={G.fc}>
<div style={{textAlign:“center”,marginBottom:12}}><div style={{fontSize:36}}>✅</div><h3 style={{color:”#fff”,marginTop:4,fontSize:16}}>تأكيد الحجز</h3></div>
{[[“الاسم”,form.name],[“الجوال”,form.phone],[“الخدمات”,form.services.join(” + “)],[“الحلاق”,barber?.name||“أي حلاق”],[“التاريخ”,form.date],[“الوقت”,form.time],[“الإجمالي”,`${total} ريال`]].map(([l,v])=><div key={l} style={{display:“flex”,justifyContent:“space-between”,padding:“6px 0”,borderBottom:“1px solid #2a2a3a”}}><span style={{color:”#888”,fontSize:12}}>{l}</span><span style={{color:”#f0f0f0”,fontWeight:600,fontSize:12}}>{v}</span></div>)}
<button style={{…G.mapsBtn,width:“100%”,marginTop:10,justifyContent:“center”,display:“flex”,padding:10}} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>📍 افتح على الخريطة</button>
<button style={{…G.sub,marginTop:8,background:“linear-gradient(135deg,#27ae60,#2ecc71)”,color:”#fff”}} onClick={()=>addBooking(salon.id,{…form,barberId:form.barberId||“any”,barberName:barber?.name||””,total})}>إرسال طلب الحجز 🎉</button>
</div>}
</>
);
if(inline)return <div>{inner}</div>;
return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>onBack?onBack():setView(“home”)}>→</button><h2 style={G.ft}>حجز موعد</h2></div>{inner}</div></div>;
}

// ══════════════════════════════════════════════
//  STATS + NOTIF
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  TERMS VIEW
// ══════════════════════════════════════════════
function TermsView({onAccept}){
const[checked,setChecked]=useState(false);
return(
<div style={{minHeight:“100vh”,background:”#0d0d1a”,display:“flex”,flexDirection:“column”,alignItems:“center”,justifyContent:“center”,padding:“20px”,fontFamily:”‘Cairo’,sans-serif”,direction:“rtl”}}>
<div style={{maxWidth:480,width:“100%”}}>
<div style={{textAlign:“center”,marginBottom:24}}>
<div style={{fontSize:50,marginBottom:8}}>✂</div>
<div style={{fontSize:28,fontWeight:900,color:“var(–p,#d4a017)”,letterSpacing:2}}>دورك</div>
<div style={{fontSize:13,color:”#888”,marginTop:4}}>الشروط والأحكام</div>
</div>
<div style={{background:”#13131f”,borderRadius:16,padding:20,border:“1px solid #2a2a3a”,marginBottom:16,maxHeight:300,overflowY:“auto”}}>
{[
{t:“١. التزام العميل”,c:“يلتزم العميل بالحضور في الوقت المحدد للحجز. في حال التأخر أو الغياب بدون إشعار مسبق، يحق للصالون إلغاء الحجز.”},
{t:“٢. التزام الصالون”,c:“يلتزم الصالون بتقديم الخدمة في الوقت المحجوز، ومتابعة طلبات العملاء والرد عليها في أقرب وقت ممكن.”},
{t:“٣. سياسة الإلغاء”,c:“يمكن إلغاء الحجز قبل الموعد بساعة على الأقل. الإلغاء المتكرر قد يؤثر على أولوية الحجز.”},
{t:“٤. خصوصية البيانات”,c:“تُحفظ بيانات المستخدمين بسرية تامة ولا تُشارك مع أطراف ثالثة إلا بموافقة صريحة.”},
{t:“٥. التزامات الإدارة”,c:“تحتفظ إدارة دورك بحق تعليق أو إلغاء أي حساب يخالف شروط الاستخدام.”},
{t:“٦. جودة الخدمة”,c:“الإدارة غير مسؤولة عن جودة الخدمة المقدمة من الصالون، وأي نزاع يُحل مباشرة بين العميل والصالون.”},
{t:“٧. التعديلات”,c:“تحتفظ إدارة دورك بحق تعديل هذه الشروط في أي وقت مع إشعار المستخدمين.”},
].map(({t,c})=>(
<div key={t} style={{marginBottom:14}}>
<div style={{fontSize:13,fontWeight:700,color:“var(–p,#d4a017)”,marginBottom:4}}>{t}</div>
<div style={{fontSize:12,color:”#aaa”,lineHeight:1.7}}>{c}</div>
</div>
))}
</div>
<label style={{display:“flex”,alignItems:“center”,gap:10,marginBottom:16,cursor:“pointer”,padding:“12px 16px”,background:”#13131f”,borderRadius:10,border:`1.5px solid ${checked?"var(--p,#d4a017)":"#2a2a3a"}`}}>
<input type=“checkbox” checked={checked} onChange={e=>setChecked(e.target.checked)} style={{width:18,height:18,cursor:“pointer”}}/>
<span style={{fontSize:13,color:”#fff”,fontWeight:600}}>أوافق على الشروط والأحكام</span>
</label>
<button style={{width:“100%”,padding:14,borderRadius:12,border:“none”,background:checked?“linear-gradient(135deg,var(–p,#d4a017),var(–pl,#f0c040))”:”#2a2a3a”,color:checked?”#000”:”#555”,fontSize:15,fontWeight:900,cursor:checked?“pointer”:“not-allowed”,fontFamily:“inherit”}}
disabled={!checked} onClick={onAccept}>
دخول التطبيق ✂
</button>
</div>
</div>
);
}

function StatsPanel({salon}){
const[mode,setMode]=useState(“month”); // month | year
const[m,setM]=useState(new Date().getMonth());
const[y,setY]=useState(new Date().getFullYear());

const bks=salon.bookings.filter(b=>{
if(!b.date)return false;
const d=new Date(b.date);
if(mode===“year”)return d.getFullYear()===y;
return d.getMonth()===m&&d.getFullYear()===y;
});

// بيانات الرسم البياني
const chartData=mode===“year”
?MONTHS_AR.map((mn,i)=>{
const cnt=salon.bookings.filter(b=>{const d=new Date(b.date);return d.getMonth()===i&&d.getFullYear()===y;}).length;
return{label:mn.slice(0,3),count:cnt};
})
:Array.from({length:new Date(y,m+1,0).getDate()},(*, i)=>{
const day=String(i+1).padStart(2,“0”);
const dateStr=`${y}-${String(m+1).padStart(2,"0")}-${day}`;
const cnt=salon.bookings.filter(b=>b.date===dateStr).length;
return{label:String(i+1),count:cnt};
}).filter((*, i)=>i%3===0); // كل 3 أيام عشان ما يزدحم
const maxCount=Math.max(…chartData.map(d=>d.count),1);

return(
<div style={{paddingTop:4}}>
{/* تبديل شهري/سنوي */}
<div style={{display:“flex”,gap:8,marginBottom:12}}>
<button style={{flex:1,padding:“8px 0”,borderRadius:9,border:`1.5px solid ${mode==="month"?"var(--p)":"#2a2a3a"}`,background:mode===“month”?“var(–pa12)”:”#1a1a2e”,color:mode===“month”?“var(–p)”:”#888”,cursor:“pointer”,fontSize:12,fontFamily:“inherit”,fontWeight:700}} onClick={()=>setMode(“month”)}>📅 شهري</button>
<button style={{flex:1,padding:“8px 0”,borderRadius:9,border:`1.5px solid ${mode==="year"?"var(--p)":"#2a2a3a"}`,background:mode===“year”?“var(–pa12)”:”#1a1a2e”,color:mode===“year”?“var(–p)”:”#888”,cursor:“pointer”,fontSize:12,fontFamily:“inherit”,fontWeight:700}} onClick={()=>setMode(“year”)}>📆 سنوي</button>
</div>

```
  {/* فلاتر */}
  <div style={{display:"flex",gap:7,marginBottom:12}}>
    {mode==="month"&&<select style={{...fi(),...{flex:1}}} value={m} onChange={e=>setM(+e.target.value)}>{MONTHS_AR.map((mn,i)=><option key={i} value={i}>{mn}</option>)}</select>}
    <select style={{...fi(),...{width:mode==="year"?"100%":88}}} value={y} onChange={e=>setY(+e.target.value)}>{[2024,2025,2026,2027].map(yr=><option key={yr}>{yr}</option>)}</select>
  </div>

  {/* إحصائيات */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
    {[["الحجوزات",bks.length,"var(--p)"],["مقبول",bks.filter(b=>b.status==="approved").length,"#27ae60"],["انتظار",bks.filter(b=>b.status==="pending").length,"var(--pl)"],["مرفوض",bks.filter(b=>b.status==="rejected").length,"#e74c3c"]].map(([l,n,c])=>(
      <div key={l} style={{background:"#13131f",borderRadius:11,padding:"12px 8px",textAlign:"center",border:`1px solid ${c}33`}}><div style={{fontSize:22,fontWeight:900,color:c}}>{n}</div><div style={{fontSize:11,color:"#888"}}>{l}</div></div>
    ))}
  </div>

  {/* الإيرادات */}
  <div style={{background:"var(--pa08)",borderRadius:11,padding:"12px 14px",border:"1px solid var(--pa25)",textAlign:"center",marginBottom:12}}>
    <div style={{fontSize:11,color:"#888",marginBottom:3}}>الإيرادات — {mode==="year"?y:`${MONTHS_AR[m]} ${y}`}</div>
    <div style={{fontSize:26,fontWeight:900,color:"var(--p)"}}>{bks.filter(b=>b.status==="approved").reduce((a,b)=>a+(b.total||0),0)} <span style={{fontSize:13}}>ريال</span></div>
  </div>

  {/* أكثر خدمة مطلوبة */}
  {(()=>{
    const svcCount={};
    bks.forEach(b=>(b.services||[]).forEach(s=>{svcCount[s]=(svcCount[s]||0)+1;}));
    const top=Object.entries(svcCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return top.length>0?(
      <div style={{background:"#13131f",borderRadius:11,padding:"12px 14px",border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--p)",marginBottom:8}}>🏆 أكثر الخدمات طلباً</div>
        {top.map(([svc,cnt],i)=>(
          <div key={svc} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <span style={{fontSize:12,color:"#fff"}}>{["🥇","🥈","🥉"][i]} {svc}</span>
            <span style={{fontSize:12,color:"var(--p)",fontWeight:700}}>{cnt} مرة</span>
          </div>
        ))}
      </div>
    ):null;
  })()}

  {/* رسم بياني */}
  <div style={{background:"#13131f",borderRadius:11,padding:"12px 8px",border:"1px solid #2a2a3a",marginBottom:4}}>
    <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:10}}>📊 {mode==="year"?"الحجوزات الشهرية":"الحجوزات اليومية"}</div>
    <div style={{display:"flex",alignItems:"flex-end",gap:mode==="year"?4:2,height:60}}>
      {chartData.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{width:"100%",background:`linear-gradient(180deg,var(--p),var(--pd))`,borderRadius:"3px 3px 0 0",height:`${Math.max((d.count/maxCount)*48,d.count?3:0)}px`,minHeight:d.count?3:0}}/>
          <div style={{fontSize:8,color:"#555",textAlign:"center"}}>{d.label}</div>
        </div>
      ))}
    </div>
  </div>
</div>
```

);
}
function NotifPanel({salon,onUpdate}){
const[showWaiting,setShowWaiting]=useState(false);
const KEY=`dork_waiting_${salon.id}`;
const[waitingList,setWaitingList]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||”[]”);}catch{return[];}});

const addToWaiting=(name,phone)=>{
const item={id:Date.now(),name,phone,addedAt:new Date().toLocaleTimeString(“ar”,{hour:“2-digit”,minute:“2-digit”})};
const newList=[…waitingList,item];
setWaitingList(newList);
try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
};

const removeFromWaiting=(id)=>{
const newList=waitingList.filter(w=>w.id!==id);
setWaitingList(newList);
try{localStorage.setItem(KEY,JSON.stringify(newList));}catch{}
};

const bks=[…salon.bookings].reverse();

return(
<div style={{paddingTop:4}}>
{/* قائمة الانتظار */}
<button style={{…G.sub,marginBottom:10,background:showWaiting?“var(–pa25)”:“transparent”,border:“1.5px solid var(–pa25)”,color:“var(–p)”}} onClick={()=>setShowWaiting(w=>!w)}>
⏳ قائمة الانتظار {waitingList.length>0&&`(${waitingList.length})`}
</button>
{showWaiting&&(
<div style={{background:”#13131f”,borderRadius:12,padding:12,border:“1px solid var(–pa25)”,marginBottom:12}}>
<div style={{fontSize:12,color:“var(–p)”,fontWeight:700,marginBottom:8}}>⏳ العملاء في قائمة الانتظار</div>
{waitingList.length===0&&<div style={{fontSize:12,color:”#888”,marginBottom:8}}>لا يوجد أحد في قائمة الانتظار</div>}
{waitingList.map(w=>(
<div key={w.id} style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,padding:“6px 0”,borderBottom:“1px solid #2a2a3a”}}>
<div>
<div style={{fontSize:12,color:”#fff”,fontWeight:600}}>{w.name}</div>
<div style={{fontSize:11,color:”#888”}}>{w.phone} · {w.addedAt}</div>
</div>
<button style={G.xBtn} onClick={()=>removeFromWaiting(w.id)}>✕</button>
</div>
))}
<div style={{display:“flex”,gap:6,marginTop:8}}>
<input id=“wname” style={{flex:1,padding:“8px 10px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#fff”,fontSize:12,fontFamily:“inherit”,outline:“none”,direction:“rtl”}} placeholder=“الاسم”/>
<input id=“wphone” style={{flex:1,padding:“8px 10px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#fff”,fontSize:12,fontFamily:“inherit”,outline:“none”,direction:“ltr”}} placeholder=“الجوال”/>
<button style={{…G.sub,width:“auto”,padding:“0 10px”,marginTop:0,fontSize:12}} onClick={()=>{
const n=document.getElementById(“wname”)?.value;
const p=document.getElementById(“wphone”)?.value;
if(n&&p){addToWaiting(n,p);document.getElementById(“wname”).value=””;document.getElementById(“wphone”).value=””;}
}}>+</button>
</div>
</div>
)}

```
  {/* الحجوزات */}
  {!bks.length?<div style={G.empty}>لا توجد حجوزات</div>:
  <div style={{display:"flex",flexDirection:"column",gap:8}}>{bks.map(b=>(
    <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>👤 {b.name}</div><div style={{fontSize:11,color:"#aaa"}}>📞 {b.phone}</div><div style={{fontSize:11,color:"#aaa"}}>✂ {Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` · ${b.barberName}`:""}</div><div style={{fontSize:11,color:"var(--p)"}}>📅 {b.date} {b.time} · {b.total||0} ر</div></div>
        <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="approved"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="approved"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="approved"?"✅ مقبول":b.status==="rejected"?"❌ مرفوض":"⏳ انتظار"}</span>
      </div>
      {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"approved")}>✅ قبول</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>❌ رفض</button></div>}
    </div>
  ))}</div>}
</div>
```

);
}

// ══════════════════════════════════════════════
//  REGISTER  (salon + custom services)
// ══════════════════════════════════════════════
function RegisterView({allLoc,addSalon,setView,addExtraLoc}){
const[form,setForm]=useState({name:””,owner:””,ownerPhone:””,region:””,gov:””,center:””,village:””,phone:””,address:””,locationUrl:””,services:[],prices:{},shiftEnabled:false,shift1Start:“08:00”,shift1End:“13:00”,shift2Start:“16:00”,shift2End:“23:00”,workStart:“09:00”,workEnd:“22:00”,barbers:[{id:“b”+Date.now(),name:””}],tone:“bell”});
const[errors,setErrors]=useState({});
const[locMethod,setLocMethod]=useState(“link”);
const[detecting,setDetecting]=useState(false);
const[newSvc,setNewSvc]=useState(””);
// extra-loc add state
const[newR,setNewR]=useState(””); const[newG,setNewG]=useState(””); const[newC,setNewC]=useState(””); const[newV,setNewV]=useState(””);
const[showAddLoc,setShowAddLoc]=useState(false);

const govList=form.region?(allLoc.find(r=>r.region===form.region)?.govs||[]):[];
const centerList=form.gov?(govList.find?.(g=>(g.name||g)===form.gov)?.centers||[]):[];

const applyNewLoc=()=>{
const r=newR.trim()||form.region; const g=newG.trim()||form.gov; const v=newV.trim();
if(!r||!g){alert(“أدخل المنطقة والمحافظة على الأقل”);return;}
addExtraLoc(r,g,””,v);
setForm(p=>({…p,region:r,gov:g,village:v||p.village}));
setNewR(””);setNewG(””);setNewC(””);setNewV(””);setShowAddLoc(false);
};

const detect=async()=>{
if(!navigator.geolocation){
alert(“⚠️ المتصفح لا يدعم تحديد الموقع\nاستخدم "رابط الخريطة" بدلاً من ذلك”);
return;
}
setDetecting(true);
// Check permission state first
try {
if(navigator.permissions){
const perm=await navigator.permissions.query({name:“geolocation”});
if(perm.state===“denied”){
alert(“🚫 إذن الموقع مرفوض\n\nلتفعيله:\n• اضغط على رمز القفل/الموقع بجوار الرابط\n• اختر "السماح" للموقع\n• أعد المحاولة\n\nأو استخدم "رابط الخريطة" يدوياً”);
setDetecting(false);
return;
}
}
} catch(e){}

```
navigator.geolocation.getCurrentPosition(
  p=>{
    const lat=p.coords.latitude.toFixed(6), lng=p.coords.longitude.toFixed(6);
    setForm(f=>({...f,locationUrl:`https://maps.google.com/?q=${lat},${lng}`}));
    setDetecting(false);
  },
  err=>{
    setDetecting(false);
    let msg="";
    if(err.code===1){msg="🚫 رفضت إذن الموقع\n\nمن إعدادات المتصفح:\n• اسمح للموقع\n• أعد تحميل الصفحة\n• حاول مرة أخرى";}
    else if(err.code===2){msg="📡 خدمة الموقع غير متوفرة\nتحقق من تشغيل GPS / WiFi وحاول مجدداً";}
    else if(err.code===3){msg="⏱ انتهت مهلة التحديد\nحاول مرة أخرى أو استخدم رابط الخريطة";}
    else msg="⚠️ تعذّر التحديد ("+err.message+")";
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
```

};

const toggleSvc=s=>setForm(p=>{
const has=p.services.includes(s);
const services=has?p.services.filter(x=>x!==s):[…p.services,s];
const prices={…p.prices};
if(!has)prices[s]=prices[s]||50; else delete prices[s];
return{…p,services,prices};
});

const addCustomSvc=()=>{
if(!newSvc.trim())return;
setForm(p=>({…p,services:[…p.services,newSvc.trim()],prices:{…p.prices,[newSvc.trim()]:50}}));
setNewSvc(””);
};

const adjustPrice=(s,delta)=>setForm(p=>({…p,prices:{…p.prices,[s]:Math.max(0,(p.prices[s]||0)+delta)}}));
const setPrice=(s,v)=>setForm(p=>({…p,prices:{…p.prices,[s]:Math.max(0,+v||0)}}));

const addBarber=()=>setForm(p=>({…p,barbers:[…p.barbers,{id:“b”+Date.now(),name:””,photo:””}]}));
const rmBarber=id=>setForm(p=>({…p,barbers:p.barbers.filter(b=>b.id!==id)}));
const upBarber=(id,name)=>setForm(p=>({…p,barbers:p.barbers.map(b=>b.id===id?{…b,name}:b)}));
const upBarberPhoto=(id,photo)=>setForm(p=>({…p,barbers:p.barbers.map(b=>b.id===id?{…b,photo}:b)}));
const pickPhoto=(id)=>{
const inp=document.createElement(“input”);
inp.type=“file”; inp.accept=“image/*”;
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
if(!form.name.trim())e.name=“مطلوب”; if(!form.owner.trim())e.owner=“مطلوب”;
if(!form.ownerPhone.trim())e.ownerPhone=“مطلوب”;
if(!form.region)e.region=“مطلوب”; if(!form.gov)e.gov=“مطلوب”;
if(!form.phone.trim())e.phone=“مطلوب”; if(!form.address.trim())e.address=“مطلوب”;
if(!form.locationUrl.trim())e.locationUrl=“الموقع مطلوب”;
if(!form.services.length)e.services=“اختر خدمة”;
if(form.barbers.some(b=>!b.name.trim()))e.barbers=“أدخل أسماء الحلاقين”;
setErrors(e); return!Object.keys(e).length;
};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>تسجيل صالون جديد</h2></div>

```
  {/* pending notice */}
  <div style={{background:"var(--pa08)",border:"1px solid var(--pa3)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
    ⚠️ سيتم مراجعة طلبك من الإدارة قبل النشر
  </div>

  <div style={G.fc}>
    <SL>معلومات الصالون</SL>
    <F label="اسم الصالون" error={errors.name}><input style={fi(errors.name)} placeholder="صالون النخبة" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
    <F label="اسم المالك" error={errors.owner}><input style={fi(errors.owner)} placeholder="الاسم الكامل" value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))}/></F>
    <F label="جوال المالك (للدخول لاحقاً)" error={errors.ownerPhone}><input style={fi(errors.ownerPhone)} placeholder="05XXXXXXXX" value={form.ownerPhone} onChange={e=>setForm(p=>({...p,ownerPhone:e.target.value}))}/></F>
    <F label="جوال الصالون" error={errors.phone}><input style={fi(errors.phone)} placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
    <F label="العنوان" error={errors.address}><input style={fi(errors.address)} placeholder="الشارع والحي" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/></F>
  </div>

  <div style={G.fc}>
    <SL>التسلسل الإداري</SL>
    <F label="المنطقة" error={errors.region}>
      <select style={fi(errors.region)} value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value,gov:"",center:"",village:""}))}>
        <option value="">اختر المنطقة</option>{allLoc.map(r=><option key={r.region} value={r.region}>{r.region}</option>)}
      </select>
    </F>
    {form.region&&<F label="المحافظة / المدينة" error={errors.gov}>
      <select style={fi(errors.gov)} value={form.gov} onChange={e=>setForm(p=>({...p,gov:e.target.value,center:"",village:""}))}>
        <option value="">اختر المحافظة</option>{govList.map(g=><option key={g.name||g} value={g.name||g}>{g.name||g}</option>)}
      </select>
    </F>}
    {form.gov&&<F label="المركز الإداري">
      <select style={fi()} value={form.center} onChange={e=>setForm(p=>({...p,center:e.target.value,village:""}))}>
        <option value="">اختر المركز (اختياري)</option>
        {centerList.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
    </F>}
    {form.center&&<F label="الحي / القرية">
      <input style={fi()} placeholder="مثال: حي النزهة، قرية الرشيدية..." value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
    </F>}
    {form.center&&<button style={G.otherBtn} onClick={()=>setShowAddLoc(s=>!s)}>
      {showAddLoc?"✕ إغلاق":"+ حيك / قريتك مو موجودة؟ أضفها هنا"}
    </button>}
    {showAddLoc&&form.center&&<div style={{background:"rgba(42,109,217,.06)",border:"1px solid #2a6dd9",borderRadius:10,padding:12,marginTop:4}}>
      <div style={{fontSize:12,color:"#6aadff",marginBottom:8,fontWeight:700}}>➕ إضافة حي / قرية جديدة</div>
      <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>
        ستُضاف تحت <b style={{color:"var(--p)"}}>{form.center}</b> وتظهر للجميع
      </div>
      <div style={{display:"flex",gap:7}}>
        <input style={{...fi(),flex:1}} placeholder="مثال: حي النزهة، الروضة، العزيزية..." value={newC} onChange={e=>setNewC(e.target.value)}/>
        <button style={{background:"var(--grad)",color:"#000",border:"none",borderRadius:9,padding:"0 14px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",flexShrink:0}} onClick={async()=>{
          const val=newC.trim();
          if(!val){alert("أدخل اسم الحي أو القرية");return;}
          // منع إضافة اسم منطقة أو محافظة أو مركز موجود
          const allRegions=allLoc.map(r=>r.region);
          const allGovs=allLoc.flatMap(r=>r.govs.map(g=>g.name||g));
          const allCenters=allLoc.flatMap(r=>r.govs.flatMap(g=>g.centers||[]));
          if(allRegions.includes(val)||allGovs.includes(val)||allCenters.includes(val)){
            alert("⚠️ هذا الاسم موجود بالفعل كمنطقة أو محافظة أو مركز!\nأدخل اسم الحي أو القرية فقط.");
            return;
          }
          try{
            await sb("centers","POST",{name:val,governorate_id:null},"");
          }catch(e){}
          addExtraLoc(form.region,form.gov,form.center,val);
          setForm(p=>({...p,village:val}));
          setNewC("");setShowAddLoc(false);
          alert("✅ تم إضافة الحي/القرية بنجاح!");
        }}>✓ إضافة</button>
      </div>
    </div>}
    {!form.center&&form.gov&&<F label="الحي / القرية / التفصيل">
      <input style={fi()} placeholder="مثال: حي النزهة، قرية الرشيدية..." value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
    </F>}
  </div>

  <div style={G.fc}>
    <SL>موقع الخريطة <span style={{color:"#e74c3c"}}>*</span></SL>
    <div style={{display:"flex",gap:7,marginBottom:9}}>
      <button style={{...G.locTab,...(locMethod==="link"?G.locTabOn:{})}} onClick={()=>setLocMethod("link")}>🔗 رابط</button>
      <button style={{...G.locTab,...(locMethod==="detect"?G.locTabOn:{})}} onClick={()=>setLocMethod("detect")}>📡 تلقائي</button>
    </div>
    {locMethod==="link"
      ?<F error={errors.locationUrl}><input style={fi(errors.locationUrl)} placeholder="https://maps.google.com/..." value={form.locationUrl} onChange={e=>setForm(p=>({...p,locationUrl:e.target.value}))}/><div style={{fontSize:10,color:"#555",marginTop:3}}>افتح Google Maps → الموقع → شارك → انسخ</div></F>
      :<div style={{marginBottom:11}}><button style={{...G.detectBtn,opacity:detecting?0.6:1}} disabled={detecting} onClick={detect}>{detecting?"⏳ جاري...":"📡 تحديد موقعي"}</button>{form.locationUrl&&locMethod==="detect"&&<div style={{color:"#4caf50",fontSize:11,marginTop:4,textAlign:"center"}}>✅ تم</div>}{errors.locationUrl&&<div style={G.err}>{errors.locationUrl}</div>}</div>
    }
  </div>

  <div style={G.fc}>
    <SL>ساعات العمل</SL>
    <div style={{display:"flex",gap:7,marginBottom:10}}>
      <button style={{...G.locTab,...(!form.shiftEnabled?G.locTabOn:{})}} onClick={()=>setForm(p=>({...p,shiftEnabled:false}))}>فترة واحدة</button>
      <button style={{...G.locTab,...(form.shiftEnabled?G.locTabOn:{})}}  onClick={()=>setForm(p=>({...p,shiftEnabled:true}))}>فترتان</button>
    </div>
    {!form.shiftEnabled
      ?<div style={{display:"flex",gap:10}}><F label="من" style={{flex:1}}><input type="time" style={fi()} value={form.workStart} onChange={e=>setForm(p=>({...p,workStart:e.target.value}))}/></F><F label="إلى" style={{flex:1}}><input type="time" style={fi()} value={form.workEnd} onChange={e=>setForm(p=>({...p,workEnd:e.target.value}))}/></F></div>
      :<>
        <div style={{fontSize:11,color:"var(--p)",marginBottom:6}}>🌅 الفترة الصباحية</div>
        <div style={{display:"flex",gap:10,marginBottom:10}}><F label="من" style={{flex:1}}><input type="time" style={fi()} value={form.shift1Start} onChange={e=>setForm(p=>({...p,shift1Start:e.target.value}))}/></F><F label="إلى" style={{flex:1}}><input type="time" style={fi()} value={form.shift1End} onChange={e=>setForm(p=>({...p,shift1End:e.target.value}))}/></F></div>
        <div style={{fontSize:11,color:"var(--p)",marginBottom:6}}>🌆 الفترة المسائية</div>
        <div style={{display:"flex",gap:10}}><F label="من" style={{flex:1}}><input type="time" style={fi()} value={form.shift2Start} onChange={e=>setForm(p=>({...p,shift2Start:e.target.value}))}/></F><F label="إلى" style={{flex:1}}><input type="time" style={fi()} value={form.shift2End} onChange={e=>setForm(p=>({...p,shift2End:e.target.value}))}/></F></div>
      </>
    }
  </div>

  <div style={G.fc}>
    <SL>الحلاقون {errors.barbers&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>— {errors.barbers}</span>}</SL>
    <div style={{fontSize:11,color:"#666",marginBottom:8}}>عدد الحلاقين = حجوزات متزامنة في نفس الوقت</div>
    {form.barbers.map((b,i)=>(
      <div key={b.id} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
        <div style={{position:"relative",flexShrink:0}} onClick={()=>pickPhoto(b.id)}>
          <div style={{width:44,height:44,borderRadius:"50%",background:b.photo?"transparent":"#1a1a2e",border:`2px dashed var(--p)`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            {b.photo?<img src={b.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<span style={{fontSize:18,color:"var(--p)"}}>📷</span>}
          </div>
          <div style={{position:"absolute",bottom:-2,right:-2,background:"var(--p)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",cursor:"pointer"}}>+</div>
        </div>
        <input style={{...fi(),...{flex:1}}} placeholder={`اسم الحلاق ${i+1}`} value={b.name} onChange={e=>upBarber(b.id,e.target.value)}/>
        {form.barbers.length>1&&<button style={G.xBtn} onClick={()=>rmBarber(b.id)}>✕</button>}
      </div>
    ))}
    <button style={G.addBarberBtn} onClick={addBarber}>+ إضافة حلاق</button>
  </div>

  <div style={G.fc}>
    <SL>الخدمات والأسعار {errors.services&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>— {errors.services}</span>}</SL>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
      {DEFAULT_SERVICES.map(s=><div key={s} style={{...G.chip,...(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggleSvc(s)}>{s}</div>)}
    </div>
    {/* add custom service */}
    <div style={{display:"flex",gap:6,marginBottom:10}}>
      <input style={{...fi(),...{flex:1}}} placeholder="خدمة جديدة..." value={newSvc} onChange={e=>setNewSvc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomSvc()}/>
      <button style={{...G.sub,...{width:60,padding:0,fontSize:13}}} onClick={addCustomSvc}>+ أضف</button>
    </div>
    {form.services.map(s=>(
      <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,background:"#1a1a2e",padding:"8px 11px",borderRadius:9}}>
        <span style={{fontSize:12,color:"#f0f0f0"}}>{s}</span>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <button style={G.pmBtn} onClick={()=>adjustPrice(s,-5)}>−</button>
          <input type="number" style={{width:52,background:"#0d0d1a",border:"1px solid #2a2a3a",borderRadius:6,color:"#fff",textAlign:"center",fontSize:13,padding:"3px 0",fontFamily:"inherit",outline:"none"}} value={form.prices[s]||0} onChange={e=>setPrice(s,e.target.value)}/>
          <button style={G.pmBtn} onClick={()=>adjustPrice(s,5)}>+</button>
          <span style={{color:"var(--p)",fontSize:11}}>ر</span>
        </div>
      </div>
    ))}
  </div>

  <div style={G.fc}>
    <SL>نغمة التنبيه 🔔</SL>
    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:5}}>
      {TONES.map(t=><div key={t.id} style={{...G.chip,...(form.tone===t.id?G.chipOn:{})}} onClick={()=>{setForm(p=>({...p,tone:t.id}));playTone(t.id,0.8);}}>{t.label}</div>)}
    </div>
    <div style={{fontSize:11,color:"#555"}}>اضغط للمعاينة بصوت عالٍ</div>
  </div>

  <button style={{...G.sub,marginBottom:30}} onClick={()=>{if(validate())addSalon(form);}}>إرسال طلب التسجيل ✂</button>
</div></div>
```

);
}

// ══════════════════════════════════════════════
//  ADMIN VIEW
// ══════════════════════════════════════════════
function AdminView({salons,setSalons,customers,setCustomers,setView,deleteSalon,approveSalon,onEnter,adminSession,setAdminSession,onPage,setSelSalon,toast$,loyaltySettings,setLoyaltySettings,socialLinks,setSocialLinks}){
const[pw,setPw]=useState(””); const[err,setErr]=useState(false);
const[tab,setTab]=useState(“pending”);
const[search,setSearch]=useState(””);
const[adminPwd,setAdminPwd]=useState(ADMIN_PWD);
const[pwForm,setPwForm]=useState({old:””,n1:””,n2:””,err:””});
const[bkFilter,setBkFilter]=useState(“all”);
const[bkDate,setBkDate]=useState(””);

if(!adminSession)return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>لوحة الإدارة</h2></div>
<div style={{background:“linear-gradient(135deg,#13131f,#1a1a2e)”,borderRadius:16,padding:24,border:“1px solid #2a2a3a”,marginBottom:16,textAlign:“center”}}>
<div style={{fontSize:40,marginBottom:8}}>🔐</div>
<div style={{fontSize:18,fontWeight:900,color:”#fff”,marginBottom:4}}>دخول المشرف</div>
<div style={{fontSize:12,color:”#666”,marginBottom:20}}>منطقة مخصصة للإدارة فقط</div>
<input type=“password” style={{…fi(err),textAlign:“center”,fontSize:16,letterSpacing:4,marginBottom:8}} placeholder=”••••••••” value={pw}
onChange={e=>{setPw(e.target.value);setErr(false);}}
onKeyDown={e=>e.key===“Enter”&&(pw===adminPwd?onEnter():setErr(true))}/>
{err&&<div style={{color:”#e74c3c”,fontSize:12,marginBottom:8}}>❌ كلمة المرور غير صحيحة</div>}
<button style={{…G.sub,marginTop:4}} onClick={()=>pw===adminPwd?onEnter():setErr(true)}>دخول</button>
<div style={{fontSize:10,color:”#333”,marginTop:10}}>للتجربة: admin123</div>
</div>
</div></div>
);

const pending=salons.filter(s=>s.status===“pending”);
const approved=salons.filter(s=>s.status===“approved”);
const rejected=salons.filter(s=>s.status===“rejected”);
const totalBk=salons.reduce((a,s)=>a+s.bookings.length,0);
const todayBk=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.date===todayStr()).length,0);
const totalRev=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status===“approved”).reduce((x,b)=>x+(b.total||0),0),0);
const todayRev=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status===“approved”&&b.date===todayStr()).reduce((x,b)=>x+(b.total||0),0),0);

const q=search.trim().toLowerCase();
const filterSalons=list=>!q?list:list.filter(s=>[s.name,s.owner,s.phone,s.ownerPhone,s.region,s.gov,s.village].join(” “).toLowerCase().includes(q));
const allBookings=salons.flatMap(s=>s.bookings.map(b=>({…b,salonName:s.name}))).sort((a,b)=>b.date>a.date?1:-1);
const filteredBookings=!q?allBookings:allBookings.filter(b=>[b.name,b.phone,b.salonName,b.date].join(” “).toLowerCase().includes(q));
const filteredCustomers=!q?customers:customers.filter(c=>[c.name,c.phone].join(” “).toLowerCase().includes(q));

// رسم بياني — آخر 6 أشهر
const monthlyData=(()=>{
const months=[];
for(let i=5;i>=0;i–){
const d=new Date(); d.setMonth(d.getMonth()-i);
const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const label=[“يناير”,“فبراير”,“مارس”,“أبريل”,“مايو”,“يونيو”,“يوليو”,“أغسطس”,“سبتمبر”,“أكتوبر”,“نوفمبر”,“ديسمبر”][d.getMonth()];
const count=allBookings.filter(b=>b.date?.startsWith(key)).length;
months.push({label,count,key});
}
return months;
})();
const maxCount=Math.max(…monthlyData.map(m=>m.count),1);

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={{...G.ft,flex:1}}>🔐 لوحة الإدارة</h2><button style={{…G.delBtn,border:“1.5px solid #888”,color:”#aaa”,background:“transparent”,fontSize:11,padding:“5px 10px”}} onClick={()=>{if(confirm(“تسجيل خروج من الإدارة؟”)){setAdminSession(false);localStorage.removeItem(“dork_admin”);setView(“home”);}}}>خروج</button></div>

```
  {/* إشعار صالون جديد */}
  {pending.length>0&&(
    <div style={{background:"rgba(212,160,23,.1)",border:"1.5px solid var(--pa4)",borderRadius:11,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:20}}>🔔</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)"}}>يوجد {pending.length} طلب {pending.length===1?"جديد":"جديدة"} بانتظار مراجعتك</div>
        <div style={{fontSize:11,color:"#888"}}>{pending.map(s=>s.name).join(" · ")}</div>
      </div>
      <button style={{...G.tabBtn,...G.tabOn,fontSize:11,padding:"5px 10px",flexShrink:0}} onClick={()=>setTab("pending")}>عرض</button>
    </div>
  )}

  {/* احصائيات */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
    {[
      {n:approved.length,l:"صالون مفعّل",c:"#27ae60",i:"✂"},
      {n:pending.length,l:"بانتظار الموافقة",c:"var(--p)",i:"⏳"},
      {n:totalBk,l:"إجمالي الحجوزات",c:"#6aadff",i:"📅"},
      {n:todayBk,l:"حجوزات اليوم",c:"#a78bfa",i:"🕐"},
      {n:totalRev,l:"إجمالي الإيرادات",c:"#f0c040",i:"💰",s:" ر"},
      {n:todayRev,l:"إيرادات اليوم",c:"#34d399",i:"💵",s:" ر"},
    ].map(({n,l,c,i,s})=>(
      <div key={l} style={{background:"#13131f",borderRadius:13,padding:"13px 10px",textAlign:"center",border:`1px solid ${c}33`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:8,right:10,fontSize:20,opacity:.12}}>{i}</div>
        <div style={{fontSize:22,fontWeight:900,color:c,marginBottom:2}}>{n}{s||""}</div>
        <div style={{fontSize:10,color:"#888"}}>{l}</div>
      </div>
    ))}
  </div>

  {/* رسم بياني — الحجوزات الشهرية */}
  <div style={{background:"#13131f",borderRadius:13,padding:"14px 12px",marginBottom:12,border:"1px solid #2a2a3a"}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:12}}>📈 الحجوزات — آخر 6 أشهر</div>
    <div style={{display:"flex",alignItems:"flex-end",gap:6,height:70}}>
      {monthlyData.map((m,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div style={{fontSize:10,color:"var(--p)",fontWeight:700}}>{m.count||""}</div>
          <div style={{width:"100%",background:`linear-gradient(180deg,var(--p),var(--pd))`,borderRadius:"4px 4px 0 0",height:`${Math.max((m.count/maxCount)*50,m.count?4:0)}px`,minHeight:m.count?4:0,transition:"height .3s"}}/>
          <div style={{fontSize:9,color:"#555",textAlign:"center",lineHeight:1.2}}>{m.label.slice(0,3)}</div>
        </div>
      ))}
    </div>
  </div>

  {/* بحث */}
  <div style={{...G.searchRow,marginBottom:12}}>
    <span style={{fontSize:14,color:"#555"}}>🔍</span>
    <input style={G.searchInput} placeholder="ابحث بالاسم أو الجوال أو المنطقة..." value={search} onChange={e=>setSearch(e.target.value)}/>
    {search&&<button style={G.searchClear} onClick={()=>setSearch("")}>✕</button>}
  </div>

  {/* تبويبات */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:12}}>
    {[
      {k:"pending",l:"⏳ الطلبات",n:pending.length},
      {k:"approved",l:"✅ المفعّلة",n:approved.length},
      {k:"rejected",l:"❌ المرفوضة",n:rejected.length},
      {k:"salons",l:"✂ الصالونات",n:salons.length},
      {k:"bookings",l:"📋 الحجوزات",n:totalBk},
      {k:"customers",l:"👥 العملاء",n:customers.length},
      {k:"compare",l:"📈 مقارنة",n:0},
      {k:"messages",l:"💬 رسائل",n:0},
      {k:"loyalty",l:"🎁 النقاط",n:0},
      {k:"social",l:"📱 التواصل",n:0},
      {k:"add",l:"➕ إضافة",n:0},
      {k:"password",l:"🔑 كلمة المرور",n:0},
    ].map(({k,l,n})=>(
      <button key={k} style={{...G.tabBtn,fontSize:11,...(tab===k?G.tabOn:{})}} onClick={()=>setTab(k)}>
        {l}{n>0&&k!=="password"&&<span style={{...G.notifDot,background:tab===k?"var(--p)":"#555",marginRight:3}}>{n}</span>}
      </button>
    ))}
  </div>

  {/* الطلبات */}
  {tab==="pending"&&(filterSalons(pending).length===0
    ?<div style={G.empty}>{search?"لا نتائج":"لا توجد طلبات معلّقة 🎉"}</div>
    :<>
      {filterSalons(pending).length>1&&(
        <button style={{...G.accBtn,width:"100%",marginBottom:10,padding:10}} onClick={()=>{if(confirm(`قبول جميع الطلبات (${filterSalons(pending).length}) دفعة واحدة؟`))filterSalons(pending).forEach(s=>approveSalon(s.id,"approved"));}}>
          ✅ قبول الكل ({filterSalons(pending).length})
        </button>
      )}
      {filterSalons(pending).map(s=>(
        <div key={s.id} style={{...G.bItem,marginBottom:10,border:"1px solid var(--pa25)",borderRight:"4px solid var(--p)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
              <div style={{fontSize:11,color:"#aaa"}}>👤 {s.owner} · 📞 {s.phone}</div>
              <div style={{fontSize:11,color:"#aaa"}}>📍 {s.gov||s.region}{s.village?` · ${s.village}`:""}</div>
              <div style={{fontSize:11,color:"#aaa"}}>🕐 {s.shiftEnabled?`${s.shift1Start}-${s.shift1End} | ${s.shift2Start}-${s.shift2End}`:`${s.workStart}-${s.workEnd}`}</div>
            </div>
            <button style={G.pageBtn} onClick={()=>{setSelSalon(s);setView("salon");}}>معاينة</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
            {(s.services||[]).map(sv=><span key={sv} style={G.tag}>{sv}</span>)}
          </div>
          <div style={{display:"flex",gap:7}}>
            <button style={{...G.accBtn,flex:2}} onClick={()=>approveSalon(s.id,"approved")}>✅ قبول ونشر</button>
            <button style={{...G.rejBtn,flex:1}} onClick={()=>{
              const reason=prompt("سبب الرفض (اختياري):");
              approveSalon(s.id,"rejected",reason||"");
            }}>❌ رفض</button>
          </div>
        </div>
      ))}
    </>
  )}

  {/* المفعّلة */}
  {tab==="approved"&&(filterSalons(approved).length===0
    ?<div style={G.empty}>{search?"لا نتائج":"لا توجد صالونات مفعّلة"}</div>
    :<>
      <button style={{...G.sub,marginBottom:10,background:"#1a3a1a",border:"1px solid #27ae60",color:"#4caf50"}} onClick={()=>{
        const rows=[["الاسم","المالك","الجوال","المنطقة","المحافظة","الحجوزات","التقييم"],...filterSalons(approved).map(s=>[s.name,s.owner,s.phone,s.region,s.gov||"",s.bookings.length,s.rating||""])];
        const csv=rows.map(r=>r.join(",")).join("\n");
        const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);a.download="salons.csv";a.click();
      }}>📥 تصدير CSV</button>
      <button style={{...G.sub,marginBottom:10,background:"#1a1a3a",border:"1px solid #3b82f6",color:"#60a5fa"}} onClick={()=>{
        const lines=filterSalons(approved).map((s,i)=>`${i+1}. ${s.name} | ${s.gov||s.region} | ${s.bookings.length} حجز | ${s.rating}⭐`).join("\n");
        const content=`تقرير صالونات دورك\n==================\nالتاريخ: ${new Date().toLocaleDateString("ar")}\nإجمالي الصالونات: ${approved.length}\n\n${lines}\n\nإجمالي الحجوزات: ${totalBk}\nإجمالي الإيرادات: ${totalRev} ريال`;
        const a=document.createElement("a");a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(content);a.download="dork-report.txt";a.click();
      }}>📄 تقرير نصي</button>
      <AdminApprovedList salons={filterSalons(approved)} setSalons={setSalons} deleteSalon={deleteSalon} setSelSalon={setSelSalon} setView={setView} toast$={toast$}/>
    </>
  )}

  {/* المرفوضة */}
  {tab==="rejected"&&(filterSalons(rejected).length===0
    ?<div style={G.empty}>{search?"لا نتائج":"لا توجد صالونات مرفوضة"}</div>
    :filterSalons(rejected).map(s=>(
      <div key={s.id} style={{...G.bItem,marginBottom:8,borderRight:"3px solid #e74c3c"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
            <div style={{fontSize:11,color:"#888"}}>{s.phone}</div>
          </div>
          <div style={{display:"flex",gap:5}}>
            <button style={G.accBtn} onClick={()=>approveSalon(s.id,"approved")}>✅ قبول</button>
            <button style={G.delBtn} onClick={()=>deleteSalon(s.id)}>🗑</button>
          </div>
        </div>
      </div>
    ))
  )}

  {/* الحجوزات */}
  {tab==="bookings"&&(()=>{
    const filtered=filteredBookings.filter(b=>{
      if(bkFilter!=="all"&&b.status!==bkFilter)return false;
      if(bkDate&&b.date!==bkDate)return false;
      return true;
    });
    return(
      <div>
        {/* فلاتر الحجوزات */}
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          {[["all","الكل"],["pending","⏳"],["approved","✅"],["rejected","❌"]].map(([k,l])=>(
            <button key={k} style={{...G.tabBtn,fontSize:11,...(bkFilter===k?G.tabOn:{})}} onClick={()=>setBkFilter(k)}>{l}</button>
          ))}
          <input type="date" style={{padding:"6px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:11,fontFamily:"inherit",outline:"none",direction:"ltr"}} value={bkDate} onChange={e=>setBkDate(e.target.value)}/>
          {bkDate&&<button style={G.xBtn} onClick={()=>setBkDate("")}>✕</button>}
        </div>
        {filtered.length===0
          ?<div style={G.empty}>لا نتائج</div>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map((b,i)=>{
              const sc=b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--p)";
              const sl=b.status==="approved"?"✅ مقبول":b.status==="rejected"?"❌ مرفوض":"⏳ انتظار";
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${sc}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {b.salonName}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>👤 {b.name} · 📞 {b.phone}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>📅 {b.date} · 🕐 {b.time}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{(b.services||[]).join(" + ")}</div>
                    </div>
                    <div style={{textAlign:"left",flexShrink:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>{b.total||0} ر</div>
                      <div style={{fontSize:10,color:sc,marginTop:3}}>{sl}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    );
  })()}

  {/* الصالونات بالاسم */}
  {tab==="salons"&&(()=>{
    const allSalons=!q?salons:salons.filter(s=>[s.name,s.owner,s.phone,s.region,s.gov].join(" ").toLowerCase().includes(q));
    const sorted=[...allSalons].sort((a,b)=>a.name.localeCompare(b.name,"ar"));
    return sorted.length===0
      ?<div style={G.empty}>{search?"لا نتائج":"لا توجد صالونات"}</div>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {sorted.map(s=>{
          const stColor=s.status==="approved"?"#27ae60":s.status==="rejected"?"#e74c3c":"var(--p)";
          const stLabel=s.status==="approved"?"✅":"❌";
          return(
            <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name} {stLabel}</div>
                  <div style={{fontSize:11,color:"#888"}}>👤 {s.owner} · 📞 {s.phone}</div>
                  <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?" · "+s.village:""}</div>
                  <div style={{display:"flex",gap:8,marginTop:3}}>
                    <span style={{fontSize:10,color:"#4caf50"}}>📅 {s.bookings.length} حجز</span>
                    <span style={{fontSize:10,color:"var(--p)"}}>⭐ {s.rating||0}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                  <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{setSelSalon(s);setView("salon");}}>📋 صفحة</button>
                  {s.status==="pending"&&<button style={{...G.accBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>approveSalon(s.id,"approved")}>✅ قبول</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>;
  })()}

  {/* العملاء */}
  {tab==="customers"&&(filteredCustomers.length===0
    ?<div style={G.empty}>{search?"لا نتائج":"لا يوجد عملاء مسجلون"}</div>
    :<AdminCustomerList customers={filteredCustomers} salons={salons} toast$={toast$} setCustomers={setCustomers}/>
  )}

  {/* مقارنة الصالونات + PDF */}
  {tab==="compare"&&(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button style={{flex:1,...G.sub,background:"#1a3a1a",border:"1px solid #27ae60",color:"#4caf50",marginTop:0}} onClick={()=>{
          const rows=[["الصالون","الحجوزات","المقبولة","الإيرادات","التقييم","المنطقة"],
            ...approved.map(s=>[s.name,s.bookings.length,s.bookings.filter(b=>b.status==="approved").length,s.bookings.filter(b=>b.status==="approved").reduce((a,b)=>a+(b.total||0),0)+" ر",s.rating,s.gov||s.region])];
          const csv=rows.map(r=>r.join(",")).join("\n");
          const a=document.createElement("a");
          a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);
          a.download="تقرير_دورك.csv";a.click();
          toast$&&toast$("✅ تم تحميل التقرير CSV");
        }}>📊 تقرير CSV</button>
        <button style={{flex:1,...G.sub,marginTop:0}} onClick={()=>{
          const lines=["📊 تقرير دورك — "+new Date().toLocaleDateString("ar-SA"),"═".repeat(40),"",
            ...approved.map((s,i)=>`${i+1}. ${s.name}\n   📅 ${s.bookings.length} حجز | ✅ ${s.bookings.filter(b=>b.status==="approved").length} مقبول\n   💰 ${s.bookings.filter(b=>b.status==="approved").reduce((a,b)=>a+(b.total||0),0)} ريال | ⭐ ${s.rating}\n   📍 ${s.gov||s.region}`),
            "","═".repeat(40),`إجمالي الصالونات: ${approved.length}`,`إجمالي الحجوزات: ${approved.reduce((a,s)=>a+s.bookings.length,0)}`,`إجمالي الإيرادات: ${approved.reduce((a,s)=>a+s.bookings.filter(b=>b.status==="approved").reduce((x,b)=>x+(b.total||0),0),0)} ريال`];
          const a=document.createElement("a");
          a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(lines.join("\n"));
          a.download="تقرير_دورك.txt";a.click();
          toast$&&toast$("✅ تم تحميل التقرير");
        }}>📄 تقرير نصي</button>
      </div>

      {approved.length===0
        ?<div style={G.empty}>لا توجد صالونات مفعّلة</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[...approved].sort((a,b)=>b.bookings.length-a.bookings.length).map((s,i)=>{
            const rev=s.bookings.filter(b=>b.status==="approved").reduce((a,b)=>a+(b.total||0),0);
            const maxBk=approved[0]?.bookings.length||1;
            const pct=Math.round(s.bookings.length/maxBk*100);
            return(
              <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${i===0?"#f0c040":i===1?"#888":"#cd7f32"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"  "} {s.name}</div>
                  <div style={{fontSize:11,color:"var(--p)",fontWeight:700}}>{rev} ر</div>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"#888"}}>📅 {s.bookings.length} حجز</span>
                  <span style={{fontSize:11,color:"#27ae60"}}>✅ {s.bookings.filter(b=>b.status==="approved").length}</span>
                  <span style={{fontSize:11,color:"var(--p)"}}>⭐ {s.rating}</span>
                  <span style={{fontSize:11,color:"#6aadff"}}>📍 {s.gov||s.region}</span>
                </div>
                <div style={{height:6,background:"#1a1a2e",borderRadius:10,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--p),var(--pl))",borderRadius:10}}/>
                </div>
                <div style={{fontSize:10,color:"#555",marginTop:3,textAlign:"left"}}>{pct}%</div>
              </div>
            );
          })}
        </div>
      }
    </div>
  )}

  {tab==="comparison"&&<SalonComparison salons={approved}/>}
  {/* رسائل الإدارة */}
  {tab==="messages"&&<AdminMessages salons={approved} toast$={toast$}/>}

  {/* النقاط */}
  {tab==="loyalty"&&(
    <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #27ae6033"}}>
      <div style={{fontSize:13,fontWeight:700,color:"#27ae60",marginBottom:12,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>🎁 إعدادات نقاط الولاء</div>
      <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer"}}>
        <input type="checkbox" checked={loyaltySettings?.enabled||false} onChange={e=>setLoyaltySettings&&setLoyaltySettings(p=>({...p,enabled:e.target.checked}))}/>
        <span style={{fontSize:13,color:"#fff",fontWeight:700}}>تفعيل نظام النقاط للجميع</span>
      </label>
      {loyaltySettings?.enabled&&<>
        {[{l:"نقاط لكل حجز",k:"pointsPerBooking"},{l:"الحد الأدنى للاستخدام",k:"minRedeemPoints"},{l:"قيمة النقطة (ريال)",k:"redeemValue"}].map(({l,k})=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600}}>{l}</label>
            <input type="number" min="1" style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}} value={loyaltySettings?.[k]||0} onChange={e=>setLoyaltySettings&&setLoyaltySettings(p=>({...p,[k]:+e.target.value}))}/>
          </div>
        ))}
      </>}
      <button style={G.sub} onClick={()=>toast$&&toast$("✅ تم حفظ إعدادات النقاط")}>💾 حفظ</button>
    </div>
  )}

  {/* التواصل */}
  {tab==="social"&&(
    <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>📱 وسائل التواصل الاجتماعي</div>
      {[{k:"email",l:"📧 البريد",ph:"example@email.com"},{k:"twitter",l:"🐦 تويتر",ph:"@username"},{k:"whatsapp",l:"💬 واتساب",ph:"05XXXXXXXX"},{k:"telegram",l:"✈️ تيليجرام (رقم)",ph:"05XXXXXXXX"},{k:"telegramUser",l:"✈️ تيليجرام (مستخدم)",ph:"@username"}].map(({k,l,ph})=>(
        <div key={k} style={{marginBottom:10}}>
          <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600}}>{l}</label>
          <input style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}} placeholder={ph} value={socialLinks?.[k]||""} onChange={e=>setSocialLinks&&setSocialLinks(p=>({...p,[k]:e.target.value}))}/>
        </div>
      ))}
      <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
        <input type="checkbox" checked={socialLinks?.enabled||false} onChange={e=>setSocialLinks&&setSocialLinks(p=>({...p,enabled:e.target.checked}))}/>
        <span style={{fontSize:12,color:"#fff"}}>إظهار للمستخدمين في الإعدادات</span>
      </label>
      <button style={G.sub} onClick={()=>toast$&&toast$("✅ تم حفظ التواصل")}>💾 حفظ</button>
    </div>
  )}

  {/* إضافة صالون أو عميل */}
  {tab==="add"&&<AdminAddView salons={salons} setSalons={setSalons} customers={customers} setCustomers={setCustomers} toast$={toast$} approveSalon={approveSalon}/>}

  {tab==="password"&&<div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>🔑 تغيير كلمة مرور الإدارة</div>
      {[{l:"كلمة المرور الحالية",k:"old"},{l:"كلمة المرور الجديدة",k:"n1"},{l:"تأكيد كلمة المرور",k:"n2"}].map(({l,k})=>(
        <div key={k} style={{marginBottom:10}}>
          <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600}}>{l}</label>
          <input type="password" style={fi(pwForm.err&&k==="old")} value={pwForm[k]} onChange={e=>setPwForm(p=>({...p,[k]:e.target.value,err:""}))}/>
        </div>
      ))}
      {pwForm.err&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:8}}>❌ {pwForm.err}</div>}
      <button style={G.sub} onClick={()=>{
        if(pwForm.old!==adminPwd){setPwForm(p=>({...p,err:"كلمة المرور الحالية غير صحيحة"}));return;}
        if(pwForm.n1.length<4){setPwForm(p=>({...p,err:"كلمة المرور قصيرة جداً"}));return;}
        if(pwForm.n1!==pwForm.n2){setPwForm(p=>({...p,err:"كلمتا المرور غير متطابقتين"}));return;}
        setAdminPwd(pwForm.n1);
        setPwForm({old:"",n1:"",n2:"",err:""});
        toast$&&toast$("✅ تم تغيير كلمة المرور");
      }}>💾 حفظ كلمة المرور الجديدة</button>
      <div style={{fontSize:11,color:"#555",marginTop:8}}>⚠️ تُحفظ في الجلسة الحالية فقط</div>
    </div>}

</div></div>
```

);
}

// ══════════════════════════════════════════════
//  ADMIN ADD VIEW — إضافة صالون أو عميل
// ══════════════════════════════════════════════
function AdminAddView({salons,setSalons,customers,setCustomers,toast$,approveSalon}){
const[mode,setMode]=useState(“salon”); // salon | customer
const[f,setF]=useState({name:””,owner:””,phone:””,ownerPhone:””,region:””,gov:””,address:””});
const[cf,setCf]=useState({name:””,phone:””,password:””});

const addSalon=async()=>{
if(!f.name||!f.phone){toast$&&toast$(“❌ الاسم والجوال مطلوبان”,“err”);return;}
try{
const data={name:f.name,owner:f.owner,phone:f.phone,owner_phone:f.ownerPhone,region:f.region,gov:f.gov,address:f.address,status:“approved”,bookings:[],services:[],barbers:[],prices:{},rating:5,workStart:“09:00”,workEnd:“23:00”};
const res=await sb(“salons”,“POST”,data,””);
toast$&&toast$(“✅ تم إضافة الصالون وتفعيله”);
setF({name:””,owner:””,phone:””,ownerPhone:””,region:””,gov:””,address:””});
}catch(e){toast$&&toast$(“❌ خطأ: “+e.message,“err”);}
};

const addCustomer=async()=>{
if(!cf.name||!cf.phone){toast$&&toast$(“❌ الاسم والجوال مطلوبان”,“err”);return;}
try{
await sb(“customers”,“POST”,{name:cf.name,phone:cf.phone,password:cf.password||“1234”,history:[],favs:[]},””);
toast$&&toast$(“✅ تم إضافة العميل”);
setCf({name:””,phone:””,password:””});
}catch(e){toast$&&toast$(“❌ خطأ: “+e.message,“err”);}
};

const inp={width:“100%”,padding:“10px 12px”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,direction:“rtl”,boxSizing:“border-box”,marginBottom:10};
const lbl={display:“block”,fontSize:11,color:”#aaa”,marginBottom:4,fontWeight:600};

return(
<div>
<div style={{display:“flex”,gap:8,marginBottom:14}}>
<button style={{flex:1,padding:“10px”,borderRadius:10,border:`1.5px solid ${mode==="salon"?"var(--p)":"#2a2a3a"}`,background:mode===“salon”?“var(–pa12)”:“transparent”,color:mode===“salon”?“var(–p)”:”#888”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:mode===“salon”?700:400}} onClick={()=>setMode(“salon”)}>✂ إضافة صالون</button>
<button style={{flex:1,padding:“10px”,borderRadius:10,border:`1.5px solid ${mode==="customer"?"var(--p)":"#2a2a3a"}`,background:mode===“customer”?“var(–pa12)”:“transparent”,color:mode===“customer”?“var(–p)”:”#888”,cursor:“pointer”,fontFamily:“inherit”,fontWeight:mode===“customer”?700:400}} onClick={()=>setMode(“customer”)}>👤 إضافة عميل</button>
</div>

```
  {mode==="salon"&&<div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
    <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>✂ إضافة صالون جديد</div>
    {[["اسم الصالون","name"],["اسم المالك","owner"],["جوال الصالون","phone"],["جوال المالك","ownerPhone"],["المنطقة","region"],["المحافظة","gov"],["العنوان","address"]].map(([l,k])=>(
      <div key={k}><label style={lbl}>{l}</label><input style={inp} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}/></div>
    ))}
    <button style={G.sub} onClick={addSalon}>✅ إضافة وتفعيل الصالون</button>
  </div>}

  {mode==="customer"&&<div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
    <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>👤 إضافة عميل جديد</div>
    {[["الاسم","name"],["رقم الجوال","phone"],["كلمة المرور","password"]].map(([l,k])=>(
      <div key={k}><label style={lbl}>{l}</label><input style={inp} type={k==="password"?"password":"text"} value={cf[k]} onChange={e=>setCf(p=>({...p,[k]:e.target.value}))}/></div>
    ))}
    <button style={G.sub} onClick={addCustomer}>✅ إضافة العميل</button>
  </div>}
</div>
```

);
}
// ══════════════════════════════════════════════
//  NOTIFS VIEW — صفحة الإشعارات
// ══════════════════════════════════════════════
function NotifsView({setView}){
const[notifs,setNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem(“dork_notifs”)||”[]”);}catch{return[];}});

const markAll=()=>{
const updated=notifs.map(n=>({…n,read:true}));
setNotifs(updated);
localStorage.setItem(“dork_notifs”,JSON.stringify(updated));
localStorage.setItem(“dork_notif_count”,“0”);
};

const clearAll=()=>{
setNotifs([]);
localStorage.setItem(“dork_notifs”,”[]”);
localStorage.setItem(“dork_notif_count”,“0”);
};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}>
<button style={G.bb} onClick={()=>setView(“home”)}>→</button>
<h2 style={{...G.ft,flex:1}}>🔔 الإشعارات</h2>
{notifs.length>0&&<button style={{…G.pageBtn,fontSize:11,padding:“5px 10px”}} onClick={markAll}>قراءة الكل</button>}
{notifs.length>0&&<button style={{…G.delBtn,fontSize:11,padding:“5px 10px”}} onClick={clearAll}>مسح</button>}
</div>
{notifs.length===0
?<div style={G.empty}>🔔 لا توجد إشعارات</div>
:<div style={{display:“flex”,flexDirection:“column”,gap:8}}>
{notifs.map(n=>(
<div key={n.id} style={{…G.bItem,borderRight:`3px solid ${n.read?"#2a2a3a":"var(--p)"}`,opacity:n.read?.7:1}}>
<div style={{display:“flex”,gap:10,alignItems:“flex-start”}}>
<span style={{fontSize:20,flexShrink:0}}>{n.icon}</span>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>{n.title}</div>
<div style={{fontSize:12,color:”#aaa”,marginTop:2}}>{n.body}</div>
<div style={{fontSize:10,color:”#555”,marginTop:4}}>{n.time}</div>
</div>
{!n.read&&<div style={{width:8,height:8,borderRadius:“50%”,background:“var(–p)”,flexShrink:0,marginTop:4}}/>}
</div>
</div>
))}
</div>
}
</div></div>
);
}

function CompareSalonsView({salons,setView,setSelSalon}){
if(!salons||salons.length<2)return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>⚖ مقارنة الصالونات</h2></div>
<div style={G.empty}>اختر صالونين من الصفحة الرئيسية للمقارنة</div>
</div></div>
);

const [a,b]=salons;
const rows=[
{l:“التقييم”,av:a.rating||”—”,bv:b.rating||”—”,better:(+a.rating||0)>(+b.rating||0)?“a”:“b”},
{l:“عدد الحلاقين”,av:a.barbers?.length||1,bv:b.barbers?.length||1,better:(a.barbers?.length||1)>(b.barbers?.length||1)?“a”:“b”},
{l:“عدد الخدمات”,av:a.services.length,bv:b.services.length,better:a.services.length>b.services.length?“a”:“b”},
{l:“أقل سعر”,av:Math.min(…Object.values(a.prices||{0:0}))+” ر”,bv:Math.min(…Object.values(b.prices||{0:0}))+” ر”,better:Math.min(…Object.values(a.prices||{999:0}))<Math.min(…Object.values(b.prices||{999:0}))?“a”:“b”},
{l:“أعلى سعر”,av:Math.max(…Object.values(a.prices||{0:0}))+” ر”,bv:Math.max(…Object.values(b.prices||{0:0}))+” ر”,better:Math.max(…Object.values(a.prices||{0:0}))<Math.max(…Object.values(b.prices||{0:0}))?“a”:“b”},
{l:“الحجوزات”,av:a.bookings.length,bv:b.bookings.length,better:a.bookings.length>b.bookings.length?“a”:“b”},
];

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>⚖ مقارنة الصالونات</h2></div>

```
  {/* عناوين */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
    <div/>
    {[a,b].map(s=>(
      <div key={s.id} style={{background:"#13131f",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid var(--pa25)",cursor:"pointer"}} onClick={()=>{setSelSalon(s);setView("salon");}}>
        <div style={{fontSize:24,marginBottom:4}}>✂</div>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",lineHeight:1.3}}>{s.name}</div>
        <div style={{fontSize:10,color:"#888",marginTop:3}}>📍 {s.gov||s.region}</div>
      </div>
    ))}
  </div>

  {/* مقارنة */}
  {rows.map(({l,av,bv,better})=>(
    <div key={l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6,alignItems:"center"}}>
      <div style={{fontSize:11,color:"#888",textAlign:"center"}}>{l}</div>
      {[{v:av,side:"a"},{v:bv,side:"b"}].map(({v,side})=>(
        <div key={side} style={{background:better===side?"var(--pa12)":"#13131f",border:`1px solid ${better===side?"var(--p)":"#2a2a3a"}`,borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:better===side?900:400,color:better===side?"var(--p)":"#aaa"}}>{v}</div>
          {better===side&&<div style={{fontSize:9,color:"var(--p)"}}>✓ أفضل</div>}
        </div>
      ))}
    </div>
  ))}

  {/* الخدمات */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
    {[a,b].map(s=>(
      <div key={s.id} style={{background:"#13131f",borderRadius:12,padding:12,border:"1px solid #2a2a3a"}}>
        <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>خدمات {s.name.split(" ")[0]}</div>
        {s.services.map(sv=>(
          <div key={sv} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
            <span style={{color:"#fff"}}>{sv}</span>
            <span style={{color:"var(--p)"}}>{s.prices?.[sv]||0} ر</span>
          </div>
        ))}
      </div>
    ))}
  </div>

  {/* أزرار الحجز */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
    {[a,b].map(s=>(
      <button key={s.id} style={G.sub} onClick={()=>{setSelSalon(s);setView("book");}}>
        احجز في {s.name.split(" ")[0]}
      </button>
    ))}
  </div>
</div></div>
```

);
}

// ══════════════════════════════════════════════
//  NEAR MAP VIEW — خريطة الصالونات القريبة
// ══════════════════════════════════════════════
function NearMapView({salons,setView,setSelSalon}){
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
const m=s.locationUrl.match(/q=(-?\d+.?\d*),(-?\d+.?\d*)/);
return m?{lat:+m[1],lng:+m[2]}:null;
};

const detect=()=>{
if(!navigator.geolocation){alert(“⚠️ المتصفح لا يدعم تحديد الموقع”);return;}
setLoading(true);
navigator.geolocation.getCurrentPosition(
p=>{
const loc={lat:p.coords.latitude,lng:p.coords.longitude};
setUserLoc(loc);
const s=[…salons].map(s=>({…s,dist:getCoords(s)?haversine(loc.lat,loc.lng,getCoords(s).lat,getCoords(s).lng):999}))
.sort((a,b)=>a.dist-b.dist);
setSorted(s);
setLoading(false);
},
()=>{setLoading(false);alert(“تعذّر تحديد موقعك”);},
{enableHighAccuracy:true,timeout:15000}
);
};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>📍 الصالونات القريبة</h2></div>
{!userLoc?(
<div style={{textAlign:“center”,padding:“40px 20px”}}>
<div style={{fontSize:50,marginBottom:12}}>📍</div>
<div style={{fontSize:14,color:”#fff”,fontWeight:700,marginBottom:8}}>اعرف أقرب صالون إليك</div>
<div style={{fontSize:12,color:”#888”,marginBottom:20}}>سنحتاج إذن موقعك لإظهار الصالونات القريبة</div>
<button style={G.sub} onClick={detect} disabled={loading}>
{loading?“⏳ جاري التحديد…”:“📍 تحديد موقعي”}
</button>
</div>
):(
<div>
<div style={{background:“var(–pa08)”,borderRadius:10,padding:“8px 12px”,marginBottom:12,fontSize:12,color:“var(–p)”}}>
📍 تم تحديد موقعك — {sorted.filter(s=>s.dist<50).length} صالون في نطاق 50 كم
</div>
{sorted.length===0
?<div style={G.empty}>لا توجد صالونات مع روابط خريطة</div>
:<div style={{display:“flex”,flexDirection:“column”,gap:8}}>
{sorted.slice(0,15).map(s=>(
<div key={s.id} style={{…G.bItem,borderRight:`3px solid ${s.dist<5?"#27ae60":s.dist<20?"var(--p)":"#555"}`}}
onClick={()=>{setSelSalon(s);setView(“salon”);}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>✂ {s.name}</div>
<div style={{fontSize:11,color:”#888”}}>📍 {s.gov||s.region}{s.village?” · “+s.village:””}</div>
</div>
<div style={{textAlign:“left”,flexShrink:0}}>
<div style={{fontSize:14,fontWeight:900,color:s.dist<5?”#27ae60”:s.dist<20?“var(–p)”:”#888”}}>
{s.dist<999?`${s.dist.toFixed(1)} كم`:”—”}
</div>
<div style={{fontSize:10,color:”#555”,marginTop:2}}>⭐ {s.rating}</div>
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
const shareUrl=`${window.location.origin}${window.location.pathname}?salon=${salon.id}`;
const shareText=`✂ ${salon.name}\n📍 ${salon.gov||salon.region}\n⭐ ${salon.rating||5}\n\nاحجز الآن: ${shareUrl}`;

const share=async()=>{
if(navigator.share){
try{await navigator.share({title:salon.name,text:shareText,url:shareUrl});}catch{}
}else{
try{await navigator.clipboard.writeText(shareUrl);alert(“✅ تم نسخ رابط الصالون!”);}catch{alert(shareUrl);}
}
};

return(
<button style={{…G.pageBtn,fontSize:11,padding:“5px 10px”}} onClick={share}>
📤 مشاركة
</button>
);
}

// ══════════════════════════════════════════════
//  OWNER LOGIN + DASHBOARD
// ══════════════════════════════════════════════
function OwnerLogin({salons,setOwnerSession,setView,toast$}){
const[phone,setPhone]=useState(””); const[err,setErr]=useState(””);
const login=()=>{
const s=salons.find(x=>x.ownerPhone===phone.trim()||x.phone===phone.trim());
if(!s){setErr(“لا يوجد صالون بهذا الرقم”);return;}
setOwnerSession(s.id); setView(“ownerDash”);
};
return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>دخول صاحب الصالون</h2></div>
<div style={G.fc}>
<SL>أدخل رقم جوالك المسجّل</SL>
<F label="رقم الجوال" error={err}><input style={fi(err)} placeholder=“05XXXXXXXX” value={phone} onChange={e=>{setPhone(e.target.value);setErr(””);}}/></F>
<button style={G.sub} onClick={login}>دخول</button>
</div>
<div style={{margin:“0 0 16px”,background:“rgba(var(–pr),.06)”,border:“1.5px dashed rgba(var(–pr),.4)”,borderRadius:13,padding:“18px 16px”,textAlign:“center”}}>
<div style={{fontSize:15,color:“var(–p)”,fontWeight:700,marginBottom:6}}>لا تملك صالوناً بعد؟</div>
<div style={{fontSize:12,color:”#888”,marginBottom:14}}>سجّل صالونك الآن وابدأ باستقبال الحجوزات</div>
<button style={{…G.sub,background:“var(–grad)”,color:”#000”,fontSize:15,fontWeight:900,letterSpacing:.5}} onClick={()=>setView(“register”)}>
✂ سجّل صالونك الآن
</button>
</div>
</div></div>
);
}
function OwnerDash({salon,setView,setOwnerSession,updateBookingStatus,setSalons,toast$}){
const[tab,setTab]=useState(“notif”);
if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>لوحة الصالون</h2></div><div style={G.empty}>الصالون غير موجود</div></div></div>;
const pending=salon.bookings.filter(b=>b.status===“pending”).length;
const statusColor=salon.status===“approved”?”#27ae60”:salon.status===“rejected”?”#e74c3c”:“var(–pl)”;
const statusLabel=salon.status===“approved”?“✅ مفعّل”:salon.status===“rejected”?“❌ مرفوض”:“⏳ انتظار موافقة الإدارة”;

const togglePause=async()=>{
try{
await sb(“salons”,“PATCH”,{paused:!salon.paused},`?id=eq.${salon.id}`);
setSalons(p=>p.map(s=>s.id===salon.id?{…s,paused:!s.paused}:s));
toast$(salon.paused?“✅ تم تفعيل استقبال الحجوزات”:“⏸ تم إيقاف استقبال الحجوزات مؤقتاً”);
}catch(e){toast$(“❌ خطأ: “+e.message,“err”);}
};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={{...G.ft,flex:1}}>لوحة صالوني</h2><button style={{…G.delBtn,border:“1.5px solid #888”,color:”#aaa”,background:“transparent”}} onClick={()=>{setOwnerSession(null);setView(“home”);}}>خروج</button></div>
<div style={G.salonBadge}>
<span style={{fontSize:20,color:“var(–p)”}}>✂</span>
<div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:”#fff”}}>{salon.name}</div><div style={{fontSize:11,color:”#888”}}>{salon.gov||salon.region}{salon.village?` · ${salon.village}`:””}</div></div>
<span style={{fontSize:11,fontWeight:700,color:statusColor,background:`${statusColor}22`,padding:“3px 8px”,borderRadius:8}}>{statusLabel}</span>
</div>
{salon.status!==“approved”&&<div style={{background:“rgba(240,192,64,.08)”,border:“1px solid var(–pl)55”,borderRadius:10,padding:“10px 12px”,marginBottom:12,fontSize:12,color:“var(–pl)”}}>🔔 صالونك في انتظار موافقة الإدارة — سيظهر للعملاء بعد القبول</div>}

```
  {/* زر مشاركة الصالون */}
  <div style={{display:"flex",gap:8,marginBottom:10}}>
    <button style={{flex:1,padding:"9px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>{
      const url=`${window.location.origin}${window.location.pathname}?salon=${salon.id}`;
      if(navigator.share){navigator.share({title:`صالون ${salon.name}`,text:`احجز موعدك في ${salon.name} عبر دورك`,url});}
      else{navigator.clipboard?.writeText(url);toast$&&toast$("✅ تم نسخ رابط الصالون");}
    }}>📤 مشاركة الصالون</button>
    <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${salon.paused?"#27ae60":"#f39c12"}`,background:salon.paused?"rgba(39,174,96,.1)":"rgba(243,156,18,.1)",color:salon.paused?"#27ae60":"#f39c12",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={togglePause}>
      {salon.paused?"✅ تفعيل الحجوزات":"⏸ إيقاف مؤقت"}
    </button>
  </div>
  {salon.paused&&<div style={{background:"rgba(231,76,60,.08)",border:"1px solid #e74c3c55",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#e74c3c"}}>⚠️ الحجوزات موقوفة — لن يتمكن العملاء من الحجز الآن</div>}

  <div style={{...G.tabRow,flexWrap:"nowrap",overflowX:"auto"}}>
    <button style={{...G.tabBtn,flexShrink:0,...(tab==="notif"?G.tabOn:{})}} onClick={()=>setTab("notif")}>🔔 {pending>0&&<span style={G.notifDot}>{pending}</span>}</button>
    <button style={{...G.tabBtn,flexShrink:0,...(tab==="alerts"?G.tabOn:{})}} onClick={()=>{localStorage.setItem("dork_notif_count","0");setTab("alerts");}}>
      🔕 {(()=>{const n=parseInt(localStorage.getItem("dork_notif_count")||"0");return n>0?<span style={{...G.notifDot,background:"#e74c3c"}}>{n}</span>:null;})()}
    </button>
    <button style={{...G.tabBtn,flexShrink:0,...(tab==="calendar"?G.tabOn:{})}} onClick={()=>setTab("calendar")}>🗓 تقويم</button>
    <button style={{...G.tabBtn,flexShrink:0,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")}>📊</button>
    <button style={{...G.tabBtn,flexShrink:0,...(tab==="messages"?G.tabOn:{})}} onClick={()=>setTab("messages")}>💬 رسائل</button>
    <button style={{...G.tabBtn,flexShrink:0,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙️</button>
  </div>
  {tab==="notif"&&<NotifPanel salon={salon} onUpdate={updateBookingStatus}/>}
  {tab==="alerts"&&(()=>{
    const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
    return notifs.length===0?<div style={G.empty}>لا توجد إشعارات</div>
      :<div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:4}}>
        {notifs.map(n=>(
          <div key={n.id} style={{...G.bItem,borderRight:"3px solid var(--p)"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.icon} {n.title}</div>
            <div style={{fontSize:12,color:"#aaa"}}>{n.body}</div>
            <div style={{fontSize:10,color:"#555",marginTop:2}}>{n.time}</div>
          </div>
        ))}
      </div>;
  })()}
  {tab==="calendar"&&<BookingCalendar salon={salon} onUpdate={updateBookingStatus}/>}
  {tab==="stats"&&<StatsPanel salon={salon}/>}
  {tab==="messages"&&<MessagesPanel salon={salon} toast$={toast$}/>}
  {tab==="settings"&&<OwnerSettings salon={salon} setSalons={setSalons} toast$={toast$}/>}
</div></div>
```

);
}

// ══════════════════════════════════════════════
//  BOOKING CALENDAR — تقويم مرئي للحجوزات
// ══════════════════════════════════════════════
function BookingCalendar({salon,onUpdate}){
const[selDate,setSelDate]=useState(todayStr());
const today=new Date();
const[viewMonth,setViewMonth]=useState(today.getMonth());
const[viewYear,setViewYear]=useState(today.getFullYear());

const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
const firstDay=new Date(viewYear,viewMonth,1).getDay();
const bookingsForDate=(d)=>{
const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
return salon.bookings.filter(b=>b.date===dateStr);
};
const selBks=salon.bookings.filter(b=>b.date===selDate);

return(
<div style={{paddingTop:4}}>
{/* header */}
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”,marginBottom:10}}>
<button style={{…G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}}>‹</button>
<span style={{fontSize:14,fontWeight:700,color:“var(–p)”}}>{MONTHS_AR[viewMonth]} {viewYear}</span>
<button style={{…G.bb,width:32,height:32}} onClick={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}}>›</button>
</div>
{/* days header */}
<div style={{display:“grid”,gridTemplateColumns:“repeat(7,1fr)”,gap:2,marginBottom:4}}>
{[“أح”,“إث”,“ثل”,“أر”,“خم”,“جم”,“سب”].map(d=><div key={d} style={{textAlign:“center”,fontSize:10,color:”#555”,padding:“4px 0”}}>{d}</div>)}
</div>
{/* calendar grid */}
<div style={{display:“grid”,gridTemplateColumns:“repeat(7,1fr)”,gap:2,marginBottom:12}}>
{Array(firstDay).fill(null).map((*,i)=><div key={`e${i}`}/>)}
{Array.from({length:daysInMonth},(*,i)=>{
const d=i+1;
const dateStr=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const bks=bookingsForDate(d);
const isToday=dateStr===todayStr();
const isSel=dateStr===selDate;
const hasBks=bks.length>0;
return(
<button key={d} onClick={()=>setSelDate(dateStr)}
style={{position:“relative”,padding:“6px 0”,borderRadius:8,border:`1.5px solid ${isSel?"var(--p)":isToday?"var(--pd)":"#2a2a3a"}`,background:isSel?“var(–pa12)”:isToday?“var(–pa05)”:“transparent”,color:isSel?“var(–p)”:isToday?“var(–pl)”:”#aaa”,cursor:“pointer”,fontFamily:“inherit”,fontSize:12,fontWeight:isSel||isToday?700:400,textAlign:“center”}}>
{d}
{hasBks&&<div style={{position:“absolute”,bottom:2,left:“50%”,transform:“translateX(-50%)”,width:4,height:4,borderRadius:“50%”,background:“var(–p)”}}/>}
</button>
);
})}
</div>
{/* bookings for selected date */}
<div style={{fontSize:12,color:“var(–p)”,fontWeight:700,marginBottom:8}}>📅 {selDate} — {selBks.length} حجز</div>
{selBks.length===0
?<div style={G.empty}>لا توجد حجوزات في هذا اليوم</div>
:selBks.map(b=>(
<div key={b.id} style={{…G.bItem,borderRight:`3px solid ${b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--p)"}`,marginBottom:8}}>
<div style={{display:“flex”,justifyContent:“space-between”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>🕐 {b.time} — {b.name}</div>
<div style={{fontSize:11,color:”#aaa”}}>{Array.isArray(b.services)?b.services.join(” + “):””} · {b.total||0} ر</div>
</div>
<span style={{fontSize:10,color:b.status===“approved”?”#27ae60”:b.status===“rejected”?”#e74c3c”:“var(–p)”}}>{b.status===“approved”?“✅”:b.status===“rejected”?“❌”:“⏳”}</span>
</div>
{b.status===“pending”&&<div style={{display:“flex”,gap:6,marginTop:6}}>
<button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,“approved”)}>✅ قبول</button>
<button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,“rejected”)}>❌ رفض</button>
</div>}
</div>
))
}
</div>
);
}

// ══════════════════════════════════════════════
//  MESSAGES PANEL — رسائل بين الإدارة والصالون
// ══════════════════════════════════════════════
function MessagesPanel({salon,toast$}){
const KEY=`dork_msgs_${salon.id}`;
const[msgs,setMsgs]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||”[]”);}catch{return[];}});
const[txt,setTxt]=useState(””);

const send=()=>{
if(!txt.trim())return;
const m={id:Date.now(),from:“owner”,text:txt.trim(),time:new Date().toLocaleTimeString(“ar”,{hour:“2-digit”,minute:“2-digit”})};
const newMsgs=[…msgs,m];
setMsgs(newMsgs);
try{localStorage.setItem(KEY,JSON.stringify(newMsgs));}catch{}
setTxt(””);
};

return(
<div style={{display:“flex”,flexDirection:“column”,height:400}}>
<div style={{flex:1,overflowY:“auto”,display:“flex”,flexDirection:“column”,gap:8,marginBottom:10}}>
{msgs.length===0&&<div style={G.empty}>لا توجد رسائل — ابدأ المحادثة مع الإدارة</div>}
{msgs.map(m=>(
<div key={m.id} style={{display:“flex”,justifyContent:m.from===“owner”?“flex-end”:“flex-start”}}>
<div style={{maxWidth:“80%”,padding:“8px 12px”,borderRadius:m.from===“owner”?“12px 12px 2px 12px”:“12px 12px 12px 2px”,background:m.from===“owner”?“var(–pa25)”:”#1a1a2e”,border:`1px solid ${m.from==="owner"?"var(--pa4)":"#2a2a3a"}`}}>
<div style={{fontSize:13,color:”#fff”}}>{m.text}</div>
<div style={{fontSize:9,color:”#555”,marginTop:3,textAlign:m.from===“owner”?“left”:“right”}}>{m.time}</div>
</div>
</div>
))}
</div>
<div style={{display:“flex”,gap:8}}>
<input style={{flex:1,padding:“10px 12px”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,direction:“rtl”}}
placeholder=“اكتب رسالة للإدارة…” value={txt} onChange={e=>setTxt(e.target.value)}
onKeyDown={e=>e.key===“Enter”&&send()}/>
<button style={{…G.sub,width:“auto”,padding:“0 16px”,marginTop:0}} onClick={send}>إرسال</button>
</div>
</div>
);
}

// ══════════════════════════════════════════════
//  ADMIN MESSAGES — رسائل الإدارة مع الصالونات
// ══════════════════════════════════════════════
function AdminMessages({salons,toast$}){
const[selId,setSelId]=useState(null);
const[txt,setTxt]=useState(””);
const sel=selId?salons.find(s=>s.id===selId):null;

const getKey=(id)=>`dork_msgs_${id}`;
const getMsgs=(id)=>{try{return JSON.parse(localStorage.getItem(getKey(id))||”[]”);}catch{return[];}};
const[msgs,setMsgs]=useState([]);

const openChat=(id)=>{setSelId(id);setMsgs(getMsgs(id));};

const send=()=>{
if(!txt.trim()||!selId)return;
const m={id:Date.now(),from:“admin”,text:txt.trim(),time:new Date().toLocaleTimeString(“ar”,{hour:“2-digit”,minute:“2-digit”})};
const newMsgs=[…msgs,m];
setMsgs(newMsgs);
try{localStorage.setItem(getKey(selId),JSON.stringify(newMsgs));}catch{}
setTxt(””);
sendNotif(“رسالة من الإدارة”,txt.trim(),“📩”);
toast$&&toast$(“✅ تم إرسال الرسالة”);
};

if(sel) return(
<div>
<div style={{display:“flex”,alignItems:“center”,gap:8,marginBottom:12}}>
<button style={G.bb} onClick={()=>setSelId(null)}>→</button>
<span style={{fontSize:14,fontWeight:700,color:”#fff”}}>💬 {sel.name}</span>
</div>
<div style={{display:“flex”,flexDirection:“column”,height:350}}>
<div style={{flex:1,overflowY:“auto”,display:“flex”,flexDirection:“column”,gap:8,marginBottom:10,background:”#0d0d1a”,borderRadius:10,padding:10,border:“1px solid #2a2a3a”}}>
{msgs.length===0&&<div style={G.empty}>لا توجد رسائل</div>}
{msgs.map(m=>(
<div key={m.id} style={{display:“flex”,justifyContent:m.from===“admin”?“flex-end”:“flex-start”}}>
<div style={{maxWidth:“80%”,padding:“8px 12px”,borderRadius:m.from===“admin”?“12px 12px 2px 12px”:“12px 12px 12px 2px”,background:m.from===“admin”?“var(–pa25)”:”#1a1a2e”,border:`1px solid ${m.from==="admin"?"var(--pa4)":"#2a2a3a"}`}}>
<div style={{fontSize:10,color:”#888”,marginBottom:3}}>{m.from===“admin”?“الإدارة”:“المالك”}</div>
<div style={{fontSize:13,color:”#fff”}}>{m.text}</div>
<div style={{fontSize:9,color:”#555”,marginTop:3}}>{m.time}</div>
</div>
</div>
))}
</div>
<div style={{display:“flex”,gap:8}}>
<input style={{flex:1,padding:“10px 12px”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,direction:“rtl”}}
placeholder=“اكتب رسالة للصالون…” value={txt} onChange={e=>setTxt(e.target.value)}
onKeyDown={e=>e.key===“Enter”&&send()}/>
<button style={{…G.sub,width:“auto”,padding:“0 16px”,marginTop:0}} onClick={send}>إرسال</button>
</div>
</div>
</div>
);

return(
<div>
<div style={{fontSize:12,color:”#888”,marginBottom:10}}>اختر صالوناً لمراسلته:</div>
{salons.length===0&&<div style={G.empty}>لا توجد صالونات</div>}
{salons.map(s=>{
const msgs=getMsgs(s.id);
const lastMsg=msgs[msgs.length-1];
return(
<div key={s.id} style={{…G.bItem,cursor:“pointer”,marginBottom:8}} onClick={()=>openChat(s.id)}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>✂ {s.name}</div>
{lastMsg&&<div style={{fontSize:11,color:”#888”,marginTop:2}}>{lastMsg.from===“admin”?“أنت: “:””}{lastMsg.text.slice(0,40)}</div>}
</div>
<div style={{flexShrink:0}}>
<span style={{fontSize:12,color:“var(–p)”}}>💬 {msgs.length}</span>
</div>
</div>
</div>
);
})}
</div>
);
}

// ══════════════════════════════════════════════

function OwnerSettings({salon,setSalons,toast$}){
const[saving,setSaving]=useState(false);
const[sec,setSec]=useState(“info”);
const[f,setF]=useState({
name:salon.name||””,
phone:salon.phone||””,
address:salon.address||””,
locationUrl:salon.locationUrl||””,
shiftEnabled:salon.shiftEnabled||false,
shift1Start:salon.shift1Start||“08:00”,
shift1End:salon.shift1End||“13:00”,
shift2Start:salon.shift2Start||“16:00”,
shift2End:salon.shift2End||“23:00”,
workStart:salon.workStart||“09:00”,
workEnd:salon.workEnd||“22:00”,
services:[…(salon.services||[])],
prices:{…(salon.prices||{})},
barbers:JSON.parse(JSON.stringify(salon.barbers||[])),
tone:salon.tone||“bell”,
});
const[newSvc,setNewSvc]=useState(””);
const[newBarber,setNewBarber]=useState(””);
const upd=(k,v)=>setF(p=>({…p,[k]:v}));

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
await sb(“salons”,“PATCH”,patch,`?id=eq.${salon.id}`);
setSalons(p=>p.map(s=>s.id===salon.id?{…s,name:f.name,phone:f.phone,address:f.address,locationUrl:f.locationUrl,shiftEnabled:f.shiftEnabled,shift1Start:f.shift1Start,shift1End:f.shift1End,shift2Start:f.shift2Start,shift2End:f.shift2End,workStart:f.workStart,workEnd:f.workEnd,services:f.services,prices:f.prices,barbers:f.barbers,tone:f.tone}:s));
toast$&&toast$(“✅ تم حفظ التعديلات”);
}catch(e){toast$&&toast$(“❌ خطأ: “+e.message,“err”);}
setSaving(false);
};

const inp={width:“100%”,padding:“10px 12px”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,boxSizing:“border-box”,direction:“rtl”};
const lbl={display:“block”,fontSize:11,color:”#aaa”,marginBottom:4,fontWeight:600};
const box={background:”#13131f”,borderRadius:13,padding:14,border:“1px solid #2a2a3a”,marginBottom:10};
const hdr={fontSize:12,fontWeight:700,color:“var(–p)”,marginBottom:10,paddingBottom:6,borderBottom:“1px solid #2a2a3a”};

return(
<div>
<div style={{display:“flex”,gap:5,marginBottom:12,overflowX:“auto”,paddingBottom:2}}>
{[{id:“info”,icon:“📋”,label:“المعلومات”},{id:“hours”,icon:“🕐”,label:“الأوقات”},{id:“services”,icon:“✂”,label:“الخدمات”},{id:“barbers”,icon:“💈”,label:“الحلاقون”},{id:“tone”,icon:“🔔”,label:“النغمة”}].map(s=>(
<button key={s.id} onClick={()=>setSec(s.id)}
style={{flexShrink:0,padding:“6px 10px”,borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"#2a2a3a"}`,background:sec===s.id?“var(–pa12)”:”#1a1a2e”,color:sec===s.id?“var(–p)”:”#888”,cursor:“pointer”,fontSize:11,fontFamily:“inherit”,fontWeight:sec===s.id?700:400,display:“flex”,alignItems:“center”,gap:4}}>
{s.icon} {s.label}
</button>
))}
</div>

```
  {sec==="info"&&<div style={box}>
    <div style={hdr}>📋 المعلومات الأساسية</div>
    {[{l:"اسم الصالون",k:"name"},{l:"رقم الجوال",k:"phone"},{l:"العنوان",k:"address"},{l:"رابط الخريطة",k:"locationUrl"}].map(({l,k})=>(
      <div key={k} style={{marginBottom:10}}>
        <label style={lbl}>{l}</label>
        <input style={inp} value={f[k]} onChange={e=>upd(k,e.target.value)}/>
      </div>
    ))}
  </div>}

  {sec==="hours"&&<div style={box}>
    <div style={hdr}>🕐 أوقات العمل</div>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${!f.shiftEnabled?"var(--p)":"#2a2a3a"}`,background:!f.shiftEnabled?"var(--pa12)":"#1a1a2e",color:!f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",false)}>وردية واحدة</button>
      <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${f.shiftEnabled?"var(--p)":"#2a2a3a"}`,background:f.shiftEnabled?"var(--pa12)":"#1a1a2e",color:f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",true)}>صباحية + مسائية</button>
    </div>
    {!f.shiftEnabled
      ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={lbl}>من</label><input type="time" style={inp} value={f.workStart} onChange={e=>upd("workStart",e.target.value)}/></div>
        <div><label style={lbl}>إلى</label><input type="time" style={inp} value={f.workEnd} onChange={e=>upd("workEnd",e.target.value)}/></div>
      </div>
      :<>
        <div style={{fontSize:11,color:"#888",marginBottom:6}}>⛅ الصباحية</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>من</label><input type="time" style={inp} value={f.shift1Start} onChange={e=>upd("shift1Start",e.target.value)}/></div>
          <div><label style={lbl}>إلى</label><input type="time" style={inp} value={f.shift1End} onChange={e=>upd("shift1End",e.target.value)}/></div>
        </div>
        <div style={{fontSize:11,color:"#888",marginBottom:6}}>🌙 المسائية</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl}>من</label><input type="time" style={inp} value={f.shift2Start} onChange={e=>upd("shift2Start",e.target.value)}/></div>
          <div><label style={lbl}>إلى</label><input type="time" style={inp} value={f.shift2End} onChange={e=>upd("shift2End",e.target.value)}/></div>
        </div>
      </>
    }
  </div>}

  {sec==="services"&&<div style={box}>
    <div style={hdr}>✂ الخدمات والأسعار</div>
    {f.services.map(svc=>(
      <div key={svc} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:"#0d0d1a",borderRadius:9,padding:"8px 10px",border:"1px solid #2a2a3a"}}>
        <span style={{flex:1,fontSize:13,color:"#f0f0f0"}}>{svc}</span>
        <input type="number" min="0" style={{width:75,padding:"6px 8px",borderRadius:7,border:"1.5px solid #2a2a3a",background:"#13131f",color:"var(--p)",fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
          value={f.prices[svc]||0} onChange={e=>setF(p=>({...p,prices:{...p.prices,[svc]:+e.target.value}}))}/>
        <span style={{fontSize:11,color:"#888",flexShrink:0}}>ريال</span>
        <button style={G.xBtn} onClick={()=>setF(p=>{const sv=p.services.filter(s=>s!==svc);const pr={...p.prices};delete pr[svc];return{...p,services:sv,prices:pr};})}>✕</button>
      </div>
    ))}
    <div style={{display:"flex",gap:7,marginTop:10}}>
      <input style={{...inp,flex:1}} placeholder="اسم خدمة جديدة" value={newSvc} onChange={e=>setNewSvc(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"&&newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}/>
      <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}>+ إضافة</button>
    </div>
    <div style={{marginTop:12}}>
      <div style={{fontSize:11,color:"#666",marginBottom:6}}>خدمات جاهزة:</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
        {DEFAULT_SERVICES.filter(d=>!f.services.includes(d)).map(d=>(
          <button key={d} style={{...G.chip,fontSize:11}} onClick={()=>setF(p=>({...p,services:[...p.services,d],prices:{...p.prices,[d]:0}}))}>+ {d}</button>
        ))}
      </div>
    </div>
  </div>}

  {sec==="barbers"&&<div style={box}>
    <div style={hdr}>💈 الحلاقون</div>
    {f.barbers.length===0&&<div style={G.empty}>لا يوجد حلاقون</div>}
    {f.barbers.map((b,i)=>(
      <div key={b.id} style={{marginBottom:10,background:"#0d0d1a",borderRadius:10,padding:"10px 12px",border:"1px solid #2a2a3a"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          {/* صورة الحلاق */}
          <div style={{position:"relative",flexShrink:0}}>
            {b.photo
              ?<img src={b.photo} alt={b.name} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--p)"}}/>
              :<div style={{width:44,height:44,borderRadius:"50%",background:"#1a1a2e",border:"2px dashed #2a2a3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💈</div>
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
          <input style={{...inp,flex:1,padding:"6px 10px"}} placeholder="اسم الحلاق" value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
          <button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}>✕</button>
        </div>
        {/* وقت الدوام */}
        <div style={{fontSize:11,color:"#888",marginBottom:6}}>🕐 وقت الدوام</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
          <div>
            <label style={{display:"block",fontSize:10,color:"#666",marginBottom:3}}>من</label>
            <input type="time" style={{...inp,fontSize:12}} value={b.shiftStart||"09:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftStart:e.target.value}:x)}))}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:10,color:"#666",marginBottom:3}}>إلى</label>
            <input type="time" style={{...inp,fontSize:12}} value={b.shiftEnd||"22:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftEnd:e.target.value}:x)}))}/>
          </div>
        </div>
      </div>
    ))}
    <div style={{display:"flex",gap:7,marginTop:8}}>
      <input style={{...inp,flex:1}} placeholder="اسم الحلاق الجديد" value={newBarber} onChange={e=>setNewBarber(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00"}]}));setNewBarber("");}}}/>
      <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00"}]}));setNewBarber("");}}}>+ إضافة</button>
    </div>
  </div>}

  {sec==="tone"&&<div style={box}>
    <div style={hdr}>🔔 نغمة التنبيه</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {TONES.map(t=>{
        const active=f.tone===t.id;
        return(
          <button key={t.id} onClick={()=>{upd("tone",t.id);playTone(t.id,0.8);}}
            style={{padding:"11px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center"}}>
            {t.label} {active&&"✓"}
          </button>
        );
      })}
    </div>
    <div style={{fontSize:11,color:"#555",marginTop:8}}>اضغط للمعاينة</div>
  </div>}

  <button style={{...G.sub,marginTop:4,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
    {saving?"⏳ جاري الحفظ...":"💾 حفظ التعديلات"}
  </button>
</div>
```

);
}

// ══════════════════════════════════════════════
//  CUSTOMER LOGIN + DASHBOARD
// ══════════════════════════════════════════════
function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$}){
const[tab,setTab]=useState(“login”);
const[phone,setPhone]=useState(””); const[name,setName]=useState(””);
const[email,setEmail]=useState(””); const[pass,setPass]=useState(””);
const[err,setErr]=useState(””);

// تسجيل دخول بالبصمة
const loginWithBiometric=async()=>{
if(!window.PublicKeyCredential){toast$&&toast$(“❌ البصمة غير مدعومة”,“err”);return;}
try{
const savedId=localStorage.getItem(“dork_biometric_id”);
if(!savedId){toast$&&toast$(“❌ لم تُسجّل البصمة بعد — سجّل دخول أولاً”,“err”);return;}
const c=customers.find(x=>String(x.id)===savedId);
if(!c){toast$&&toast$(“❌ لم يُعثر على الحساب”,“err”);return;}
setCustomerSession(c);setView(“home”);
toast$&&toast$(“✅ تم الدخول بالبصمة”);
}catch(e){toast$&&toast$(“❌ فشل التحقق”,“err”);}
};

const login=async()=>{
if(!phone.trim()){setErr(“أدخل رقم الجوال”);return;}
try{
const rows=await sb(“customers”,“GET”,null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
if(!rows.length){setErr(“لا يوجد حساب بهذا الرقم”);return;}
const c=toAppCustomer(rows[0]);
setCustomerSession(c);setView(“home”);
// حفظ للبصمة
localStorage.setItem(“dork_biometric_id”,String(c.id));
}catch(e){setErr(“خطأ: “+e.message);}
};

const register=async()=>{
if(!name.trim()||!phone.trim()){setErr(“أدخل الاسم والجوال”);return;}
try{
const exists=await sb(“customers”,“GET”,null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
if(exists.length){setErr(“الرقم مسجل بالفعل”);return;}
const rows=await sb(“customers”,“POST”,{name:name.trim(),phone:phone.trim(),email:email.trim()||null,history:[],favs:[]},””);
const nc=toAppCustomer(rows[0]);
setCustomerSession(nc);setView(“home”);
localStorage.setItem(“dork_biometric_id”,String(nc.id));
}catch(e){setErr(“خطأ: “+e.message);}
};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>حساب العميل 👤</h2></div>

```
  {/* دخول بالبصمة */}
  {localStorage.getItem("dork_biometric_id")&&(
    <button style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--pa25)",background:"var(--pa08)",color:"var(--p)",cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={loginWithBiometric}>
      👆 دخول بالبصمة
    </button>
  )}

  <div style={{display:"flex",gap:7,marginBottom:14}}>
    <button style={{...G.toggleBtn,...(tab==="login"?G.toggleOn:{})}} onClick={()=>{setTab("login");setErr("");}}>دخول</button>
    <button style={{...G.toggleBtn,...(tab==="reg"?G.toggleOn:{})}} onClick={()=>{setTab("reg");setErr("");}}>حساب جديد</button>
  </div>
  <div style={G.fc}>
    {tab==="login"?<>
      <SL>تسجيل الدخول</SL>
      <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
      <button style={G.sub} onClick={login}>دخول</button>
      <div style={{textAlign:"center",margin:"12px 0",color:"#555",fontSize:12}}>— أو —</div>
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
          const fb=window["firebase"];
          if(!fb.apps.length) fb.initializeApp({apiKey:"AIzaSyBYCJYdJUi_oPfYlOzSukntj4",authDomain:"dork-app.firebaseapp.com",projectId:"dork-app",appId:"1:659823227621:web:befaaa1b5063"});
          const provider=new fb.auth.GoogleAuthProvider();
          provider.setCustomParameters({prompt:"select_account"});
          const result=await fb.auth().signInWithPopup(provider);
          const gUser={name:result.user.displayName||"مستخدم",email:result.user.email||"",googleUid:result.user.uid};
          const rows=await sb("customers","GET",null,`?google_uid=eq.${gUser.googleUid}`);
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
        الدخول عبر Google
      </button>
    </>:<>
      <SL>إنشاء حساب جديد</SL>
      <F label="الاسم"><input style={fi()} placeholder="اسمك الكريم" value={name} onChange={e=>setName(e.target.value)}/></F>
      <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
      <F label="البريد الإلكتروني (اختياري)"><input style={fi()} placeholder="example@email.com" value={email} onChange={e=>setEmail(e.target.value)} type="email"/></F>
      <button style={G.sub} onClick={register}>إنشاء الحساب</button>
    </>}
  </div>
</div></div>
```

);
}
function CustomerDash({customer,salons,setSalons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers}){
const[tab,setTab]=useState(“favs”);
const[editMode,setEditMode]=useState(false);
const[editName,setEditName]=useState(customer?.name||””);
const[editPhone,setEditPhone]=useState(customer?.phone||””);
const[reminderMins,setReminderMins]=useState(60);
if(!customer)return null;

const favSalons=salons.filter(s=>favSet.has(s.id)&&s.status===“approved”);
const history=customer.history||[];
const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
const points=history.length*10;
const badge=history.length>=10?“🏆 عميل مميز”:history.length>=5?“⭐ عميل نشط”:“🆕 عميل جديد”;

// avatar بالحرف الأول
const initials=(customer.name||”?”)[0];
const avatarColors=[”#d4a017”,”#27ae60”,”#3b82f6”,”#8b5cf6”,”#e74c3c”];
const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

const saveEdit=async()=>{
if(!editName.trim()){return;}
try{
await sb(“customers”,“PATCH”,{name:editName.trim(),phone:editPhone.trim()},`?id=eq.${customer.id}`);
setCustomers(p=>p.map(c=>c.id===customer.id?{…c,name:editName.trim(),phone:editPhone.trim()}:c));
setEditMode(false);
}catch(e){alert(“خطأ: “+e.message);}
};

const deleteAccount=async()=>{
if(!confirm(“حذف حسابك نهائياً؟ لا يمكن التراجع!”)){return;}
try{
await sb(“customers”,“DELETE”,null,`?id=eq.${customer.id}`);
setCustomerSession(null);setView(“home”);
}catch(e){alert(“خطأ: “+e.message);}
};

const scheduleReminder=(h)=>{
const dt=new Date(`${h.date}T${h.time}`);
dt.setMinutes(dt.getMinutes()-reminderMins);
const now=new Date();
const diff=dt-now;
if(diff<=0){alert(“الموعد قريب جداً أو مضى!”);return;}
setTimeout(()=>{
if(Notification.permission===“granted”){
new Notification(“تذكير موعدك في دورك ✂”,{body:`موعدك في ${h.salonName||"الصالون"} الساعة ${h.time}`,icon:”/favicon.ico”});
}else{alert(`تذكير: موعدك في ${h.salonName||"الصالون"} الساعة ${h.time}`);}
},diff);
Notification.requestPermission();
alert(`✅ سيتم تذكيرك قبل ${reminderMins>=60?reminderMins/60+" ساعة":reminderMins+" دقيقة"} من موعدك!`);
};

const inp2={width:“100%”,padding:“10px 12px”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,boxSizing:“border-box”,direction:“rtl”};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={{...G.ft,flex:1}}>حسابي</h2><button style={{…G.delBtn,border:“1.5px solid #888”,color:”#aaa”,background:“transparent”}} onClick={()=>{setCustomerSession(null);setView(“home”);}}>خروج</button></div>

```
  {/* بروفايل العميل */}
  {!editMode?(
    <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1px solid #2a2a3a",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#000",flexShrink:0}}>{initials}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{customer.name}</div>
          <div style={{fontSize:12,color:"#888"}}>📞 {customer.phone}</div>
          <div style={{fontSize:11,color:avatarColor,marginTop:2}}>{badge}</div>
        </div>
        <button style={{...G.pageBtn,fontSize:11}} onClick={()=>setEditMode(true)}>✏️ تعديل</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[{v:history.length,l:"حجز",c:"#6aadff"},{v:totalSpent+" ر",l:"إجمالي",c:"#f0c040"},{v:points,l:"نقطة 🎁",c:"#27ae60"}].map(({v,l,c})=>(
          <div key={l} style={{background:"#0d0d1a",borderRadius:10,padding:"10px 6px",textAlign:"center",border:`1px solid ${c}33`}}>
            <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
            <div style={{fontSize:10,color:"#888"}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  ):(
    <div style={{background:"#13131f",borderRadius:16,padding:16,border:"1px solid var(--pa25)",marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>✏️ تعديل البيانات</div>
      <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>الاسم</label><input style={inp2} value={editName} onChange={e=>setEditName(e.target.value)}/></div>
      <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>رقم الجوال</label><input style={inp2} value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></div>
      <div style={{display:"flex",gap:8}}>
        <button style={G.sub} onClick={saveEdit}>💾 حفظ</button>
        <button style={{...G.delBtn,padding:"12px 14px"}} onClick={()=>setEditMode(false)}>إلغاء</button>
      </div>
    </div>
  )}

  {/* تبويبات */}
  <div style={{...G.tabRow,flexWrap:"nowrap"}}>
    <button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>{localStorage.setItem("dork_notif_count","0");setTab("notif");}}>
      🔔 {(()=>{const n=parseInt(localStorage.getItem("dork_notif_count")||"0");return n>0?<span style={G.notifDot}>{n}</span>:null;})()}
    </button>
    <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>♥ المفضلة {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
    <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>📋 حجوزاتي</button>
    <button style={{...G.tabBtn,...(tab==="invite"?G.tabOn:{})}} onClick={()=>setTab("invite")}>🎁 دعوة</button>
    <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙️ الحساب</button>
  </div>

  {/* المفضلة */}
  {tab==="favs"&&<>
    {favSalons.length===0?<div style={G.empty}>لم تضف صالوناً للمفضلة بعد</div>:
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {favSalons.map(s=>(
          <div key={s.id} style={G.bItem}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?` · ${s.village}`:""}</div>
                <div style={{fontSize:11,color:"var(--p)"}}>⭐ {s.rating}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={G.bookBtn} onClick={()=>{setSelSalon(s);setView("book");}}>احجز</button>
                <button style={{...G.favBtn,fontSize:18,color:"#e74c3c"}} onClick={()=>toggleFav(s.id)}>♥</button>
              </div>
            </div>
          </div>
        ))}
      </div>}
  </>}

  {/* الحجوزات */}
  {tab==="hist"&&<>
    {/* إعداد التذكير */}
    <div style={{background:"#13131f",borderRadius:10,padding:"10px 12px",marginBottom:10,border:"1px solid #2a2a3a"}}>
      <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>🔔 وقت التذكير بالمواعيد</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        {[{v:30,l:"30 د"},{v:60,l:"ساعة"},{v:120,l:"ساعتين"},{v:1440,l:"يوم"}].map(({v,l})=>(
          <button key={v} onClick={()=>setReminderMins(v)}
            style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${reminderMins===v?"var(--p)":"#2a2a3a"}`,background:reminderMins===v?"var(--pa12)":"#1a1a2e",color:reminderMins===v?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>
            {l}
          </button>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:"#888",flexShrink:0}}>أو أدخل دقائق:</span>
        <input type="number" min="1" max="10080"
          style={{width:80,padding:"6px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
          value={reminderMins} onChange={e=>setReminderMins(Math.max(1,+e.target.value))}/>
        <span style={{fontSize:11,color:"#888"}}>دقيقة</span>
      </div>
    </div>
    {history.length===0?<div style={G.empty}>لا توجد حجوزات سابقة</div>:
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {[...history].reverse().map((h,i)=>{
          const s=salons.find(x=>x.id===h.salonId||x.id===Number(h.salonId));
          // نجيب الحالة الحقيقية من بيانات الصالون بمقارنة مرنة
          const realBooking=s?.bookings?.find(b=>
            b.date===h.date && b.time===h.time &&
            (b.phone===h.phone || b.name===customer.name)
          ) || s?.bookings?.find(b=>b.date===h.date&&b.time===h.time);
          const status=realBooking?.status||h.status||"pending";
          const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":"#f39c12";
          const stLabel=status==="approved"?"✅ مقبول":status==="rejected"?"❌ مرفوض":"⏳ بانتظار الموافقة";
          return(
            <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s?.name||h.salonName||"صالون"}</div>
                  <div style={{fontSize:11,color:"#aaa"}}>📅 {h.date} · 🕐 {h.time}</div>
                  <div style={{fontSize:11,color:"#aaa"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>💰 {h.total||0} ريال</div>
                  <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                  {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=h.rating?"#f0c040":"#333"}}>★</span>)}</div>}
                  {s&&<button style={{...G.bookBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{setSelSalon(s);setView("book");}}>🔄 احجز مجدداً</button>}
                  <button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>🔔 ذكّرني</button>
                </div>
              </div>
              {/* التقييم فقط بعد القبول */}
              {status==="approved"&&<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                const rev=[...history].reverse();
                rev[i]={...rev[i],rating:r,comment};
                const updated=[...rev].reverse();
                setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated}:c));
                try{await sb("customers","PATCH",{history:updated},`?id=eq.${customer.id}`);}catch{}
                // تحديث تقييم الصالون مباشرة
                try{
                  const salonId=h.salonId;
                  const allRatings=updated.filter(x=>Number(x.salonId)===Number(salonId)&&x.rating>0).map(x=>x.rating);
                  const newRating=allRatings.length?Math.round(allRatings.reduce((a,x)=>a+x,0)/allRatings.length*10)/10:r;
                  await sb("salons","PATCH",{rating:newRating},`?id=eq.${salonId}`);
                  setSalons(p=>p.map(s=>s.id===Number(salonId)||s.id===salonId?{...s,rating:newRating}:s));
                }catch{}
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
              <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"#2a2a3a":"var(--p)"}`}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:20}}>{n.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.title}</div>
                    <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{n.body}</div>
                    <div style={{fontSize:10,color:"#555",marginTop:3}}>{n.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    );
  })()}
  {tab==="invite"&&(()=>{
    const inviteCode=`DORK-${customer.id}-${customer.name?.charCodeAt(0)||0}`;
    const inviteLink=`${window.location.origin}${window.location.pathname}?invite=${inviteCode}`;
    const inviteCount=parseInt(localStorage.getItem(`invite_${customer.id}`)||"0");
    return(
      <div>
        <div style={{background:"linear-gradient(135deg,var(--pa12),var(--pa08))",borderRadius:16,padding:20,border:"1px solid var(--pa25)",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:36,marginBottom:8}}>🎁</div>
          <div style={{fontSize:16,fontWeight:900,color:"var(--p)",marginBottom:4}}>ادعُ أصدقاءك</div>
          <div style={{fontSize:12,color:"#aaa",marginBottom:16}}>احصل على 50 نقطة لكل صديق يسجّل عبر رابطك</div>
          <div style={{background:"#0d0d1a",borderRadius:10,padding:"10px 14px",marginBottom:12,fontFamily:"monospace",fontSize:14,color:"var(--p)",fontWeight:700,letterSpacing:2}}>
            {inviteCode}
          </div>
          <button style={G.sub} onClick={async()=>{
            if(navigator.share){
              try{await navigator.share({title:"دورك - دعوة",text:`انضم لتطبيق دورك للحجز في أفضل صالونات الحلاقة! استخدم كودي: ${inviteCode}`,url:inviteLink});}catch{}
            }else{
              navigator.clipboard?.writeText(inviteLink).then(()=>alert("✅ تم نسخ رابط الدعوة!")).catch(()=>alert(inviteLink));
            }
          }}>📤 مشاركة رابط الدعوة</button>
        </div>
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10}}>📊 إحصائيات دعوتي</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{v:inviteCount,l:"صديق سجّل",c:"#27ae60"},{v:inviteCount*50,l:"نقطة كسبتها",c:"var(--p)"}].map(({v,l,c})=>(
              <div key={l} style={{background:"#0d0d1a",borderRadius:10,padding:"12px 8px",textAlign:"center",border:`1px solid ${c}33`}}>
                <div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:11,color:"#888"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a"}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8}}>🎯 كيف يعمل؟</div>
          {["شارك رابطك مع أصدقائك","لما يسجّل صديقك عبر رابطك","تحصل على 50 نقطة تلقائياً","استخدم النقاط للحصول على خصومات"].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"var(--p)",color:"#000",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,color:"#ccc",lineHeight:1.6}}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    );
  })()}

  {/* إعدادات الحساب */}
  {tab==="settings"&&(
    <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
      <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>⚙️ إعدادات الحساب</div>
      <div style={{fontSize:12,color:"#888",marginBottom:16,lineHeight:1.8}}>
        <div>👤 الاسم: <span style={{color:"#fff",fontWeight:700}}>{customer.name}</span></div>
        <div>📞 الجوال: <span style={{color:"#fff",fontWeight:700}}>{customer.phone}</span></div>
        <div>🎁 النقاط: <span style={{color:"#27ae60",fontWeight:700}}>{points} نقطة</span></div>
        <div>📋 الحجوزات: <span style={{color:"var(--p)",fontWeight:700}}>{history.length} حجز</span></div>
      </div>
      <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>{setTab("favs");setEditMode(true);}}>✏️ تعديل البيانات</button>
      <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>🗑 حذف الحساب نهائياً</button>
      <div style={{fontSize:10,color:"#555",marginTop:8,textAlign:"center"}}>تحذير: حذف الحساب لا يمكن التراجع عنه</div>
    </div>
  )}

</div></div>
```

);
}

function InlineStarRating({rated,comment,onRate}){
const[hover,setHover]=useState(0);
const[sel,setSel]=useState(0);
const[txt,setTxt]=useState(””);
const labels=[””,“ضعيف”,“مقبول”,“جيد”,“جيد جداً”,“ممتاز”];
if(rated>0) return(
<div style={{marginTop:8,borderTop:“1px solid #1e1e2e”,paddingTop:8}}>
<div style={{display:“flex”,gap:1,marginBottom:comment?4:0}}>
{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=rated?”#f0c040”:”#333”}}>★</span>)}
<span style={{fontSize:11,color:”#888”,marginRight:6,alignSelf:“center”}}>{labels[rated]}</span>
</div>
{comment&&<div style={{fontSize:12,color:”#aaa”,fontStyle:“italic”}}>”{comment}”</div>}
</div>
);
return(
<div style={{marginTop:8,borderTop:“1px solid #1e1e2e”,paddingTop:8}}>
<div style={{fontSize:11,color:”#666”,marginBottom:5}}>قيّم تجربتك في هذا الصالون:</div>
<div style={{display:“flex”,alignItems:“center”,gap:3,marginBottom:8}}>
{[1,2,3,4,5].map(n=>(
<span key={n}
style={{fontSize:28,cursor:“pointer”,color:n<=(hover||sel)?”#f0c040”:”#2a2a3a”,transition:“color .1s”,lineHeight:1,userSelect:“none”}}
onMouseEnter={()=>setHover(n)}
onMouseLeave={()=>setHover(0)}
onClick={()=>setSel(n)}>★</span>
))}
{(hover||sel)>0&&<span style={{fontSize:11,color:“var(–p)”,marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
</div>
{sel>0&&<>
<textarea
style={{width:“100%”,padding:“8px 10px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:12,fontFamily:“inherit”,outline:“none”,boxSizing:“border-box”,direction:“rtl”,resize:“none”,minHeight:60,marginBottom:8}}
placeholder=“أضف تعليقاً (اختياري)…”
value={txt} onChange={e=>setTxt(e.target.value)}/>
<button style={{…G.sub,padding:“8px 0”,fontSize:12}} onClick={()=>onRate(sel,txt)}>
إرسال التقييم ⭐
</button>
</>}
</div>
);
}

function AdminCustomerList({customers,salons,toast$,setCustomers}){
const[selId,setSelId]=useState(null);
const[notes,setNotes]=useState({});
const[blocked,setBlocked]=useState({});
const[custSearch,setCustSearch]=useState(””);
const sel=selId?customers.find(c=>c.id===selId):null;

const filtered=!custSearch.trim()?customers:customers.filter(c=>
c.name?.toLowerCase().includes(custSearch.toLowerCase())||
c.phone?.includes(custSearch.trim())
);

if(sel){
const history=sel.history||[];
const favs=sel.favs||[];
const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
const isBlocked=blocked[sel.id];
return(
<div>
<div style={{display:“flex”,alignItems:“center”,gap:8,marginBottom:12}}>
<button style={G.bb} onClick={()=>setSelId(null)}>→</button>
<span style={{fontSize:14,fontWeight:700,color:”#fff”}}>👤 {sel.name}</span>
{isBlocked&&<span style={{fontSize:11,background:“rgba(231,76,60,.2)”,color:”#e74c3c”,padding:“2px 8px”,borderRadius:20,fontWeight:700}}>محظور</span>}
</div>

```
    {/* معلومات */}
    <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
      <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>معلومات العميل</div>
      <div style={{fontSize:13,color:"#fff",marginBottom:4}}>👤 {sel.name}</div>
      <div style={{fontSize:12,color:"#888",marginBottom:4}}>📞 {sel.phone}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
        {[{v:history.length,l:"حجز",c:"#6aadff"},{v:totalSpent+" ر",l:"إجمالي",c:"#f0c040"},{v:favs.length,l:"مفضلة",c:"#e74c3c"}].map(({v,l,c})=>(
          <div key={l} style={{background:"#0d0d1a",borderRadius:9,padding:"9px 6px",textAlign:"center",border:`1px solid ${c}33`}}>
            <div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div>
            <div style={{fontSize:10,color:"#888"}}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* نقاط الولاء */}
    <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #27ae6033",marginBottom:10}}>
      <div style={{fontSize:12,color:"#27ae60",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>🎁 نقاط الولاء</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:900,color:"#27ae60"}}>{sel.loyaltyPoints||0}</div>
          <div style={{fontSize:11,color:"#888"}}>نقطة</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,flex:2}}>
          <div style={{display:"flex",gap:6}}>
            <button style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #27ae60",background:"rgba(39,174,96,.1)",color:"#27ae60",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
              onClick={async()=>{
                const v=prompt("إضافة نقاط (أدخل رقم):");
                if(!v||isNaN(+v))return;
                const pts=(sel.loyaltyPoints||0)+(+v);
                try{await sb("customers","PATCH",{loyalty_points:pts},`?id=eq.${sel.id}`);setCustomers(p=>p.map(c=>c.id===sel.id?{...c,loyaltyPoints:pts}:c));toast$&&toast$("✅ تم إضافة النقاط");}catch(e){toast$&&toast$("❌ خطأ");}
              }}>+ إضافة</button>
            <button style={{flex:1,padding:"7px 0",borderRadius:8,border:"1px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
              onClick={async()=>{
                const v=prompt("خصم نقاط (أدخل رقم):");
                if(!v||isNaN(+v))return;
                const pts=Math.max(0,(sel.loyaltyPoints||0)-(+v));
                try{await sb("customers","PATCH",{loyalty_points:pts},`?id=eq.${sel.id}`);setCustomers(p=>p.map(c=>c.id===sel.id?{...c,loyaltyPoints:pts}:c));toast$&&toast$("✅ تم خصم النقاط");}catch(e){toast$&&toast$("❌ خطأ");}
              }}>- خصم</button>
          </div>
          <button style={{padding:"7px 0",borderRadius:8,border:`1px solid ${sel.loyaltyFrozen?"#27ae60":"#f39c12"}`,background:sel.loyaltyFrozen?"rgba(39,174,96,.1)":"rgba(243,156,18,.1)",color:sel.loyaltyFrozen?"#27ae60":"#f39c12",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
            onClick={async()=>{
              try{await sb("customers","PATCH",{loyalty_frozen:!sel.loyaltyFrozen},`?id=eq.${sel.id}`);setCustomers(p=>p.map(c=>c.id===sel.id?{...c,loyaltyFrozen:!c.loyaltyFrozen}:c));toast$&&toast$(sel.loyaltyFrozen?"✅ تم تفعيل النقاط":"🔒 تم تجميد نقاط العميل");}catch(e){toast$&&toast$("❌ خطأ");}
            }}>{sel.loyaltyFrozen?"✅ تفعيل النقاط":"🔒 تجميد النقاط"}</button>
        </div>
      </div>
    </div>

    {/* سجل الحجوزات */}
    {history.length>0&&<div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
      <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>📋 سجل الحجوزات</div>
      {[...history].reverse().slice(0,5).map((h,i)=>{
        const s=salons.find(x=>x.id===h.salonId);
        return(
          <div key={i} style={{padding:"7px 0",borderBottom:"1px solid #1e1e2e"}}>
            <div style={{fontSize:12,color:"#fff",fontWeight:600}}>✂ {s?.name||"صالون محذوف"}</div>
            <div style={{fontSize:11,color:"#888"}}>📅 {h.date} · 💰 {h.total||0} ر</div>
          </div>
        );
      })}
    </div>}

    {/* ملاحظة */}
    <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
      <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8}}>📝 ملاحظة داخلية</div>
      <textarea style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"vertical",minHeight:70}}
        placeholder="ملاحظة خاصة عن هذا العميل..." value={notes[sel.id]||""}
        onChange={e=>setNotes(p=>({...p,[sel.id]:e.target.value}))}/>
      <button style={{...G.sub,marginTop:6}} onClick={()=>toast$&&toast$("✅ تم حفظ الملاحظة")}>💾 حفظ الملاحظة</button>
    </div>

    {/* أزرار الإجراءات */}
    <div style={{display:"flex",gap:8}}>
      <button style={{flex:1,padding:"10px 0",borderRadius:9,border:`1.5px solid ${isBlocked?"#27ae60":"#f39c12"}`,background:isBlocked?"rgba(39,174,96,.12)":"rgba(243,156,18,.12)",color:isBlocked?"#27ae60":"#f39c12",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
        onClick={()=>{setBlocked(p=>({...p,[sel.id]:!isBlocked}));toast$&&toast$(isBlocked?"✅ تم رفع الحظر":"🚫 تم حظر العميل");}}>
        {isBlocked?"✅ رفع الحظر":"🚫 حظر العميل"}
      </button>
      <button style={{...G.delBtn,flex:1,padding:"10px 0",textAlign:"center"}} onClick={async()=>{
        const reason=prompt("سبب الحذف (اختياري):");
        if(!confirm(`حذف العميل "${sel.name}"؟${reason?"\nالسبب: "+reason:""}`))return;
        try{
          await sb("customers","DELETE",null,`?id=eq.${sel.id}`);
          setCustomers(p=>p.filter(c=>c.id!==sel.id));
          toast$&&toast$("🗑 تم حذف العميل"+(reason?" — السبب: "+reason:""));
          setSelId(null);
        }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
      }}>🗑 حذف</button>
    </div>
  </div>
);
```

}

return(
<div>
{/* بحث العملاء */}
<div style={{...G.searchRow,marginBottom:10}}>
<span style={{fontSize:14,color:”#555”}}>🔍</span>
<input style={G.searchInput} placeholder=“ابحث بالاسم أو رقم الجوال…” value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
{custSearch&&<button style={G.searchClear} onClick={()=>setCustSearch(””)}>✕</button>}
</div>
{filtered.length===0&&<div style={G.empty}>لا نتائج</div>}
<div style={{display:“flex”,flexDirection:“column”,gap:8}}>
{filtered.map(c=>{
const isBlocked=blocked[c.id];
return(
<div key={c.id} style={{…G.bItem,borderRight:`3px solid ${isBlocked?"#e74c3c":"#6aadff"}`,cursor:“pointer”}} onClick={()=>setSelId(c.id)}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“center”}}>
<div>
<div style={{display:“flex”,alignItems:“center”,gap:6}}>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>👤 {c.name}</div>
{isBlocked&&<span style={{fontSize:10,background:“rgba(231,76,60,.2)”,color:”#e74c3c”,padding:“1px 6px”,borderRadius:20}}>محظور</span>}
</div>
<div style={{fontSize:11,color:”#888”}}>📞 {c.phone}</div>
</div>
<div style={{textAlign:“left”,flexShrink:0}}>
<div style={{fontSize:11,color:”#a78bfa”}}>📋 {(c.history||[]).length} حجز</div>
<div style={{fontSize:11,color:”#e74c3c”,marginTop:2}}>♥ {(c.favs||[]).length} مفضلة</div>
</div>
</div>
</div>
);
})}
</div>
</div>
);
}

function AdminApprovedList({salons,setSalons,deleteSalon,setSelSalon,setView,toast$}){
const[editId,setEditId]=useState(null);
const[ef,setEf]=useState(null);
const[pinned,setPinned]=useState(()=>{try{return JSON.parse(localStorage.getItem(“pinned_salons”)||”[]”);}catch{return[];}});
const[weekSalon,setWeekSalonState]=useState(()=>{try{return localStorage.getItem(“week_salon”)||””;}catch{return “”;}});
const sel=editId?salons.find(s=>s.id===editId):null;
const DAYS=[“الأحد”,“الإثنين”,“الثلاثاء”,“الأربعاء”,“الخميس”,“الجمعة”,“السبت”];

const togglePin=(id)=>{
const newPinned=pinned.includes(id)?pinned.filter(x=>x!==id):[…pinned,id];
setPinned(newPinned);localStorage.setItem(“pinned_salons”,JSON.stringify(newPinned));
toast$&&toast$(pinned.includes(id)?“📌 تم إلغاء التثبيت”:“📌 تم تثبيت الصالون”);
};

const toggleFreeze=async(s)=>{
try{
await sb(“salons”,“PATCH”,{frozen:!s.frozen},`?id=eq.${s.id}`);
setSalons(p=>p.map(x=>x.id===s.id?{…x,frozen:!s.frozen}:x));
toast$&&toast$(s.frozen?“✅ تم تفعيل الصالون”:“🔒 تم تجميد الصالون مؤقتاً”);
}catch(e){toast$&&toast$(“❌ خطأ: “+e.message,“err”);}
};

const setWeeklySalon=(id)=>{
const newVal=weekSalon===String(id)?””:String(id);
setWeekSalonState(newVal);localStorage.setItem(“week_salon”,newVal);
toast$&&toast$(newVal?“🏅 تم اختيار صالون الأسبوع”:“🏅 تم إلغاء الاختيار”);
};

const sortedSalons=[…salons].sort((a,b)=>{
const aw=weekSalon===String(a.id)?2:0,bw=weekSalon===String(b.id)?2:0;
const ap=pinned.includes(a.id)?1:0,bp=pinned.includes(b.id)?1:0;
return(bw+bp)-(aw+ap);
});

const startEdit=s=>{setEditId(s.id);setEf({name:s.name,owner:s.owner,phone:s.phone,ownerPhone:s.ownerPhone||s.phone,address:s.address,rating:s.rating||5,welcomeMsg:s.welcomeMsg||””,closedDays:s.closedDays||[],slotMin:s.slotMin||40});};

const save=async()=>{
try{
await sb(“salons”,“PATCH”,{name:ef.name,owner:ef.owner,phone:ef.phone,owner_phone:ef.ownerPhone,address:ef.address,rating:ef.rating,welcome_msg:ef.welcomeMsg,closed_days:ef.closedDays,slot_min:ef.slotMin},`?id=eq.${editId}`);
setSalons(p=>p.map(s=>s.id===editId?{…s,…ef,ownerPhone:ef.ownerPhone,welcomeMsg:ef.welcomeMsg,closedDays:ef.closedDays,slotMin:ef.slotMin}:s));
toast$&&toast$(“✅ تم الحفظ”);setEditId(null);setEf(null);
}catch(e){toast$&&toast$(“❌ خطأ: “+e.message,“err”);}
};

if(editId&&ef&&sel) return(
<div>
<div style={{display:“flex”,alignItems:“center”,gap:8,marginBottom:12}}>
<button style={G.bb} onClick={()=>{setEditId(null);setEf(null);}}>→</button>
<span style={{fontSize:14,fontWeight:700,color:”#fff”}}>✏️ تعديل: {sel.name}</span>
</div>
<div style={{background:”#13131f”,borderRadius:13,padding:16,border:“1px solid var(–pa25)”,marginBottom:8}}>
{[[“اسم الصالون”,“name”],[“اسم المالك”,“owner”],[“جوال الصالون”,“phone”],[“جوال المالك”,“ownerPhone”],[“العنوان”,“address”]].map(([l,k])=>(
<div key={k} style={{marginBottom:10}}>
<label style={{display:“block”,fontSize:11,color:”#aaa”,marginBottom:3,fontWeight:600}}>{l}</label>
<input style={{width:“100%”,padding:“10px 12px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,direction:“rtl”,boxSizing:“border-box”}} value={ef[k]||””} onChange={e=>setEf(f=>({…f,[k]:e.target.value}))}/>
</div>
))}
<div style={{marginBottom:10}}>
<label style={{display:“block”,fontSize:11,color:”#aaa”,marginBottom:3,fontWeight:600}}>التقييم ⭐</label>
<input type=“number” min=“1” max=“5” step=“0.1” style={{width:“100%”,padding:“10px 12px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,direction:“rtl”,boxSizing:“border-box”}} value={ef.rating} onChange={e=>setEf(f=>({…f,rating:+e.target.value}))}/>
</div>
<div style={{marginBottom:10}}>
<label style={{display:“block”,fontSize:11,color:”#aaa”,marginBottom:3,fontWeight:600}}>💬 رسالة ترحيب</label>
<input style={{width:“100%”,padding:“10px 12px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,direction:“rtl”,boxSizing:“border-box”}} placeholder=“مثال: أهلاً بك 👋” value={ef.welcomeMsg} onChange={e=>setEf(f=>({…f,welcomeMsg:e.target.value}))}/>
</div>
<div style={{marginBottom:10}}>
<label style={{display:“block”,fontSize:11,color:”#aaa”,marginBottom:6,fontWeight:600}}>📅 أيام الإغلاق</label>
<div style={{display:“flex”,flexWrap:“wrap”,gap:5}}>
{DAYS.map((d,i)=>{const closed=ef.closedDays.includes(i);return(
<button key={i} style={{padding:“5px 10px”,borderRadius:8,border:`1.5px solid ${closed?"#e74c3c":"#2a2a3a"}`,background:closed?“rgba(231,76,60,.15)”:”#0d0d1a”,color:closed?”#e74c3c”:”#888”,cursor:“pointer”,fontSize:11,fontFamily:“inherit”}}
onClick={()=>setEf(f=>({…f,closedDays:closed?f.closedDays.filter(x=>x!==i):[…f.closedDays,i]}))}>
{d}
</button>
);})}
</div>
</div>
<div style={{marginBottom:12}}>
<label style={{display:“block”,fontSize:11,color:”#aaa”,marginBottom:6,fontWeight:600}}>⏱ مدة الموعد</label>
<div style={{display:“flex”,gap:8}}>
{[20,30,40,60].map(m=>(
<button key={m} style={{flex:1,padding:“8px 0”,borderRadius:8,border:`1.5px solid ${ef.slotMin===m?"var(--p)":"#2a2a3a"}`,background:ef.slotMin===m?“var(–pa12)”:”#0d0d1a”,color:ef.slotMin===m?“var(–p)”:”#888”,cursor:“pointer”,fontSize:12,fontFamily:“inherit”,fontWeight:ef.slotMin===m?700:400}} onClick={()=>setEf(f=>({…f,slotMin:m}))}>{m} د</button>
))}
</div>
</div>
<div style={{display:“flex”,gap:8}}>
<button style={G.sub} onClick={save}>💾 حفظ</button>
<button style={{…G.delBtn,padding:“12px 14px”,flexShrink:0}} onClick={()=>{const r=prompt(“سبب الحذف:”);if(confirm(`حذف؟${r?"\n"+r:""}`)){deleteSalon(editId);setEditId(null);setEf(null);}}}>🗑</button>
</div>
</div>
</div>
);

return(
<div style={{display:“flex”,flexDirection:“column”,gap:8}}>
{sortedSalons.map(s=>{
const isPinned=pinned.includes(s.id);
const isWeek=weekSalon===String(s.id);
const isFrozen=s.frozen;
const lastBk=s.bookings.length?[…s.bookings].sort((a,b)=>b.date>a.date?1:-1)[0]:null;
return(
<div key={s.id} style={{…G.bItem,borderRight:`3px solid ${isWeek?"#f0c040":isPinned?"#8b5cf6":isFrozen?"#e74c3c":"#27ae60"}`,opacity:isFrozen?.7:1}}>
<div style={{display:“flex”,justifyContent:“space-between”,alignItems:“flex-start”}}>
<div style={{flex:1,minWidth:0}}>
<div style={{display:“flex”,alignItems:“center”,gap:6,flexWrap:“wrap”}}>
<div style={{fontSize:13,fontWeight:700,color:”#fff”}}>✂ {s.name}</div>
{isWeek&&<span style={{fontSize:10,color:”#f0c040”}}>🏅 الأسبوع</span>}
{isPinned&&<span style={{fontSize:10,color:”#8b5cf6”}}>📌</span>}
{isFrozen&&<span style={{fontSize:10,color:”#e74c3c”,background:“rgba(231,76,60,.15)”,padding:“1px 6px”,borderRadius:10}}>🔒 مجمّد</span>}
</div>
<div style={{fontSize:11,color:”#888”}}>👤 {s.owner} · 📞 {s.phone}</div>
{s.ownerPhone&&s.ownerPhone!==s.phone&&<div style={{fontSize:11,color:”#888”}}>📱 مالك: {s.ownerPhone}</div>}
<div style={{fontSize:11,color:”#888”}}>📍 {s.gov||s.region}{s.village?” · “+s.village:””}</div>
<div style={{display:“flex”,gap:8,marginTop:3,flexWrap:“wrap”}}>
<span style={{fontSize:10,color:”#4caf50”}}>📅 {s.bookings.length} حجز</span>
<span style={{fontSize:10,color:“var(–p)”}}>⭐ {s.rating}</span>
{lastBk&&<span style={{fontSize:10,color:”#6aadff”}}>🕐 آخر نشاط: {lastBk.date}</span>}
</div>
</div>
<div style={{display:“flex”,flexDirection:“column”,gap:4,flexShrink:0}}>
<button style={{…G.pageBtn,fontSize:10,padding:“5px 9px”,background:isWeek?“rgba(240,192,64,.2)”:“transparent”,border:`1px solid ${isWeek?"#f0c040":"#444"}`,color:isWeek?”#f0c040”:”#888”}} onClick={()=>setWeeklySalon(s.id)}>🏅</button>
<button style={{…G.pageBtn,fontSize:10,padding:“5px 9px”,background:isPinned?“rgba(139,92,246,.2)”:“transparent”,border:`1px solid ${isPinned?"#8b5cf6":"#444"}`,color:isPinned?”#8b5cf6”:”#888”}} onClick={()=>togglePin(s.id)}>📌</button>
<button style={{…G.pageBtn,fontSize:10,padding:“5px 9px”,background:isFrozen?“rgba(231,76,60,.15)”:“transparent”,border:`1px solid ${isFrozen?"#e74c3c":"#444"}`,color:isFrozen?”#e74c3c”:”#888”}} onClick={()=>toggleFreeze(s)}>🔒</button>
<button style={{…G.pageBtn,fontSize:10,padding:“5px 9px”,background:“rgba(212,160,23,.12)”,border:“1px solid var(–p)”,color:“var(–p)”}} onClick={()=>startEdit(s)}>✏️</button>
<button style={{…G.pageBtn,fontSize:10,padding:“5px 9px”}} onClick={()=>{setSelSalon(s);setView(“salon”);}}>📋</button>
<button style={{…G.delBtn,fontSize:10,padding:“5px 9px”}} onClick={()=>{const r=prompt(“سبب الحذف:”);if(confirm(`حذف؟${r?"\n"+r:""}`))deleteSalon(s.id);}}>🗑</button>
</div>
</div>
</div>
);
})}
</div>
);
}

// ══════════════════════════════════════════════
//  SETTINGS VIEW
// ══════════════════════════════════════════════
function SettingsView({settings,setSettings,setView,toast$,adminSession,loyaltySettings,setLoyaltySettings,socialLinks,setSocialLinks,darkMode,setDarkMode}){
const[sec,setSec]=useState(“theme”);
const SECS=[
{id:“theme”,icon:“🎨”,label:“الألوان”},
{id:“bg”,   icon:“🖼”,label:“الخلفية”},
{id:“font”, icon:“🔤”,label:“الخط”},
{id:“dark”, icon:“🌙”,label:“الإضاءة”},
{id:“tone”, icon:“🔔”,label:“النغمات”},
{id:“social”,icon:“📱”,label:“التواصل”},
{id:“guide”,icon:“📖”,label:“الدليل”},
{id:“faq”,  icon:“❓”,label:“أسئلة”},
{id:“danger”,icon:“⚠️”,label:“الخطر”},
];
const THEME_OPTIONS=[
{id:“gold”,label:“ذهبي”,color:”#d4a017”,emoji:“✨”},
{id:“emerald”,label:“زمردي”,color:”#10b981”,emoji:“🌿”},
{id:“sapphire”,label:“ياقوتي”,color:”#3b82f6”,emoji:“💎”},
{id:“rose”,label:“وردي”,color:”#ec4899”,emoji:“🌸”},
{id:“violet”,label:“بنفسجي”,color:”#8b5cf6”,emoji:“🔮”},
{id:“crimson”,label:“قرمزي”,color:”#ef4444”,emoji:“🔴”},
];
const applyTheme=(id)=>{
const t=THEMES[id]||THEMES.gold;
const r=document.documentElement.style;
r.setProperty(”–p”,t.primary);r.setProperty(”–pl”,t.light);r.setProperty(”–pd”,t.dark);r.setProperty(”–pll”,t.lightest);r.setProperty(”–pr”,t.rgb);
[“5”,“07”,“08”,“12”,“15”,“18”,“2”,“25”,“3”,“4”].forEach(a=>{
const pct=a===“4”?.45:a===“3”?.3:a===“25”?.25:a===“2”?.2:a===“18”?.18:a===“15”?.15:a===“12”?.12:a===“08”?.08:a===“07”?.07:.05;
r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);
});
r.setProperty(”–grad”,`linear-gradient(135deg,${t.primary},${t.light})`);
r.setProperty(”–grad2”,`linear-gradient(135deg,${t.light},${t.primary})`);
setSettings(s=>({…s,theme:id}));
};
const box={background:”#13131f”,borderRadius:13,padding:16,border:“1px solid #2a2a3a”,marginBottom:12};
const hdr={fontSize:13,fontWeight:700,color:“var(–p)”,marginBottom:10,paddingBottom:6,borderBottom:“1px solid #2a2a3a”};
const inp2={width:“100%”,padding:“10px 12px”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,boxSizing:“border-box”,direction:“rtl”};
const lbl={display:“block”,fontSize:11,color:”#aaa”,marginBottom:4,fontWeight:600};

return(
<div style={G.page}><div style={G.fp}>
<div style={G.fh}><button style={G.bb} onClick={()=>setView(“home”)}>→</button><h2 style={G.ft}>⚙ الإعدادات</h2></div>
<div style={{display:“flex”,gap:5,marginBottom:14,overflowX:“auto”,paddingBottom:2}}>
{SECS.map(s=>(
<button key={s.id} onClick={()=>setSec(s.id)}
style={{flexShrink:0,padding:“6px 10px”,borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"#2a2a3a"}`,background:sec===s.id?“var(–pa12)”:”#1a1a2e”,color:sec===s.id?“var(–p)”:”#888”,cursor:“pointer”,fontSize:11,fontFamily:“inherit”,fontWeight:sec===s.id?700:400,display:“flex”,alignItems:“center”,gap:4}}>
{s.icon} {s.label}
</button>
))}
</div>

```
  {sec==="theme"&&<div style={box}>
    <div style={hdr}>🎨 لون واجهة التطبيق</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {THEME_OPTIONS.map(t=>{
        const active=settings.theme===t.id;
        return(
          <button key={t.id} onClick={()=>applyTheme(t.id)}
            style={{padding:"14px 6px",borderRadius:12,border:`2px solid ${active?t.color:"#2a2a3a"}`,background:active?t.color+"22":"#1a1a2e",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)"}}>
            <span style={{fontSize:22}}>{t.emoji}</span>
            <div style={{width:24,height:24,borderRadius:"50%",background:t.color,boxShadow:active?`0 0 0 3px ${t.color}55`:"none"}}/>
            <span style={{fontSize:11,color:active?t.color:"#888"}}>{t.label}</span>
          </button>
        );
      })}
    </div>
  </div>}

  {sec==="font"&&<div style={box}>
    <div style={hdr}>🔤 حجم الخط</div>
    <div style={{fontSize:11,color:"#666",marginBottom:12}}>اختر حجم الخط المناسب لك</div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {[{id:"sm",label:"صغير",size:13},{id:"md",label:"متوسط",size:15},{id:"lg",label:"كبير",size:17}].map(({id,label,size})=>{
        const active=(settings.fontSize||"md")===id;
        return(
          <button key={id} onClick={()=>setSettings(s=>({...s,fontSize:id}))}
            style={{flex:1,padding:"14px 6px",borderRadius:12,border:`2px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#888",cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,fontSize:size,transform:active?"scale(1.04)":"scale(1)"}}>
            {label}
          </button>
        );
      })}
    </div>
    <div style={{background:"#0d0d1a",borderRadius:10,padding:14,border:"1px solid #2a2a3a",fontSize:settings.fontSize==="sm"?13:settings.fontSize==="lg"?17:15,color:"#aaa",lineHeight:1.7}}>
      معاينة: هذا نص تجريبي لمعاينة حجم الخط المختار في تطبيق دورك للحلاقة والصالونات.
    </div>
  </div>}

  {sec==="bg"&&<div style={box}>
    <div style={hdr}>🖼 خلفية التطبيق</div>
    <div style={{fontSize:11,color:"#666",marginBottom:12}}>اختر خلفية تنسجم مع اللون</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {BACKGROUNDS.map(bg=>{
        const active=(settings.bg||"none")===bg.id;
        return(
          <button key={bg.id} onClick={()=>{
            applyBackground(bg.id);
            setSettings(s=>({...s,bg:bg.id}));
            // تطبيق فوري
            const el=document.getElementById("dork-bg");
            if(el){
              if(bg.id==="none"){el.style.background="#0d0d1a";el.style.backgroundImage="none";}
              else if(bg.id==="stars"){el.style.background="radial-gradient(ellipse at top,#1a1a3a,#0d0d1a)";el.style.backgroundImage="radial-gradient(circle,rgba(255,255,255,.08) 1px,transparent 1px)";el.style.backgroundSize="40px 40px";}
              else if(bg.id==="grid"){el.style.background="#0d0d1a";el.style.backgroundImage="linear-gradient(rgba(212,160,23,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.05) 1px,transparent 1px)";el.style.backgroundSize="30px 30px";}
              else if(bg.id==="waves"){el.style.background="linear-gradient(180deg,#0d0d1a 0%,#0a1628 50%,#0d0d1a 100%)";el.style.backgroundImage="none";}
              else if(bg.id==="marble"){el.style.background="linear-gradient(135deg,#111118 25%,#1a1a2a 25%,#1a1a2a 50%,#111118 50%,#111118 75%,#1a1a2a 75%)";el.style.backgroundSize="20px 20px";el.style.backgroundImage="none";}
              else if(bg.id==="circuit"){el.style.background="#0d0d1a";el.style.backgroundImage="radial-gradient(circle at 50%,rgba(212,160,23,.03) 0%,transparent 60%)";}
            }
          }}
            style={{padding:"18px 6px",borderRadius:12,border:`2px solid ${active?"var(--p)":"#2a2a3a"}`,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)",minHeight:80,background:active?"var(--pa12)":"#1a1a2e"}}>
            <span style={{fontSize:26}}>{bg.emoji}</span>
            <span style={{fontSize:11,color:active?"var(--p)":"#aaa",fontWeight:active?700:400}}>{bg.label}</span>
            {active&&<span style={{fontSize:9,color:"var(--p)"}}>✓ مفعّل</span>}
          </button>
        );
      })}
    </div>
  </div>}

  {sec==="dark"&&<div style={box}>
    <div style={hdr}>🌙 وضع الإضاءة</div>
    <div style={{fontSize:11,color:"#666",marginBottom:14}}>اختر الوضع المناسب لك</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{id:true,label:"🌙 داكن",desc:"خلفية سوداء"},{id:false,label:"☀️ فاتح",desc:"خلفية بيضاء"}].map(({id,label,desc})=>{
        const active=darkMode===id;
        return(
          <button key={String(id)} onClick={()=>setDarkMode&&setDarkMode(id)}
            style={{padding:"18px 10px",borderRadius:12,border:`2px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":id?"#0d0d1a":"#f0f0f0",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:active?"scale(1.04)":"scale(1)"}}>
            <span style={{fontSize:28}}>{label.split(" ")[0]}</span>
            <span style={{fontSize:13,color:active?"var(--p)":id?"#aaa":"#555",fontWeight:active?700:400}}>{label.split(" ")[1]}</span>
            <span style={{fontSize:11,color:"#888"}}>{desc}</span>
            {active&&<span style={{fontSize:10,color:"var(--p)"}}>✓ مفعّل</span>}
          </button>
        );
      })}
    </div>
  </div>}

  {sec==="tone"&&<div style={box}>
    <div style={hdr}>🔔 نغمة التنبيه</div>
    <div style={{fontSize:11,color:"#666",marginBottom:12}}>اضغط للمعاينة</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {TONES.map(t=>{
        const active=settings.defaultTone===t.id;
        return(
          <button key={t.id} onClick={()=>{setSettings(s=>({...s,defaultTone:t.id}));playTone(t.id,0.8);}}
            style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center"}}>
            {t.label} {active&&"✓"}
          </button>
        );
      })}
    </div>
  </div>}

  {sec==="social"&&<div style={box}>
    <div style={hdr}>📱 وسائل التواصل</div>
    <div style={{fontSize:12,color:"#888",marginBottom:12,background:"rgba(255,255,255,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid #2a2a3a",display:"flex",alignItems:"center",gap:6}}>
      <span>🔒</span><span>للعرض فقط — التعديل من لوحة الإدارة</span>
    </div>
    {socialLinks?.enabled
      ?<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {socialLinks.email&&<a href={`mailto:${socialLinks.email}`} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"#13131f",border:"1px solid #2a2a3a",textDecoration:"none",color:"#fff"}}>
          <span style={{fontSize:18}}>📧</span><span style={{fontSize:13}}>{socialLinks.email}</span>
        </a>}
        {socialLinks.whatsapp&&<a href={`https://wa.me/966${socialLinks.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"#13131f",border:"1px solid #2a2a3a",textDecoration:"none",color:"#fff"}}>
          <span style={{fontSize:18}}>💬</span><span style={{fontSize:13}}>{socialLinks.whatsapp}</span>
        </a>}
        {socialLinks.twitter&&<a href={`https://twitter.com/${socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"#13131f",border:"1px solid #2a2a3a",textDecoration:"none",color:"#fff"}}>
          <span style={{fontSize:18}}>🐦</span><span style={{fontSize:13}}>{socialLinks.twitter}</span>
        </a>}
        {(socialLinks.telegram||socialLinks.telegramUser)&&<a href={`https://t.me/${(socialLinks.telegramUser||socialLinks.telegram).replace(/^0/,"").replace("@","")}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"#13131f",border:"1px solid #2a2a3a",textDecoration:"none",color:"#fff"}}>
          <span style={{fontSize:18}}>✈️</span><span style={{fontSize:13}}>{socialLinks.telegramUser||socialLinks.telegram}</span>
        </a>}
      </div>
      :<div style={G.empty}>لا توجد وسائل تواصل مضافة بعد</div>
    }
  </div>}

  {sec==="loyalty"&&<div style={box}>
    <div style={hdr}>🎁 نظام نقاط الولاء</div>
    {!adminSession&&<div style={{fontSize:12,color:"#888",background:"rgba(212,160,23,.08)",padding:"8px 12px",borderRadius:8,marginBottom:10}}>⚠️ الإعدادات متاحة للإدارة فقط</div>}
    {adminSession&&<>
      <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer"}}>
        <input type="checkbox" checked={loyaltySettings?.enabled||false} onChange={e=>setLoyaltySettings&&setLoyaltySettings(p=>({...p,enabled:e.target.checked}))}/>
        <span style={{fontSize:13,color:"#fff",fontWeight:700}}>تفعيل النقاط للجميع</span>
      </label>
      {loyaltySettings?.enabled&&<>
        {[{l:"نقاط لكل حجز",k:"pointsPerBooking"},{l:"الحد الأدنى للاستخدام",k:"minRedeemPoints"},{l:"قيمة النقطة (ريال)",k:"redeemValue"}].map(({l,k})=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={lbl}>{l}</label>
            <input type="number" min="1" style={inp2} value={loyaltySettings?.[k]||0} onChange={e=>setLoyaltySettings&&setLoyaltySettings(p=>({...p,[k]:+e.target.value}))}/>
          </div>
        ))}
        <button style={G.sub} onClick={()=>toast$&&toast$("✅ تم حفظ إعدادات النقاط")}>💾 حفظ</button>
      </>}
    </>}
    {loyaltySettings?.enabled&&!adminSession&&(
      <div style={{background:"var(--pa08)",borderRadius:10,padding:"12px 14px",textAlign:"center",border:"1px solid var(--pa25)"}}>
        <div style={{fontSize:20,fontWeight:900,color:"var(--p)"}}>🎁 نقاط الولاء مفعّلة</div>
        <div style={{fontSize:12,color:"#888",marginTop:4}}>{loyaltySettings.pointsPerBooking} نقطة لكل حجز</div>
      </div>
    )}
  </div>}

  {sec==="guide"&&<div style={box}>
    <div style={hdr}>📖 دليل الاستخدام</div>
    {[{t:"👤 للعميل",steps:["ابحث عن صالون من الصفحة الرئيسية","اضغط على الصالون واختر الخدمة والحلاق","حدد الموعد وأرسل طلب الحجز","انتظر موافقة الصالون","بعد الزيارة قيّم تجربتك"]},{t:"✂ للصالون",steps:["سجّل صالونك من زر المقص","أضف خدماتك وأسعارك وأوقات العمل","انتظر موافقة الإدارة","استقبل الحجوزات من لوحتك","تابع إحصائياتك الشهرية والسنوية"]}].map(({t,steps})=>(
      <div key={t} style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:8}}>{t}</div>
        {steps.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"var(--p)",color:"#000",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
            <div style={{fontSize:12,color:"#ccc",lineHeight:1.6}}>{s}</div>
          </div>
        ))}
      </div>
    ))}
  </div>}

  {sec==="faq"&&<div style={box}>
    <div style={hdr}>❓ الأسئلة الشائعة</div>
    {[{q:"كيف أحجز موعد؟",a:"ابحث عن صالون، اضغط عليه، اختر الخدمة والوقت، ثم أرسل الطلب."},{q:"هل الحجز مجاني؟",a:"نعم، الحجز عبر دورك مجاني تماماً للعملاء."},{q:"ماذا لو تأخرت؟",a:"تواصل مع الصالون فوراً. التأخر المتكرر قد يؤثر على أولويتك."},{q:"كيف ألغي حجزي؟",a:"تواصل مع الصالون مباشرة عبر رقم الجوال."},{q:"كيف أسجّل صالوني؟",a:"اضغط على أيقونة المقص في الشريط العلوي."},{q:"ما هي نقاط الولاء؟",a:"نقاط تكسبها مع كل حجز للحصول على خصومات عند تفعيلها من الإدارة."},{q:"كم يستغرق قبول تسجيل الصالون؟",a:"عادة من 24 إلى 48 ساعة."}].map(({q,a},i)=>(
      <FAQItem key={i} q={q} a={a}/>
    ))}
  </div>}

  {sec==="danger"&&<div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #c0392b33"}}>
    <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:6,borderBottom:"1px solid #c0392b33"}}>⚠️ منطقة الخطر</div>
    <div style={{fontSize:11,color:"#888",marginBottom:12}}>حذف البيانات المحلية وإعادة التطبيق لحالته الأولى</div>
    <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{if(confirm("حذف البيانات المحلية؟")){localStorage.clear();window.location.reload();}}}>🗑 مسح البيانات المحلية</button>
  </div>}

  <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:13,padding:14,border:"1px solid var(--pa25)",marginTop:4,textAlign:"center"}}>
    <div style={{fontSize:22,fontWeight:900,color:"var(--p)",letterSpacing:1}}>دورك ✂</div>
    <div style={{fontSize:11,color:"#888",marginTop:2}}>{"الإصدار 1.0.0 - 2025"}</div>
  </div>
</div></div>
```

);
}

function FAQItem({q,a}){
const[open,setOpen]=useState(false);
return(
<div style={{marginBottom:8,borderRadius:10,border:“1px solid #2a2a3a”,overflow:“hidden”}}>
<button style={{width:“100%”,padding:“11px 14px”,background:”#0d0d1a”,border:“none”,color:”#fff”,fontSize:13,fontWeight:700,textAlign:“right”,cursor:“pointer”,fontFamily:“inherit”,display:“flex”,justifyContent:“space-between”,alignItems:“center”}} onClick={()=>setOpen(p=>!p)}>
<span>{q}</span><span style={{color:“var(–p)”,fontSize:14,transform:open?“rotate(180deg)”:“rotate(0)”,transition:“transform .2s”}}>▼</span>
</button>
{open&&<div style={{padding:“10px 14px”,background:”#13131f”,fontSize:12,color:”#aaa”,lineHeight:1.7}}>{a}</div>}
</div>
);
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function SL({children}){return <div style={G.sl2}>{children}</div>;}
function F({label,error,children,style}){return <div style={{marginBottom:11,...style}}>{label&&<label style={{display:“block”,fontSize:12,color:”#aaa”,marginBottom:3,fontWeight:600}}>{label}</label>}{children}{error&&<div style={G.err}>{error}</div>}</div>;}
const fi=(err)=>({width:“100%”,padding:“10px 12px”,borderRadius:9,border:`1.5px solid ${err?"#e74c3c":"#2a2a3a"}`,background:”#13131f”,color:”#f0f0f0”,fontSize:13,fontFamily:“inherit”,outline:“none”,boxSizing:“border-box”,direction:“rtl”});

// ══════════════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════════════
const CSS=`:root { --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23; --pa5: rgba(212,160,23,.05); --pa07: rgba(212,160,23,.07); --pa08: rgba(212,160,23,.08); --pa12: rgba(212,160,23,.12); --pa15: rgba(212,160,23,.15); --pa18: rgba(212,160,23,.18); --pa2: rgba(212,160,23,.2); --pa25: rgba(212,160,23,.25); --pa3: rgba(212,160,23,.3); --pa4: rgba(212,160,23,.45); --grad: linear-gradient(135deg,#d4a017,#f0c040); --grad2: linear-gradient(135deg,#f0c040,#d4a017); } @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} body{direction:rtl;font-family:'Cairo',sans-serif;background:#0d0d1a;} ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--p);border-radius:4px;} .hcard{transition:transform .18s,box-shadow .18s;} .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;} input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);} select option{background:#1a1a2e;color:#f0f0f0;} button:active{opacity:.82;}`;

const G={
searchRow:{display:“flex”,alignItems:“center”,gap:8,background:”#13131f”,borderRadius:10,border:“1.5px solid #2a2a3a”,padding:“9px 12px”},
searchInput:{flex:1,background:“transparent”,border:“none”,color:”#f0f0f0”,fontSize:14,outline:“none”,fontFamily:”‘Cairo’,sans-serif”,direction:“rtl”},
searchClear:{background:”#2a2a3a”,border:“none”,color:”#aaa”,cursor:“pointer”,borderRadius:“50%”,width:22,height:22,fontSize:11,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Cairo’,sans-serif”,flexShrink:0},
sortChip:{padding:“6px 12px”,borderRadius:20,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#aaa”,cursor:“pointer”,fontSize:11,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600,whiteSpace:“nowrap”,flexShrink:0},
sortChipOn:{background:“var(–pa15)”,border:“1.5px solid var(–p)”,color:“var(–p)”},
app:{minHeight:“100vh”,background:”#0d0d1a”,color:”#f0f0f0”,fontFamily:”‘Cairo’,sans-serif”,direction:“rtl”},
page:{maxWidth:480,margin:“0 auto”,minHeight:“100vh”,paddingBottom:30},
toast:{position:“fixed”,top:64,left:“50%”,transform:“translateX(-50%)”,padding:“10px 22px”,borderRadius:11,color:”#fff”,fontWeight:700,zIndex:9999,fontSize:13,boxShadow:“0 4px 20px rgba(0,0,0,.5)”,whiteSpace:“nowrap”},

// TOP BAR
topBar:{position:“fixed”,top:0,left:0,right:0,zIndex:100,background:”#0d0d1a”,borderBottom:“1px solid #2a2a3a”,height:56,display:“flex”,alignItems:“center”,justifyContent:“space-between”,padding:“0 14px”,maxWidth:480,margin:“0 auto”},
roleBtn:{width:36,height:36,borderRadius:10,border:“1.5px solid #2a2a3a”,background:”#13131f”,color:”#aaa”,cursor:“pointer”,fontSize:16,position:“relative”,display:“flex”,alignItems:“center”,justifyContent:“center”},
roleBtnActive:{border:“1.5px solid var(–p)”,color:“var(–p)”,background:“rgba(var(–pr),.1)”},
roleDot:{position:“absolute”,top:-4,right:-4,background:”#e74c3c”,color:”#fff”,borderRadius:“50%”,width:16,height:16,fontSize:9,fontWeight:700,display:“flex”,alignItems:“center”,justifyContent:“center”},
registerTopBtn:{background:“var(–grad)”,color:”#000”,border:“none”,padding:“7px 13px”,borderRadius:9,fontWeight:700,fontSize:12,cursor:“pointer”,fontFamily:”‘Cairo’,sans-serif”},

fRow:{display:“flex”,alignItems:“center”,background:”#13131f”,borderRadius:9,border:“1.5px solid #2a2a3a”,padding:“7px 11px”,gap:7},
fSel:{flex:1,background:“transparent”,border:“none”,color:”#f0f0f0”,fontSize:12,outline:“none”,fontFamily:”‘Cairo’,sans-serif”,direction:“rtl”},

toggleBtn:{flex:1,padding:“8px 0”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#aaa”,cursor:“pointer”,fontSize:12,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600,display:“flex”,alignItems:“center”,justifyContent:“center”,gap:4},
toggleOn:{background:“var(–pa12)”,border:“1.5px solid var(–p)”,color:“var(–p)”},

section:{padding:“10px 14px 0”},
badge:{background:“var(–p)”,color:”#000”,padding:“2px 9px”,borderRadius:20,fontSize:11,fontWeight:700},
empty:{textAlign:“center”,color:”#555”,padding:“36px 0”,fontSize:13},

card:{background:”#13131f”,borderRadius:14,padding:13,border:“1px solid #2a2a3a”,boxShadow:“0 4px 16px rgba(0,0,0,.3)”},
cav:{width:38,height:38,borderRadius:10,background:“var(–grad)”,display:“flex”,alignItems:“center”,justifyContent:“center”,fontSize:17,flexShrink:0},
tag:{background:”#1e1e30”,color:“var(–p)”,padding:“2px 8px”,borderRadius:20,fontSize:10,border:“1px solid #2a2a3a”},
favBtn:{background:“transparent”,border:“none”,cursor:“pointer”,fontSize:20,color:”#555”,padding:0,lineHeight:1},
favOn:{color:”#e74c3c”},

mapsBtn:{background:“rgba(42,109,217,.12)”,border:“1.5px solid #2a6dd9”,color:”#6aadff”,padding:“6px 10px”,borderRadius:8,cursor:“pointer”,fontSize:11,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600,whiteSpace:“nowrap”},
pageBtn:{background:“rgba(100,60,180,.15)”,border:“1.5px solid #7c4dff”,color:”#b39ddb”,padding:“6px 10px”,borderRadius:8,cursor:“pointer”,fontSize:11,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600,whiteSpace:“nowrap”},
bookBtn:{flex:1,background:“var(–grad)”,color:”#000”,border:“none”,padding:“8px 0”,borderRadius:8,fontWeight:700,fontSize:13,cursor:“pointer”,fontFamily:”‘Cairo’,sans-serif”},
delBtn:{background:“rgba(192,57,43,.15)”,border:“1.5px solid #c0392b”,color:”#e74c3c”,padding:“5px 9px”,borderRadius:8,cursor:“pointer”,fontSize:11,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600},
accBtn:{flex:1,background:“rgba(39,174,96,.15)”,border:“1.5px solid #27ae60”,color:”#4caf50”,padding:“8px 0”,borderRadius:9,cursor:“pointer”,fontSize:13,fontFamily:”‘Cairo’,sans-serif”,fontWeight:700},
rejBtn:{flex:1,background:“rgba(192,57,43,.15)”,border:“1.5px solid #c0392b”,color:”#e74c3c”,padding:“8px 0”,borderRadius:9,cursor:“pointer”,fontSize:13,fontFamily:”‘Cairo’,sans-serif”,fontWeight:700},

fp:{padding:“0 13px 24px”},
fh:{display:“flex”,alignItems:“center”,gap:8,padding:“12px 0 13px”,position:“sticky”,top:56,background:”#0d0d1a”,zIndex:10},
bb:{background:”#1a1a2e”,border:“none”,color:“var(–p)”,fontSize:16,cursor:“pointer”,width:32,height:32,borderRadius:8,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Cairo’,sans-serif”,flexShrink:0},
ft:{fontSize:17,fontWeight:700,color:”#fff”},
fc:{background:”#13131f”,borderRadius:13,padding:14,border:“1px solid #2a2a3a”,marginBottom:10},
sl2:{fontSize:12,fontWeight:700,color:“var(–p)”,marginBottom:9,paddingBottom:5,borderBottom:“1px solid #2a2a3a”},
err:{color:”#e74c3c”,fontSize:11,marginTop:2},
sub:{width:“100%”,background:“var(–grad)”,color:”#000”,border:“none”,padding:“12px”,borderRadius:10,fontWeight:700,fontSize:14,cursor:“pointer”,marginTop:4,fontFamily:”‘Cairo’,sans-serif”},

salonBadge:{display:“flex”,alignItems:“center”,gap:8,background:“rgba(var(–pr),.06)”,border:“1px solid var(–pa2)”,borderRadius:10,padding:“10px 12px”,marginBottom:11},
tabRow:{display:“flex”,gap:6,marginBottom:11},
tabBtn:{flex:1,padding:“8px 0”,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#aaa”,cursor:“pointer”,fontSize:12,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600,display:“flex”,alignItems:“center”,justifyContent:“center”,gap:3},
tabOn:{background:“var(–pa12)”,border:“1.5px solid var(–p)”,color:“var(–p)”},
notifDot:{background:”#e74c3c”,color:”#fff”,borderRadius:20,fontSize:9,padding:“1px 5px”,fontWeight:700},

steps:{display:“flex”,marginBottom:11},
si:{flex:1,display:“flex”,flexDirection:“column”,alignItems:“center”,gap:2,opacity:.3,transition:“opacity .2s”},
sd:{width:24,height:24,borderRadius:“50%”,background:“var(–p)”,color:”#000”,fontWeight:700,fontSize:11,display:“flex”,alignItems:“center”,justifyContent:“center”},

chip:{padding:“5px 11px”,borderRadius:20,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#aaa”,cursor:“pointer”,fontSize:12,fontFamily:”‘Cairo’,sans-serif”},
chipOn:{background:“var(–pa12)”,border:“1.5px solid var(–p)”,color:“var(–p)”},
totalBox:{background:“var(–pa07)”,border:“1px solid var(–pa2)”,borderRadius:8,padding:“7px 11px”,fontSize:12,color:”#f0f0f0”,marginBottom:10},

timeGrid:{display:“grid”,gridTemplateColumns:“repeat(3,1fr)”,gap:7,marginBottom:10},
ts:{padding:“8px 3px”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#f0f0f0”,cursor:“pointer”,fontSize:11,fontFamily:”‘Cairo’,sans-serif”,textAlign:“center”},
tsF:{background:”#160a0a”,color:”#444”,borderColor:”#2a1414”,cursor:“not-allowed”},
tsS:{background:“var(–pa15)”,borderColor:“var(–p)”,color:“var(–p)”,fontWeight:700},

bItem:{background:”#13131f”,borderRadius:10,padding:“10px 12px”,border:“1px solid #2a2a3a”},
pmBtn:{width:26,height:26,borderRadius:7,border:“1.5px solid #2a2a3a”,background:”#0d0d1a”,color:“var(–p)”,fontSize:16,cursor:“pointer”,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Cairo’,sans-serif”,fontWeight:700,padding:0},

locTab:{flex:1,padding:“7px 0”,borderRadius:8,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#aaa”,cursor:“pointer”,fontSize:12,fontFamily:”‘Cairo’,sans-serif”,fontWeight:600},
locTabOn:{background:“rgba(42,109,217,.1)”,border:“1.5px solid #2a6dd9”,color:”#6aadff”},
detectBtn:{width:“100%”,background:“rgba(42,109,217,.1)”,border:“1.5px solid #2a6dd9”,color:”#6aadff”,padding:“10px 0”,borderRadius:9,fontWeight:700,fontSize:12,cursor:“pointer”,fontFamily:”‘Cairo’,sans-serif”},

otherBtn:{marginTop:6,width:“100%”,background:“transparent”,border:“1.5px dashed #2a6dd9”,color:”#6aadff”,padding:“6px 0”,borderRadius:8,cursor:“pointer”,fontSize:12,fontFamily:”‘Cairo’,sans-serif”},
addBarberBtn:{width:“100%”,background:“transparent”,border:“1.5px dashed var(–p)”,color:“var(–p)”,padding:“7px 0”,borderRadius:8,cursor:“pointer”,fontSize:12,fontFamily:”‘Cairo’,sans-serif”,marginBottom:3},
ratingBadge:{background:“var(–pa15)”,border:“1px solid rgba(var(–pr),.4)”,borderRadius:8,padding:“3px 8px”,fontSize:12,fontWeight:700,color:“var(–p)”,flexShrink:0,display:“flex”,alignItems:“center”,gap:3},
heartCardBtn:{width:36,height:36,borderRadius:9,border:“1.5px solid #2a2a3a”,background:”#1a1a2e”,color:”#888”,cursor:“pointer”,fontSize:20,display:“flex”,alignItems:“center”,justifyContent:“center”,flexShrink:0,fontFamily:”‘Cairo’,sans-serif”},
heartCardOn:{border:“1.5px solid #e74c3c”,background:“rgba(231,76,60,.1)”,color:”#e74c3c”},
xBtn:{width:26,height:26,borderRadius:7,border:“1.5px solid #c0392b”,background:“transparent”,color:”#e74c3c”,cursor:“pointer”,fontSize:12,display:“flex”,alignItems:“center”,justifyContent:“center”,fontFamily:”‘Cairo’,sans-serif”,flexShrink:0},
};

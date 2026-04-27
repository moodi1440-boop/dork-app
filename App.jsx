import React, { useState, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════
//  SUPABASE CLIENT
// ══════════════════════════════════════════════
const SUPABASE_URL    = "https://ywrlhvzfefvyogfxfdhl.supabase.co";
const SUPABASE_ANON   = "sb_publishable_3tbZHK51ohv9AITf-Mt5Ww_MGZ1DMQs";

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
const ADMIN_PWD = "admin123";
const SLOT_MIN  = 40;
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

// ══════════════════════════════════════════════
//  TONES  – louder + barbershop themed
// ══════════════════════════════════════════════
const TONES = [
  { id:"scissors",  label:"مقص ✂"       },
  { id:"razor",     label:"ماكينة 🪒"    },
  { id:"bell",      label:"جرس الباب 🔔" },
  { id:"cash",      label:"صندوق النقد 💰"},
  { id:"welcome",   label:"أهلاً وسهلاً 🎉"},
  { id:"chime3",    label:"جرس ثلاثي 🎶" },
  { id:"alert",     label:"تنبيه عاجل ⚡" },
  { id:"classic",   label:"كلاسيك 🎵"    },
];

const THEMES = {
  gold:     {primary:"#d4a017", light:"#f0c040", dark:"#a07810", lightest:"#f5d76e", rgb:"212,160,23"},
  emerald:  {primary:"#10b981", light:"#34d399", dark:"#047857", lightest:"#6ee7b7", rgb:"16,185,129"},
  sapphire: {primary:"#3b82f6", light:"#60a5fa", dark:"#1e40af", lightest:"#93c5fd", rgb:"59,130,246"},
  rose:     {primary:"#ec4899", light:"#f472b6", dark:"#9d174d", lightest:"#f9a8d4", rgb:"236,72,153"},
  violet:   {primary:"#8b5cf6", light:"#a78bfa", dark:"#5b21b6", lightest:"#c4b5fd", rgb:"139,92,246"},
  crimson:  {primary:"#ef4444", light:"#f87171", dark:"#991b1b", lightest:"#fca5a5", rgb:"239,68,68"},
};

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
      scissors: ()=>{ beep(1200,0,.05,"square",.5); beep(900,0.08,.05,"square",.5); beep(1200,0.16,.05,"square",.5); beep(900,0.24,.05,"square",.5); },
      razor:    ()=>{ [0,.06,.12,.18,.24].forEach(t=>beep(80+Math.random()*40,t,.07,"sawtooth",.6)); },
      bell:     ()=>{ beep(880,0,.6,"sine",.7); beep(1100,.15,.5,"sine",.5); beep(1320,.3,.8,"sine",.4); },
      cash:     ()=>{ beep(1800,0,.04,"square",.6); beep(2400,.05,.04,"square",.5); beep(1200,.12,.3,"triangle",.4); },
      welcome:  ()=>{ [523,659,784,1047].forEach((f,i)=>beep(f,i*.12,.25,"sine",.6)); },
      chime3:   ()=>{ [[880,.0],[1100,.18],[1320,.36],[1100,.54],[880,.72]].forEach(([f,t])=>beep(f,t,.25,"sine",.6)); },
      alert:    ()=>{ [0,.1,.2].forEach(t=>beep(1400,t,.08,"square",.7)); },
      classic:  ()=>{ [[440,0],[554,.15],[659,.3],[880,.5]].forEach(([f,t])=>beep(f,t,.3,"triangle",.6)); },
    };
    plays[id]?.();
  }catch(e){}
}

// ══════════════════════════════════════════════
//  LOCATION DATA  (4 levels)
//  المصدر: الخطة الموحدة للمراكز الإدارية ١٤٤٧هـ
//  كل منطقة → محافظات → مراكز إدارية
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function makeSlots(s,e){
  const r=[]; let[h,m]=s.split(":").map(Number); const[eh,em]=e.split(":").map(Number);
  while(h<eh||(h===eh&&m<em)){r.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);m+=SLOT_MIN;if(m>=60){h++;m-=60;}} return r;
}
function getSlotsForSalon(s){
  if(s.shiftEnabled){
    return[...(s.shift1Start&&s.shift1End?makeSlots(s.shift1Start,s.shift1End):[]),...(s.shift2Start&&s.shift2End?makeSlots(s.shift2Start,s.shift2End):[])];
  }
  return makeSlots(s.workStart||"09:00",s.workEnd||"22:00");
}
function todayStr(){return new Date().toISOString().split("T")[0];}
function openMaps(url,name,addr){window.open(url?.trim()||`https://www.google.com/maps/search/${encodeURIComponent(name+" "+addr)}`,"_blank");}
function calcTotal(svcs,prices){return(svcs||[]).reduce((a,s)=>a+(prices?.[s]||0),0);}

const DEMO_SALONS=[
  {id:1,name:"صالون الأناقة",owner:"أحمد محمد",ownerPhone:"0501234567",region:"منطقة مكة المكرمة",gov:"محافظة جدة",center:"مركز جدة",village:"الروضة",phone:"0501234567",address:"شارع الملك عبدالعزيز",locationUrl:"https://maps.google.com/?q=21.5433,39.1728",services:["قص شعر","حلاقة لحية","تسريح"],prices:{"قص شعر":50,"حلاقة لحية":30,"تسريح":40},shiftEnabled:true,shift1Start:"08:00",shift1End:"13:00",shift2Start:"16:00",shift2End:"23:00",workStart:"08:00",workEnd:"23:00",barbers:[{id:"b1",name:"أبو خالد"},{id:"b2",name:"محمد"}],tone:"bell",bookings:[],rating:4.8,status:"approved"},
  {id:2,name:"بارشوب كلاسيك",owner:"سالم العتيبي",ownerPhone:"0559876543",region:"منطقة الرياض",gov:"محافظة الرياض",center:"مركز الرياض",village:"العليا",phone:"0559876543",address:"طريق الملك فهد",locationUrl:"https://maps.google.com/?q=24.6877,46.7219",services:["قص شعر","حلاقة كاملة","عناية بالبشرة"],prices:{"قص شعر":60,"حلاقة كاملة":80,"عناية بالبشرة":100},shiftEnabled:false,workStart:"10:00",workEnd:"23:00",barbers:[{id:"b3",name:"يوسف"},{id:"b4",name:"عبدالله"},{id:"b5",name:"فهد"}],tone:"welcome",bookings:[],rating:4.6,status:"approved"},
  {id:3,name:"صالون النخبة",owner:"فهد القحطاني",ownerPhone:"0533445566",region:"منطقة عسير",gov:"محافظة أبها",center:"مركز أبها",village:"السودة",phone:"0533445566",address:"شارع الأمير سلطان",locationUrl:"https://maps.google.com/?q=18.2164,42.5053",services:["قص شعر","تسريح","صبغة شعر"],prices:{"قص شعر":45,"تسريح":35,"صبغة شعر":100},shiftEnabled:false,workStart:"09:00",workEnd:"22:00",barbers:[{id:"b6",name:"عبدالرحمن"}],tone:"scissors",bookings:[],rating:4.5,status:"pending"},
];

// ══════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════
export default function App(){
  const[salons,setSalons]=useState([]);
  const[customers,setCustomers]=useState([]);
  const[extraLoc,setExtraLoc]=useState(()=>{
    try{
      // امسح أي إضافات قديمة غلط وابدأ نظيف
      localStorage.removeItem("bbv6_loc");
      return [];
    }catch{return[];}
  });
  const[loading,setLoading]=useState(true);
  const[dbError,setDbError]=useState(null);
  const[view,setView]=useState("home");
  const[selSalon,setSelSalon]=useState(null);
  const[toast,setToast]=useState(null);

  // Sessions
  const[adminSession,setAdminSession]=useState(false);
  const[ownerSession,setOwnerSession]=useState(null);
  const[customerSession,setCustomerSession]=useState(null);

  // Filters
  const[fRegion,setFRegion]=useState("");
  const[fGov,setFGov]=useState("");
  const[fVillage,setFVillage]=useState("");
  const[fCenter,setFCenter]=useState("");
  const[showFavs,setShowFavs]=useState(false);
  const[search,setSearch]=useState("");
  const[sortBy,setSortBy]=useState("default");
  const[userLoc,setUserLoc]=useState(null);
  const[settings,setSettings]=useState(()=>{try{const s=localStorage.getItem("bbv6_settings");return s?JSON.parse(s):{theme:"gold",defaultTone:"bell"};}catch{return{theme:"gold",defaultTone:"bell"};}});
  useEffect(()=>{localStorage.setItem("bbv6_settings",JSON.stringify(settings));},[settings]);
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

  const allLoc=[...BASE_LOC,...extraLoc];
  useEffect(()=>{localStorage.setItem("bbv6_loc",JSON.stringify(extraLoc));},[extraLoc]);

  const toast$=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};

  // ── تحميل البيانات من Supabase ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const salonRows = await sb("salons", "GET", null, "?order=id.desc");
      const salonsWithBookings = salonRows.map(row => {
        const salon = toAppSalon(row);
        // الحجوزات محفوظة داخل الصالون مباشرة
        salon.bookings = (row.bookings || []).map(b=>({
          id: b.id||Date.now(),
          salonId: b.salonId||row.id,
          name: b.name||"",
          phone: b.phone||"",
          services: b.services||[],
          barberId: b.barberId||"any",
          barberName: b.barberName||"",
          date: b.date||"",
          time: b.time||"",
          total: b.total||0,
          status: b.status||"pending",
        }));
        return salon;
      });
      setSalons(salonsWithBookings);
      const custRows = await sb("customers", "GET", null, "");
      setCustomers(custRows.map(toAppCustomer));
      setDbError(null);
    } catch(e) {
      console.error(e);
      setDbError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ loadData(); }, [loadData]);

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

  // ── CRUD operations → Supabase ──
  const addSalon=async(s)=>{
    try{
      const dbData=toDbSalon(s);
      await sb("salons","POST",dbData,"");
      toast$("✅ تم إرسال طلب تسجيل الصالون — في انتظار موافقة الإدارة");
      setView("home");
      await loadData();
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };
  const deleteSalon=async(id)=>{
    try{
      await sb("bookings","DELETE",null,`?salon_id=eq.${id}`);
      await sb("salons","DELETE",null,`?id=eq.${id}`);
      toast$("🗑 تم الحذف","warn");
      await loadData();
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };
  const approveSalon=async(id,st)=>{
    try{
      await sb("salons","PATCH",{status:st},`?id=eq.${id}`);
      toast$(st==="approved"?"✅ تم قبول الصالون":"❌ تم رفض الصالون");
      await loadData();
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
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
        barberId:bk.barberId||"any",
        barberName:bk.barberName||"",
        date:bk.date,
        time:bk.time,
        total:bk.total,
        status:"pending",
      };
      const updatedBookings=[...(salon.bookings||[]),newBooking];
      await sb("salons","PATCH",{bookings:updatedBookings},`?id=eq.${sid}`);
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
          };
          const hist=[...(c.history||[]),histItem];
          // نحفظ في localStorage كحل احتياطي
          try{localStorage.setItem(`hist_${c.id}`,JSON.stringify(hist));}catch{}
          // نجرب Supabase — لو فشل نكمل بدونه
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
      const updatedBookings=salon.bookings.map(b=>b.id===bid?{...b,status}:b);
      await sb("salons","PATCH",{bookings:updatedBookings},`?id=eq.${sid}`);
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
    onPage:(s)=>{setSelSalon(s);setView("salon");},
    fRegion,setFRegion:v=>{setFRegion(v);setFGov("");setFCenter("");setFVillage("");},
    fGov,setFGov:v=>{setFGov(v);setFCenter("");setFVillage("");},
    fCenter,setFCenter,
    fVillage,setFVillage,
    govList,villageList,centerList2,
    showFavs,setShowFavs,
    displaySalons,
    search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,settings,setSettings,
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"'Cairo',sans-serif",direction:"rtl"}}>
      <style>{CSS}</style>
      <div style={{fontSize:48}}>✂</div>
      <div style={{color:"var(--p)",fontSize:18,fontWeight:700}}>جارٍ تحميل البيانات...</div>
      <div style={{width:48,height:48,border:"4px solid #2a2a3a",borderTop:"4px solid var(--p)",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {dbError&&<div style={{background:"#3a1a1a",color:"#e74c3c",padding:"12px 20px",borderRadius:10,fontSize:12,maxWidth:320,textAlign:"center",margin:"0 16px"}}>❌ خطأ في الاتصال بقاعدة البيانات:<br/><br/>{dbError}<br/><br/><small style={{color:"#aaa"}}>تحقق من الـ anon key في الكود</small></div>}
    </div>
  );

  return(
    <div style={G.app}>
      <style>{CSS}</style>
      {toast&&<div style={{...G.toast,background:toast.type==="warn"?"#7a3a10":toast.type==="err"?"#7a1a1a":"#1a5c34"}}>{toast.msg}</div>}
      <TopBar {...sharedProps}/>
      <div style={{paddingTop:56}}>
        {view==="home"&&      <HomeView {...sharedProps}/>}
        {view==="register"&&  <RegisterView {...sharedProps}/>}
        {view==="book"&&selSalon&&<BookView salon={selSalon} {...sharedProps}/>}
        {view==="salon"&&selSalon&&<SalonPage salon={salons.find(s=>s.id===selSalon.id)||selSalon} {...sharedProps}/>}
        {view==="admin"&&     <AdminView {...sharedProps}/>}
        {view==="ownerLogin"&&<OwnerLogin {...sharedProps}/>}
        {view==="ownerDash"&& <OwnerDash  salon={salons.find(s=>s.id===ownerSession)} {...sharedProps}/>}
        {view==="custLogin"&& <CustomerLogin {...sharedProps}/>}
        {view==="custDash"&&  <CustomerDash customer={customer} {...sharedProps}/>}
        {view==="settings"&&  <SettingsView {...sharedProps}/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  TOP BAR – 3 role buttons on the LEFT
// ══════════════════════════════════════════════
function TopBar({adminSession,ownerSession,customerSession,setView,setAdminSession,setOwnerSession,setCustomerSession,salons}){
  const pendingCount=salons.filter(s=>s.status==="pending").length;
  const ownerSalon=ownerSession?salons.find(s=>s.id===ownerSession):null;
  const ownerPending=ownerSalon?ownerSalon.bookings.filter(b=>b.status==="pending").length:0;
  return(
    <div style={G.topBar}>
      {/* LEFT: role buttons */}
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {/* Admin */}
        <button style={{...G.roleBtn,...(adminSession?G.roleBtnActive:{})}} onClick={()=>setView("admin")} title="الإدارة">
          🔐
          {pendingCount>0&&adminSession&&<span style={G.roleDot}>{pendingCount}</span>}
        </button>
        {/* Owner – scissors removed, use shop icon */}
        <button style={{...G.roleBtn,...(ownerSession?G.roleBtnActive:{})}} onClick={()=>setView(ownerSession?"ownerDash":"ownerLogin")} title="صاحب الصالون">
          ✂
        </button>
        {/* Customer */}
        <button style={{...G.roleBtn,...(customerSession?G.roleBtnActive:{})}} onClick={()=>setView(customerSession?"custDash":"custLogin")} title="حساب العميل">
          👤
        </button>
        {/* Settings */}
        <button style={G.roleBtn} onClick={()=>setView("settings")} title="الإعدادات">
          ⚙
        </button>
      </div>
      {/* RIGHT: دورك Logo */}
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <svg width="36" height="36" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="goldG" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--pll)"/>
              <stop offset="50%" stopColor="var(--p)"/>
              <stop offset="100%" stopColor="var(--pd)"/>
            </linearGradient>
            <linearGradient id="darkG" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1a1a2e"/>
              <stop offset="100%" stopColor="#0d0d1a"/>
            </linearGradient>
          </defs>
          {/* Outer ring */}
          <circle cx="30" cy="30" r="28" fill="url(#goldG)"/>
          <circle cx="30" cy="30" r="24" fill="url(#darkG)"/>
          {/* Clock dots (4 cardinal points) */}
          <circle cx="30" cy="9"  r="1.5" fill="var(--p)"/>
          <circle cx="30" cy="51" r="1.5" fill="var(--p)" opacity=".5"/>
          <circle cx="9"  cy="30" r="1.5" fill="var(--p)" opacity=".5"/>
          <circle cx="51" cy="30" r="1.5" fill="var(--p)" opacity=".5"/>
          {/* Scissors silhouette */}
          <g transform="translate(30 30) rotate(-30)">
            <circle cx="-7" cy="-3" r="3.5" fill="none" stroke="var(--p)" strokeWidth="1.6"/>
            <circle cx="-7" cy="3"  r="3.5" fill="none" stroke="var(--p)" strokeWidth="1.6"/>
            <line x1="-4" y1="-1.5" x2="9" y2="0"  stroke="var(--pl)" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="-4" y1="1.5"  x2="9" y2="0"  stroke="var(--pl)" strokeWidth="1.6" strokeLinecap="round"/>
          </g>
          {/* Center pivot */}
          <circle cx="30" cy="30" r="1.5" fill="var(--pll)"/>
        </svg>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",lineHeight:1}}>
          <span style={{fontSize:22,fontWeight:900,color:"var(--pl)",fontFamily:"'Cairo',sans-serif",letterSpacing:1,textShadow:"0 1px 3px rgba(var(--pr),.3)"}}>دورك</span>
          <span style={{fontSize:8,color:"var(--p)",letterSpacing:1.2,marginTop:2,fontFamily:"'Cairo',sans-serif",opacity:.85}}>DORK · حلاقة وصالونات</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════
function HomeView({displaySalons,approvedSalons,allLoc,fRegion,setFRegion,fGov,setFGov,fCenter,setFCenter,fVillage,setFVillage,govList,villageList,centerList2,showFavs,setShowFavs,favSet,toggleFav,setView,setSelSalon,customer,search,setSearch,sortBy,setSortBy,userLoc,setUserLoc,toast$}){
  const detectUserLoc=()=>{
    if(!navigator.geolocation){alert("⚠️ المتصفح لا يدعم تحديد الموقع");return;}
    navigator.geolocation.getCurrentPosition(
      p=>{setUserLoc({lat:p.coords.latitude,lng:p.coords.longitude});setSortBy("nearest");toast$&&toast$("✅ تم تحديد موقعك");},
      err=>{
        let m="تعذّر تحديد موقعك";
        if(err.code===1)m="🚫 رفضت إذن الموقع — فعّله من إعدادات المتصفح";
        else if(err.code===2)m="📡 خدمة الموقع غير متوفرة";
        else if(err.code===3)m="⏱ انتهت مهلة التحديد";
        alert(m);
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:60000}
    );
  };
  return(
    <div style={G.page}>
      <div style={{background:"linear-gradient(160deg,#12122a,#1a1a3a)",borderBottom:"1px solid #2a2a3a",padding:"14px 14px 0"}}>
        <div style={{textAlign:"center",paddingBottom:10}}>
          <h1 style={{fontSize:24,fontWeight:900,color:"#fff",lineHeight:1.3}}>احجز وقتك<br/><span style={{color:"var(--p)"}}>بضغطة واحدة</span></h1>
          <p style={{color:"#777",fontSize:12,marginTop:4}}>أفضل صالونات الحلاقة في مدينتك</p>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",background:"rgba(255,255,255,.05)",borderRadius:9,border:"1px solid #2a2a3a",padding:"6px 10px",gap:6}}>
            <span style={{fontSize:12,color:"var(--p)",flexShrink:0}}>🔎</span>
            <input style={{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"}} placeholder="ابحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button style={{background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:11,padding:0}} onClick={()=>setSearch("")}>✕</button>}
          </div>
          <button style={{background:"var(--pa12)",border:"1px solid var(--pa25)",borderRadius:9,padding:"6px 10px",color:"var(--p)",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",whiteSpace:"nowrap",fontWeight:600}} onClick={()=>{setSearch("");setSortBy("default");}}>🏠 رئيسي</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,paddingBottom:14}}>
          <LocFilter icon="🗺" label="المنطقة"   value={fRegion}  onChange={v=>{setFRegion(v);setFGov("");setFCenter("");setFVillage("");}}  options={allLoc.map(r=>r.region)} all="كل المناطق"/>
          {fRegion&&<LocFilter icon="🏛" label="المحافظة"  value={fGov} onChange={v=>{setFGov(v);setFCenter("");setFVillage("");}} options={govList.map(g=>g.name||g)} all="كل المحافظات"/>}
          {fGov&&centerList2.length>0&&<LocFilter icon="🏘" label="المركز" value={fCenter} onChange={v=>{setFCenter(v);setFVillage("");}} options={centerList2} all="كل المراكز"/>}
          {fCenter&&(()=>{const villages=[...new Set(approvedSalons.filter(s=>s.center===fCenter&&s.village).map(s=>s.village))];return villages.length>0?<LocFilter icon="📍" label="الحي / القرية" value={fVillage} onChange={setFVillage} options={villages} all="كل الأحياء"/>:null;})()}
        </div>
      </div>

      {/* Search bar */}
      {/* Sort row */}
      <div style={{padding:"10px 14px 0",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
        {[
          ["default","الافتراضي","🔄"],
          ["ratingHigh","الأعلى تقييماً","⭐"],
          ["ratingLow","الأقل تقييماً","☆"],
          ["priceLow","الأرخص","💰"],
          ["priceHigh","الأغلى","💎"],
          ["nearest","الأقرب","📍"],
        ].map(([k,l,ic])=>(
          <button key={k} style={{...G.sortChip,...(sortBy===k?G.sortChipOn:{})}} onClick={()=>{
            if(k==="nearest"&&!userLoc){detectUserLoc();return;}
            setSortBy(k);
          }}>{ic} {l}</button>
        ))}
      </div>

      <div style={{padding:"10px 14px 80px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>الصالونات المتاحة</span>
          <span style={G.badge}>{displaySalons.length}</span>
        </div>
        {displaySalons.length===0
          ?<div style={G.empty}>لا توجد صالونات في هذه المنطقة</div>
          :<div style={{display:"flex",flexDirection:"column",gap:11}}>
            {displaySalons.map(s=>(
              <SalonCard key={s.id} salon={s} fav={favSet.has(s.id)} onFav={()=>toggleFav(s.id)}
                onBook={()=>{setSelSalon(s);setView("book");}}/>
            ))}
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
function SalonCard({salon,fav,onFav,onBook}){
  const slots=getSlotsForSalon(salon);
  return(
    <div style={G.card} className="hcard">
      <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
        <div style={G.cav}>✂</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{salon.name}</div>
          <div style={{fontSize:11,color:"#888"}}>📍 {salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div>
        </div>
        <div style={G.ratingBadge}>⭐ {salon.rating||"5.0"}</div>
      </div>
      <div style={{fontSize:11,color:"#555",marginBottom:4,fontStyle:"italic"}}>{salon.region}</div>
      <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>🏠 {salon.address}</div>
      {salon.shiftEnabled
        ?<div style={{fontSize:11,color:"#aaa",marginBottom:2}}>⏰ {salon.shift1Start}–{salon.shift1End} | {salon.shift2Start}–{salon.shift2End}</div>
        :<div style={{fontSize:11,color:"#aaa",marginBottom:2}}>⏰ {salon.workStart}–{salon.workEnd}</div>}
      <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>✂ {salon.barbers?.length||1} حلاق · {slots.length} وقت</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:9}}>
        {salon.services.slice(0,3).map(s=><span key={s} style={G.tag}>{s}</span>)}
        {salon.services.length>3&&<span style={{...G.tag,color:"#888"}}>+{salon.services.length-3}</span>}
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>🗺</button>
        <button style={{...G.heartCardBtn,...(fav?G.heartCardOn:{})}} onClick={onFav}>{fav?"♥":"♡"}</button>
        <button style={G.bookBtn} onClick={onBook}>احجز الآن</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  SALON PAGE
// ══════════════════════════════════════════════
function SalonPage({salon,favSet,toggleFav,setView,addBooking,updateBookingStatus,adminSession,ownerSession,deleteSalon}){
  const[tab,setTab]=useState("book");
  const fav=favSet.has(salon.id);
  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const canManage=adminSession||(ownerSession===salon.id);
  return(
    <div style={G.page}>
      <div style={G.fp}>
        <div style={G.fh}>
          <button style={G.bb} onClick={()=>setView("home")}>→</button>
          <h2 style={{...G.ft,flex:1}}>{salon.name}</h2>
          <button style={{...G.favBtn,...(fav?G.favOn:{}),fontSize:20}} onClick={()=>toggleFav(salon.id)}>{fav?"♥":"♡"}</button>
          {adminSession&&<button style={{...G.delBtn,marginRight:0}} onClick={()=>{deleteSalon(salon.id);setView("home");}}>🗑</button>}
        </div>
        <div style={G.salonBadge}>
          <span style={{fontSize:20,color:"var(--p)"}}>✂</span>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{salon.name}</div>
            <div style={{fontSize:11,color:"#888"}}>{salon.gov||salon.region}{salon.village?` › ${salon.village}`:""}</div>
            <div style={{fontSize:11,color:"#888"}}>👤 {salon.owner} · 📞 {salon.phone}</div>
          </div>
          <button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>🗺</button>
        </div>
        <div style={G.tabRow}>
          <button style={{...G.tabBtn,...(tab==="book"?G.tabOn:{})}} onClick={()=>setTab("book")}>📅 حجز</button>
          {canManage&&<button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>setTab("notif")}>
            🔔{pending>0&&<span style={G.notifDot}>{pending}</span>}
          </button>}
          {canManage&&<button style={{...G.tabBtn,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")}>📊</button>}
        </div>
        {tab==="book"&&<BookView salon={salon} addBooking={addBooking} onBack={null} inline setView={setView}/>}
        {tab==="notif"&&canManage&&<NotifPanel salon={salon} onUpdate={updateBookingStatus}/>}
        {tab==="stats"&&canManage&&<StatsPanel salon={salon}/>}
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
    name: customer?.name||"",
    phone: customer?.phone||"",
    services:[], barberId:"", date:todayStr(), time:""
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
  const v1=()=>{const e={};if(!form.name.trim())e.name="مطلوب";if(!form.phone.trim())e.phone="مطلوب";if(!form.services.length)e.services="اختر خدمة";if(salon.barbers?.length&&!form.barberId)e.barberId="اختر الحلاق";setErrors(e);return!Object.keys(e).length;};
  const v2=()=>{const e={};if(!form.date)e.date="مطلوب";if(!form.time)e.time="اختر وقتاً";setErrors(e);return!Object.keys(e).length;};
  const inner=(
    <>
      {!inline&&<div style={G.salonBadge}><span style={{fontSize:20,color:"var(--p)"}}>✂</span><div style={{flex:1}}><div style={{fontWeight:700,color:"#fff"}}>{salon.name}</div><div style={{fontSize:11,color:"#888"}}>{salon.gov||salon.region}</div></div><button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>🗺</button></div>}
      <div style={G.steps}>{["بياناتك","الموعد","تأكيد"].map((l,i)=><div key={i} style={{...G.si,...(step>=i+1?{opacity:1}:{})}}><div style={G.sd}>{i+1}</div><span style={{fontSize:10,color:"var(--p)"}}>{l}</span></div>)}</div>
      {step===1&&<div style={G.fc}>
        <F label="اسمك الكريم" error={errors.name}><input style={fi(errors.name)} placeholder="الاسم الكامل" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label="رقم الجوال" error={errors.phone}><input style={fi(errors.phone)} placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
        <F label="الخدمات" error={errors.services}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{salon.services.map(s=><div key={s} style={{...G.chip,...(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggle(s)}>{s}{salon.prices?.[s]?` (${salon.prices[s]}ر)`:""}</div>)}</div></F>
        {form.services.length>0&&<div style={G.totalBox}>الإجمالي: <strong style={{color:"var(--p)"}}>{total} ريال</strong></div>}
        {salon.barbers?.length>0&&<F label="اختر الحلاق" error={errors.barberId}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{salon.barbers.map(b=><div key={b.id} style={{...G.chip,...(form.barberId===b.id?G.chipOn:{})}} onClick={()=>setForm(p=>({...p,barberId:b.id,time:""}))}>✂ {b.name}</div>)}</div></F>}
        <button style={G.sub} onClick={()=>{if(v1())setStep(2);}}>التالي →</button>
      </div>}
      {step===2&&<div style={G.fc}>
        <F label="التاريخ" error={errors.date}><input type="date" style={fi(errors.date)} value={form.date} min={todayStr()} onChange={e=>setForm(p=>({...p,date:e.target.value,time:""}))}/></F>
        {salon.shiftEnabled&&<div style={{fontSize:11,color:"var(--p)",background:"var(--pa07)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>⏰ {salon.shift1Start}–{salon.shift1End} | {salon.shift2Start}–{salon.shift2End}</div>}
        <div style={{fontSize:12,color:"#aaa",marginBottom:7}}>اختر الوقت{form.barberId?` · ${barber?.name||""}`:""}</div>
        {errors.time&&<div style={G.err}>{errors.time}</div>}
        <div style={G.timeGrid}>{slots.map(sl=>{const used=slotUsed(sl);const full=slotFull(sl);const sel=form.time===sl;return(<button key={sl} disabled={full} onClick={()=>!full&&setForm(p=>({...p,time:sl}))} style={{...G.ts,...(full?G.tsF:{}),...(sel?G.tsS:{})}}><div>{sl}</div><div style={{fontSize:9,marginTop:1,color:full?"#555":sel?"var(--p)":"#666"}}>{full?"محجوز":`${bc-used} متاح`}</div></button>);})}</div>
        <button style={G.sub} onClick={()=>{if(v2())setStep(3);}}>التالي →</button>
      </div>}
      {step===3&&<div style={G.fc}>
        <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:36}}>✅</div><h3 style={{color:"#fff",marginTop:4,fontSize:16}}>تأكيد الحجز</h3></div>
        {[["الاسم",form.name],["الجوال",form.phone],["الخدمات",form.services.join(" + ")],["الحلاق",barber?.name||"أي حلاق"],["التاريخ",form.date],["الوقت",form.time],["الإجمالي",`${total} ريال`]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #2a2a3a"}}><span style={{color:"#888",fontSize:12}}>{l}</span><span style={{color:"#f0f0f0",fontWeight:600,fontSize:12}}>{v}</span></div>)}
        <button style={{...G.mapsBtn,width:"100%",marginTop:10,justifyContent:"center",display:"flex",padding:10}} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>🗺 افتح على خريطة Google</button>
        <button style={{...G.sub,marginTop:8,background:"linear-gradient(135deg,#27ae60,#2ecc71)",color:"#fff"}} onClick={()=>addBooking(salon.id,{...form,barberId:form.barberId||"any",barberName:barber?.name||"",total})}>إرسال طلب الحجز 🎉</button>
      </div>}
    </>
  );
  if(inline)return <div>{inner}</div>;
  return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={onBack}>→</button><h2 style={G.ft}>حجز موعد</h2></div>{inner}</div></div>;
}

// ══════════════════════════════════════════════
//  STATS + NOTIF
// ══════════════════════════════════════════════
function StatsPanel({salon}){
  const[m,setM]=useState(new Date().getMonth());
  const[y,setY]=useState(new Date().getFullYear());
  const bks=salon.bookings.filter(b=>{if(!b.date)return false;const d=new Date(b.date);return d.getMonth()===m&&d.getFullYear()===y;});
  return(
    <div style={{paddingTop:4}}>
      <div style={{display:"flex",gap:7,marginBottom:12}}>
        <select style={{...fi(),...{flex:1}}} value={m} onChange={e=>setM(+e.target.value)}>{MONTHS_AR.map((mn,i)=><option key={i} value={i}>{mn}</option>)}</select>
        <select style={{...fi(),...{width:88}}} value={y} onChange={e=>setY(+e.target.value)}>{[2024,2025,2026,2027].map(yr=><option key={yr}>{yr}</option>)}</select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[["الحجوزات",bks.length,"var(--p)"],["مقبول",bks.filter(b=>b.status==="accepted").length,"#27ae60"],["انتظار",bks.filter(b=>b.status==="pending").length,"var(--pl)"],["مرفوض",bks.filter(b=>b.status==="rejected").length,"#e74c3c"]].map(([l,n,c])=>(
          <div key={l} style={{background:"#13131f",borderRadius:11,padding:"12px 8px",textAlign:"center",border:`1px solid ${c}33`}}><div style={{fontSize:22,fontWeight:900,color:c}}>{n}</div><div style={{fontSize:11,color:"#888"}}>{l}</div></div>
        ))}
      </div>
      <div style={{background:"var(--pa08)",borderRadius:11,padding:"12px 14px",border:"1px solid var(--pa25)",textAlign:"center"}}>
        <div style={{fontSize:11,color:"#888",marginBottom:3}}>الإيرادات — {MONTHS_AR[m]} {y}</div>
        <div style={{fontSize:26,fontWeight:900,color:"var(--p)"}}>{bks.reduce((a,b)=>a+(b.total||0),0)} <span style={{fontSize:13}}>ريال</span></div>
      </div>
    </div>
  );
}
function NotifPanel({salon,onUpdate}){
  const bks=[...salon.bookings].reverse();
  if(!bks.length)return <div style={G.empty}>لا توجد حجوزات</div>;
  return <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:4}}>{bks.map(b=>(
    <div key={b.id} style={{...G.bItem,borderRight:`3px solid ${b.status==="accepted"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--pl)"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>👤 {b.name}</div><div style={{fontSize:11,color:"#aaa"}}>📞 {b.phone}</div><div style={{fontSize:11,color:"#aaa"}}>✂ {Array.isArray(b.services)?b.services.join(" + "):b.service||""}{b.barberName?` · ${b.barberName}`:""}</div><div style={{fontSize:11,color:"var(--p)"}}>📅 {b.date} {b.time} · {b.total||0} ر</div></div>
        <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,flexShrink:0,background:b.status==="accepted"?"#1a3a2a":b.status==="rejected"?"#3a1a1a":"#2a2a1a",color:b.status==="accepted"?"#4caf50":b.status==="rejected"?"#e74c3c":"var(--pl)"}}>{b.status==="accepted"?"✅":b.status==="rejected"?"❌":"⏳"}</span>
      </div>
      {b.status==="pending"&&<div style={{display:"flex",gap:7,marginTop:8}}><button style={G.accBtn} onClick={()=>onUpdate(salon.id,b.id,"accepted")}>✅ قبول</button><button style={G.rejBtn} onClick={()=>onUpdate(salon.id,b.id,"rejected")}>❌ رفض</button></div>}
    </div>
  ))}</div>;
}

// ══════════════════════════════════════════════
//  REGISTER  (salon + custom services)
// ══════════════════════════════════════════════
function RegisterView({allLoc,addSalon,setView,addExtraLoc}){
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
      alert("⚠️ المتصفح لا يدعم تحديد الموقع\nاستخدم \"رابط الخريطة\" بدلاً من ذلك");
      return;
    }
    setDetecting(true);
    // Check permission state first
    try {
      if(navigator.permissions){
        const perm=await navigator.permissions.query({name:"geolocation"});
        if(perm.state==="denied"){
          alert("🚫 إذن الموقع مرفوض\n\nلتفعيله:\n• اضغط على رمز القفل/الموقع بجوار الرابط\n• اختر \"السماح\" للموقع\n• أعد المحاولة\n\nأو استخدم \"رابط الخريطة\" يدوياً");
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
    if(!form.name.trim())e.name="مطلوب"; if(!form.owner.trim())e.owner="مطلوب";
    if(!form.ownerPhone.trim())e.ownerPhone="مطلوب";
    if(!form.region)e.region="مطلوب"; if(!form.gov)e.gov="مطلوب";
    if(!form.phone.trim())e.phone="مطلوب"; if(!form.address.trim())e.address="مطلوب";
    if(!form.locationUrl.trim())e.locationUrl="الموقع مطلوب";
    if(!form.services.length)e.services="اختر خدمة";
    if(form.barbers.some(b=>!b.name.trim()))e.barbers="أدخل أسماء الحلاقين";
    setErrors(e); return!Object.keys(e).length;
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>تسجيل صالون جديد</h2></div>

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
  );
}

// ══════════════════════════════════════════════
//  ADMIN VIEW
// ══════════════════════════════════════════════
function AdminView({salons,setSalons,customers,setCustomers,setView,deleteSalon,approveSalon,onEnter,adminSession,onPage,setSelSalon,toast$}){
  const[pw,setPw]=useState(""); const[err,setErr]=useState(false);
  const[tab,setTab]=useState("pending");
  const[search,setSearch]=useState("");
  const[adminPwd,setAdminPwd]=useState(ADMIN_PWD);
  const[pwForm,setPwForm]=useState({old:"",n1:"",n2:"",err:""});

  if(!adminSession)return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>لوحة الإدارة</h2></div>
      <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:24,border:"1px solid #2a2a3a",marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔐</div>
        <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:4}}>دخول المشرف</div>
        <div style={{fontSize:12,color:"#666",marginBottom:20}}>منطقة مخصصة للإدارة فقط</div>
        <input type="password" style={{...fi(err),textAlign:"center",fontSize:16,letterSpacing:4,marginBottom:8}} placeholder="••••••••" value={pw}
          onChange={e=>{setPw(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&(pw===adminPwd?onEnter():setErr(true))}/>
        {err&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:8}}>❌ كلمة المرور غير صحيحة</div>}
        <button style={{...G.sub,marginTop:4}} onClick={()=>pw===adminPwd?onEnter():setErr(true)}>دخول</button>
        <div style={{fontSize:10,color:"#333",marginTop:10}}>للتجربة: admin123</div>
      </div>
    </div></div>
  );

  const pending=salons.filter(s=>s.status==="pending");
  const approved=salons.filter(s=>s.status==="approved");
  const rejected=salons.filter(s=>s.status==="rejected");
  const totalBk=salons.reduce((a,s)=>a+s.bookings.length,0);
  const todayBk=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.date===todayStr()).length,0);
  const totalRev=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status==="approved").reduce((x,b)=>x+(b.total||0),0),0);
  const todayRev=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status==="approved"&&b.date===todayStr()).reduce((x,b)=>x+(b.total||0),0),0);

  const q=search.trim().toLowerCase();
  const filterSalons=list=>!q?list:list.filter(s=>[s.name,s.owner,s.phone,s.ownerPhone,s.region,s.gov,s.village].join(" ").toLowerCase().includes(q));
  const allBookings=salons.flatMap(s=>s.bookings.map(b=>({...b,salonName:s.name}))).sort((a,b)=>b.date>a.date?1:-1);
  const filteredBookings=!q?allBookings:allBookings.filter(b=>[b.name,b.phone,b.salonName,b.date].join(" ").toLowerCase().includes(q));
  const filteredCustomers=!q?customers:customers.filter(c=>[c.name,c.phone].join(" ").toLowerCase().includes(q));

  // رسم بياني — آخر 6 أشهر
  const monthlyData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setMonth(d.getMonth()-i);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()];
      const count=allBookings.filter(b=>b.date?.startsWith(key)).length;
      months.push({label,count,key});
    }
    return months;
  })();
  const maxCount=Math.max(...monthlyData.map(m=>m.count),1);

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>🔐 لوحة الإدارة</h2></div>

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
      {tab==="bookings"&&(filteredBookings.length===0
        ?<div style={G.empty}>{search?"لا نتائج":"لا توجد حجوزات"}</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filteredBookings.map((b,i)=>{
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
      )}

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

      {/* كلمة المرور */}
      {tab==="password"&&(
        <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
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
        </div>
      )}

    </div></div>
  );
}

// ══════════════════════════════════════════════
//  OWNER LOGIN + DASHBOARD
// ══════════════════════════════════════════════
function OwnerLogin({salons,setOwnerSession,setView,toast$}){
  const[phone,setPhone]=useState(""); const[err,setErr]=useState("");
  const login=()=>{
    const s=salons.find(x=>x.ownerPhone===phone.trim()||x.phone===phone.trim());
    if(!s){setErr("لا يوجد صالون بهذا الرقم");return;}
    setOwnerSession(s.id); setView("ownerDash");
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>دخول صاحب الصالون</h2></div>
      <div style={G.fc}>
        <SL>أدخل رقم جوالك المسجّل</SL>
        <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
        <button style={G.sub} onClick={login}>دخول</button>
      </div>
      <div style={{margin:"0 0 16px",background:"rgba(var(--pr),.06)",border:"1.5px dashed rgba(var(--pr),.4)",borderRadius:13,padding:"18px 16px",textAlign:"center"}}>
        <div style={{fontSize:15,color:"var(--p)",fontWeight:700,marginBottom:6}}>لا تملك صالوناً بعد؟</div>
        <div style={{fontSize:12,color:"#888",marginBottom:14}}>سجّل صالونك الآن وابدأ باستقبال الحجوزات</div>
        <button style={{...G.sub,background:"var(--grad)",color:"#000",fontSize:15,fontWeight:900,letterSpacing:.5}} onClick={()=>setView("register")}>
          ✂ سجّل صالونك الآن
        </button>
      </div>
    </div></div>
  );
}
function OwnerDash({salon,setView,setOwnerSession,updateBookingStatus,setSalons,toast$}){
  const[tab,setTab]=useState("notif");
  if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>لوحة الصالون</h2></div><div style={G.empty}>الصالون غير موجود</div></div></div>;
  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const statusColor=salon.status==="approved"?"#27ae60":salon.status==="rejected"?"#e74c3c":"var(--pl)";
  const statusLabel=salon.status==="approved"?"✅ مفعّل":salon.status==="rejected"?"❌ مرفوض":"⏳ انتظار موافقة الإدارة";
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={{...G.ft,flex:1}}>لوحة صالوني</h2><button style={{...G.delBtn,border:"1.5px solid #888",color:"#aaa",background:"transparent"}} onClick={()=>{setOwnerSession(null);setView("home");}}>خروج</button></div>
      <div style={G.salonBadge}>
        <span style={{fontSize:20,color:"var(--p)"}}>✂</span>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{salon.name}</div><div style={{fontSize:11,color:"#888"}}>{salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div></div>
        <span style={{fontSize:11,fontWeight:700,color:statusColor,background:`${statusColor}22`,padding:"3px 8px",borderRadius:8}}>{statusLabel}</span>
      </div>
      {salon.status!=="approved"&&<div style={{background:"rgba(240,192,64,.08)",border:"1px solid var(--pl)55",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--pl)"}}>🔔 صالونك في انتظار موافقة الإدارة — سيظهر للعملاء بعد القبول</div>}
      <div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>setTab("notif")}>🔔 الحجوزات {pending>0&&<span style={G.notifDot}>{pending}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")}>📊 إحصائيات</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙️ إعدادات</button>
      </div>
      {tab==="notif"&&<NotifPanel salon={salon} onUpdate={updateBookingStatus}/>}
      {tab==="stats"&&<StatsPanel salon={salon}/>}
      {tab==="settings"&&<OwnerSettings salon={salon} setSalons={setSalons} toast$={toast$}/>}
    </div></div>
  );
}

function OwnerSettings({salon,setSalons,toast$}){
  const[saving,setSaving]=useState(false);
  const[sec,setSec]=useState("info");
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
      toast$&&toast$("✅ تم حفظ التعديلات");
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
    setSaving(false);
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600};
  const box={background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"};

  return(
    <div>
      <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        {[{id:"info",icon:"📋",label:"المعلومات"},{id:"hours",icon:"🕐",label:"الأوقات"},{id:"services",icon:"✂",label:"الخدمات"},{id:"barbers",icon:"💈",label:"الحلاقون"},{id:"tone",icon:"🔔",label:"النغمة"}].map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"#2a2a3a"}`,background:sec===s.id?"var(--pa12)":"#1a1a2e",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

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
          <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:"#0d0d1a",borderRadius:9,padding:"9px 11px",border:"1px solid #2a2a3a"}}>
            <span style={{fontSize:16}}>💈</span>
            <input style={{...inp,flex:1,padding:"6px 10px"}} value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
            <button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder="اسم الحلاق الجديد" value={newBarber} onChange={e=>setNewBarber(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim()}]}));setNewBarber("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim()}]}));setNewBarber("");}}}>+ إضافة</button>
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
  );
}

// ══════════════════════════════════════════════
//  CUSTOMER LOGIN + DASHBOARD
// ══════════════════════════════════════════════
function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$}){
  const[tab,setTab]=useState("login");
  const[phone,setPhone]=useState(""); const[name,setName]=useState(""); const[err,setErr]=useState("");
  const login=async()=>{
    try{
      const rows=await sb("customers","GET",null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
      if(!rows.length){setErr("لا يوجد حساب بهذا الرقم");return;}
      const c=toAppCustomer(rows[0]);
      setCustomerSession(c); setView("custDash");
    }catch(e){setErr("خطأ: "+e.message);}
  };
  const register=async()=>{
    if(!name.trim()||!phone.trim()){setErr("أدخل الاسم والجوال");return;}
    try{
      const exists=await sb("customers","GET",null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
      if(exists.length){setErr("الرقم مسجل بالفعل");return;}
      const rows=await sb("customers","POST",{name:name.trim(),phone:phone.trim()},"");
      const nc=toAppCustomer(rows[0]);
      setCustomerSession(nc); setView("custDash");
    }catch(e){setErr("خطأ: "+e.message);}
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>حساب العميل 👤</h2></div>
      <div style={{display:"flex",gap:7,marginBottom:14}}>
        <button style={{...G.toggleBtn,...(tab==="login"?G.toggleOn:{})}} onClick={()=>{setTab("login");setErr("");}}>دخول</button>
        <button style={{...G.toggleBtn,...(tab==="reg"?G.toggleOn:{})}} onClick={()=>{setTab("reg");setErr("");}}>حساب جديد</button>
      </div>
      <div style={G.fc}>
        {tab==="login"?<>
          <SL>تسجيل الدخول</SL>
          <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <button style={G.sub} onClick={login}>دخول</button>
        </>:<>
          <SL>إنشاء حساب جديد</SL>
          <F label="الاسم"><input style={fi()} placeholder="اسمك الكريم" value={name} onChange={e=>setName(e.target.value)}/></F>
          <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <button style={G.sub} onClick={register}>إنشاء الحساب</button>
        </>}
      </div>
    </div></div>
  );
}
function CustomerDash({customer,salons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers}){
  const[tab,setTab]=useState("favs");
  const[editMode,setEditMode]=useState(false);
  const[editName,setEditName]=useState(customer?.name||"");
  const[editPhone,setEditPhone]=useState(customer?.phone||"");
  const[reminderMins,setReminderMins]=useState(60);
  if(!customer)return null;

  const favSalons=salons.filter(s=>favSet.has(s.id)&&s.status==="approved");
  const history=customer.history||[];
  const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
  const points=history.length*10;
  const badge=history.length>=10?"🏆 عميل مميز":history.length>=5?"⭐ عميل نشط":"🆕 عميل جديد";

  // avatar بالحرف الأول
  const initials=(customer.name||"?")[0];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

  const saveEdit=async()=>{
    if(!editName.trim()){return;}
    try{
      await sb("customers","PATCH",{name:editName.trim(),phone:editPhone.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim()}:c));
      setEditMode(false);
    }catch(e){alert("خطأ: "+e.message);}
  };

  const deleteAccount=async()=>{
    if(!confirm("حذف حسابك نهائياً؟ لا يمكن التراجع!")){return;}
    try{
      await sb("customers","DELETE",null,`?id=eq.${customer.id}`);
      setCustomerSession(null);setView("home");
    }catch(e){alert("خطأ: "+e.message);}
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

  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={{...G.ft,flex:1}}>حسابي</h2><button style={{...G.delBtn,border:"1.5px solid #888",color:"#aaa",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("home");}}>خروج</button></div>

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
        <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>♥ المفضلة {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>📋 حجوزاتي</button>
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
              const s=salons.find(x=>x.id===h.salonId);
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${h.rating?"var(--p)":"#2a2a3a"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s?.name||"صالون محذوف"}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>📅 {h.date} · 🕐 {h.time}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>💰 {h.total||0} ريال</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=h.rating?"#f0c040":"#333"}}>★</span>)}</div>}
                      {s&&<button style={{...G.bookBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{setSelSalon(s);setView("book");}}>🔄 احجز مجدداً</button>}
                      <button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>🔔 ذكّرني</button>
                    </div>
                  </div>
                  <InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={(r,comment)=>{
                    const rev=[...history].reverse();
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated}:c));
                    sb("customers","PATCH",{history:updated},`?id=eq.${customer.id}`).catch(console.error);
                  }}/>
                </div>
              );
            })}
          </div>}
      </>}

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
        {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=rated?"#f0c040":"#333"}}>★</span>)}
        <span style={{fontSize:11,color:"#888",marginRight:6,alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment&&<div style={{fontSize:12,color:"#aaa",fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );
  return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{fontSize:11,color:"#666",marginBottom:5}}>قيّم تجربتك في هذا الصالون:</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{fontSize:28,cursor:"pointer",color:n<=(hover||sel)?"#f0c040":"#2a2a3a",transition:"color .1s",lineHeight:1,userSelect:"none"}}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}>★</span>
        ))}
        {(hover||sel)>0&&<span style={{fontSize:11,color:"var(--p)",marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel>0&&<>
        <textarea
          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"none",minHeight:60,marginBottom:8}}
          placeholder="أضف تعليقاً (اختياري)..."
          value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button style={{...G.sub,padding:"8px 0",fontSize:12}} onClick={()=>onRate(sel,txt)}>
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
  const[custSearch,setCustSearch]=useState("");
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
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button style={G.bb} onClick={()=>setSelId(null)}>→</button>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>👤 {sel.name}</span>
          {isBlocked&&<span style={{fontSize:11,background:"rgba(231,76,60,.2)",color:"#e74c3c",padding:"2px 8px",borderRadius:20,fontWeight:700}}>محظور</span>}
        </div>

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
  }

  return(
    <div>
      {/* بحث العملاء */}
      <div style={{...G.searchRow,marginBottom:10}}>
        <span style={{fontSize:14,color:"#555"}}>🔍</span>
        <input style={G.searchInput} placeholder="ابحث بالاسم أو رقم الجوال..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
        {custSearch&&<button style={G.searchClear} onClick={()=>setCustSearch("")}>✕</button>}
      </div>
      {filtered.length===0&&<div style={G.empty}>لا نتائج</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(c=>{
          const isBlocked=blocked[c.id];
          return(
            <div key={c.id} style={{...G.bItem,borderRight:`3px solid ${isBlocked?"#e74c3c":"#6aadff"}`,cursor:"pointer"}} onClick={()=>setSelId(c.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>👤 {c.name}</div>
                    {isBlocked&&<span style={{fontSize:10,background:"rgba(231,76,60,.2)",color:"#e74c3c",padding:"1px 6px",borderRadius:20}}>محظور</span>}
                  </div>
                  <div style={{fontSize:11,color:"#888"}}>📞 {c.phone}</div>
                </div>
                <div style={{textAlign:"left",flexShrink:0}}>
                  <div style={{fontSize:11,color:"#a78bfa"}}>📋 {(c.history||[]).length} حجز</div>
                  <div style={{fontSize:11,color:"#e74c3c",marginTop:2}}>♥ {(c.favs||[]).length} مفضلة</div>
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
  const[pinned,setPinned]=useState(()=>{try{return JSON.parse(localStorage.getItem("pinned_salons")||"[]");}catch{return[];}});
  const sel=editId?salons.find(s=>s.id===editId):null;

  const togglePin=(id)=>{
    const newPinned=pinned.includes(id)?pinned.filter(x=>x!==id):[...pinned,id];
    setPinned(newPinned);
    localStorage.setItem("pinned_salons",JSON.stringify(newPinned));
    toast$&&toast$(pinned.includes(id)?"📌 تم إلغاء التثبيت":"📌 تم تثبيت الصالون");
  };

  // ترتيب: المثبتة أولاً
  const sortedSalons=[...salons].sort((a,b)=>{
    const ap=pinned.includes(a.id)?1:0;
    const bp=pinned.includes(b.id)?1:0;
    return bp-ap;
  });

  const startEdit=s=>{setEditId(s.id);setEf({name:s.name,owner:s.owner,phone:s.phone,ownerPhone:s.ownerPhone||s.phone,address:s.address,rating:s.rating||5});};
  const save=async()=>{
    try{
      await sb("salons","PATCH",{name:ef.name,owner:ef.owner,phone:ef.phone,owner_phone:ef.ownerPhone,address:ef.address,rating:ef.rating},`?id=eq.${editId}`);
      setSalons(p=>p.map(s=>s.id===editId?{...s,...ef,ownerPhone:ef.ownerPhone}:s));
      toast$&&toast$("✅ تم حفظ التعديلات");setEditId(null);setEf(null);
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
  };

  if(editId&&ef&&sel) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <button style={G.bb} onClick={()=>{setEditId(null);setEf(null);}}>→</button>
        <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>✏️ تعديل بيانات: {sel.name}</span>
      </div>
      <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid var(--pa25)",marginBottom:8}}>
        <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:12,borderBottom:"1px solid #2a2a3a",paddingBottom:6}}>معلومات الصالون</div>
        {[["اسم الصالون","name"],["اسم المالك","owner"],["جوال الصالون","phone"],["جوال المالك (للدخول)","ownerPhone"],["العنوان","address"]].map(([l,k])=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:3,fontWeight:600}}>{l}</label>
            <input style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}}
              value={ef[k]||""} onChange={e=>setEf(f=>({...f,[k]:e.target.value}))}/>
          </div>
        ))}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:3,fontWeight:600}}>التقييم ⭐ (1.0 – 5.0)</label>
          <input type="number" min="1" max="5" step="0.1"
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}}
            value={ef.rating} onChange={e=>setEf(f=>({...f,rating:+e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={G.sub} onClick={save}>💾 حفظ التعديلات</button>
          <button style={{...G.delBtn,padding:"12px 14px",flexShrink:0}} onClick={()=>{const r=prompt("سبب الحذف (اختياري):");if(confirm(`حذف هذا الصالون نهائياً؟${r?"\nالسبب: "+r:""}`)){deleteSalon(editId);setEditId(null);setEf(null);}}}>🗑</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sortedSalons.map(s=>{
        const isPinned=pinned.includes(s.id);
        const lastBk=s.bookings.length?[...s.bookings].sort((a,b)=>b.date>a.date?1:-1)[0]:null;
        return(
        <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${isPinned?"#f0c040":"#27ae60"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                {isPinned&&<span style={{fontSize:10,color:"#f0c040"}}>📌</span>}
              </div>
              <div style={{fontSize:11,color:"#888"}}>👤 {s.owner} · 📞 {s.phone}</div>
              {s.ownerPhone&&s.ownerPhone!==s.phone&&<div style={{fontSize:11,color:"#888"}}>📱 مالك: {s.ownerPhone}</div>}
              <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?" · "+s.village:""}</div>
              <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#4caf50"}}>📅 {s.bookings.length} حجز</span>
                <span style={{fontSize:10,color:"var(--p)"}}>⭐ {s.rating}</span>
                {lastBk&&<span style={{fontSize:10,color:"#6aadff"}}>🕐 آخر نشاط: {lastBk.date}</span>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px",background:isPinned?"rgba(240,192,64,.15)":"rgba(100,60,180,.15)",border:`1px solid ${isPinned?"#f0c040":"#7c4dff"}`,color:isPinned?"#f0c040":"#b39ddb"}} onClick={()=>togglePin(s.id)}>{isPinned?"📌 مثبت":"📌 تثبيت"}</button>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px",background:"rgba(212,160,23,.12)",border:"1px solid var(--p)",color:"var(--p)"}} onClick={()=>startEdit(s)}>✏️ تعديل</button>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{setSelSalon(s);setView("salon");}}>📋 صفحة</button>
              <button style={{...G.delBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{const r=prompt("سبب الحذف (اختياري):");if(confirm(`حذف؟${r?"\nالسبب: "+r:""}`))deleteSalon(s.id);}}>🗑</button>
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
function SettingsView({settings,setSettings,setView,toast$}){
  const THEME_OPTIONS=[
    {id:"gold",    label:"ذهبي",    color:"#d4a017",emoji:"✨"},
    {id:"emerald", label:"زمردي",   color:"#10b981",emoji:"🌿"},
    {id:"sapphire",label:"ياقوتي",  color:"#3b82f6",emoji:"💎"},
    {id:"rose",    label:"وردي",    color:"#ec4899",emoji:"🌸"},
    {id:"violet",  label:"بنفسجي",  color:"#8b5cf6",emoji:"🔮"},
    {id:"crimson", label:"قرمزي",   color:"#ef4444",emoji:"🔴"},
  ];

  const applyTheme=(id)=>{
    const t=THEMES[id]||THEMES.gold;
    const r=document.documentElement.style;
    r.setProperty("--p",  t.primary);
    r.setProperty("--pl", t.light);
    r.setProperty("--pd", t.dark);
    r.setProperty("--pll",t.lightest);
    r.setProperty("--pr", t.rgb);
    ["5","07","08","12","15","18","2","25","3","4"].forEach(a=>{
      const pct=a==="4"?.45:a==="3"?.3:a==="25"?.25:a==="2"?.2:a==="18"?.18:a==="15"?.15:a==="12"?.12:a==="08"?.08:a==="07"?.07:.05;
      r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);
    });
    r.setProperty("--grad", `linear-gradient(135deg,${t.primary},${t.light})`);
    r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
    setSettings(s=>({...s,theme:id}));
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>⚙ الإعدادات</h2></div>

      {/* Theme Picker */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:4,paddingBottom:5,borderBottom:"1px solid #2a2a3a"}}>🎨 لون واجهة التطبيق</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>اختر اللون الذي يناسبك — يُطبَّق فوراً</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {THEME_OPTIONS.map(t=>{
            const active=settings.theme===t.id;
            return(
              <button key={t.id} onClick={()=>applyTheme(t.id)}
                style={{padding:"14px 6px",borderRadius:12,border:`2px solid ${active?t.color:"#2a2a3a"}`,background:active?t.color+"22":"#1a1a2e",color:"#fff",cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:active?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all .2s",transform:active?"scale(1.04)":"scale(1)"}}>
                <span style={{fontSize:22}}>{t.emoji}</span>
                <div style={{width:24,height:24,borderRadius:"50%",background:t.color,boxShadow:active?`0 0 0 3px ${t.color}55`:"none"}}/>
                <span style={{fontSize:11,color:active?t.color:"#888"}}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone Picker */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:4,paddingBottom:5,borderBottom:"1px solid #2a2a3a"}}>🔔 نغمة التنبيه</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>اضغط للمعاينة — تُستخدم كنغمة افتراضية للصالونات الجديدة</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(t=>{
            const active=settings.defaultTone===t.id;
            return(
              <button key={t.id} onClick={()=>{setSettings(s=>({...s,defaultTone:t.id}));playTone(t.id,0.8);}}
                style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:active?700:400,textAlign:"center"}}>
                {t.label} {active&&"✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* App Info */}
      <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:16,padding:20,border:"1px solid var(--pa25)",marginBottom:12,textAlign:"center"}}>
        <div style={{fontSize:28,fontWeight:900,color:"var(--p)",letterSpacing:1,marginBottom:4}}>دورك</div>
        <div style={{fontSize:12,color:"#888",marginBottom:2}}>وسيطك للحلاقة والصالونات</div>
        <div style={{fontSize:10,color:"#555"}}>الإصدار 1.0.0 · 2025</div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14}}>
          {[["✂","صالونات"],["👤","عملاء"],["📅","حجوزات"]].map(([i,l])=>(
            <div key={l} style={{textAlign:"center"}}><div style={{fontSize:20}}>{i}</div><div style={{fontSize:10,color:"#666",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #c0392b33",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #c0392b33"}}>⚠️ منطقة الخطر</div>
        <div style={{fontSize:11,color:"#888",marginBottom:12}}>حذف جميع البيانات وإعادة التطبيق لحالته الأولى</div>
        <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{
          if(confirm("⚠️ سيتم حذف جميع البيانات!\n\n• الصالونات\n• الحجوزات\n• حسابات العملاء\n• الإعدادات\n\nهل أنت متأكد؟")){
            localStorage.clear(); 
            alert("⚠️ البيانات في Supabase لن تُحذف من هنا. اذهب إلى Supabase Dashboard لحذف السجلات.");
            window.location.reload();
          }
        }}>🗑 حذف جميع البيانات</button>
      </div>
    </div></div>
  );
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function SL({children}){return <div style={G.sl2}>{children}</div>;}
function F({label,error,children,style}){return <div style={{marginBottom:11,...style}}>{label&&<label style={{display:"block",fontSize:12,color:"#aaa",marginBottom:3,fontWeight:600}}>{label}</label>}{children}{error&&<div style={G.err}>{error}</div>}</div>;}
const fi=(err)=>({width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${err?"#e74c3c":"#2a2a3a"}`,background:"#13131f",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"});

// ══════════════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════════════
const CSS=`
  :root {
    --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23;
    --pa5: rgba(212,160,23,.05); --pa07: rgba(212,160,23,.07); --pa08: rgba(212,160,23,.08);
    --pa12: rgba(212,160,23,.12); --pa15: rgba(212,160,23,.15); --pa18: rgba(212,160,23,.18);
    --pa2: rgba(212,160,23,.2); --pa25: rgba(212,160,23,.25); --pa3: rgba(212,160,23,.3);
    --pa4: rgba(212,160,23,.45);
    --grad: linear-gradient(135deg,#d4a017,#f0c040);
    --grad2: linear-gradient(135deg,#f0c040,#d4a017);
  }
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{direction:rtl;font-family:'Cairo',sans-serif;background:#0d0d1a;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--p);border-radius:4px;}
  .hcard{transition:transform .18s,box-shadow .18s;} .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;}
  input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;} button:active{opacity:.82;}
`;

const G={
  searchRow:{display:"flex",alignItems:"center",gap:8,background:"#13131f",borderRadius:10,border:"1.5px solid #2a2a3a",padding:"9px 12px"},
  searchInput:{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:14,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  searchClear:{background:"#2a2a3a",border:"none",color:"#aaa",cursor:"pointer",borderRadius:"50%",width:22,height:22,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  sortChip:{padding:"6px 12px",borderRadius:20,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0},
  sortChipOn:{background:"var(--pa15)",border:"1.5px solid var(--p)",color:"var(--p)"},
  app:{minHeight:"100vh",background:"#0d0d1a",color:"#f0f0f0",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  page:{maxWidth:480,margin:"0 auto",minHeight:"100vh",paddingBottom:30},
  toast:{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",padding:"10px 22px",borderRadius:11,color:"#fff",fontWeight:700,zIndex:9999,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"},

  // TOP BAR
  topBar:{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"#0d0d1a",borderBottom:"1px solid #2a2a3a",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",maxWidth:480,margin:"0 auto"},
  roleBtn:{width:36,height:36,borderRadius:10,border:"1.5px solid #2a2a3a",background:"#13131f",color:"#aaa",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  roleBtnActive:{border:"1.5px solid var(--p)",color:"var(--p)",background:"rgba(var(--pr),.1)"},
  roleDot:{position:"absolute",top:-4,right:-4,background:"#e74c3c",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  registerTopBtn:{background:"var(--grad)",color:"#000",border:"none",padding:"7px 13px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  fRow:{display:"flex",alignItems:"center",background:"#13131f",borderRadius:9,border:"1.5px solid #2a2a3a",padding:"7px 11px",gap:7},
  fSel:{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},

  toggleBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  toggleOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},

  section:{padding:"10px 14px 0"},
  badge:{background:"var(--p)",color:"#000",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700},
  empty:{textAlign:"center",color:"#555",padding:"36px 0",fontSize:13},

  card:{background:"#13131f",borderRadius:14,padding:13,border:"1px solid #2a2a3a",boxShadow:"0 4px 16px rgba(0,0,0,.3)"},
  cav:{width:38,height:38,borderRadius:10,background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0},
  tag:{background:"#1e1e30",color:"var(--p)",padding:"2px 8px",borderRadius:20,fontSize:10,border:"1px solid #2a2a3a"},
  favBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#555",padding:0,lineHeight:1},
  favOn:{color:"#e74c3c"},

  mapsBtn:{background:"rgba(42,109,217,.12)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  pageBtn:{background:"rgba(100,60,180,.15)",border:"1.5px solid #7c4dff",color:"#b39ddb",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  bookBtn:{flex:1,background:"var(--grad)",color:"#000",border:"none",padding:"8px 0",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},
  delBtn:{background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"5px 9px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  accBtn:{flex:1,background:"rgba(39,174,96,.15)",border:"1.5px solid #27ae60",color:"#4caf50",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},
  rejBtn:{flex:1,background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},

  fp:{padding:"0 13px 24px"},
  fh:{display:"flex",alignItems:"center",gap:8,padding:"12px 0 13px",position:"sticky",top:56,background:"#0d0d1a",zIndex:10},
  bb:{background:"#1a1a2e",border:"none",color:"var(--p)",fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  ft:{fontSize:17,fontWeight:700,color:"#fff"},
  fc:{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10},
  sl2:{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:9,paddingBottom:5,borderBottom:"1px solid #2a2a3a"},
  err:{color:"#e74c3c",fontSize:11,marginTop:2},
  sub:{width:"100%",background:"var(--grad)",color:"#000",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,fontFamily:"'Cairo',sans-serif"},

  salonBadge:{display:"flex",alignItems:"center",gap:8,background:"rgba(var(--pr),.06)",border:"1px solid var(--pa2)",borderRadius:10,padding:"10px 12px",marginBottom:11},
  tabRow:{display:"flex",gap:6,marginBottom:11},
  tabBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3},
  tabOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  notifDot:{background:"#e74c3c",color:"#fff",borderRadius:20,fontSize:9,padding:"1px 5px",fontWeight:700},

  steps:{display:"flex",marginBottom:11},
  si:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.3,transition:"opacity .2s"},
  sd:{width:24,height:24,borderRadius:"50%",background:"var(--p)",color:"#000",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"},

  chip:{padding:"5px 11px",borderRadius:20,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  chipOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  totalBox:{background:"var(--pa07)",border:"1px solid var(--pa2)",borderRadius:8,padding:"7px 11px",fontSize:12,color:"#f0f0f0",marginBottom:10},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10},
  ts:{padding:"8px 3px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#f0f0f0",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",textAlign:"center"},
  tsF:{background:"#160a0a",color:"#444",borderColor:"#2a1414",cursor:"not-allowed"},
  tsS:{background:"var(--pa15)",borderColor:"var(--p)",color:"var(--p)",fontWeight:700},

  bItem:{background:"#13131f",borderRadius:10,padding:"10px 12px",border:"1px solid #2a2a3a"},
  pmBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0},

  locTab:{flex:1,padding:"7px 0",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  locTabOn:{background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff"},
  detectBtn:{width:"100%",background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"10px 0",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  otherBtn:{marginTop:6,width:"100%",background:"transparent",border:"1.5px dashed #2a6dd9",color:"#6aadff",padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  addBarberBtn:{width:"100%",background:"transparent",border:"1.5px dashed var(--p)",color:"var(--p)",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",marginBottom:3},
  ratingBadge:{background:"var(--pa15)",border:"1px solid rgba(var(--pr),.4)",borderRadius:8,padding:"3px 8px",fontSize:12,fontWeight:700,color:"var(--p)",flexShrink:0,display:"flex",alignItems:"center",gap:3},
  heartCardBtn:{width:36,height:36,borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#888",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cairo',sans-serif"},
  heartCardOn:{border:"1.5px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c"},
  xBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #c0392b",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
};

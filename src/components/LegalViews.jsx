// شاشات اللغة والخصوصية والأسئلة الشائعة (صالون/عميل) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { SALON_LANGS, CLIENT_LANGS } from "../i18n.js";
import { G } from "../styles.js";
import { ALL_LANG_INFO } from "../constants.js";
import { PrivacyPolicyContent, FAQItem } from "./misc.jsx";
import { IconArrowRight, NotifIcon } from "./icons.jsx";

export function OwnerLangView({setView,setShowSalonDrawer,setOwnerTab}){
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

export function CustLangView({setView,setShowDrawer}){
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

export function OwnerPrivacyView({setView,setShowSalonDrawer}){
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

export function OwnerFaqView({setView,setShowSalonDrawer,setOwnerTab}){
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


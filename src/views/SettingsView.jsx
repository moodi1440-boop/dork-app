import React, { useState } from "react";
import { G } from "../styles";
import { playTone } from "../utils/audio";
import { TONES, THEMES, BACKGROUNDS, DEFAULT_SERVICES, DEFAULT_SOCIAL_LINKS } from "../constants";

function SettingsView({settings,setSettings,setView,toast$,socialLinks,setSocialLinks,darkMode,setDarkMode,persistUiToSupabase}){
  const[sec,setSec]=useState("theme");
  const SECS=[
    {id:"theme",icon:"🎨",label:"الألوان"},
    {id:"bg",   icon:"🖼",label:"الخلفية"},
    {id:"font", icon:"🔤",label:"الخط"},
    {id:"dark", icon:"🌙",label:"الإضاءة"},
    {id:"tone", icon:"🔔",label:"النغمات"},
    {id:"social",icon:"📱",label:"التواصل"},
    {id:"guide",icon:"📖",label:"الدليل"},
    {id:"faq",  icon:"❓",label:"أسئلة"},
    {id:"danger",icon:"⚠",label:"الخطر"},
  ];
  const THEME_OPTIONS=[
    {id:"gold",label:"ذهبي",color:"#d4a017",emoji:"✨"},
    {id:"emerald",label:"زمردي",color:"#10b981",emoji:"🌿"},
    {id:"sapphire",label:"ياقوتي",color:"#3b82f6",emoji:"💎"},
    {id:"royalBlue",label:"أزرق ملكي",color:"#1e3a8a",emoji:"👑"},
    {id:"bronze",label:"برونزي",color:"#8b5a2b",emoji:"🏺"},
    {id:"rose",label:"وردي",color:"#ec4899",emoji:"🌸"},
    {id:"violet",label:"بنفسجي",color:"#8b5cf6",emoji:"🔮"},
    {id:"crimson",label:"قرمزي",color:"#ef4444",emoji:"🔴"},
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
    setSettings(s=>({...s,theme:id}));
    persistUiToSupabase&&persistUiToSupabase({theme:id});
  };
  const box={background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a",marginBottom:12};
  const hdr={fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"};
  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600};

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>⚙ الإعدادات</h2></div>
      <div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {SECS.map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"#2a2a3a"}`,background:sec===s.id?"var(--pa12)":"#1a1a2e",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

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
              <button key={id} onClick={()=>{setSettings(s=>({...s,fontSize:id}));persistUiToSupabase&&persistUiToSupabase({fontSize:id});}}
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
                setSettings(s=>({...s,bg:bg.id}));
                persistUiToSupabase&&persistUiToSupabase({bg:bg.id});
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
          {[{id:true,label:"🌙 داكن",desc:"خلفية سوداء"},{id:false,label:"☀ فاتح",desc:"خلفية بيضاء"}].map(({id,label,desc})=>{
            const active=darkMode===id;
            return(
              <button key={String(id)} onClick={()=>{setDarkMode&&setDarkMode(id);persistUiToSupabase&&persistUiToSupabase({darkMode:id});}}
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
              <button key={t.id} onClick={()=>{setSettings(s=>({...s,defaultTone:t.id}));playTone(t.id,0.8);persistUiToSupabase&&persistUiToSupabase({defaultTone:t.id});}}
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
          <span>🔒</span><span>للعرض فقط - التعديل من لوحة الإدارة</span>
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
              <span style={{fontSize:18}}>✈</span><span style={{fontSize:13}}>{socialLinks.telegramUser||socialLinks.telegram}</span>
            </a>}
            {(socialLinks.customFields||[]).filter(f=>f&&f.label&&(f.value||"").trim()).map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:"#13131f",border:"1px solid #2a2a3a",color:"#fff"}}>
                <span style={{fontSize:18}}>📌</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:"#888"}}>{f.label}</div>
                  <div style={{fontSize:13}}>{f.value}</div>
                </div>
              </div>
            ))}
          </div>
          :<div style={G.empty}>لا توجد وسائل تواصل مضافة بعد</div>
        }
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
        <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:6,borderBottom:"1px solid #c0392b33"}}>⚠ منطقة الخطر</div>
        <div style={{fontSize:11,color:"#888",marginBottom:12}}>حذف البيانات المحلية وإعادة التطبيق لحالته الأولى</div>
        <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{if(confirm("حذف البيانات المحلية؟")){localStorage.clear();window.location.reload();}}}>🗑 مسح البيانات المحلية</button>
      </div>}

      <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:13,padding:14,border:"1px solid var(--pa25)",marginTop:4,textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:900,color:"var(--p)",letterSpacing:1}}>دورك ✂</div>
        <div style={{fontSize:11,color:"#888",marginTop:2}}>{"الإصدار 1.0.0 - 2025"}</div>
      </div>
    </div></div>
  );
}


export { SettingsView };

// حضور العميل وإعدادات التطبيق العامة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";
import { TONES, THEMES, BACKGROUNDS } from "../../constants.js";
import { playTone } from "../../utils.js";
import { PrivacyPolicyContent, FAQItem } from "./Misc.jsx";
import {
  IconArrowRight, IconCheck, IconScissors, NotifIcon, LabelWithIcon
} from "./Icons.jsx";
import { sb } from "../../../App.jsx";

export function AttendanceView({customer,salons}){
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

export function SettingsView({settings,setSettings,setView,toast$,socialLinks,setSocialLinks,darkMode,setDarkMode,themeMode,setThemeMode,persistUiToSupabase,setShowDrawer,onlySec,backFn}){
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

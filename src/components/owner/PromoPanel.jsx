// لوحة العروض الترويجية للصالون — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import {
  IconArrowRight, IconMedal, IconRocket, IconSuccess, IconSwapHorizontal, NotifIcon, LabelWithIcon
} from "../shared/Icons.jsx";
import { sb, supabase } from "../../../App.jsx";

export function PromoPanel({salon,customers,toast$}){
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

// تسجيل صالون جديد — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { DEFAULT_SERVICES, TONES } from "../constants.js";
import { F, fi } from "./ui.jsx";
import { IconArrowRight, IconClose, IconTrash, NotifIcon } from "./icons.jsx";
import { sb } from "../../App.jsx";

export function RegisterView({allLoc,addSalon,setView,addExtraLoc}){
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

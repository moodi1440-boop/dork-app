// إعدادات صاحب الصالون وتعديل بيانات العميل — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { G } from "../styles.js";
import { DEFAULT_SOCIAL_LINKS, TONES } from "../constants.js";
import { hashPin, optimizeImageUrl } from "../utils.js";
import {
  IconArrowRight, IconBarberPole, IconCamera, IconCheck, IconDragHandle, IconLock,
  IconPencil, IconPin, IconRefresh, IconSuccess, IconTrash, NotifIcon
} from "./icons.jsx";
import { sb } from "../../App.jsx";

export function OwnerSettings({salon,setSalons,toast$,socialLinks,setSocialLinks,onlySec,setView,setShowSalonDrawer,setOwnerTab}){
  const{t}=useTranslation();
  const[saving,setSaving]=useState(false);
  const[sec,setSec]=useState(onlySec||"info");
  const SEC_TITLES={info:t("owner_settings.tab_info"),hours:t("owner_settings.tab_hours"),services:t("owner_settings.tab_services"),barbers:t("owner_settings.tab_barbers"),tone:t("owner_settings.tab_tone"),social:t("owner_settings.tab_social"),pin:t("owner_settings.tab_pin")};
  const[draftSocial,setDraftSocial]=useState({...DEFAULT_SOCIAL_LINKS,...(socialLinks||{})});
  const[socialSaved,setSocialSaved]=useState(false);
  const saveSocial=()=>{setSocialLinks&&setSocialLinks(draftSocial);setSocialSaved(true);setTimeout(()=>setSocialSaved(false),2500);};
  const effectiveSec=onlySec==="hours"?"barbers":sec;
  const[showHoursInBarbers,setShowHoursInBarbers]=useState(false);
  const[sortMode,setSortMode]=useState(false);
  const[sortSvcMode,setSortSvcMode]=useState(false);
  const[expandedBarberDur,setExpandedBarberDur]=useState(null);
  const[dragActive,setDragActive]=useState(null); // {list,index}
  const dragIndexRef=useRef(null);
  const startDrag=(list,index)=>(e)=>{
    e.preventDefault();
    const isTouch=e.type==="touchstart";
    const row=e.currentTarget.closest(`[data-drag-list="${list}"]`);
    if(!row)return;
    const rowH=row.getBoundingClientRect().height||1;
    const container=row.parentElement;
    const rowCount=container.querySelectorAll(`[data-drag-list="${list}"]`).length;
    const startY=isTouch?e.touches[0].clientY:e.clientY;
    let lastIndex=index;
    dragIndexRef.current=index;
    setDragActive({list,index});
    row.style.position="relative";
    row.style.zIndex="50";
    row.style.boxShadow="0 6px 18px rgba(0,0,0,.35)";
    row.style.transition="none";
    const point=ev=>isTouch?ev.touches[0]:ev;
    let rafId=null;
    let pendingPt=null;
    const flush=()=>{
      rafId=null;
      const pt=pendingPt;
      if(!pt)return;
      const dy=pt.clientY-startY;
      row.style.transform=`translateY(${dy}px)`;
      const rawIndex=index+Math.round(dy/rowH);
      lastIndex=Math.max(0,Math.min(rowCount-1,rawIndex));
    };
    const onMove=(ev)=>{
      const pt=point(ev);
      if(!pt)return;
      if(isTouch)ev.preventDefault();
      pendingPt=pt;
      if(rafId==null)rafId=requestAnimationFrame(flush);
    };
    const cleanupStyles=()=>{
      row.style.position="";
      row.style.zIndex="";
      row.style.boxShadow="";
      row.style.transition="";
      row.style.transform="";
    };
    const onEnd=()=>{
      if(rafId!=null){cancelAnimationFrame(rafId);rafId=null;}
      cleanupStyles();
      dragIndexRef.current=null;
      setDragActive(null);
      if(lastIndex!==index){
        setF(p=>{
          const arr=[...p[list]];
          const[moved]=arr.splice(index,1);
          arr.splice(lastIndex,0,moved);
          return{...p,[list]:arr};
        });
      }
      if(isTouch){
        window.removeEventListener("touchmove",onMove);
        window.removeEventListener("touchend",onEnd);
        window.removeEventListener("touchcancel",onEnd);
      }else{
        window.removeEventListener("mousemove",onMove);
        window.removeEventListener("mouseup",onEnd);
      }
    };
    if(isTouch){
      window.addEventListener("touchmove",onMove,{passive:false});
      window.addEventListener("touchend",onEnd);
      window.addEventListener("touchcancel",onEnd);
    }else{
      window.addEventListener("mousemove",onMove);
      window.addEventListener("mouseup",onEnd);
    }
  };
  const[f,setF]=useState({
    name:salon.name||"",
    phone:salon.phone||"",
    address:salon.address||"",
    ownerEmail:salon.owner_email||"",
    locationUrl:salon.locationUrl||"",
    shiftEnabled:salon.shiftEnabled||false,
    shift1Start:salon.shift1Start||"08:00",
    shift1End:salon.shift1End||"13:00",
    shift2Start:salon.shift2Start||"16:00",
    shift2End:salon.shift2End||"23:00",
    workStart:salon.workStart||"09:00",
    workEnd:salon.workEnd||"22:00",
    _savedWorkStart:(!salon.shiftEnabled&&salon.workStart==="00:00"&&salon.workEnd==="23:59")?"09:00":(salon.workStart||"09:00"),
    _savedWorkEnd:(!salon.shiftEnabled&&salon.workStart==="00:00"&&salon.workEnd==="23:59")?"22:00":(salon.workEnd||"22:00"),
    services:[...(salon.services||[])],
    prices:{...(salon.prices||{})},
    durations:{...(salon.prices?.__durations||{})},
    barbers:JSON.parse(JSON.stringify(salon.barbers||[])).map(b=>({...b,shiftStart:b.shiftStart??"09:00",shiftEnd:b.shiftEnd??"22:00"})),
    tone:salon.tone||"bell",
  });
  const _sbLen=salon?.barbers?.length||0;
  useEffect(()=>{
    if(_sbLen>0&&f.barbers.length===0){
      setF(p=>({...p,barbers:JSON.parse(JSON.stringify(salon.barbers)).map(b=>({...b,shiftStart:b.shiftStart??"09:00",shiftEnd:b.shiftEnd??"22:00"}))}));
    }
  },[_sbLen]);
  const[newSvc,setNewSvc]=useState("");
  const[newBarber,setNewBarber]=useState("");
  const[detecting,setDetecting]=useState(false);
  const dragIdx=useRef(null);
  const dragOverIdx=useRef(null);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const savePin=async()=>{
    try{
      await ownerApi("PATCH",{new_pin:f._editTempPin});
      toast$&&toast$(t("owner_settings.success_pin"));
      setF(p=>({...p,_editPinStep:null,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}));
    }catch{
      setF(p=>({...p,_editPinErr:"تعذر حفظ PIN، حاول مرة أخرى"}));
    }
  };
  const detectSalonLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      p=>{const lat=p.coords.latitude.toFixed(6),lng=p.coords.longitude.toFixed(6);upd("locationUrl",`https://maps.google.com/?q=${lat},${lng}`);setDetecting(false);toast$&&toast$(i18n.t('ui.location_found_save'));},
      ()=>{setDetecting(false);toast$&&toast$(i18n.t('ui.detect_failed'),"err");},
      {enableHighAccuracy:true,timeout:15000}
    );
  };

  const save=async()=>{
    setSaving(true);
    try{
      const compressPhoto=(dataUrl)=>new Promise(resolve=>{
        if(!dataUrl||!dataUrl.startsWith("data:")||dataUrl.length<40000){resolve(dataUrl);return;}
        const img=new Image();
        img.onload=()=>{
          const MAX=150;let w=img.width,h=img.height;
          if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}
          const c=document.createElement("canvas");c.width=w;c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          resolve(c.toDataURL(IMG_FMT,0.75));
        };
        img.onerror=()=>resolve(dataUrl);
        img.src=dataUrl;
      });
      const compressedBarbers=await Promise.all(f.barbers.map(async b=>({...b,photo:await compressPhoto(b.photo)})));
      const patch={
        name:f.name,phone:f.phone,address:f.address,location_url:f.locationUrl,owner_email:f.ownerEmail||null,
        shift_enabled:f.shiftEnabled,
        shift1_start:f.shift1Start,shift1_end:f.shift1End,
        shift2_start:f.shift2Start,shift2_end:f.shift2End,
        work_start:f.workStart,work_end:f.workEnd,
        services:f.services,prices:{...f.prices,__durations:f.durations},
        barbers:compressedBarbers,tone:f.tone,
      };
      await ownerApi("PATCH",patch);
      setSalons(p=>p.map(s=>s.id===salon.id?{...s,name:f.name,phone:f.phone,address:f.address,owner_email:f.ownerEmail||null,locationUrl:f.locationUrl,shiftEnabled:f.shiftEnabled,shift1Start:f.shift1Start,shift1End:f.shift1End,shift2Start:f.shift2Start,shift2End:f.shift2End,workStart:f.workStart,workEnd:f.workEnd,services:f.services,prices:{...f.prices,__durations:f.durations},barbers:compressedBarbers,tone:f.tone}:s));
      toast$&&toast$(t("owner_settings.success"));
    }catch(e){toast$&&toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    setSaving(false);
  };

  const saveBarberDurations=async(barberIdx)=>{
    try{
      await ownerApi("PATCH",{barbers:f.barbers});
      setSalons(p=>p.map(s=>s.id===salon.id?{...s,barbers:f.barbers}:s));
      toast$&&toast$(i18n.t('ui.durations_saved'));
    }catch(e){toast$&&toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"var(--text-muted)",marginBottom:4,fontWeight:600};
  const box={background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};

  return(
    <div style={onlySec?G.page:undefined}><div style={onlySec?G.fp:undefined}>
      {onlySec&&<div style={G.fh}><button style={G.bb} onClick={()=>{setOwnerTab&&setOwnerTab(null);setShowSalonDrawer&&setShowSalonDrawer(true);}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{SEC_TITLES[onlySec]||t("owner_settings.settings_title")}</h2></div>}
      {!onlySec&&<div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        {[{id:"info",icon:"📋",label:t("owner_settings.tab_info")},{id:"services",icon:"✂",label:t("owner_settings.tab_services")},{id:"barbers",icon:"💈",label:t("owner_settings.tab_barbers")},{id:"tone",icon:"🔔",label:t("owner_settings.tab_tone")},{id:"social",icon:"📱",label:t("owner_settings.tab_social")},{id:"pin",icon:"🔐",label:t("owner_settings.tab_pin")}].map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"var(--border-ui)"}`,background:sec===s.id?"var(--pa12)":"var(--surface-2)",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            <NotifIcon icon={s.icon} size={11}/> {s.label}
          </button>
        ))}
      </div>}

      {sec==="info"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.info_title")}</div>
        {[{l:t("owner_settings.salon_name"),k:"name"},{l:t("owner_settings.phone"),k:"phone"},{l:t("owner_settings.address"),k:"address"}].map(({l,k})=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={lbl}>{l}</label>
            <input style={inp} value={f[k]} onChange={e=>upd(k,e.target.value)}/>
          </div>
        ))}
        <div style={{marginBottom:10}}>
          <label style={lbl}>{t("register.owner_email")}</label>
          <input style={inp} type="email" inputMode="email" placeholder="example@email.com" value={f.ownerEmail} onChange={e=>upd("ownerEmail",e.target.value)}/>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:3}}>{t("register.owner_email_hint")}</div>
        </div>
        {/* قسم الموقع */}
        <div style={{background:"rgba(var(--pr),.06)",borderRadius:12,padding:12,border:"1px solid rgba(var(--pr),.2)"}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={12}/>{t("owner_settings.map_url")}</div>
          {f.locationUrl?(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.loc_saved_map')}</div>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",opacity:detecting?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5}} disabled={detecting} onClick={detectSalonLocation}>{detecting?"⏳ جاري التحديد...":<><IconRefresh size={11}/>{t('ui.update_location')}</>}</button>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={()=>upd("locationUrl","")}>{t('ui.delete_location')}</button>
              </div>
            </>
          ):(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{t('ui.no_location')}</div>
              <button style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:"1.5px dashed rgba(var(--pr),.4)",color:"var(--p)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",marginBottom:8,opacity:detecting?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5}} disabled={detecting} onClick={detectSalonLocation}>{detecting?"⏳ جاري التحديد...":<><IconPin size={12}/>{t('ui.detect_location')}</>}</button>
            </>
          )}
          <input style={{...inp,fontSize:11}} placeholder={t('ui.maps_link_ph')} value={f.locationUrl} onChange={e=>upd("locationUrl",e.target.value)}/>
        </div>
      </div>}


      {sec==="services"&&<div style={box}>
        <div style={{...hdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>{t("owner_settings.services_title")}</span>
          {f.services.length>0&&<button onClick={()=>setSortSvcMode(p=>!p)} style={{fontSize:11,padding:"3px 10px",borderRadius:7,border:`1.5px solid ${sortSvcMode?"var(--p)":"var(--border-ui)"}`,background:sortSvcMode?"var(--pa12)":"transparent",color:sortSvcMode?"var(--p)":"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
            {sortSvcMode?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.done')}</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconPencil size={11}/>{t('ui.edit')}</span>}
          </button>}
        </div>
        {f.services.length>0&&<>
          {!sortSvcMode&&(
            <div style={{borderRadius:9,overflow:"hidden",border:"1px solid var(--border-ui)",marginBottom:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px",padding:"6px 10px",background:"var(--surface-2)",borderBottom:"1px solid var(--border-ui)"}}>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700}}>{t('ui.service_col')}</span>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,textAlign:"center"}}>{t('ui.time_col')}</span>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,textAlign:"center"}}>{t('ui.price_col')}</span>
              </div>
              {f.services.map((svc,i)=>(
                <div key={svc} style={{display:"grid",gridTemplateColumns:"1fr 90px 80px",gap:6,alignItems:"center",padding:"8px 10px",background:"var(--bg-input)",borderBottom:i<f.services.length-1?"1px solid var(--border-ui)":"none"}}>
                  <span style={{fontSize:13,color:"var(--text-primary)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc}</span>
                  <input type="number" min="1" max="480" placeholder="—" style={{padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"#27ae60",fontSize:12,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr",width:"100%",boxSizing:"border-box"}}
                    value={f.durations[svc]||""} onChange={e=>setF(p=>({...p,durations:{...p.durations,[svc]:+e.target.value||undefined}}))}/>
                  <input type="number" min="0" style={{padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--p)",fontSize:12,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr",width:"100%",boxSizing:"border-box"}}
                    value={f.prices[svc]||0} onChange={e=>setF(p=>({...p,prices:{...p.prices,[svc]:+e.target.value}}))}/>
                </div>
              ))}
            </div>
          )}
          {sortSvcMode&&f.services.map((svc,i)=>(
            <div key={svc} data-drag-list="services" data-drag-index={i} style={{display:"grid",gridTemplateColumns:"1fr",gap:6,marginBottom:6,alignItems:"center",background:"var(--bg-input)",borderRadius:9,padding:"6px 8px",border:"1px solid var(--border-ui)",opacity:dragActive?.list==="services"&&dragActive.index===i?.5:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span onTouchStart={startDrag("services",i)} onMouseDown={startDrag("services",i)} style={{cursor:"grab",display:"flex",color:"var(--text-muted)",touchAction:"none",WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none",padding:"10px 8px"}}><IconDragHandle size={16}/></span>
                <span style={{flex:1,fontSize:13,color:"var(--text-primary)",fontWeight:600}}>{svc}</span>
                <button style={G.xBtn} onClick={()=>setF(p=>{const sv=p.services.filter(s=>s!==svc);const pr={...p.prices};delete pr[svc];const dr={...p.durations};delete dr[svc];return{...p,services:sv,prices:pr,durations:dr};})}><IconTrash size={14}/></button>
              </div>
            </div>
          ))}
        </>}
        <div style={{display:"flex",gap:7,marginTop:10}}>
          <input style={{...inp,flex:1}} placeholder={t("owner_settings.new_service_ph")} value={newSvc} onChange={e=>setNewSvc(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}>{t("owner_settings.add_btn")}</button>
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,color:"#666",marginBottom:6}}>{t("owner_settings.preset_label")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {DEFAULT_SERVICES.filter(d=>!f.services.includes(d)).map(d=>(
              <button key={d} style={{...G.chip,fontSize:11}} onClick={()=>setF(p=>({...p,services:[...p.services,d],prices:{...p.prices,[d]:0}}))}>+ {d}</button>
            ))}
          </div>
        </div>
      </div>}

      {(sec==="barbers"||effectiveSec==="barbers")&&<div style={box}>
        {/* ── ساعات عمل الصالون (مدموجة هنا) ── */}
        <div style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid var(--border-ui)"}}>
          <button onClick={()=>setShowHoursInBarbers(p=>!p)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:"none",padding:0,cursor:"pointer",marginBottom:showHoursInBarbers?10:0}}>
            <span style={{fontSize:12,fontWeight:700,color:"var(--p)",display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="🕐" size={13}/> {t("owner_settings.hours_title")}</span>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{showHoursInBarbers?"▲":"▼"}</span>
          </button>
          {showHoursInBarbers&&<>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${(!f.shiftEnabled&&!(f.workStart==="00:00"&&f.workEnd==="23:59"))?"var(--p)":"var(--border-ui)"}`,background:(!f.shiftEnabled&&!(f.workStart==="00:00"&&f.workEnd==="23:59"))?"var(--pa12)":"var(--surface-2)",color:(!f.shiftEnabled&&!(f.workStart==="00:00"&&f.workEnd==="23:59"))?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>setF(p=>{const from24h=p.workStart==="00:00"&&p.workEnd==="23:59";return{...p,shiftEnabled:false,workStart:from24h?(p._savedWorkStart||"09:00"):p.workStart,workEnd:from24h?(p._savedWorkEnd||"22:00"):p.workEnd};})}>{t("owner_settings.single_shift")}</button>
            <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${f.shiftEnabled?"var(--p)":"var(--border-ui)"}`,background:f.shiftEnabled?"var(--pa12)":"var(--surface-2)",color:f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",true)}>{t("owner_settings.double_shift")}</button>
            <button style={{padding:"9px 12px",borderRadius:9,border:`1.5px solid ${(!f.shiftEnabled&&f.workStart==="00:00"&&f.workEnd==="23:59")?"var(--p)":"var(--border-ui)"}`,background:(!f.shiftEnabled&&f.workStart==="00:00"&&f.workEnd==="23:59")?"var(--pa12)":"var(--surface-2)",color:(!f.shiftEnabled&&f.workStart==="00:00"&&f.workEnd==="23:59")?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700,whiteSpace:"nowrap"}} onClick={()=>setF(p=>{const already24h=p.workStart==="00:00"&&p.workEnd==="23:59";return{...p,shiftEnabled:false,_savedWorkStart:already24h?p._savedWorkStart:p.workStart,_savedWorkEnd:already24h?p._savedWorkEnd:p.workEnd,workStart:"00:00",workEnd:"23:59"};})}><span style={{display:"inline-flex",alignItems:"center",gap:4}}><NotifIcon icon="🕐" size={11}/> 24h</span></button>
          </div>
          {!f.shiftEnabled
            ?<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={lbl}>{t("owner_settings.from")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.workStart} onChange={e=>upd("workStart",e.target.value)}/>
              <span style={lbl}>{t("owner_settings.to")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.workEnd} onChange={e=>upd("workEnd",e.target.value)}/>
            </div>
            :<>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.morning")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={lbl}>{t("owner_settings.from")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift1Start} onChange={e=>upd("shift1Start",e.target.value)}/>
                <span style={lbl}>{t("owner_settings.to")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift1End} onChange={e=>upd("shift1End",e.target.value)}/>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{t("owner_settings.evening")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={lbl}>{t("owner_settings.from")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift2Start} onChange={e=>upd("shift2Start",e.target.value)}/>
                <span style={lbl}>{t("owner_settings.to")}</span>
                <input type="time" style={{flex:1,minWidth:0,padding:"7px 5px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={f.shift2End} onChange={e=>upd("shift2End",e.target.value)}/>
              </div>
            </>
          }
          </>}
        </div>
        <div style={{...hdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>{t("owner_settings.barbers_title")}</span>
          {f.barbers.length>0&&<button onClick={()=>setSortMode(p=>!p)} style={{fontSize:11,padding:"3px 10px",borderRadius:7,border:`1.5px solid ${sortMode?"var(--p)":"var(--border-ui)"}`,background:sortMode?"var(--pa12)":"transparent",color:sortMode?"var(--p)":"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
            {sortMode?<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.done')}</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><IconPencil size={11}/>{t('ui.edit')}</span>}
          </button>}
        </div>
        {f.barbers.length===0&&<div style={G.empty}>{t("owner_settings.barbers_empty")}</div>}
        {f.barbers.map((b,i)=>(
          <div key={b.id} data-drag-list="barbers" data-drag-index={i}
            style={{marginBottom:10,background:"var(--bg-input)",borderRadius:10,padding:"10px 12px",border:`1px solid ${sortMode?"var(--p)33":"var(--border-ui)"}`,overflow:"hidden",opacity:dragActive?.list==="barbers"&&dragActive.index===i?.5:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:sortMode?0:8}}>
              {sortMode&&<span onTouchStart={startDrag("barbers",i)} onMouseDown={startDrag("barbers",i)} style={{cursor:"grab",display:"flex",color:"var(--text-muted)",touchAction:"none",WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none",padding:"10px 8px",flexShrink:0}}><IconDragHandle size={16}/></span>}
              {/* صورة الحلاق */}
              <div style={{position:"relative",flexShrink:0}}>
                {b.photo
                  ?<img src={optimizeImageUrl(b.photo,44,44)} alt={b.name} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--p)"}}/>
                  :<div style={{width:44,height:44,borderRadius:"50%",background:"var(--surface-2)",border:"2px dashed #2a2a3a",display:"flex",alignItems:"center",justifyContent:"center"}}><IconBarberPole size={18}/></div>
                }
                <label style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--p)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10}}>
                  <IconCamera size={11} color="#fff"/>
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    const reader=new FileReader();
                    reader.onload=ev=>{
                      const img=new Image();
                      img.onload=()=>{
                        const MAX=150;
                        let w=img.width,h=img.height;
                        if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}
                        const canvas=document.createElement("canvas");
                        canvas.width=w;canvas.height=h;
                        canvas.getContext("2d").drawImage(img,0,0,w,h);
                        const compressed=canvas.toDataURL(IMG_FMT,0.75);
                        setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,photo:compressed}:x)}));
                      };
                      img.src=ev.target.result;
                    };
                    reader.readAsDataURL(file);
                  }}/>
                </label>
              </div>
              <input style={{...inp,flex:1,padding:"6px 10px"}} placeholder={t("owner_settings.barber_name_ph")} value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
              {/* زر التفعيل/التعطيل بنمط iPhone */}
              <button onClick={()=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,active:x.active===false}:x)}))}
                style={{width:38,height:22,borderRadius:11,border:"none",cursor:"pointer",position:"relative",flexShrink:0,
                  background:b.active!==false?"var(--p)":"#555",transition:"background .2s"}}>
                <div style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",
                  transition:"left .2s",left:b.active!==false?19:3}}/>
              </button>
              {sortMode&&<button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}><IconTrash size={14}/></button>}
            </div>
            {!sortMode&&b.active===false&&<div style={{fontSize:10,color:"#e74c3c",marginBottom:6,textAlign:"center",fontWeight:600}}>{t('ui.closed_traveling')}</div>}
            {!sortMode&&b.active!==false&&<>
            {f.services.length>0&&(
              <div style={{marginBottom:10}}>
                <button onClick={()=>setExpandedBarberDur(expandedBarberDur===i?null:i)}
                  style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--surface-2)",border:"1px solid var(--border-ui)",borderRadius:9,padding:"7px 10px",cursor:"pointer",fontFamily:"inherit"}}>
                  <span style={{fontSize:11,color:"var(--text-muted)",fontWeight:600}}>⏱ مدد الخدمات ({f.services.filter(svc=>(b.durations||{})[svc]).length}/{f.services.length})</span>
                  <span style={{fontSize:11,color:"var(--p)"}}>{expandedBarberDur===i?"▲":"▼"}</span>
                </button>
                {expandedBarberDur===i&&<div style={{marginTop:6,background:"var(--bg-input)",borderRadius:9,border:"1px solid var(--border-ui)",overflow:"hidden"}}>
                  {/* رأس */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:6,padding:"6px 10px",borderBottom:"1px solid var(--border-ui)"}}>
                    <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:700}}>{t('ui.service_col')}</span>
                    <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:700,textAlign:"center"}}>{t('ui.default_col')}</span>
                    <span style={{fontSize:10,color:"var(--p)",fontWeight:700,textAlign:"center"}}>{t('ui.barber_time')}</span>
                  </div>
                  {f.services.map(svc=>{
                    const defaultDur=f.durations[svc]||"—";
                    const barberDur=(b.durations||{})[svc];
                    return(
                      <div key={svc} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:6,padding:"7px 10px",borderBottom:"1px solid rgba(var(--pr),.05)",alignItems:"center"}}>
                        <span style={{fontSize:12,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{svc}</span>
                        <div style={{padding:"4px 6px",borderRadius:6,border:"1px solid var(--border-ui)",background:"var(--surface-2)",fontSize:11,color:"var(--text-muted)",textAlign:"center",minWidth:38}}>{defaultDur}{defaultDur!=="—"?" د":""}</div>
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <input type="number" min="1" max="480" placeholder={String(defaultDur)}
                            style={{flex:1,width:0,padding:"4px 4px",borderRadius:6,border:`1.5px solid ${barberDur?"var(--p)":"var(--border-ui)"}`,background:"var(--surface-1)",color:"var(--p)",fontSize:11,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
                            value={barberDur||""} onChange={e=>{const v=+e.target.value||undefined;setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,durations:{...(x.durations||{}),[svc]:v}}:x)}));}}/>
                          <span style={{fontSize:9,color:"var(--text-muted)"}}>{t('ui.min_short')}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{padding:"8px 10px",borderTop:"1px solid var(--border-ui)"}}>
                    <button onClick={()=>saveBarberDurations(i)}
                      style={{width:"100%",padding:"8px",borderRadius:8,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5}}><NotifIcon icon="💾" size={12}/> حفظ المدد</span>
                    </button>
                  </div>
                </div>}
              </div>
            )}
            <div style={{marginBottom:6}}>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>{t("owner_settings.barber_shift")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:10,color:"var(--text-muted)",flexShrink:0}}>{t("owner_settings.from")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={b.shiftStart||"09:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftStart:e.target.value}:x)}))}/>
              <span style={{fontSize:10,color:"var(--text-muted)",flexShrink:0}}>{t("owner_settings.to")}</span>
              <input type="time" style={{flex:1,minWidth:0,padding:"5px 4px",borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"ltr"}} value={b.shiftEnd||"22:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftEnd:e.target.value}:x)}))}/>
            </div>
            </>}
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder={t("owner_settings.new_barber_ph")} value={newBarber} onChange={e=>setNewBarber(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00",active:true}]}));setNewBarber("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00",active:true}]}));setNewBarber("");}}}>{t("owner_settings.add_btn")}</button>
        </div>
      </div>}

      {sec==="tone"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.tone_title")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(tn=>{
            const active=f.tone===tn.id;
            return(
              <button key={tn.id} onClick={()=>{upd("tone",tn.id);playTone(tn.id,0.8);}}
                style={{padding:"11px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"var(--border-ui)"}`,background:active?"var(--pa12)":"var(--surface-2)",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                {t("settings.tones."+tn.id)} {active&&<IconCheck size={11}/>}
              </button>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>{t("owner_settings.tone_hint")}</div>
      </div>}

      {sec==="social"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.social_title")}</div>
        {socialLinks?.enabled
          ?<div>
            {socialLinks.email&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📧" size={13}/> البريد الإلكتروني</label>
              <a href={`mailto:${socialLinks.email}`} style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.email}</a>
            </div>}
            {socialLinks.whatsapp&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="💬" size={13}/> واتساب</label>
              <a href={`https://wa.me/966${socialLinks.whatsapp.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.whatsapp}</a>
            </div>}
            {socialLinks.twitter&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="🐦" size={13}/> تويتر / X</label>
              <a href={`https://twitter.com/${socialLinks.twitter.replace("@","")}`} target="_blank" rel="noreferrer" style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.twitter}</a>
            </div>}
            {(socialLinks.telegram||socialLinks.telegramUser)&&<div style={{marginBottom:12}}>
              <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="✈" size={13}/> تيليغرام</label>
              <a href={`https://t.me/${(socialLinks.telegramUser||socialLinks.telegram).replace(/^0/,"").replace("@","")}`} target="_blank" rel="noreferrer" style={{...inp,display:"block",textDecoration:"none",direction:"ltr"}}>{socialLinks.telegramUser||socialLinks.telegram}</a>
            </div>}
            {(socialLinks.customFields||[]).filter(f=>f&&f.label&&(f.value||"").trim()).map((f,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <label style={{...lbl,display:"flex",alignItems:"center",gap:5}}><NotifIcon icon="📌" size={12}/> {f.label}</label>
                <div style={{...inp}}>{f.value}</div>
              </div>
            ))}
          </div>
          :<div style={G.empty}>{t("settings.social_empty")}</div>
        }
      </div>}

      {sec==="pin"&&<div style={box}>
        <div style={hdr}>{t("owner_settings.pin_title")}</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14,lineHeight:1.6}}>{t("owner_settings.pin_hint")}</div>
        <button onClick={()=>setF(p=>({...p,_editPinStep:"enter",_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--p)",background:"rgba(var(--pr),.1)",color:"var(--p)",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
          {t("owner_settings.change_pin")}
        </button>
        {f._editPinStep&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"var(--surface-1)",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
              {f._editPinStep==="enter"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_enter")} (6)</div>
                <input type="password" maxLength={6} value={f._editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setF(p=>({...p,_editTempPin:val}));if(val.length===6)setTimeout(()=>setF(p=>({...p,_editPinStep:"confirm"})),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="••••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editTempPin.length===6)setF(p=>({...p,_editPinStep:"confirm"}));}} />
              </>:f._editPinStep==="confirm"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>{t("owner_settings.pin_confirm_title")}</div>
                <input type="password" maxLength={6} value={f._editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setF(p=>({...p,_editPinConfirm:val}));if(val.length===6&&f._editTempPin!==val){setF(p=>({...p,_editPinErr:t("owner_settings.pin_mismatch")}));}else{setF(p=>({...p,_editPinErr:""}));}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${f._editPinErr?"#e74c3c":"var(--p)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="••••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm){savePin();}}} />
                {f._editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{f._editPinErr}</div>}
                <div style={{display:"flex",gap:8,marginTop:16}}>
                  <button onClick={()=>{if(f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm){savePin();}}} disabled={f._editPinConfirm.length!==6||f._editTempPin!==f._editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm?"var(--p)":"var(--border-ui)",color:f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm?"#000":"#555",cursor:f._editPinConfirm.length===6&&f._editTempPin===f._editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    {t("owner_settings.save")}
                  </button>
                  <button onClick={()=>setF(p=>({...p,_editPinStep:null,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    {t("owner_settings.cancel")}
                  </button>
                </div>
              </>:null}
            </div>
          </div>
        )}
      </div>}

      {sec!=="social"&&sec!=="pin"&&<button style={{...G.sub,marginTop:4,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
        {saving?`⏳ ${t("owner_settings.saving")}...`:t("owner_settings.save_btn")}
      </button>}
    </div>
    </div>
  );
}

export function CustEditDataView({customer,setCustomers,setCustomerSession,setView,setShowDrawer,toast$}){
  const{t}=useTranslation();
  const[name,setName]=useState(customer?.name||"");
  const[phone,setPhone]=useState(customer?.phone||"");
  const[email,setEmail]=useState(customer?.email||"");
  const[pinStep,setPinStep]=useState(null);
  const[pinLen,setPinLen]=useState(4);
  const[tempPin,setTempPin]=useState("");
  const[pinConfirm,setPinConfirm]=useState("");
  const[pinErr,setPinErr]=useState("");
  const[showLocUrl,setShowLocUrl]=useState(false);
  const[locUrlInput,setLocUrlInput]=useState("");
  const inp={width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const saveLocation=()=>{
    if(!navigator.geolocation){toast$&&toast$(i18n.t('ui.browser_no_geo'),"err");return;}
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
        setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession(s=>({...s,locationLat:lat,locationLng:lng}));
        toast$&&toast$(i18n.t('ui.location_saved'));
      }catch{toast$&&toast$(i18n.t('ui.location_save_failed'),"err");}
    },()=>{toast$&&toast$(i18n.t('ui.location_denied'),"warn");},{enableHighAccuracy:true,timeout:15000});
  };
  const clearLocation=async()=>{
    try{
      await sb("customers","PATCH",{location_lat:null,location_lng:null},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:null,locationLng:null}:c));
      setCustomerSession(s=>({...s,locationLat:null,locationLng:null}));
      toast$&&toast$(i18n.t('ui.location_deleted'));
    }catch{toast$&&toast$(i18n.t('ui.location_delete_failed'),"err");}
  };
  const saveLocationFromUrl=async()=>{
    const m=locUrlInput.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)||locUrlInput.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if(!m){toast$&&toast$(i18n.t('ui.loc_url_invalid'),"err");return;}
    const lat=parseFloat(m[1]),lng=parseFloat(m[2]);
    try{
      await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customer.id}`);
      setCustomers(prev=>prev.map(c=>c.id===customer.id?{...c,locationLat:lat,locationLng:lng}:c));
      setCustomerSession(s=>({...s,locationLat:lat,locationLng:lng}));
      setShowLocUrl(false);setLocUrlInput("");
      toast$&&toast$(i18n.t('ui.location_saved'));
    }catch{toast$&&toast$(i18n.t('ui.location_save_failed'),"err");}
  };
  const save=async()=>{
    if(!name.trim())return;
    try{
      await sb("customers","PATCH",{name:name.trim(),phone:phone.trim(),email:email.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:name.trim(),phone:phone.trim(),email:email.trim()}:c));
      setCustomerSession(s=>({...s,name:name.trim(),phone:phone.trim(),email:email.trim()}));
      toast$(""+t("cust_drawer.save"));
      setView("home");setShowDrawer&&setShowDrawer(true);
    }catch(e){toast$(""+e.message,"err");}
  };
  const savePin=async()=>{
    if(tempPin!==pinConfirm){setPinErr(t("cust_drawer.pin_mismatch"));return;}
    try{
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:customer.id,pin:tempPin})});
      const d=await res.json().catch(()=>({}));
      if(!res.ok){setPinErr(d.error||t("cust_drawer.pin_mismatch"));if(d.code==="err_same_pin"){setPinStep("enter");setTempPin("");}return;}
      localStorage.setItem(`dork_customer_pin_${customer.id}`,await hashPin(tempPin));
      toast$(""+t("cust_drawer.pin_success"));setPinStep(null);setTempPin("");setPinConfirm("");setPinErr("");
    }catch(e){setPinErr(""+e.message);}
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}>
        <button style={G.bb} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}><IconArrowRight size={20}/></button>
        <h2 style={{...G.ft,display:"flex",alignItems:"center",gap:6}}><IconPencil size={16}/>{t("cust_drawer.edit_data")}</h2>
      </div>
      {!pinStep&&(<>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.name_label")}</label>
          <input style={inp} value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.phone_label")}</label>
          <input style={inp} inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value)}/>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>{t("cust_drawer.email_label")}</label>
          <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        {/* موقعي المحفوظ */}
        <div style={{background:"rgba(var(--pr),.06)",borderRadius:12,padding:14,border:"1px solid rgba(var(--pr),.2)",marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:8,display:"flex",alignItems:"center",gap:4}}><IconPin size={12}/>{t('ui.my_location')}</div>
          {customer?.locationLat&&customer?.locationLng?(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10,display:"flex",alignItems:"center",gap:4}}><IconSuccess size={11}/>{t('ui.loc_saved_offers')}</div>
              <div style={{display:"flex",gap:8}}>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveLocation}><IconRefresh size={11}/>{t('ui.update_location')}</button>
                <button style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}} onClick={clearLocation}>{t('ui.delete_location')}</button>
              </div>
            </>
          ):(
            <>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:10}}>{t('ui.no_location_long')}</div>
              <button style={{width:"100%",padding:"10px",borderRadius:8,background:"transparent",border:"1.5px dashed rgba(var(--pr),.4)",color:"var(--p)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onClick={saveLocation}><IconPin size={12}/>{t('ui.save_location')}</button>
            </>
          )}
          <button type="button" onClick={()=>setShowLocUrl(v=>!v)} style={{width:"100%",marginTop:10,padding:0,border:"none",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:11,textDecoration:"underline"}}>{t('ui.loc_url_manual_toggle')}</button>
          {showLocUrl&&(
            <div style={{marginTop:8,display:"flex",gap:8}}>
              <input style={{...inp,flex:1,fontSize:12,direction:"ltr",textAlign:"left"}} placeholder={t('ui.loc_url_ph')} value={locUrlInput} onChange={e=>setLocUrlInput(e.target.value)} dir="ltr"/>
              <button type="button" onClick={saveLocationFromUrl} style={{flexShrink:0,padding:"0 14px",borderRadius:8,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>{t('ui.loc_url_save')}</button>
            </div>
          )}
        </div>
        <button style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",marginBottom:10}} onClick={()=>setPinStep("select")}>{t("cust_drawer.change_pin")}</button>
        <div style={{display:"flex",gap:10}}>
          <button style={{flex:1,padding:"13px",borderRadius:12,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}} onClick={()=>{setView("home");setShowDrawer&&setShowDrawer(true);}}>{t("cust_drawer.cancel")}</button>
          <button style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}} onClick={save}>{t("cust_drawer.save")}</button>
        </div>
      </>)}
      {pinStep==="select"&&(
        <div style={{textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><IconLock size={30}/></div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_select_title")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>{t("cust_drawer.pin_select_hint")}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${pinLen===4?"var(--p)":"var(--border-ui)"}`,background:pinLen===4?"var(--pa15)":"transparent",color:pinLen===4?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setPinLen(4)}>{t("cust_drawer.pin_4")}</button>
            <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${pinLen===6?"var(--p)":"var(--border-ui)"}`,background:pinLen===6?"var(--pa15)":"transparent",color:pinLen===6?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setPinLen(6)}>{t("cust_drawer.pin_6")}</button>
          </div>
          <div style={{marginTop:16,display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep(null)}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>{setPinStep("enter");setTempPin("");}}>{t("cust_drawer.pin_enter")}</button>
          </div>
        </div>
      )}
      {pinStep==="enter"&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_enter")}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>{pinLen} {t("cust_drawer.pin_digits_hint")}</div>
          <input type="password" inputMode="numeric" maxLength={pinLen} value={tempPin} onChange={e=>{setTempPin(e.target.value.replace(/\D/g,"").slice(0,pinLen));setPinErr("");}} style={{...inp,textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:pinErr?6:16}}/>
          {pinErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10}}>{pinErr}</div>}
          <div style={{display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep("select")}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>{if(tempPin.length===pinLen)setPinStep("confirm");}}>{t("cust_drawer.pin_enter")}</button>
          </div>
        </div>
      )}
      {pinStep==="confirm"&&(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",marginBottom:6}}>{t("cust_drawer.pin_confirm_title")}</div>
          <input type="password" inputMode="numeric" maxLength={pinLen} value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,pinLen))} style={{...inp,textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:10}}/>
          {pinErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10}}>{pinErr}</div>}
          <div style={{display:"flex",gap:10}}>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={()=>setPinStep("enter")}>{t("cust_drawer.cancel")}</button>
            <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"var(--p)",color:"var(--p-text)",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}} onClick={savePin}>{t("cust_drawer.pin_save")}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}

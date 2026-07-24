// إعدادات صاحب الصالون وتعديل بيانات العميل — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";

import { hashPin } from "../../utils.js";
import { IconArrowRight, IconLock, IconPencil, IconPin, IconRefresh, IconSuccess } from "../shared/Icons.jsx";
import { sb } from "../../api.js";


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

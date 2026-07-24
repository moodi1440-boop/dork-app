// شاشة تسجيل دخول صاحب الصالون (PIN + نسيت الرمز) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../styles.js";
import { F, fi, SL } from "../shared/Ui.jsx";
import { OtpInput } from "../shared/Misc.jsx";
import { IconArrowRight, IconEye, IconEyeOff } from "../shared/Icons.jsx";
import { supabase, registerPushSubForUser } from "../../../App.jsx";

export function OwnerLogin({setOwnerSession,setOwnerTab,setView,toast$}){
  const{t}=useTranslation();
  const[phone,setPhone]=useState(()=>{ try{return localStorage.getItem("dork_owner_saved_phone")||"";}catch{return"";}});
  const[pin,setPin]=useState("");
  const[showPin,setShowPin]=useState(false);
  const[rememberPhone,setRememberPhone]=useState(()=>{ try{return!!localStorage.getItem("dork_owner_saved_phone");}catch{return false;}});
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  // استعادة الرمز السري
  const[resetStep,setResetStep]=useState(null); // null | "phone" | "otp" | "pin"
  const[resetPhone,setResetPhone]=useState("");
  const[resetEmail,setResetEmail]=useState("");
  const[resetOtp,setResetOtp]=useState("");
  const[resetNewPin,setResetNewPin]=useState("");
  const[resetConfirmPin,setResetConfirmPin]=useState("");
  const[resetErr,setResetErr]=useState("");
  const[resetLoading,setResetLoading]=useState(false);
  const[resetOtpSent,setResetOtpSent]=useState(false);
  const[resetAccessToken,setResetAccessToken]=useState("");
  const[resendTimer,setResendTimer]=useState(0);

  useEffect(()=>{
    if(resendTimer<=0)return;
    const interval=setInterval(()=>setResendTimer(prev=>Math.max(prev-1,0)),1000);
    return()=>clearInterval(interval);
  },[resendTimer]);

  const handleRemember=(checked)=>{
    setRememberPhone(checked);
    try{if(checked)localStorage.setItem("dork_owner_saved_phone",phone);else localStorage.removeItem("dork_owner_saved_phone");}catch{}
  };

  const login=async()=>{
    if(!phone.trim()||pin.length!==6){setErr(t("owner_login.err_pin_wrong"));return;}
    setLoading(true); setErr("");
    try{
      const res=await fetch("/api/owner-auth",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:phone.trim(),pin}),
      });
      const data=await res.json();
      if(!res.ok){
        if(data.code==="err_locked"&&data.remainingMinutes){
          setErr(`تم قفل الدخول مؤقتاً — أعد المحاولة بعد ${data.remainingMinutes} ${data.remainingMinutes===1?"دقيقة":"دقائق"}`);
        }else{
          setErr(t(`owner_login.${data.code||"err_generic"}`));
        }
        setLoading(false); return;
      }
      if(data.access_token&&data.refresh_token){
        await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token}).catch(()=>{});
      }
      setOwnerSession(data.id); setOwnerTab(null); setView("ownerDash"); registerPushSubForUser("salon",data.id);
    }catch{
      setErr(t("owner_login.err_generic"));
    }
    setLoading(false);
  };
  const sendResetOtp=async()=>{
    if(resendTimer>0){setResetErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة الإرسال`);return;}
    setResetErr(""); setResetLoading(true);
    try{
      const res=await fetch("/api/salon-reset-pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify",phone:resetPhone.trim(),email:resetEmail.trim()})});
      const d=await res.json();
      if(!res.ok){setResetErr(d.error||"خطأ");setResetLoading(false);return;}
      const{data,error}=await supabase.auth.signInWithOtp({email:resetEmail.trim(),options:{shouldCreateUser:false}});
      if(error){setResetErr(error.message);setResetLoading(false);return;}
      setResendTimer(170);
      setResetOtpSent(true);setResetStep("otp");
      toast$&&toast$(t("owner_login.reset_otp_sent"));
    }catch(e){setResetErr(e.message);}
    setResetLoading(false);
  };

  const verifyResetOtp=async()=>{
    setResetErr(""); setResetLoading(true);
    try{
      const otp=resetOtp.replace(/\D/g,"").slice(0,6);
      if(otp.length<6){setResetErr(t("owner_login.reset_err_6digits"));setResetLoading(false);return;}
      const{data,error}=await supabase.auth.verifyOtp({email:resetEmail.trim(),token:otp,type:"email"});
      if(error){setResetErr(error.message);setResetLoading(false);return;}
      setResetAccessToken(data.session?.access_token||"");
      setResetStep("pin");
    }catch(e){setResetErr(e.message);}
    setResetLoading(false);
  };

  const saveResetPin=async()=>{
    setResetErr("");
    if(!/^\d{6}$/.test(resetNewPin)){setResetErr(t("owner_login.reset_err_6digits"));return;}
    if(resetNewPin!==resetConfirmPin){setResetErr(t("owner_login.reset_err_mismatch"));return;}
    setResetLoading(true);
    try{
      const res=await fetch("/api/salon-reset-pin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset",phone:resetPhone.trim(),accessToken:resetAccessToken,newPin:resetNewPin})});
      const d=await res.json();
      if(!res.ok){setResetErr(d.error||"خطأ");setResetLoading(false);return;}
      await supabase.auth.signOut().catch(()=>{});
      toast$&&toast$(t("owner_login.reset_success"));
      setResetStep(null);setResetPhone("");setResetEmail("");setResetOtp("");setResetNewPin("");setResetConfirmPin("");setResetAccessToken("");
    }catch(e){setResetErr(e.message);}
    setResetLoading(false);
  };

  if(resetStep){
    return(
      <div style={G.page}><div style={G.fp}>
        <div style={G.fh}><button style={G.bb} onClick={()=>{setResetStep(null);setResetErr("");}}><IconArrowRight size={20}/></button><h2 style={G.ft}>{t("owner_login.reset_title")}</h2></div>
        <div style={G.fc}>
          {resetStep==="phone"&&<>
            <SL>{t("owner_login.reset_step1_hint")}</SL>
            <F label={t("owner_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={resetPhone} onChange={e=>{setResetPhone(e.target.value);setResetErr("");}}/></F>
            <F label={t("owner_login.reset_email_label")} error={resetErr}><input style={fi(resetErr)} type="email" inputMode="email" placeholder="example@email.com" value={resetEmail} onChange={e=>{setResetEmail(e.target.value);setResetErr("");}}/></F>
            <button style={{...G.sub,opacity:resetLoading?0.7:1}} disabled={resetLoading} onClick={sendResetOtp}>{resetLoading?t("owner_login.reset_sending"):t("owner_login.reset_send_otp")}</button>
          </>}
          {resetStep==="otp"&&<>
            <SL>{t("owner_login.reset_otp_sent")}</SL>
            <F label={t("owner_login.reset_otp_label")} error={resetErr}><OtpInput value={resetOtp} onChange={val=>{setResetOtp(val);setResetErr("");}} error={!!resetErr} use6Boxes={true} disabled={resetLoading}/></F>
            <button style={{...G.sub,opacity:resetLoading?0.7:1}} disabled={resetLoading} onClick={verifyResetOtp}>{resetLoading?t("owner_login.reset_verifying"):t("owner_login.reset_verify_btn")}</button>
            {resendTimer>0
              ?<div style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginTop:8}}>⏳ إعادة الإرسال متاحة بعد {Math.floor(resendTimer/60)}:{String(resendTimer%60).padStart(2,"0")}</div>
              :<button onClick={sendResetOtp} disabled={resetLoading} style={{width:"100%",marginTop:8,padding:"8px 0",background:"transparent",border:"none",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:12,textDecoration:"underline"}}>إعادة إرسال الكود</button>}
          </>}
          {resetStep==="pin"&&<>
            <SL>✅ تم التحقق — أدخل رمزاً سرياً جديداً</SL>
            <F label={t("owner_login.reset_new_pin_label")} error={resetErr}><input style={{...fi(resetErr),letterSpacing:4,textAlign:"center"}} type="password" inputMode="numeric" placeholder="••••••" maxLength={6} value={resetNewPin} onChange={e=>{setResetNewPin(e.target.value.replace(/\D/g,"").slice(0,6));setResetErr("");}}/></F>
            <F label={t("owner_login.reset_confirm_pin_label")}><input style={{...fi(),letterSpacing:4,textAlign:"center"}} type="password" inputMode="numeric" placeholder="••••••" maxLength={6} value={resetConfirmPin} onChange={e=>{setResetConfirmPin(e.target.value.replace(/\D/g,"").slice(0,6));setResetErr("");}}/></F>
            <button style={{...G.sub,opacity:resetLoading?0.7:1}} disabled={resetLoading} onClick={saveResetPin}>{resetLoading?t("owner_login.reset_saving"):t("owner_login.reset_save_btn")}</button>
          </>}
        </div>
      </div></div>
    );
  }

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fc}>
        <SL>{t("owner_login.phone_hint")}</SL>
        <F label={t("owner_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");if(rememberPhone)try{localStorage.setItem("dork_owner_saved_phone",e.target.value);}catch{}}}/></F>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--text-muted)",cursor:"pointer",marginTop:-6,marginBottom:8}}>
          <input type="checkbox" checked={rememberPhone} onChange={e=>handleRemember(e.target.checked)} style={{width:15,height:15,accentColor:"var(--p)",cursor:"pointer"}}/>
          {t("owner_login.remember_phone")}
        </label>
        <F label={t("owner_login.pin_label")} error={err}><div style={{position:"relative"}}><input style={{...fi(err),paddingLeft:36}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" value={pin} onChange={e=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setPin(val);setErr("");}}/><button type="button" onClick={()=>setShowPin(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0}}>{showPin?<IconEyeOff size={17}/>:<IconEye size={17}/>}</button></div></F>
        <button onClick={()=>{setResetStep("phone");setResetPhone(phone);setResetErr("");}} style={{background:"transparent",border:"none",color:"var(--p)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:"4px 0",textAlign:"center",width:"100%",textDecoration:"underline",marginBottom:6}}>{t("owner_login.forgot_pin")}</button>
        <button style={{...G.sub,opacity:loading?0.7:1}} disabled={loading} onClick={login}>{t("owner_login.login_btn")}</button>
      </div>
      <div style={{margin:"0 0 16px",background:"rgba(var(--pr),.06)",border:"1.5px dashed rgba(var(--pr),.4)",borderRadius:13,padding:"18px 16px",textAlign:"center"}}>
        <div style={{fontSize:15,color:"var(--p)",fontWeight:700,marginBottom:6}}>{t("owner_login.no_salon_title")}</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:14}}>{t("owner_login.no_salon_sub")}</div>
        <button style={{...G.sub,background:"var(--grad)",color:"#000",fontSize:15,fontWeight:900,letterSpacing:.5}} onClick={()=>setView("register")}>
          {t("owner_login.register_btn")}
        </button>
      </div>
      <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:4,marginBottom:16,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("owner_login.back")}</button>
    </div></div>
  );
}

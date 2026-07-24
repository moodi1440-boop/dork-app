// تسجيل دخول العميل (جوال+رمز/Google/تسجيل جديد/نسيت الرمز) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";
import { hashPin, toAppCustomer } from "../../utils.js";
import { F, fi, SL } from "../shared/Ui.jsx";
import { OtpInput } from "../shared/Misc.jsx";
import { IconEye, IconEyeOff } from "../shared/Icons.jsx";
import { sb, supabase } from "../../api.js";

export function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$,setCustDashNav}){
  const{t}=useTranslation();
  const[tab,setTab]=useState("login");
  const[phone,setPhone]=useState(()=>{try{return localStorage.getItem("dork_customer_saved_phone")||"";}catch{return "";}});
  const[name,setName]=useState("");
  const[email,setEmail]=useState(""); const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[pin,setPin]=useState(""); const[showPin,setShowPin]=useState(false);
  const[pinConfirm,setPinConfirm]=useState("");
  const[googleStep,setGoogleStep]=useState(null);
  const[gPhone,setGPhone]=useState("");
  const[gPin,setGPin]=useState("");
  const[gPinConfirm,setGPinConfirm]=useState("");
  const[gErr,setGErr]=useState("");
  const[gSaving,setGSaving]=useState(false);
  const[phoneLoginLoading,setPhoneLoginLoading]=useState(false);
  // حفظ الموقع تلقائياً فور إنشاء الحساب (طلب أحمد) — صامت تماماً، لا يوقف
  // أو يؤخر أي خطوة تالية بالتسجيل؛ لو رُفض الإذن يقدر العميل يضيفه لاحقاً
  // يدوياً من "تعديل البيانات" (رابط الخرائط اليدوي المضاف بـL164)
  const autoSaveLocation=(customerId)=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(async(p)=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      try{
        await sb("customers","PATCH",{location_lat:lat,location_lng:lng},`?id=eq.${customerId}`);
        setCustomers(prev=>prev.map(c=>c.id===customerId?{...c,locationLat:lat,locationLng:lng}:c));
        setCustomerSession(s=>s&&s.id===customerId?{...s,locationLat:lat,locationLng:lng}:s);
      }catch{/* فشل صامت */}
    },()=>{/* رفض/تعذّر — فشل صامت، العميل يقدر يضيفه لاحقاً يدوياً */},{enableHighAccuracy:true,timeout:15000});
  };
  const[otpSent,setOtpSent]=useState(false);
  const[otpCode,setOtpCode]=useState("");
  const[otpTimer,setOtpTimer]=useState(0);
  const[otpExpired,setOtpExpired]=useState(false);
  const[sending,setSending]=useState(false);
  const[verifying,setVerifying]=useState(false);
  const[attempts,setAttempts]=useState(0);
  const[resendTimer,setResendTimer]=useState(0);
  const[rememberPhone,setRememberPhone]=useState(()=>{try{return !!localStorage.getItem("dork_customer_saved_phone");}catch{return false;}});
  const[resetStep,setResetStep]=useState(null);
  const[resetEmail,setResetEmail]=useState("");
  const[resetOtp,setResetOtp]=useState("");
  const[resetErr,setResetErr]=useState("");
  const[resetLoading,setResetLoading]=useState(false);
  const[resetCustomer,setResetCustomer]=useState(null);
  const[resetPinLen,setResetPinLen]=useState(4);
  const[resetTempPin,setResetTempPin]=useState("");
  const[resetPinConfirm,setResetPinConfirm]=useState("");

  const handleRemember=(checked)=>{
    setRememberPhone(checked);
    try{
      if(checked&&phone.trim()) localStorage.setItem("dork_customer_saved_phone",phone.trim());
      else localStorage.removeItem("dork_customer_saved_phone");
    }catch{}
  };

  const sendResetOtp=async()=>{
    if(resetLoading)return;
    if(resendTimer>0){setResetErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة الإرسال`);return;}
    const emailTrimmed=resetEmail.trim();
    if(!emailTrimmed){setResetErr(t("cust_login.err_email"));return;}
    const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRx.test(emailTrimmed)){setResetErr(t("cust_login.err_email_invalid"));return;}
    try{
      setResetLoading(true);setResetErr("");
      const{error}=await supabase.auth.signInWithOtp({email:emailTrimmed,options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:""}});
      if(error){
        const isRate=error.message.includes("rate")||error.message.includes("too many")||error.message.includes("security");
        setResetErr(isRate?i18n.t('ui.wait_two_mins'):i18n.t('ui.error_prefix')+error.message.substring(0,40));
        if(isRate)setResendTimer(170);
        return;
      }
      setResendTimer(170);
      setResetStep("otp");
    }catch(e){setResetErr(i18n.t('ui.connection_internet'));}
    finally{setResetLoading(false);}
  };

  const verifyResetOtp=async()=>{
    if(resetLoading)return;
    const otpClean=String(resetOtp||"").replace(/\D/g,"").slice(0,6);
    if(otpClean.length<6){setResetErr(t("cust_login.err_6digits"));return;}
    try{
      setResetLoading(true);setResetErr("");
      const{data,error}=await supabase.auth.verifyOtp({email:resetEmail.trim(),token:otpClean,type:"email"});
      if(error){setResetErr(i18n.t('ui.code_wrong_check'));setResetOtp("");return;}
      const lookupRes=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"by_email",email:resetEmail.trim(),accessToken:data?.session?.access_token||null})});
      const lookupData=await lookupRes.json().catch(()=>({}));
      if(!lookupRes.ok||!lookupData.customer){setResetErr(t("cust_login.err_not_found"));return;}
      const c=toAppCustomer(lookupData.customer);
      if(c.blocked){setResetErr(i18n.t('ui.account_banned'));return;}
      try{localStorage.removeItem(`dork_customer_pin_${c.id}`);}catch{}
      // نطلب رمز سري جديد فعلياً بدل تسجيل الدخول مباشرة — وإلا يبقى pin_hash
      // بالسيرفر فاضياً للأبد وتتكرر رسالة "يلزم ضبط رمز سري" بكل محاولة دخول قادمة
      setResetCustomer(c);setResetTempPin("");setResetPinConfirm("");setResetPinLen(4);
      setResetStep("pin-select");
    }catch(e){setResetErr(i18n.t('ui.op_error_retry')+e.message.substring(0,40));}
    finally{setResetLoading(false);}
  };

  const finishResetPin=async()=>{
    if(resetLoading||!resetCustomer)return;
    if(resetTempPin.length!==resetPinLen||resetPinConfirm.length!==resetPinLen){return;}
    if(resetTempPin!==resetPinConfirm){setResetErr(t("cust_drawer.pin_mismatch"));return;}
    try{
      setResetLoading(true);setResetErr("");
      const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:resetCustomer.id,pin:resetTempPin})});
      if(!res.ok){
        const d=await res.json().catch(()=>({}));
        if(d.code==="err_same_pin"){setResetErr(d.error);setResetStep("pin-enter");setResetTempPin("");return;}
        throw new Error(d.error||`HTTP ${res.status}`);
      }
      localStorage.setItem(`dork_customer_pin_${resetCustomer.id}`,await hashPin(resetTempPin));
      setCustomerSession(resetCustomer);setView("home");
      localStorage.setItem("dork_biometric_id",String(resetCustomer.id));
      toast$&&toast$(t("cust_login.reset_success"),"success");
    }catch(e){setResetErr(i18n.t('ui.op_error_retry')+e.message.substring(0,40));}
    finally{setResetLoading(false);}
  };

  // تسجيل دخول بالبصمة
  const loginWithBiometric=async()=>{
    if(!window.PublicKeyCredential){toast$&&toast$(i18n.t('ui.biometric_unsupported'),"err");return;}
    try{
      const savedId=localStorage.getItem("dork_biometric_id");
      if(!savedId){toast$&&toast$(i18n.t('ui.biometric_not_registered'),"err");return;}
      const c=customers.find(x=>String(x.id)===savedId);
      if(!c){toast$&&toast$(i18n.t('ui.account_not_found'),"err");return;}
      if(c.blocked){toast$&&toast$(i18n.t('ui.account_banned'),"err");return;}
      setCustomerSession(c);setView("home");
      toast$&&toast$(i18n.t('ui.biometric_success'));
    }catch(e){toast$&&toast$(i18n.t('ui.verification_failed'),"err");}
  };

  const loginWithPhone=async()=>{
    if(!phone.trim()){setErr(t("cust_login.err_phone"));return;}
    if(pin.length!==6){setErr(t("cust_login.err_pin_wrong"));return;}
    setPhoneLoginLoading(true);setErr("");
    try{
      const res=await fetch("/api/customer-auth",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({phone:phone.trim(),pin}),
      });
      const data=await res.json();
      if(!res.ok){
        if(data.code==="err_locked"&&data.remainingMinutes){
          setErr(`تم قفل الدخول مؤقتاً — أعد المحاولة بعد ${data.remainingMinutes} ${data.remainingMinutes===1?"دقيقة":"دقائق"}`);
        }else if(data.code==="err_no_pin"){
          setErr("يلزم ضبط رمز سري لهذا الحساب أول مرة — استخدم 'نسيت الرمز السري؟' لضبطه");
        }else{
          setErr(data.error||t("cust_login.err_pin_wrong"));
        }
        setPhoneLoginLoading(false);return;
      }
      if(data.access_token&&data.refresh_token){
        await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token}).catch(()=>{});
      }
      const rows=await sb("customers","GET",null,`?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at,blocked&id=eq.${data.id}&limit=1`).catch(()=>[]);
      const c=rows?.length?toAppCustomer(rows[0]):{id:data.id,name:data.name,phone:data.phone,email:data.email,history:[],favs:[]};
      setCustomerSession(c);setView("home");
      localStorage.setItem("dork_biometric_id",String(c.id));
    }catch(e){setErr(i18n.t('ui.error_prefix')+e.message);}
    setPhoneLoginLoading(false);
  };

  // مؤقت صلاحية الكود (2:50 — يطابق إعداد Email OTP Expiration بـSupabase)
  useEffect(()=>{
    if(!otpSent||otpTimer<=0)return;
    const interval=setInterval(()=>{
      setOtpTimer(prev=>{
        const newTimer=prev-1;
        if(newTimer<=0){
          setOtpExpired(true);
          return 0;
        }
        return newTimer;
      });
    },1000);
    return()=>clearInterval(interval);
  },[otpSent]);

  // مؤقت انتظار إعادة الإرسال — يطابق مدة صلاحية الكود (2:50) عمداً، يمنع كسر كود لسا صالح
  useEffect(()=>{
    if(resendTimer<=0)return;
    const interval=setInterval(()=>{
      setResendTimer(prev=>Math.max(prev-1,0));
    },1000);
    return()=>clearInterval(interval);
  },[resendTimer]);

 const sendOtpCode=async()=>{
  if(sending)return;
  if(!/^\d{6}$/.test(pin)){setErr(t("cust_login.err_6digits"));return;}
  if(pin!==pinConfirm){setErr(t("owner_login.reset_err_mismatch"));return;}
  if(!email.trim()){setErr(t("cust_login.err_email"));return;}
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email.trim())){setErr(t("cust_login.err_email_invalid"));return;}
  if(resendTimer>0){setErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة المحاولة`);return;}
  try{
    setSending(true);
    setErr("");
    setOtpExpired(false);
    setOtpCode("");
    setOtpTimer(170);
    setResendTimer(170);
    setOtpSent(true);
    setAttempts(0);
    const {data,error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:""}});
    if(error){
      console.error("OTP Error:",error.message);
      setOtpExpired(false);
      const isRateLimit=error.message.includes("rate")||error.message.includes("too many")||error.message.includes("limit")||error.message.includes("security");
      if(isRateLimit){
        setOtpSent(true);
        setResendTimer(170);
        setErr(i18n.t('ui.wait_two_mins'));
      }else{
        setOtpSent(false);
        setOtpTimer(0);
        if(error.message.includes("invalid")||error.message.includes("format")){
          setErr(i18n.t('ui.email_invalid'));
        }else if(error.message.includes("disabled")||error.message.includes("not enabled")){
          setErr(i18n.t('ui.auth_disabled'));
        }else{
          setErr(i18n.t('ui.error_prefix')+error.message.substring(0,40));
        }
      }
      return;
    }
    toast$&&toast$(t("cust_login.success_otp"),"success");
  }catch(e){
    console.error("Send OTP Exception:",e.message);
    setOtpSent(false);
    setOtpTimer(0);
    setOtpExpired(false);
    setResendTimer(60);
    setErr(i18n.t('ui.connection_internet'));
  }finally{
    setSending(false);
  }
};

  const register=async()=>{
    if(verifying)return;
    if(!name.trim()||!phone.trim()){setErr(t("cust_login.err_name_phone"));return;}
    if(!email.trim()){setErr(t("cust_login.err_email"));return;}
    if(!/^\d{6}$/.test(pin)){setErr(t("cust_login.err_6digits"));return;}
    if(pin!==pinConfirm){setErr(t("owner_login.reset_err_mismatch"));return;}
    if(!otpSent){setErr(t("cust_login.err_send_first"));return;}
    if(attempts>=5){setErr(t("cust_login.max_attempts"));return;}
    const otpClean=String(otpCode||"").replace(/\D/g,"").slice(0,6);
    if(otpClean.length<6){setErr(t("cust_login.err_6digits"));return;}
    if(otpExpired){setErr(t("cust_login.err_code_expired"));return;}
    try{
      setVerifying(true);
      const {data,error}=await supabase.auth.verifyOtp({email:email.trim(),token:otpClean,type:"email"});
      if(error){
        console.error("Verify OTP Error:",error.message);
        const msg=error.message.toLowerCase();
        if(msg.includes("invalid")||msg.includes("wrong")||msg.includes("incorrect")||msg.includes("not found")){
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr(i18n.t('ui.code_wrong_check'));
        }else if((msg.includes("timeout")||msg.includes("expired")||msg.includes("used"))&&otpTimer<=0){
          setOtpExpired(true);
          setOtpTimer(0);
          setErr(i18n.t('ui.code_expired_resend'));
        }else if(msg.includes("blocked")||msg.includes("denied")){
          setErr(i18n.t('ui.email_banned'));
        }else{
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr(i18n.t('ui.code_wrong_retry'));
        }
        return;
      }
      const existsRes=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"phone_exists",phone:phone.trim()})});
      const existsData=await existsRes.json().catch(()=>({}));
      if(existsData.exists){setErr(t("cust_login.err_exists"));return;}
      let isBlacklisted=false;
      try{const bl=await supabase.rpc("is_blacklisted",{p_phone:phone.trim(),p_email:email.trim()});isBlacklisted=bl?.data||false;}catch{}
      if(isBlacklisted){setErr(i18n.t('ui.account_blacklisted'));return;}
      const authUid=data?.user?.id||null;
      const rows=await sb("customers","POST",{name:name.trim(),phone:phone.trim(),email:email.trim(),history:[],favs:[],auth_uid:authUid},"?select=id,name,phone,email,google_uid,history,favs,location_lat,location_lng,created_at,blocked");
      const nc=toAppCustomer(rows[0]);
      await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_pin",customerId:nc.id,pin})}).catch(()=>{});
      setCustomerSession(nc);setView("home");
      localStorage.setItem("dork_biometric_id",String(nc.id));
      autoSaveLocation(nc.id);
      setOtpSent(false);setOtpCode("");setOtpTimer(0);setOtpExpired(false);
      toast$&&toast$(t("cust_login.success_reg"),"success");
    }catch(e){setErr(i18n.t('ui.op_error_retry')+e.message.substring(0,50));
    }finally{setVerifying(false);}
  };

  return(
    <div style={G.page}><div style={G.fp}>

      {/* شاشة استعادة الرمز السري */}
      {resetStep!==null?<>
        <div style={G.fc}>
          <SL>{t("cust_login.reset_title")}</SL>
          {resetStep==="email"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:12,lineHeight:1.6}}>{t("cust_login.reset_hint")}</div>
            <F label={t("cust_login.email_label")} error={resetErr}>
              <input style={{...fi(resetErr),direction:"ltr",textAlign:"left"}} type="email" inputMode="email" placeholder="example@email.com" value={resetEmail} onChange={e=>{setResetEmail(e.target.value);setResetErr("");}} dir="ltr"/>
            </F>
            <button style={{...G.sub,opacity:resetLoading?.6:1,cursor:resetLoading?"not-allowed":"pointer"}} onClick={sendResetOtp} disabled={resetLoading}>
              {resetLoading?t("cust_login.reset_sending"):t("cust_login.reset_send_otp")}
            </button>
          </>:null}
          {resetStep==="otp"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:12,lineHeight:1.6}}>{t("cust_login.reset_otp_sent")} <strong dir="ltr">{resetEmail}</strong></div>
            <F label={t("cust_login.reset_otp_label")} error={resetErr}>
              <OtpInput value={resetOtp} onChange={val=>{setResetOtp(val);setResetErr("");}} error={false} use6Boxes={true} disabled={resetLoading}/>
            </F>
            <button style={{...G.sub,opacity:resetLoading?.6:1,cursor:resetLoading?"not-allowed":"pointer"}} onClick={verifyResetOtp} disabled={resetLoading}>
              {resetLoading?t("cust_login.reset_verifying"):t("cust_login.reset_verify_btn")}
            </button>
            {resendTimer>0
              ?<div style={{textAlign:"center",fontSize:12,color:"var(--text-muted)",marginTop:8}}>⏳ إعادة الإرسال متاحة بعد {Math.floor(resendTimer/60)}:{String(resendTimer%60).padStart(2,"0")}</div>
              :<button onClick={sendResetOtp} disabled={resetLoading} style={{width:"100%",marginTop:8,padding:"8px 0",background:"transparent",border:"none",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:12,textDecoration:"underline"}}>إعادة إرسال الكود</button>}
          </>:null}
          {resetStep==="pin-select"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16,lineHeight:1.6,textAlign:"center"}}>{t("cust_drawer.pin_select_hint")}</div>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
              <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${resetPinLen===4?"var(--p)":"var(--border-ui)"}`,background:resetPinLen===4?"var(--pa15)":"transparent",color:resetPinLen===4?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setResetPinLen(4)}>{t("cust_drawer.pin_4")}</button>
              <button style={{flex:1,maxWidth:140,padding:"14px",borderRadius:12,border:`2px solid ${resetPinLen===6?"var(--p)":"var(--border-ui)"}`,background:resetPinLen===6?"var(--pa15)":"transparent",color:resetPinLen===6?"var(--p)":"var(--text-muted)",cursor:"pointer",fontWeight:700,fontSize:15,fontFamily:"inherit"}} onClick={()=>setResetPinLen(6)}>{t("cust_drawer.pin_6")}</button>
            </div>
            <button style={G.sub} onClick={()=>{setResetTempPin("");setResetStep("pin-enter");}}>{t("cust_drawer.pin_enter")}</button>
          </>:null}
          {resetStep==="pin-enter"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:10,textAlign:"center"}}>{resetPinLen} {t("cust_drawer.pin_digits_hint")}</div>
            <input type="password" inputMode="numeric" maxLength={resetPinLen} value={resetTempPin} onChange={e=>{setResetTempPin(e.target.value.replace(/\D/g,"").slice(0,resetPinLen));setResetErr("");}} style={{...fi(resetErr),textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:resetErr?6:16}} autoFocus/>
            {resetErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10,textAlign:"center"}}>{resetErr}</div>}
            <button style={{...G.sub,opacity:resetTempPin.length===resetPinLen?1:.5,cursor:resetTempPin.length===resetPinLen?"pointer":"not-allowed"}} disabled={resetTempPin.length!==resetPinLen} onClick={()=>{setResetErr("");setResetPinConfirm("");setResetStep("pin-confirm");}}>{t("cust_drawer.pin_enter")}</button>
          </>:null}
          {resetStep==="pin-confirm"?<>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:10,textAlign:"center"}}>{t("cust_drawer.pin_confirm_title")}</div>
            <input type="password" inputMode="numeric" maxLength={resetPinLen} value={resetPinConfirm} onChange={e=>{setResetPinConfirm(e.target.value.replace(/\D/g,"").slice(0,resetPinLen));setResetErr("");}} style={{...fi(resetErr),textAlign:"center",fontSize:24,letterSpacing:8,marginBottom:resetErr?6:16}} autoFocus/>
            {resetErr&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:10,textAlign:"center"}}>{resetErr}</div>}
            <button style={{...G.sub,opacity:(resetLoading||resetPinConfirm.length!==resetPinLen)?.6:1,cursor:(resetLoading||resetPinConfirm.length!==resetPinLen)?"not-allowed":"pointer"}} disabled={resetLoading||resetPinConfirm.length!==resetPinLen} onClick={finishResetPin}>
              {resetLoading?t("cust_login.reset_verifying"):t("cust_drawer.pin_save")}
            </button>
          </>:null}
          <button onClick={()=>{setResetStep(null);setResetEmail("");setResetOtp("");setResetErr("");setResetCustomer(null);setResetTempPin("");setResetPinConfirm("");}} style={{width:"100%",marginTop:10,padding:"10px 0",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
            {t("cust_login.reset_back")}
          </button>
        </div>
        <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:20,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_login.back")}</button>
      </>:googleStep?<>
        {/* إضافة جوال + رمز سري اختيارية بعد أول تسجيل بجوجل — الاثنان معاً أو ولا شي */}
        <div style={G.fc}>
          <SL>{t('ui.google_phone_setup_title')}</SL>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:14,lineHeight:1.6}}>{t('ui.google_phone_setup_hint')}</div>
          <F label={t("cust_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={gPhone} onChange={e=>{setGPhone(e.target.value);setGErr("");}}/></F>
          <F label={t("cust_login.pin_label")}><input style={{...fi(),direction:"ltr",textAlign:"center",letterSpacing:4}} type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={gPin} onChange={e=>{setGPin(e.target.value.replace(/\D/g,"").slice(0,6));setGErr("");}}/></F>
          <F label={t("owner_login.reset_confirm_pin_label")} error={gErr}><input style={{...fi(gErr),direction:"ltr",textAlign:"center",letterSpacing:4}} type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={gPinConfirm} onChange={e=>{setGPinConfirm(e.target.value.replace(/\D/g,"").slice(0,6));setGErr("");}}/></F>
          <button style={{...G.sub,opacity:gSaving?.6:1,cursor:gSaving?"not-allowed":"pointer"}} disabled={gSaving} onClick={async()=>{
            if(!gPhone.trim()){setGErr(t("cust_login.err_name_phone"));return;}
            if(!/^\d{6}$/.test(gPin)){setGErr(t("cust_login.err_6digits"));return;}
            if(gPin!==gPinConfirm){setGErr(t("owner_login.reset_err_mismatch"));return;}
            setGSaving(true);
            try{
              const res=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"set_google_phone_pin",customerId:googleStep.id,phone:gPhone.trim(),pin:gPin})});
              const d=await res.json().catch(()=>({}));
              if(!res.ok){setGErr(d.error||i18n.t('ui.error_prefix'));setGSaving(false);return;}
              setCustomers(p=>p.map(c=>c.id===googleStep.id?{...c,phone:gPhone.trim()}:c));
              setCustomerSession(s=>({...s,phone:gPhone.trim()}));
              toast$&&toast$(t('ui.data_saved'));
              setView("home");
            }catch(e){setGErr(e.message);}
            setGSaving(false);
          }}>{gSaving?t("cust_login.verifying"):t('ui.save')}</button>
          <button onClick={()=>setView("home")} style={{width:"100%",marginTop:10,padding:"10px 0",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>{t('ui.google_phone_setup_skip')}</button>
        </div>
      </>:<>

      {/* دخول بالبصمة */}
      {localStorage.getItem("dork_biometric_id")&&(
        <button style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--pa25)",background:"var(--pa08)",color:"var(--p)",cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={loginWithBiometric}>
          {t("cust_login.biometric")}
        </button>
      )}

      <div style={{display:"flex",gap:7,marginBottom:14}}>
        <button style={{...G.toggleBtn,...(tab==="login"?G.toggleOn:{})}} onClick={()=>{setTab("login");setErr("");}}>{t("cust_login.login_tab")}</button>
        <button style={{...G.toggleBtn,...(tab==="reg"?G.toggleOn:{})}} onClick={()=>{setTab("reg");setErr("");}}>{t("cust_login.reg_tab")}</button>
      </div>
      <div style={G.fc}>
        {tab==="login"?<>
          <SL>{t("cust_login.login_title")}</SL>
          <F label={t("cust_login.phone_label")} error={err}><input style={fi(err)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");if(rememberPhone){try{localStorage.setItem("dork_customer_saved_phone",e.target.value.trim());}catch{}}}}/></F>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"var(--text-muted)",cursor:"pointer",margin:"4px 0 10px",userSelect:"none"}}>
            <input type="checkbox" checked={rememberPhone} onChange={e=>handleRemember(e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:"var(--p)"}}/>
            {t("cust_login.remember_phone")}
          </label>
          <F label={t("cust_login.pin_label")}><div style={{position:"relative"}}><input style={{...fi(),paddingLeft:36}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}} maxLength={6}/><button type="button" onClick={()=>setShowPin(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0}}>{showPin?<IconEyeOff size={17}/>:<IconEye size={17}/>}</button></div></F>
          <button onClick={()=>{setResetStep("email");setResetEmail("");setResetOtp("");setResetErr("");}} style={{width:"100%",marginTop:-4,marginBottom:10,padding:"4px 0",border:"none",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:13,textDecoration:"underline",textAlign:"center"}}>
            {t("cust_login.forgot_pin")}
          </button>
          <button style={{...G.sub,opacity:phoneLoginLoading?.6:1,cursor:phoneLoginLoading?"not-allowed":"pointer"}} disabled={phoneLoginLoading} onClick={()=>{if(rememberPhone&&phone.trim()){try{localStorage.setItem("dork_customer_saved_phone",phone.trim());}catch{}}loginWithPhone();}}>{phoneLoginLoading?"...":t("cust_login.login_btn")}</button>
        </>:<>
          <SL>{t("cust_login.reg_title")}</SL>
          <F label={t("cust_login.name_label")}><input style={fi()} placeholder={t("cust_login.name_ph")} value={name} onChange={e=>setName(e.target.value)}/></F>
          <F label={t("cust_login.phone_label")}><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <F label={t("cust_login.pin_label")}><div style={{position:"relative"}}><input style={{...fi(),paddingLeft:36}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}} maxLength={6}/><button type="button" onClick={()=>setShowPin(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",padding:0}}>{showPin?<IconEyeOff size={17}/>:<IconEye size={17}/>}</button></div></F>
          <F label={t("owner_login.reset_confirm_pin_label")} error={pinConfirm&&pin!==pinConfirm?t("owner_login.reset_err_mismatch"):""}><input style={{...fi(pinConfirm&&pin!==pinConfirm?"x":""),letterSpacing:4,textAlign:"center"}} type={showPin?"text":"password"} inputMode="numeric" placeholder="••••••" maxLength={6} value={pinConfirm} onChange={e=>{setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,6));setErr("");}}/></F>
          <F label={t("cust_login.email_label")} error={err}><div style={{display:"flex",gap:8}}>
            <input style={{...fi(err),flex:1,direction:"ltr",textAlign:"left"}} placeholder="example@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} type="email" disabled={otpSent||sending} dir="ltr"/>
            <button style={{...G.sub,flex:0,padding:"12px 16px",fontSize:13,opacity:(sending||resendTimer>0||pin.length!==6||pin!==pinConfirm)?.6:1,cursor:(sending||resendTimer>0||pin.length!==6||pin!==pinConfirm)?"not-allowed":"pointer"}} onClick={sendOtpCode} disabled={sending||resendTimer>0||pin.length!==6||pin!==pinConfirm}>
              {sending?t("cust_login.sending"):resendTimer>0?`${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")}`:otpSent?t("cust_login.resend_btn"):t("cust_login.send_btn")}
            </button>
          </div></F>
          {otpSent&&<>
            <F label={t("cust_login.code_label")}>
              <OtpInput value={otpCode} onChange={(val)=>{setOtpCode(val);setErr("");}} error={false} use6Boxes={true} disabled={verifying||attempts>=5}/>
              <div style={{fontSize:11,color:attempts>=5?"#e74c3c":"#888",marginTop:8,direction:"rtl"}}>
                {t("cust_login.code_sent_to")} <span dir="ltr" style={{display:"inline-block"}}><strong>{email}</strong></span>
                {attempts>0&&attempts<5&&<><br/>{t("cust_login.attempts_left")} {5-attempts}</>}
                {attempts>=5&&<><br/>{t("cust_login.max_attempts")}</>}
              </div>
            </F>
            <button style={{width:"100%",padding:"8px 12px",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"transparent",color:"var(--text-muted)",cursor:verifying?"not-allowed":"pointer",fontFamily:"inherit",opacity:verifying?.5:1,marginTop:12,fontSize:12}} disabled={verifying} onClick={()=>{setOtpSent(false);setOtpCode("");setErr("");setOtpExpired(false);setOtpTimer(0);setResendTimer(0);setAttempts(0);}}>
              {t("cust_login.edit_email")}
            </button>
          </>}
          <button style={{...G.sub,opacity:(verifying||!otpSent||pin.length!==6)?.6:1,cursor:(verifying||!otpSent||pin.length!==6)?"not-allowed":"pointer"}} onClick={register} disabled={!otpSent||verifying||otpExpired||pin.length!==6}>
            {verifying?t("cust_login.verifying"):t("cust_login.reg_btn")}
          </button>
          <div style={{textAlign:"center",margin:"12px 0",color:"var(--text-muted)",fontSize:12}}>{t("cust_login.or")}</div>
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
              const fb=window.firebase;
              if(!fb.apps.length) fb.initializeApp({apiKey:"AIzaSyD2apyCKbR8tczHA-62Cl3R_2THHut7Jo0",authDomain:"dork-app-c1011.firebaseapp.com",projectId:"dork-app-c1011",storageBucket:"dork-app-c1011.firebasestorage.app",messagingSenderId:"341759447687",appId:"1:341759447687:web:148ba8f895d6aa7f271e22",measurementId:"G-4BXDWKXYQ2"});
              const provider=new fb.auth.GoogleAuthProvider();
              provider.setCustomParameters({prompt:"select_account"});
              const result=await fb.auth().signInWithPopup(provider);
              const gUser={name:result.user.displayName||"مستخدم",email:result.user.email||"",googleUid:result.user.uid};
              const glRes=await fetch("/api/customer-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"google_login",googleUid:gUser.googleUid,name:gUser.name,email:gUser.email})});
              const glData=await glRes.json().catch(()=>({}));
              if(!glRes.ok||!glData.customer){toast$&&toast$(glData.error||i18n.t('ui.error_prefix'),"err");return;}
              if(glData.access_token&&glData.refresh_token){
                await supabase.auth.setSession({access_token:glData.access_token,refresh_token:glData.refresh_token}).catch(()=>{});
              }
              const c=toAppCustomer(glData.customer);
              setCustomerSession(c);
              localStorage.setItem("dork_biometric_id",String(c.id));
              if(glData.isNewCustomer){autoSaveLocation(c.id);setGoogleStep(c);}else{setView("home");}
            }catch(e){setErr(e.message===i18n.t('ui.google_window_closed')?i18n.t('ui.window_closed'):i18n.t('ui.error_prefix')+e.message);}
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t("cust_login.google_btn")}
          </button>
        </>}
      </div>
      <button onClick={()=>setView("entry")} style={{width:"100%",marginTop:20,padding:"14px 0",borderRadius:12,border:"1.5px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:700,WebkitAppearance:"none",appearance:"none"}}>{t("cust_login.back")}</button>
    </>}
    </div></div>
  );
}

import React, { useState, useEffect } from "react";
import { G } from "../styles";
import { supabase, sb } from "../api/supabase";
import { F, SL } from "../helpers/FormHelpers";
import { toAppSalon, toDbSalon, toAppBooking, toAppCustomer } from "../utils/transformers";

function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$}){
  const[tab,setTab]=useState("login");
  const[loginMethod,setLoginMethod]=useState("phone");
  const[phone,setPhone]=useState(""); const[name,setName]=useState("");
  const[email,setEmail]=useState(""); const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[pin,setPin]=useState(""); const[pinErr,setPinErr]=useState("");
 const[otpSent,setOtpSent]=useState(false);
  const[otpCode,setOtpCode]=useState("");
  const[otpTimer,setOtpTimer]=useState(0);
  const[otpExpired,setOtpExpired]=useState(false);
  const[sending,setSending]=useState(false);
  const[verifying,setVerifying]=useState(false);
  const[attempts,setAttempts]=useState(0);
  const[resendTimer,setResendTimer]=useState(0);

  // تسجيل دخول بالبصمة
  const loginWithBiometric=async()=>{
    if(!window.PublicKeyCredential){toast$&&toast$("❌ البصمة غير مدعومة","err");return;}
    try{
      const savedId=localStorage.getItem("dork_biometric_id");
      if(!savedId){toast$&&toast$("❌ لم تُسجّل البصمة بعد - سجّل دخول أولاً","err");return;}
      const c=customers.find(x=>String(x.id)===savedId);
      if(!c){toast$&&toast$("❌ لم يُعثر على الحساب","err");return;}
      setCustomerSession(c);setView("home");
      toast$&&toast$("✅ تم الدخول بالبصمة");
    }catch(e){toast$&&toast$("❌ فشل التحقق","err");}
  };

  const loginWithPhone=async()=>{
    if(!phone.trim()){setErr("أدخل رقم الجوال");return;}
    try{
      const rows=await sb("customers","GET",null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
      if(!rows.length){setErr("لا يوجد حساب بهذا الرقم");return;}
      const c=toAppCustomer(rows[0]);
      setCustomerSession(c);setView("home");
      localStorage.setItem("dork_biometric_id",String(c.id));
    }catch(e){setErr("خطأ: "+e.message);}
  };

  const loginWithPin=async()=>{
    const c=customers.find(cust=>{const savedPin=localStorage.getItem(`dork_customer_pin_${cust.id}`);return savedPin&&savedPin===pin;});
    if(!c){setPinErr("رمز PIN غير صحيح");setPin("");return;}
    setCustomerSession(c);setView("home");
    localStorage.setItem("dork_biometric_id",String(c.id));
  };

  // مؤقت صلاحية الكود (5 دقائق)
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

  // مؤقت انتظار إعادة الإرسال (دقيقتين)
  useEffect(()=>{
    if(resendTimer<=0)return;
    const interval=setInterval(()=>{
      setResendTimer(prev=>Math.max(prev-1,0));
    },1000);
    return()=>clearInterval(interval);
  },[resendTimer]);

 const sendOtpCode=async()=>{
  if(sending)return;
  if(!email.trim()){setErr("أدخل البريد الإلكتروني");return;}
  const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email.trim())){setErr("بريد إلكتروني غير صحيح");return;}
  if(resendTimer>0){setErr(`⏳ انتظر ${Math.floor(resendTimer/60)}:${String(resendTimer%60).padStart(2,"0")} قبل إعادة المحاولة`);return;}
  try{
    setSending(true);
    setErr("");
    setOtpExpired(false);
    setOtpCode("");
    setOtpTimer(300);
    setResendTimer(120);
    setOtpSent(true);
    setAttempts(0);
    const {data,error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin:""}});
    if(error){
      console.error("OTP Error:",error.message);
      setOtpExpired(false);
      const isRateLimit=error.message.includes("rate")||error.message.includes("too many")||error.message.includes("limit")||error.message.includes("security");
      if(isRateLimit){
        setOtpSent(true);
        setResendTimer(120);
        setErr("❌ يرجى الانتظار دقيقتين قبل المحاولة مجدداً");
      }else{
        setOtpSent(false);
        setOtpTimer(0);
        if(error.message.includes("invalid")||error.message.includes("format")){
          setErr("❌ البريد الإلكتروني غير صحيح");
        }else if(error.message.includes("disabled")||error.message.includes("not enabled")){
          setErr("❌ المصادقة غير مفعّلة - تواصل مع الدعم");
        }else{
          setErr("❌ خطأ: "+error.message.substring(0,40));
        }
      }
      return;
    }
    toast$&&toast$("✅ تم إرسال الكود لبريدك - صلاحية 5 دقائق","success");
  }catch(e){
    console.error("Send OTP Exception:",e.message);
    setOtpSent(false);
    setOtpTimer(0);
    setOtpExpired(false);
    setResendTimer(60);
    setErr("❌ خطأ في الاتصال - تحقق من الإنترنت");
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(user&&user.email===email.trim()){
        await supabase.auth.admin.deleteUser(user.id);
        console.log("Cleanup: Deleted pending user record");
      }
    }catch(cleanupErr){
      console.error("Cleanup failed:",cleanupErr.message);
    }
  }finally{
    setSending(false);
  }
};

  const register=async()=>{
    if(verifying)return;
    if(!name.trim()||!phone.trim()){setErr("أدخل الاسم والجوال");return;}
    if(!email.trim()){setErr("أدخل البريد الإلكتروني");return;}
    if(!otpSent){setErr("⚠️ أرسل الكود أولاً (اضغط زر الإرسال)");return;}
    if(attempts>=5){setErr("❌ تم تجاوز الحد الأقصى للمحاولات - يرجى إعادة الإرسال");return;}
    const otpClean=String(otpCode||"").replace(/\D/g,"").slice(0,6);
    if(otpClean.length<6){setErr("❌ أدخل جميع الأرقام الستة");return;}
    if(otpExpired){setErr("❌ انتهت صلاحية الكود - اضغط على إعادة الإرسال");return;}
    try{
      setVerifying(true);
      const {data,error}=await supabase.auth.verifyOtp({email:email.trim(),token:otpClean,type:"email"});
      if(error){
        console.error("Verify OTP Error:",error.message);
        const msg=error.message.toLowerCase();
        if(msg.includes("invalid")||msg.includes("wrong")||msg.includes("incorrect")||msg.includes("not found")){
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr("❌ الكود غير صحيح - تحقق من الكود المرسل لبريدك");
        }else if((msg.includes("timeout")||msg.includes("expired")||msg.includes("used"))&&otpTimer<=0){
          setOtpExpired(true);
          setOtpTimer(0);
          setErr("❌ انتهت صلاحية الكود - اضغط على إعادة الإرسال");
        }else if(msg.includes("blocked")||msg.includes("denied")){
          setErr("❌ البريد محظور - حاول بريد آخر");
        }else{
          setAttempts(prev=>prev+1);
          setOtpCode("");
          setErr("❌ الكود غير صحيح - حاول مجدداً");
        }
        return;
      }
      const exists=await sb("customers","GET",null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
      if(exists.length){setErr("❌ هذا الرقم مسجل بالفعل");return;}
      const rows=await sb("customers","POST",{name:name.trim(),phone:phone.trim(),email:email.trim(),history:[],favs:[]},"");
      const nc=toAppCustomer(rows[0]);
      setCustomerSession(nc);setView("custDash");
      localStorage.setItem("dork_biometric_id",String(nc.id));
      setOtpSent(false);setOtpCode("");setOtpTimer(0);setOtpExpired(false);
      toast$&&toast$("✅ تم إنشاء الحساب بنجاح!","success");
    }catch(e){setErr("❌ خطأ في العملية - حاول مجدداً: "+e.message.substring(0,50));
    }finally{setVerifying(false);}
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>حساب العميل 👤</h2></div>

      {/* دخول بالبصمة */}
      {localStorage.getItem("dork_biometric_id")&&(
        <button style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--pa25)",background:"var(--pa08)",color:"var(--p)",cursor:"pointer",fontSize:14,fontFamily:"inherit",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={loginWithBiometric}>
          👆 دخول بالبصمة
        </button>
      )}

      <div style={{display:"flex",gap:7,marginBottom:14}}>
        <button style={{...G.toggleBtn,...(tab==="login"?G.toggleOn:{})}} onClick={()=>{setTab("login");setErr("");}}>دخول</button>
        <button style={{...G.toggleBtn,...(tab==="reg"?G.toggleOn:{})}} onClick={()=>{setTab("reg");setErr("");}}>حساب جديد</button>
      </div>
      <div style={G.fc}>
        {tab==="login"?<>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={{...G.tabBtn,flex:1,...(loginMethod==="phone"?G.tabOn:{})}} onClick={()=>{setLoginMethod("phone");setErr("");setPinErr("");}}>📱 رقم الجوال</button>
            <button style={{...G.tabBtn,flex:1,...(loginMethod==="pin"?G.tabOn:{})}} onClick={()=>{setLoginMethod("pin");setErr("");setPinErr("");}}>🔐 دخول سريع</button>
          </div>
          {loginMethod==="phone"?<>
            <SL>تسجيل الدخول</SL>
            <F label="رقم الجوال" error={err}><input style={fi(err)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
            <button style={G.sub} onClick={loginWithPhone}>دخول</button>
          </>:<>
            <SL>أدخل رمز PIN الخاص بك</SL>
            <F label="رمز PIN" error={pinErr}><input style={fi(pinErr)} type="password" inputMode="numeric" placeholder="••••" value={pin} onChange={e=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setPin(val);setPinErr("");}} maxLength={6}/></F>
            <button style={G.sub} onClick={loginWithPin}>دخول</button>
          </>}
          <div style={{textAlign:"center",margin:"12px 0",color:"#555",fontSize:12}}>- أو -</div>
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
              if(!fb.apps.length) fb.initializeApp({apiKey:"AIzaSyBYCJYdJUi_oPfYlOzSukntj4YeLZFiVUY",authDomain:"dork-app.firebaseapp.com",projectId:"dork-app",appId:"1:659823227621:web:befaaa1b5063"});
              const provider=new fb.auth.GoogleAuthProvider();
              provider.setCustomParameters({prompt:"select_account"});
              const result=await fb.auth().signInWithPopup(provider);
              const gUser={name:result.user.displayName||"مستخدم",email:result.user.email||"",googleUid:result.user.uid};
              const rows=await sb("customers","GET",null,`?google_uid=eq.${gUser.googleUid}`);
              if(rows.length){
                const c=toAppCustomer(rows[0]);
                setCustomerSession(c);setView("home");
                localStorage.setItem("dork_biometric_id",String(c.id));
              }else{
                const newRows=await sb("customers","POST",{name:gUser.name,phone:"",email:gUser.email,google_uid:gUser.googleUid,history:[],favs:[]},"");
                const nc=toAppCustomer(newRows[0]);
                setCustomerSession(nc);setView("home");
                localStorage.setItem("dork_biometric_id",String(nc.id));
              }
            }catch(e){setErr(e.message==="تم إغلاق نافذة Google"?"❌ تم إغلاق النافذة":"❌ خطأ: "+e.message);}
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            الدخول عبر Google
          </button>
        </>:<>
          <SL>إنشاء حساب جديد</SL>
          <F label="الاسم"><input style={fi()} placeholder="اسمك الكريم" value={name} onChange={e=>setName(e.target.value)}/></F>
          <F label="رقم الجوال"><input style={fi()} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <F label="البريد الإلكتروني (مطلوب)" error={err}><div style={{display:"flex",gap:8}}>
            <input style={{...fi(err),flex:1,direction:"ltr",textAlign:"left"}} placeholder="example@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} type="email" disabled={otpSent||sending} dir="ltr"/>
            <button style={{...G.sub,flex:0,padding:"12px 16px",fontSize:13,opacity:sending?.6:1,cursor:sending?"not-allowed":"pointer"}} onClick={sendOtpCode} disabled={sending}>
              {sending?"⏳ جاري...":otpSent?"🔄 إعادة":"📧 إرسال"}
            </button>
          </div></F>
          {otpSent&&<>
            <F label="الكود (تحقق من بريدك)">
              <OtpInput value={otpCode} onChange={(val)=>{setOtpCode(val);setErr("");}} error={false} use6Boxes={true} disabled={verifying||attempts>=5}/>
              <div style={{fontSize:11,color:attempts>=5?"#e74c3c":"#888",marginTop:8,direction:"rtl"}}>
                💡 الكود مرسل إلى: <span dir="ltr" style={{display:"inline-block"}}><strong>{email}</strong></span>
                {attempts>0&&attempts<5&&<><br/>⚠️ محاولات متبقية: {5-attempts}</>}
                {attempts>=5&&<><br/>❌ تم تجاوز حد المحاولات - يرجى إعادة الإرسال</>}
              </div>
            </F>
            <button style={{width:"100%",padding:"8px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"transparent",color:"#888",cursor:verifying?"not-allowed":"pointer",fontFamily:"inherit",opacity:verifying?.5:1,marginTop:12,fontSize:12}} disabled={verifying} onClick={()=>{setOtpSent(false);setOtpCode("");setErr("");setOtpExpired(false);setOtpTimer(0);setResendTimer(0);setAttempts(0);}}>
              ✏️ تعديل البريد
            </button>
          </>}
          <button style={{...G.sub,opacity:(verifying||!otpSent)?.6:1,cursor:(verifying||!otpSent)?"not-allowed":"pointer"}} onClick={register} disabled={!otpSent||verifying||otpExpired}>
            {verifying?"⏳ جاري التحقق...":"إنشاء الحساب"}
          </button>
        </>}
      </div>
    </div></div>
  );
}


export { CustomerLogin };

import React, { useState } from "react";
import { G } from "../styles.js";

function OwnerLogin({salons,setOwnerSession,setView,toast$}){
  const[tab,setTab]=useState("phone");
  const[phone,setPhone]=useState(""); const[err,setErr]=useState("");
  const[pin,setPin]=useState(""); const[pinErr,setPinErr]=useState("");
  const loginWithPhone=()=>{
    const s=salons.find(x=>x.ownerPhone===phone.trim()||x.phone===phone.trim());
    if(!s){setErr("لا يوجد صالون بهذا الرقم");return;}
    if(s.banned){setErr("🚫 تم حظر هذا الصالون من قبل الإدارة — تواصل مع الدعم");return;}
    if(s.frozen){setErr("🔒 الصالون مجمّد مؤقتاً — تواصل مع الإدارة");return;}
    setOwnerSession(s.id); setView("ownerDash");
  };
  const loginWithPin=()=>{
    const s=salons.find(s=>{const savedPin=localStorage.getItem(`dork_owner_pin_${s.id}`);return savedPin&&savedPin===pin;});
    if(!s){setPinErr("رمز PIN غير صحيح");setPin("");return;}
    if(s.banned){setPinErr("🚫 تم حظر هذا الصالون");return;}
    if(s.frozen){setPinErr("🔒 الصالون مجمّد مؤقتاً");return;}
    setOwnerSession(s.id); setView("ownerDash");
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>دخول صاحب الصالون</h2></div>
      <div style={{...G.tabRow,marginBottom:16}}>
        <button style={{...G.tabBtn,flex:1,...(tab==="phone"?G.tabOn:{})}} onClick={()=>{setTab("phone");setErr("");setPinErr("");}}>📱 رقم الجوال</button>
        <button style={{...G.tabBtn,flex:1,...(tab==="pin"?G.tabOn:{})}} onClick={()=>{setTab("pin");setErr("");setPinErr("");}}>🔐 الدخول السريع</button>
      </div>
      <div style={G.fc}>
        {tab==="phone"?<>
          <SL>أدخل رقم جوالك المسجّل</SL>
          <F label="رقم الجوال" error={err}><input style={fi(err)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <button style={G.sub} onClick={loginWithPhone}>دخول</button>
        </>:<>
          <SL>أدخل رمز PIN الخاص بك</SL>
          <F label="رمز PIN" error={pinErr}><input style={fi(pinErr)} type="password" inputMode="numeric" placeholder="••••" value={pin} onChange={e=>{const val=e.target.value.replace(/\D/g,"").slice(0,6);setPin(val);setPinErr("");}}/></F>
          <button style={G.sub} onClick={loginWithPin}>دخول</button>
        </>}
      </div>
      <div style={{margin:"0 0 16px",background:"rgba(var(--pr),.06)",border:"1.5px dashed rgba(var(--pr),.4)",borderRadius:13,padding:"18px 16px",textAlign:"center"}}>
        <div style={{fontSize:15,color:"var(--p)",fontWeight:700,marginBottom:6}}>لا تملك صالوناً بعد؟</div>
        <div style={{fontSize:12,color:"#888",marginBottom:14}}>سجّل صالونك الآن وابدأ باستقبال الحجوزات</div>
        <button style={{...G.sub,background:"var(--grad)",color:"#000",fontSize:15,fontWeight:900,letterSpacing:.5}} onClick={()=>setView("register")}>
          ✂ سجّل صالونك الآن
        </button>
      </div>
    </div></div>
  );
}


export { OwnerLogin };

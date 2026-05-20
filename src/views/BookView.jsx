import React, { useState } from "react";
import { G } from "../styles.js";
import { supabase, sb } from "../api/supabase.js";
import { SLOT_MIN, MONTHS_AR, normalizeBgId, makeSlots, getSlotsForSalon, todayStr, openMaps, calcTotal, normPhone } from "../utils/helpers.js";

function BookView({salon,addBooking,onBack,inline,setView,customer,rescheduleId}){
  const[step,setStep]=useState(1);
  const[form,setForm]=useState({
    name: customer?.name||"",
    phone: customer?.phone||"",
    email: customer?.email||"",
    services:[], barberId:"", date:todayStr(), time:"", waitSlot:""
  });
  const[errors,setErrors]=useState({});
  const allSlots=getSlotsForSalon(salon);
  const bc=salon.barbers?.length||1;
  // Hide past slots for today
  const slots=form.date===todayStr()
    ? allSlots.filter(sl=>{
        const[h,m]=sl.split(":").map(Number);
        const now=new Date();
        return h*60+m > now.getHours()*60+now.getMinutes();
      })
    : allSlots;
  const slotUsed=sl=>salon.bookings.filter(b=>b.date===form.date&&b.time===sl&&b.status!=="rejected"&&(!form.barberId||b.barberId===form.barberId)).length;
  const slotFull=sl=>slotUsed(sl)>=(form.barberId?1:bc);
  const total=calcTotal(form.services,salon.prices);
  const barber=salon.barbers?.find(b=>b.id===form.barberId);
  const toggle=s=>setForm(p=>({...p,services:p.services.includes(s)?p.services.filter(x=>x!==s):[...p.services,s]}));
  const v1=()=>{const e={};if(!form.name.trim())e.name="مطلوب";if(!form.phone.trim())e.phone="مطلوب";if(!form.services.length)e.services="اختر خدمة";if(salon.barbers?.length&&!form.barberId)e.barberId="اختر الحلاق";setErrors(e);return!Object.keys(e).length;};
  const v2=()=>{const e={};if(!form.date)e.date="مطلوب";if(!form.time&&!form.waitSlot)e.time="اختر وقتاً أو ينتظر في قائمة الانتظار";setErrors(e);return!Object.keys(e).length;};
  const inner=(
    <>
      {!inline&&<div style={G.salonBadge}><span style={{fontSize:20,color:"var(--p)"}}>✂</span><div style={{flex:1}}><div style={{fontWeight:700,color:"#fff"}}>{salon.name}</div><div style={{fontSize:11,color:"#888"}}>{salon.gov||salon.region}</div></div><button style={G.mapsBtn} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg></button></div>}
      <div style={G.steps}>{["بياناتك","الموعد","تأكيد"].map((l,i)=><div key={i} style={{...G.si,...(step>=i+1?{opacity:1}:{})}}><div style={G.sd}>{i+1}</div><span style={{fontSize:10,color:"var(--p)"}}>{l}</span></div>)}</div>
      {step===1&&<div style={G.fc}>
        <F label="اسمك الكريم" error={errors.name}><input style={fi(errors.name)} placeholder="الاسم الكامل" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label="رقم الجوال" error={errors.phone}><input style={fi(errors.phone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
        <F label="الخدمات" error={errors.services}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{salon.services.map(s=><div key={s} style={{...G.chip,...(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggle(s)}>{s}{salon.prices?.[s]?` (${salon.prices[s]}ر)`:""}</div>)}</div></F>
        {form.services.length>0&&<div style={G.totalBox}>الإجمالي: <strong style={{color:"var(--p)"}}>{total} ريال</strong></div>}
        {salon.barbers?.length>0&&<F label="اختر الحلاق" error={errors.barberId}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {salon.barbers.map(b=>{
              const active=form.barberId===b.id;
              // تحقق من وقت الدوام
              const now=new Date();
              const currentMins=now.getHours()*60+now.getMinutes();
              const [sh,sm]=(b.shiftStart||"00:00").split(":").map(Number);
              const [eh,em]=(b.shiftEnd||"23:59").split(":").map(Number);
              const inShift=currentMins>=sh*60+sm&&currentMins<=eh*60+em;
              return(
                <div key={b.id}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"8px 10px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":inShift?"#2a2a3a":"#1a1a1a"}`,background:active?"var(--pa12)":inShift?"#1a1a2e":"#0d0d0d",cursor:inShift?"pointer":"not-allowed",opacity:inShift?1:.5,minWidth:60}}
                  onClick={()=>inShift&&setForm(p=>({...p,barberId:b.id,time:""}))}>
                  {b.photo
                    ?<img src={b.photo} alt={b.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${active?"var(--p)":"#2a2a3a"}`}}/>
                    :<div style={{width:36,height:36,borderRadius:"50%",background:"#1a1a2e",border:`2px solid ${active?"var(--p)":"#2a2a3a"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💈</div>
                  }
                  <span style={{fontSize:11,color:active?"var(--p)":"#aaa",fontWeight:active?700:400,textAlign:"center"}}>{b.name}</span>
                  <span style={{fontSize:9,color:inShift?"#27ae60":"#e74c3c"}}>{inShift?"متاح":"غير متاح"}</span>
                </div>
              );
            })}
          </div>
        </F>}
        <button style={G.sub} onClick={()=>{if(v1())setStep(2);}}>التالي &gt;</button>
      </div>}
      {step===2&&<div style={G.fc}>
        <F label="التاريخ" error={errors.date}>
          <input type="date" style={fi(errors.date)} value={form.date} min={todayStr()}
            onChange={e=>{
              const d=new Date(e.target.value);
              const dayOfWeek=d.getDay();
              if(salon.closedDays?.includes(dayOfWeek)){
                const DAYS=["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
                alert(`⚠ الصالون مغلق يوم ${DAYS[dayOfWeek]}`);
                return;
              }
              setForm(p=>({...p,date:e.target.value,time:""}));
            }}/>
          {salon.closedDays?.length>0&&(
            <div style={{fontSize:10,color:"#888",marginTop:3}}>
              🚫 مغلق أيام: {["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].filter((_,i)=>salon.closedDays.includes(i)).join(" - ")}
            </div>
          )}
        </F>
        {salon.shiftEnabled&&<div style={{fontSize:11,color:"var(--p)",background:"var(--pa07)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>⏰ {salon.shift1Start}-{salon.shift1End} | {salon.shift2Start}-{salon.shift2End}</div>}
        <div style={{fontSize:12,color:"#aaa",marginBottom:7}}>اختر الوقت{form.barberId?` - ${barber?.name||""}`:""}</div>
        {errors.time&&<div style={G.err}>{errors.time}</div>}
        <div style={G.timeGrid}>{slots.map(sl=>{const used=slotUsed(sl);const full=slotFull(sl);const sel=form.time===sl;const waiting=form.waitSlot===sl;return(<div key={sl} style={{display:"flex",flexDirection:"column",gap:2}}><button disabled={full&&!waiting} onClick={()=>!full&&setForm(p=>({...p,time:sl,waitSlot:""}))} style={{...G.ts,...(full?G.tsF:{}),...(sel?G.tsS:{})}}><div>{sl}</div><div style={{fontSize:9,marginTop:1,color:full?"#555":sel?"var(--p)":"#666"}}>{full?"محجوز":`${bc-used} متاح`}</div></button>{full&&<button onClick={()=>setForm(p=>({...p,waitSlot:p.waitSlot===sl?"":sl,time:""}))} style={{fontSize:9,padding:"3px 4px",borderRadius:6,border:`1.5px solid ${waiting?"var(--p)":"#f39c1266"}`,background:waiting?"var(--pa12)":"rgba(243,156,18,.06)",color:waiting?"var(--p)":"#f39c12",cursor:"pointer",fontFamily:"inherit",fontWeight:waiting?700:400}}>⏳{waiting?" ✓":""}</button>}</div>);})}</div>
        {form.waitSlot&&<div style={{background:"rgba(243,156,18,.08)",border:"1px solid #f39c1244",borderRadius:8,padding:"8px 12px",marginBottom:4,fontSize:11,color:"#f39c12",textAlign:"center"}}>⏳ ستنضم لقائمة الانتظار للساعة <strong>{form.waitSlot}</strong> — سيصلك إشعار عند تحرر الوقت</div>}
        <button style={G.sub} onClick={()=>{if(v2())setStep(3);}}>{form.waitSlot?"التالي (انتظار) >":"التالي >"}</button>
      </div>}
      {step===3&&<div style={G.fc}>
        <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:36}}>{form.waitSlot?"⏳":"✅"}</div><h3 style={{color:"#fff",marginTop:4,fontSize:16}}>{form.waitSlot?"تأكيد الانضمام للانتظار":"تأكيد الحجز"}</h3></div>
        {[["الاسم",form.name],["الجوال",form.phone],["البريد",form.email||"-"],["الخدمات",form.services.join(" + ")],["الحلاق",barber?.name||"أي حلاق"],["التاريخ",form.date],["الوقت",form.waitSlot?`⏳ انتظار ${form.waitSlot}`:form.time],["الإجمالي",`${total} ريال`]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #2a2a3a"}}><span style={{color:"#888",fontSize:12}}>{l}</span><span style={{color:"#f0f0f0",fontWeight:600,fontSize:12}}>{v}</span></div>)}
        <button style={{...G.mapsBtn,width:"100%",marginTop:10,justifyContent:"center",display:"flex",padding:10}} onClick={()=>openMaps(salon.locationUrl,salon.name,salon.address)}>📍 افتح على الخريطة</button>
        {form.waitSlot&&<div style={{background:"rgba(243,156,18,.1)",border:"1px solid #f39c1255",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#f39c12"}}>⏳ ستنضم لقائمة الانتظار للساعة {form.waitSlot} — ستُبلَّغ عند تحرر الوقت</div>}
        <button style={{...G.sub,marginTop:8,background:form.waitSlot?"linear-gradient(135deg,#f39c12,#e67e22)":rescheduleId?"linear-gradient(135deg,#8e44ad,#9b59b6)":"linear-gradient(135deg,#27ae60,#2ecc71)",color:"#fff"}} onClick={async()=>{
          if(form.waitSlot){
            if(!form.name||!form.phone){alert("أدخل الاسم والجوال أولاً");return;}
            try{
              await sb("waiting_list","POST",{salon_id:salon.id,name:form.name,phone:form.phone,slot_date:form.date,slot_time:form.waitSlot,customer_id:null,status:"waiting"});
              alert("✅ تم انضمامك لقائمة الانتظار! سيصلك إشعار عند تحرر الوقت.");
              if(setView)setView("home");
            }catch(e){alert("❌ حدث خطأ، حاول مرة أخرى");}
          }else{
            addBooking(salon.id,{...form,barberId:form.barberId||"any",barberName:barber?.name||"",total},rescheduleId||null);
          }
        }}>{form.waitSlot?"⏳ انضم لقائمة الانتظار":rescheduleId?"✅ تأكيد التعديل":"إرسال طلب الحجز 🎉"}</button>
      </div>}
    </>
  );
  if(inline)return <div>{inner}</div>;
  return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>onBack?onBack():setView("home")}>{">"}</button><h2 style={G.ft}>حجز موعد</h2></div>{inner}</div></div>;
}


export { BookView };

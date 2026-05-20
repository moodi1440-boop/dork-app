import React, { useState } from "react";
import { G } from "../styles.js";
import { supabase, sb } from "../api/supabase.js";
import { playTone } from "../utils/audio.js";
import { TONES, THEMES, BACKGROUNDS, DEFAULT_SERVICES, DEFAULT_SOCIAL_LINKS } from "../constants.js";

function RegisterView({allLoc,addSalon,setView,addExtraLoc}){
  const[form,setForm]=useState({name:"",owner:"",ownerPhone:"",region:"",gov:"",center:"",village:"",phone:"",address:"",locationUrl:"",services:[],prices:{},shiftEnabled:false,shift1Start:"08:00",shift1End:"13:00",shift2Start:"16:00",shift2End:"23:00",workStart:"09:00",workEnd:"22:00",barbers:[{id:"b"+Date.now(),name:""}],tone:"bell"});
  const[errors,setErrors]=useState({});
  const[locMethod,setLocMethod]=useState("link");
  const[detecting,setDetecting]=useState(false);
  const[newSvc,setNewSvc]=useState("");
  // extra-loc add state
  const[newR,setNewR]=useState(""); const[newG,setNewG]=useState(""); const[newC,setNewC]=useState(""); const[newV,setNewV]=useState("");
  const[showAddLoc,setShowAddLoc]=useState(false);

  const govList=form.region?(allLoc.find(r=>r.region===form.region)?.govs||[]):[];
  const centerList=form.gov?(govList.find?.(g=>(g.name||g)===form.gov)?.centers||[]):[];

  const applyNewLoc=()=>{
    const r=newR.trim()||form.region; const g=newG.trim()||form.gov; const v=newV.trim();
    if(!r||!g){alert("أدخل المنطقة والمحافظة على الأقل");return;}
    addExtraLoc(r,g,"",v);
    setForm(p=>({...p,region:r,gov:g,village:v||p.village}));
    setNewR("");setNewG("");setNewC("");setNewV("");setShowAddLoc(false);
  };

  const detect=async()=>{
    if(!navigator.geolocation){
      alert("⚠ المتصفح لا يدعم تحديد الموقع\nاستخدم \"رابط الخريطة\" بدلاً من ذلك");
      return;
    }
    setDetecting(true);
    // Check permission state first
    try {
      if(navigator.permissions){
        const perm=await navigator.permissions.query({name:"geolocation"});
        if(perm.state==="denied"){
          alert("🚫 إذن الموقع مرفوض\n\nلتفعيله:\n- اضغط على رمز القفل/الموقع بجوار الرابط\n- اختر \"السماح\" للموقع\n- أعد المحاولة\n\nأو استخدم \"رابط الخريطة\" يدوياً");
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
      reader.onload=ev=>upBarberPhoto(id,ev.target.result);
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const validate=()=>{
    const e={};
    if(!form.name.trim())e.name="مطلوب"; if(!form.owner.trim())e.owner="مطلوب";
    if(!form.ownerPhone.trim())e.ownerPhone="مطلوب";
    if(!form.region)e.region="مطلوب"; if(!form.gov)e.gov="مطلوب";
    if(!form.phone.trim())e.phone="مطلوب"; if(!form.address.trim())e.address="مطلوب";
    if(!form.locationUrl.trim())e.locationUrl="الموقع مطلوب";
    if(!form.services.length)e.services="اختر خدمة";
    if(form.barbers.some(b=>!b.name.trim()))e.barbers="أدخل أسماء الحلاقين";
    setErrors(e); return!Object.keys(e).length;
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>تسجيل صالون جديد</h2></div>

      {/* pending notice */}
      <div style={{background:"var(--pa08)",border:"1px solid var(--pa3)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--p)"}}>
        ⚠ سيتم مراجعة طلبك من الإدارة قبل النشر
      </div>

      <div style={G.fc}>
        <SL>معلومات الصالون</SL>
        <F label="اسم الصالون" error={errors.name}><input style={fi(errors.name)} placeholder="صالون النخبة" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></F>
        <F label="اسم المالك" error={errors.owner}><input style={fi(errors.owner)} placeholder="الاسم الكامل" value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))}/></F>
        <F label="جوال المالك (للدخول لاحقاً)" error={errors.ownerPhone}><input style={fi(errors.ownerPhone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.ownerPhone} onChange={e=>setForm(p=>({...p,ownerPhone:e.target.value}))}/></F>
        <F label="جوال الصالون" error={errors.phone}><input style={fi(errors.phone)} type="tel" inputMode="numeric" placeholder="05XXXXXXXX" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></F>
        <F label="العنوان" error={errors.address}><input style={fi(errors.address)} placeholder="الشارع والحي" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/></F>
      </div>

      <div style={G.fc}>
        <SL>التسلسل الإداري</SL>
        <F label="المنطقة" error={errors.region}>
          <select style={fi(errors.region)} value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value,gov:"",center:"",village:""}))}>
            <option value="">اختر المنطقة</option>{allLoc.map(r=><option key={r.region} value={r.region}>{r.region}</option>)}
          </select>
        </F>
        {form.region&&<F label="المحافظة / المدينة" error={errors.gov}>
          <select style={fi(errors.gov)} value={form.gov} onChange={e=>setForm(p=>({...p,gov:e.target.value,center:"",village:""}))}>
            <option value="">اختر المحافظة</option>{govList.map(g=><option key={g.name||g} value={g.name||g}>{g.name||g}</option>)}
          </select>
        </F>}
        {form.gov&&<F label="المركز الإداري">
          <select style={fi()} value={form.center} onChange={e=>setForm(p=>({...p,center:e.target.value,village:""}))}>
            <option value="">اختر المركز (اختياري)</option>
            {centerList.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </F>}
        {form.center&&<F label="الحي / القرية">
          <input style={fi()} placeholder="مثال: حي النزهة، قرية الرشيدية..." value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
        </F>}
        {form.center&&<button style={G.otherBtn} onClick={()=>setShowAddLoc(s=>!s)}>
          {showAddLoc?"✕ إغلاق":"+ حيك / قريتك مو موجودة؟ أضفها هنا"}
        </button>}
        {showAddLoc&&form.center&&<div style={{background:"rgba(42,109,217,.06)",border:"1px solid #2a6dd9",borderRadius:10,padding:12,marginTop:4}}>
          <div style={{fontSize:12,color:"#6aadff",marginBottom:8,fontWeight:700}}>➕ إضافة حي / قرية جديدة</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:6}}>
            ستُضاف تحت <b style={{color:"var(--p)"}}>{form.center}</b> وتظهر للجميع
          </div>
          <div style={{display:"flex",gap:7}}>
            <input style={{...fi(),flex:1}} placeholder="مثال: حي النزهة، الروضة، العزيزية..." value={newC} onChange={e=>setNewC(e.target.value)}/>
            <button style={{background:"var(--grad)",color:"#000",border:"none",borderRadius:9,padding:"0 14px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",flexShrink:0}} onClick={async()=>{
              const val=newC.trim();
              if(!val){alert("أدخل اسم الحي أو القرية");return;}
              // منع إضافة اسم منطقة أو محافظة أو مركز موجود
              const allRegions=allLoc.map(r=>r.region);
              const allGovs=allLoc.flatMap(r=>r.govs.map(g=>g.name||g));
              const allCenters=allLoc.flatMap(r=>r.govs.flatMap(g=>g.centers||[]));
              if(allRegions.includes(val)||allGovs.includes(val)||allCenters.includes(val)){
                alert("⚠ هذا الاسم موجود بالفعل كمنطقة أو محافظة أو مركز!\nأدخل اسم الحي أو القرية فقط.");
                return;
              }
              try{
                await sb("centers","POST",{name:val,governorate_id:null},"");
              }catch(e){}
              addExtraLoc(form.region,form.gov,form.center,val);
              setForm(p=>({...p,village:val}));
              setNewC("");setShowAddLoc(false);
              alert("✅ تم إضافة الحي/القرية بنجاح!");
            }}>✓ إضافة</button>
          </div>
        </div>}
        {!form.center&&form.gov&&<F label="الحي / القرية / التفصيل">
          <input style={fi()} placeholder="مثال: حي النزهة، قرية الرشيدية..." value={form.village} onChange={e=>setForm(p=>({...p,village:e.target.value}))}/>
        </F>}
      </div>

      <div style={G.fc}>
        <SL>موقع الخريطة <span style={{color:"#e74c3c"}}>*</span></SL>
        <div style={{display:"flex",gap:7,marginBottom:9}}>
          <button style={{...G.locTab,...(locMethod==="link"?G.locTabOn:{})}} onClick={()=>setLocMethod("link")}>🔗 رابط</button>
          <button style={{...G.locTab,...(locMethod==="detect"?G.locTabOn:{})}} onClick={()=>setLocMethod("detect")}>📡 تلقائي</button>
        </div>
        {locMethod==="link"
          ?<F error={errors.locationUrl}><input style={fi(errors.locationUrl)} placeholder="https://maps.google.com/..." value={form.locationUrl} onChange={e=>setForm(p=>({...p,locationUrl:e.target.value}))}/><div style={{fontSize:10,color:"#555",marginTop:3}}>افتح Google Maps &gt; الموقع &gt; شارك &gt; انسخ</div></F>
          :<div style={{marginBottom:11}}><button style={{...G.detectBtn,opacity:detecting?0.6:1}} disabled={detecting} onClick={detect}>{detecting?"⏳ جاري...":"📡 تحديد موقعي"}</button>{form.locationUrl&&locMethod==="detect"&&<div style={{color:"#4caf50",fontSize:11,marginTop:4,textAlign:"center"}}>✅ تم</div>}{errors.locationUrl&&<div style={G.err}>{errors.locationUrl}</div>}</div>
        }
      </div>

      <div style={G.fc}>
        <SL>ساعات العمل</SL>
        <div style={{display:"flex",gap:7,marginBottom:10}}>
          <button style={{...G.locTab,...(!form.shiftEnabled?G.locTabOn:{})}} onClick={()=>setForm(p=>({...p,shiftEnabled:false}))}>فترة واحدة</button>
          <button style={{...G.locTab,...(form.shiftEnabled?G.locTabOn:{})}}  onClick={()=>setForm(p=>({...p,shiftEnabled:true}))}>فترتان</button>
        </div>
        {!form.shiftEnabled
          ?<div style={{display:"flex",gap:10}}><F label="من" style={{flex:1}}><input type="time" style={fi()} value={form.workStart} onChange={e=>setForm(p=>({...p,workStart:e.target.value}))}/></F><F label="إلى" style={{flex:1}}><input type="time" style={fi()} value={form.workEnd} onChange={e=>setForm(p=>({...p,workEnd:e.target.value}))}/></F></div>
          :<>
            <div style={{fontSize:11,color:"var(--p)",marginBottom:6}}>🌅 الفترة الصباحية</div>
            <div style={{display:"flex",gap:10,marginBottom:10}}><F label="من" style={{flex:1}}><input type="time" style={fi()} value={form.shift1Start} onChange={e=>setForm(p=>({...p,shift1Start:e.target.value}))}/></F><F label="إلى" style={{flex:1}}><input type="time" style={fi()} value={form.shift1End} onChange={e=>setForm(p=>({...p,shift1End:e.target.value}))}/></F></div>
            <div style={{fontSize:11,color:"var(--p)",marginBottom:6}}>🌆 الفترة المسائية</div>
            <div style={{display:"flex",gap:10}}><F label="من" style={{flex:1}}><input type="time" style={fi()} value={form.shift2Start} onChange={e=>setForm(p=>({...p,shift2Start:e.target.value}))}/></F><F label="إلى" style={{flex:1}}><input type="time" style={fi()} value={form.shift2End} onChange={e=>setForm(p=>({...p,shift2End:e.target.value}))}/></F></div>
          </>
        }
      </div>

      <div style={G.fc}>
        <SL>الحلاقون {errors.barbers&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>- {errors.barbers}</span>}</SL>
        <div style={{fontSize:11,color:"#666",marginBottom:8}}>عدد الحلاقين = حجوزات متزامنة في نفس الوقت</div>
        {form.barbers.map((b,i)=>(
          <div key={b.id} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <div style={{position:"relative",flexShrink:0}} onClick={()=>pickPhoto(b.id)}>
              <div style={{width:44,height:44,borderRadius:"50%",background:b.photo?"transparent":"#1a1a2e",border:`2px dashed var(--p)`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                {b.photo?<img src={b.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<span style={{fontSize:18,color:"var(--p)"}}>📷</span>}
              </div>
              <div style={{position:"absolute",bottom:-2,right:-2,background:"var(--p)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",cursor:"pointer"}}>+</div>
            </div>
            <input style={{...fi(),...{flex:1}}} placeholder={`اسم الحلاق ${i+1}`} value={b.name} onChange={e=>upBarber(b.id,e.target.value)}/>
            {form.barbers.length>1&&<button style={G.xBtn} onClick={()=>rmBarber(b.id)}>✕</button>}
          </div>
        ))}
        <button style={G.addBarberBtn} onClick={addBarber}>+ إضافة حلاق</button>
      </div>

      <div style={G.fc}>
        <SL>الخدمات والأسعار {errors.services&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>- {errors.services}</span>}</SL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          {DEFAULT_SERVICES.map(s=><div key={s} style={{...G.chip,...(form.services.includes(s)?G.chipOn:{})}} onClick={()=>toggleSvc(s)}>{s}</div>)}
        </div>
        {/* add custom service */}
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <input style={{...fi(),...{flex:1}}} placeholder="خدمة جديدة..." value={newSvc} onChange={e=>setNewSvc(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCustomSvc()}/>
          <button style={{...G.sub,...{width:60,padding:0,fontSize:13}}} onClick={addCustomSvc}>+ أضف</button>
        </div>
        {form.services.map(s=>(
          <div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,background:"#1a1a2e",padding:"8px 11px",borderRadius:9}}>
            <span style={{fontSize:12,color:"#f0f0f0"}}>{s}</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button style={G.pmBtn} onClick={()=>adjustPrice(s,-5)}>-</button>
              <input type="number" style={{width:52,background:"#0d0d1a",border:"1px solid #2a2a3a",borderRadius:6,color:"#fff",textAlign:"center",fontSize:13,padding:"3px 0",fontFamily:"inherit",outline:"none"}} value={form.prices[s]||0} onChange={e=>setPrice(s,e.target.value)}/>
              <button style={G.pmBtn} onClick={()=>adjustPrice(s,5)}>+</button>
              <span style={{color:"var(--p)",fontSize:11}}>ر</span>
            </div>
          </div>
        ))}
      </div>

      <div style={G.fc}>
        <SL>نغمة التنبيه 🔔</SL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:5}}>
          {TONES.map(t=><div key={t.id} style={{...G.chip,...(form.tone===t.id?G.chipOn:{})}} onClick={()=>{setForm(p=>({...p,tone:t.id}));playTone(t.id,0.8);}}>{t.label}</div>)}
        </div>
        <div style={{fontSize:11,color:"#555"}}>اضغط للمعاينة بصوت عالٍ</div>
      </div>

      <button style={{...G.sub,marginBottom:30}} onClick={()=>{if(validate())addSalon(form);}}>إرسال طلب التسجيل ✂</button>
    </div></div>
  );
}


export { RegisterView };

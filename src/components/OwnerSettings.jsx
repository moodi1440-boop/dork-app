import React, { useState } from "react";
import { G } from "../styles";
import { supabase, sb } from "../../core/supabase";
import { playTone } from "../../utils/audioUtils";

const TONES = [
  {id:"scissors",label:"✂ مقص"},
  {id:"bell",label:"🔔 جرس الباب"},
  {id:"welcome",label:"🎉 أهلاً وسهلاً"},
  {id:"notification",label:"🔔 إشعار"},
  {id:"click",label:"👆 نقرة"},
  {id:"success",label:"✅ نجاح"},
  {id:"error",label:"❌ خطأ"},
];

const THEMES = [
  {id:"gold",label:"ذهبي",color:"#d4a017"},
  {id:"silver",label:"فضي",color:"#c0c0c0"},
  {id:"copper",label:"نحاسي",color:"#b87333"},
];

const BACKGROUNDS = [
  {id:"none",label:"بدون خلفية"},
  {id:"gold",label:"ذهبي متدرج"},
  {id:"silver",label:"فضي متدرج"},
  {id:"gradient1",label:"بنفسجي"},
  {id:"gradient2",label:"زهري"},
];

const DEFAULT_SERVICES = [];
const DEFAULT_SOCIAL_LINKS = {};


function OwnerSettings({salon,setSalons,toast$}){
  const[saving,setSaving]=useState(false);
  const[sec,setSec]=useState("info");
  const[f,setF]=useState({
    name:salon.name||"",
    phone:salon.phone||"",
    address:salon.address||"",
    locationUrl:salon.locationUrl||"",
    shiftEnabled:salon.shiftEnabled||false,
    shift1Start:salon.shift1Start||"08:00",
    shift1End:salon.shift1End||"13:00",
    shift2Start:salon.shift2Start||"16:00",
    shift2End:salon.shift2End||"23:00",
    workStart:salon.workStart||"09:00",
    workEnd:salon.workEnd||"22:00",
    services:[...(salon.services||[])],
    prices:{...(salon.prices||{})},
    barbers:JSON.parse(JSON.stringify(salon.barbers||[])),
    tone:salon.tone||"bell",
  });
  const[newSvc,setNewSvc]=useState("");
  const[newBarber,setNewBarber]=useState("");
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));

  const save=async()=>{
    setSaving(true);
    try{
      const patch={
        name:f.name,phone:f.phone,address:f.address,location_url:f.locationUrl,
        shift_enabled:f.shiftEnabled,
        shift1_start:f.shift1Start,shift1_end:f.shift1End,
        shift2_start:f.shift2Start,shift2_end:f.shift2End,
        work_start:f.workStart,work_end:f.workEnd,
        services:f.services,prices:f.prices,
        barbers:f.barbers,tone:f.tone,
      };
      await sb("salons","PATCH",patch,`?id=eq.${salon.id}`);
      setSalons(p=>p.map(s=>s.id===salon.id?{...s,name:f.name,phone:f.phone,address:f.address,locationUrl:f.locationUrl,shiftEnabled:f.shiftEnabled,shift1Start:f.shift1Start,shift1End:f.shift1End,shift2Start:f.shift2Start,shift2End:f.shift2End,workStart:f.workStart,workEnd:f.workEnd,services:f.services,prices:f.prices,barbers:f.barbers,tone:f.tone}:s));
      toast$&&toast$("✅ تم حفظ التعديلات");
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
    setSaving(false);
  };

  const inp={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};
  const lbl={display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600};
  const box={background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10};
  const hdr={fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"};

  return(
    <div>
      <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
        {[{id:"info",icon:"📋",label:"المعلومات"},{id:"hours",icon:"🕐",label:"الأوقات"},{id:"services",icon:"✂",label:"الخدمات"},{id:"barbers",icon:"💈",label:"الحلاقون"},{id:"tone",icon:"🔔",label:"النغمة"},{id:"pin",icon:"🔐",label:"PIN"}].map(s=>(
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{flexShrink:0,padding:"6px 10px",borderRadius:9,border:`1.5px solid ${sec===s.id?"var(--p)":"#2a2a3a"}`,background:sec===s.id?"var(--pa12)":"#1a1a2e",color:sec===s.id?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:sec===s.id?700:400,display:"flex",alignItems:"center",gap:4}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {sec==="info"&&<div style={box}>
        <div style={hdr}>📋 المعلومات الأساسية</div>
        {[{l:"اسم الصالون",k:"name"},{l:"رقم الجوال",k:"phone"},{l:"العنوان",k:"address"},{l:"رابط الخريطة",k:"locationUrl"}].map(({l,k})=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={lbl}>{l}</label>
            <input style={inp} value={f[k]} onChange={e=>upd(k,e.target.value)}/>
          </div>
        ))}
      </div>}

      {sec==="hours"&&<div style={box}>
        <div style={hdr}>🕐 أوقات العمل</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${!f.shiftEnabled?"var(--p)":"#2a2a3a"}`,background:!f.shiftEnabled?"var(--pa12)":"#1a1a2e",color:!f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",false)}>وردية واحدة</button>
          <button style={{flex:1,padding:"9px 0",borderRadius:9,border:`1.5px solid ${f.shiftEnabled?"var(--p)":"#2a2a3a"}`,background:f.shiftEnabled?"var(--pa12)":"#1a1a2e",color:f.shiftEnabled?"var(--p)":"#888",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}} onClick={()=>upd("shiftEnabled",true)}>صباحية + مسائية</button>
        </div>
        {!f.shiftEnabled
          ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={lbl}>من</label><input type="time" style={inp} value={f.workStart} onChange={e=>upd("workStart",e.target.value)}/></div>
            <div><label style={lbl}>إلى</label><input type="time" style={inp} value={f.workEnd} onChange={e=>upd("workEnd",e.target.value)}/></div>
          </div>
          :<>
            <div style={{fontSize:11,color:"#888",marginBottom:6}}>⛅ الصباحية</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={lbl}>من</label><input type="time" style={inp} value={f.shift1Start} onChange={e=>upd("shift1Start",e.target.value)}/></div>
              <div><label style={lbl}>إلى</label><input type="time" style={inp} value={f.shift1End} onChange={e=>upd("shift1End",e.target.value)}/></div>
            </div>
            <div style={{fontSize:11,color:"#888",marginBottom:6}}>🌙 المسائية</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={lbl}>من</label><input type="time" style={inp} value={f.shift2Start} onChange={e=>upd("shift2Start",e.target.value)}/></div>
              <div><label style={lbl}>إلى</label><input type="time" style={inp} value={f.shift2End} onChange={e=>upd("shift2End",e.target.value)}/></div>
            </div>
          </>
        }
      </div>}

      {sec==="services"&&<div style={box}>
        <div style={hdr}>✂ الخدمات والأسعار</div>
        {f.services.map(svc=>(
          <div key={svc} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:"#0d0d1a",borderRadius:9,padding:"8px 10px",border:"1px solid #2a2a3a"}}>
            <span style={{flex:1,fontSize:13,color:"#f0f0f0"}}>{svc}</span>
            <input type="number" min="0" style={{width:75,padding:"6px 8px",borderRadius:7,border:"1.5px solid #2a2a3a",background:"#13131f",color:"var(--p)",fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
              value={f.prices[svc]||0} onChange={e=>setF(p=>({...p,prices:{...p.prices,[svc]:+e.target.value}}))}/>
            <span style={{fontSize:11,color:"#888",flexShrink:0}}>ريال</span>
            <button style={G.xBtn} onClick={()=>setF(p=>{const sv=p.services.filter(s=>s!==svc);const pr={...p.prices};delete pr[svc];return{...p,services:sv,prices:pr};})}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:10}}>
          <input style={{...inp,flex:1}} placeholder="اسم خدمة جديدة" value={newSvc} onChange={e=>setNewSvc(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newSvc.trim()&&!f.services.includes(newSvc.trim())){setF(p=>({...p,services:[...p.services,newSvc.trim()],prices:{...p.prices,[newSvc.trim()]:0}}));setNewSvc("");}}}>+ إضافة</button>
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,color:"#666",marginBottom:6}}>خدمات جاهزة:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {DEFAULT_SERVICES.filter(d=>!f.services.includes(d)).map(d=>(
              <button key={d} style={{...G.chip,fontSize:11}} onClick={()=>setF(p=>({...p,services:[...p.services,d],prices:{...p.prices,[d]:0}}))}>+ {d}</button>
            ))}
          </div>
        </div>
      </div>}

      {sec==="barbers"&&<div style={box}>
        <div style={hdr}>💈 الحلاقون</div>
        {f.barbers.length===0&&<div style={G.empty}>لا يوجد حلاقون</div>}
        {f.barbers.map((b,i)=>(
          <div key={b.id} style={{marginBottom:10,background:"#0d0d1a",borderRadius:10,padding:"10px 12px",border:"1px solid #2a2a3a"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              {/* صورة الحلاق */}
              <div style={{position:"relative",flexShrink:0}}>
                {b.photo
                  ?<img src={b.photo} alt={b.name} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--p)"}}/>
                  :<div style={{width:44,height:44,borderRadius:"50%",background:"#1a1a2e",border:"2px dashed #2a2a3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💈</div>
                }
                <label style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--p)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10}}>
                  📷
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    const reader=new FileReader();
                    reader.onload=ev=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,photo:ev.target.result}:x)}));
                    reader.readAsDataURL(file);
                  }}/>
                </label>
              </div>
              <input style={{...inp,flex:1,padding:"6px 10px"}} placeholder="اسم الحلاق" value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
              <button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}>✕</button>
            </div>
            {/* وقت الدوام */}
            <div style={{fontSize:11,color:"#888",marginBottom:6}}>🕐 وقت الدوام</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
              <div>
                <label style={{display:"block",fontSize:10,color:"#666",marginBottom:3}}>من</label>
                <input type="time" style={{...inp,fontSize:12}} value={b.shiftStart||"09:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftStart:e.target.value}:x)}))}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:10,color:"#666",marginBottom:3}}>إلى</label>
                <input type="time" style={{...inp,fontSize:12}} value={b.shiftEnd||"22:00"} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,shiftEnd:e.target.value}:x)}))}/>
              </div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder="اسم الحلاق الجديد" value={newBarber} onChange={e=>setNewBarber(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00"}]}));setNewBarber("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim(),shiftStart:"09:00",shiftEnd:"22:00"}]}));setNewBarber("");}}}>+ إضافة</button>
        </div>
      </div>}

      {sec==="tone"&&<div style={box}>
        <div style={hdr}>🔔 نغمة التنبيه</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(t=>{
            const active=f.tone===t.id;
            return(
              <button key={t.id} onClick={()=>{upd("tone",t.id);playTone(t.id,0.8);}}
                style={{padding:"11px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:active?700:400,textAlign:"center"}}>
                {t.label} {active&&"✓"}
              </button>
            );
          })}
        </div>
        <div style={{fontSize:11,color:"#555",marginTop:8}}>اضغط للمعاينة</div>
      </div>}

      {sec==="pin"&&<div style={box}>
        <div style={hdr}>🔐 الدخول السريع (PIN)</div>
        <div style={{fontSize:13,color:"#aaa",marginBottom:14,lineHeight:1.6}}>تغيير رمز PIN سيؤثر على جميع طرق الدخول السريع</div>
        <button onClick={()=>setF(p=>({...p,_editPinStep:"select",_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--p)",background:"rgba(212,160,23,.1)",color:"var(--p)",fontSize:13,fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
          ✏️ تغيير رمز PIN
        </button>
        {f._editPinStep&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"#13131f",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
              {f._editPinStep==="select"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>🔐 تغيير رمز PIN</div>
                <div style={{fontSize:12,color:"#888",textAlign:"center",marginBottom:20}}>اختر عدد الأرقام</div>
                <div style={{display:"flex",gap:12,marginBottom:16}}>
                  <button onClick={()=>setF(p=>({...p,_editPinLength:4,_editPinStep:"enter"}))} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:f._editPinLength===4?"rgba(212,160,23,.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    4 أرقام
                  </button>
                  <button onClick={()=>setF(p=>({...p,_editPinLength:6,_editPinStep:"enter"}))} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:f._editPinLength===6?"rgba(212,160,23,.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    6 أرقام
                  </button>
                </div>
              </>:f._editPinStep==="enter"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>أدخل PIN الجديد ({f._editPinLength} أرقام)</div>
                <input type="password" maxLength={f._editPinLength} value={f._editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,f._editPinLength);setF(p=>({...p,_editTempPin:val}));if(val.length===f._editPinLength)setTimeout(()=>setF(p=>({...p,_editPinStep:"confirm"})),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"#0d0d1a",color:"#f0f0f0",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editTempPin.length===f._editPinLength)setF(p=>({...p,_editPinStep:"confirm"}));}} />
              </>:f._editPinStep==="confirm"?<>
                <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>أعد إدخال PIN للتأكيد</div>
                <input type="password" maxLength={f._editPinLength} value={f._editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,f._editPinLength);setF(p=>({...p,_editPinConfirm:val}));if(val.length===f._editPinLength&&f._editTempPin!==val){setF(p=>({...p,_editPinErr:"الأرقام غير متطابقة"}));}else{setF(p=>({...p,_editPinErr:""}));}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${f._editPinErr?"#e74c3c":"var(--p)"}`,background:"#0d0d1a",color:"#f0f0f0",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm){const salonIdStr=String(salon.id);localStorage.setItem(`dork_owner_pin_${salonIdStr}`,f._editTempPin);localStorage.setItem(`dork_owner_pin_length_${salonIdStr}`,String(f._editPinLength));toast$&&toast$("✅ تم تحديث PIN بنجاح");setF(p=>({...p,_editPinStep:null,_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}));}}} />
                {f._editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{f._editPinErr}</div>}
                <div style={{display:"flex",gap:8,marginTop:16}}>
                  <button onClick={()=>{if(f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm){const salonIdStr=String(salon.id);localStorage.setItem(`dork_owner_pin_${salonIdStr}`,f._editTempPin);localStorage.setItem(`dork_owner_pin_length_${salonIdStr}`,String(f._editPinLength));toast$&&toast$("✅ تم تحديث PIN بنجاح");setF(p=>({...p,_editPinStep:null,_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}));}}} disabled={f._editPinConfirm.length!==f._editPinLength||f._editTempPin!==f._editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm?"var(--p)":"#2a2a3a",color:f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm?"#000":"#555",cursor:f._editPinConfirm.length===f._editPinLength&&f._editTempPin===f._editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    حفظ
                  </button>
                  <button onClick={()=>setF(p=>({...p,_editPinStep:null,_editPinLength:4,_editTempPin:"",_editPinConfirm:"",_editPinErr:""}))} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"#888",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                    إلغاء
                  </button>
                </div>
              </>:null}
            </div>
          </div>
        )}
      </div>}

      <button style={{...G.sub,marginTop:4,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
        {saving?"⏳ جاري الحفظ...":"💾 حفظ التعديلات"}
      </button>
    </div>
  );
}


export { OwnerSettings };

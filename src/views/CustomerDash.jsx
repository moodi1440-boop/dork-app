import React, { useState, useEffect } from "react";
import { G } from "../styles.js";
import { supabase, sb } from "../api/supabase.js";
import { getCustomerClassification, requestNotifPermission, sendNotif } from "../utils/notifications.js";

function CustomerDash({customer,salons,setSalons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers,reviews,setReviews,setRescheduleId,loadData,toast$}){
  const[tab,setTab]=useState("settings");
  const[editMode,setEditMode]=useState(false);
  const[editName,setEditName]=useState(customer?.name||"");
  const[editPhone,setEditPhone]=useState(customer?.phone||"");
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[editEmail,setEditEmail]=useState(customer?.email||"");
  const[reminderMins,setReminderMins]=useState(60);
  const[myWaiting,setMyWaiting]=useState([]);
  useEffect(()=>{
    if(!customer?.phone)return;
    sb("waiting_list","GET",null,`?phone=eq.${encodeURIComponent(customer.phone)}&select=id,salon_id,slot_date,slot_time,status,created_at&order=created_at.desc`)
      .then(data=>{if(Array.isArray(data))setMyWaiting(data.filter(w=>w.status==="waiting"));})
      .catch(()=>{});
  },[customer?.phone]);
  const[editPinStep,setEditPinStep]=useState(null);
  const[editPinLength,setEditPinLength]=useState(4);
  const[editTempPin,setEditTempPin]=useState("");
  const[editPinConfirm,setEditPinConfirm]=useState("");
  const[editPinErr,setEditPinErr]=useState("");
  if(!customer)return null;

  const favSalons=salons.filter(s=>favSet.has(s.id)&&s.status==="approved");
  const history=customer.history||[];
  const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
  const classification=getCustomerClassification(customer);
  const badge=classification.label;

  // avatar بالحرف الأول
  const initials=(customer.name||"?")[0];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

  const lastSalon=history.length>0?salons.find(s=>s.id===history[history.length-1].salonId||s.id===Number(history[history.length-1].salonId)):null;

  const saveEdit=async()=>{
    if(!editName.trim()){return;}
    try{
      await sb("customers","PATCH",{name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim(),email:editEmail.trim()}:c));
      setEditMode(false);
    }catch(e){alert("خطأ: "+e.message);}
  };

  const confirmDeleteAccount=async()=>{
    try{
      await sb("customers","DELETE",null,`?id=eq.${customer.id}`);
      const {data:{user}}=await supabase.auth.getUser();
      if(user)await supabase.auth.admin.deleteUser(user.id);
      setCustomerSession(null);setView("home");
    }catch(e){alert("خطأ: "+e.message);}
    setShowDeleteConfirm(false);
  };

  const deleteAccount=()=>{
    setShowDeleteConfirm(true);
  };

  const scheduleReminder=(h)=>{
    const dt=new Date(`${h.date}T${h.time}`);
    dt.setMinutes(dt.getMinutes()-reminderMins);
    const now=new Date();
    const diff=dt-now;
    if(diff<=0){alert("الموعد قريب جداً أو مضى!");return;}
    setTimeout(()=>{
      if(Notification.permission==="granted"){
        new Notification("تذكير موعدك في دورك ✂",{body:`موعدك في ${h.salonName||"الصالون"} الساعة ${h.time}`,icon:"/favicon.ico"});
      }else{alert(`تذكير: موعدك في ${h.salonName||"الصالون"} الساعة ${h.time}`);}
    },diff);
    Notification.requestPermission();
    alert(`✅ سيتم تذكيرك قبل ${reminderMins>=60?reminderMins/60+" ساعة":reminderMins+" دقيقة"} من موعدك!`);
  };

  const inp2={width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"};

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={{...G.ft,flex:1}}>حسابي</h2><button style={{...G.delBtn,border:"1.5px solid #888",color:"#aaa",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("home");}}>خروج</button></div>

      {/* بروفايل العميل - Premium */}
      {!editMode?(
        <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1.5px solid #d4a017",marginBottom:12,position:"relative",boxShadow:"0 4px 16px rgba(212,160,23,0.1)"}}>
          {/* البادج في الزاوية اليسرى */}
          <div style={{position:"absolute",top:12,left:12,background:`${classification.color}22`,border:`1px solid ${classification.color}`,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,color:classification.color}}>{badge}</div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>👤 الاسم: <span style={{color:"#f0c040"}}>{customer.name}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>📞 الجوال: <span style={{color:"#f0c040"}}>{customer.phone}</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>📋 الحجوزات: <span style={{color:"#f0c040"}}>{history.length} حجز</span></div>
            <div style={{fontSize:14,color:"#fff",fontWeight:700}}>📅 الانضمام: <span style={{color:"#f0c040"}}>{new Date(customer.createdAt).toLocaleDateString("ar")}</span></div>
          </div>
        </div>
      ):(
        <div style={{background:"#13131f",borderRadius:16,padding:16,border:"1px solid var(--pa25)",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>✏ تعديل البيانات</div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>الاسم</label><input style={inp2} value={editName} onChange={e=>setEditName(e.target.value)}/></div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>رقم الجوال</label><input style={inp2} inputMode="numeric" type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>البريد الإلكتروني</label><input style={inp2} type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)}/></div>
          <div style={{display:"flex",gap:8}}>
            <button style={G.sub} onClick={saveEdit}>💾 حفظ</button>
            <button style={{...G.delBtn,padding:"12px 14px"}} onClick={()=>setEditMode(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* تبويبات */}
      <div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>{localStorage.setItem("dork_notif_count","0");setTab("notif");}}>
          🔔 {(()=>{const n=parseInt(localStorage.getItem("dork_notif_count")||"0");return n>0?<span style={G.notifDot}>{n}</span>:null;})()}
        </button>
        <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>♥ المفضلة {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>📋 حجوزاتي</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙ الحساب</button>
      </div>

      {/* المفضلة */}
      {tab==="favs"&&<>
        {favSalons.length===0?<div style={{...G.empty,display:"flex",flexDirection:"column",gap:16,alignItems:"center",padding:"36px 14px"}}>
          <div>لم تضف صالوناً للمفضلة بعد</div>
          <button style={{...G.sub,marginTop:0}} onClick={()=>setView("home")}>استعرض الصالونات الآن</button>
        </div>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {favSalons.map(s=>(
              <div key={s.id} style={G.bItem}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                    <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?` - ${s.village}`:""}</div>
                    <div style={{fontSize:11,color:"var(--p)"}}>⭐ {s.rating}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={G.bookBtn} onClick={()=>{setSelSalon(s);setView("book");}}>احجز</button>
                    <button style={{...G.favBtn,fontSize:18,color:"#e74c3c"}} onClick={()=>toggleFav(s.id)}>♥</button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
      </>}

      {/* الحجوزات */}
      {tab==="hist"&&<>
        {/* قائمة انتظاري */}
        {myWaiting.length>0&&(
          <div style={{background:"rgba(243,156,18,.07)",borderRadius:10,padding:"10px 12px",marginBottom:12,border:"1px solid #f39c1244"}}>
            <div style={{fontSize:12,color:"#f39c12",fontWeight:700,marginBottom:8}}>⏳ مواعيدي في قائمة الانتظار ({myWaiting.length})</div>
            {myWaiting.map(w=>{
              const s=salons.find(x=>String(x.id)===String(w.salon_id));
              return(
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:"1px solid #f39c1222"}}>
                  <div>
                    <div style={{fontSize:12,color:"#fff",fontWeight:600}}>✂ {s?.name||"صالون"}</div>
                    <div style={{fontSize:11,color:"#f39c12"}}>⏰ {w.slot_date} - {w.slot_time}</div>
                    <div style={{fontSize:10,color:"#888"}}>بانتظار تأكيد الصالون</div>
                  </div>
                  <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}
                    onClick={async()=>{
                      if(!window.confirm("هل تريد إلغاء طلب الانتظار؟"))return;
                      await sb("waiting_list","DELETE",null,"?id=eq."+w.id).catch(()=>{});
                      setMyWaiting(p=>p.filter(x=>x.id!==w.id));
                    }}>إلغاء</button>
                </div>
              );
            })}
          </div>
        )}
        {/* إعداد التذكير */}
        <div style={{background:"#13131f",borderRadius:10,padding:"10px 12px",marginBottom:10,border:"1px solid #2a2a3a"}}>
          <div style={{fontSize:11,color:"var(--p)",fontWeight:700,marginBottom:8}}>🔔 وقت التذكير بالمواعيد</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            {[{v:30,l:"30 د"},{v:60,l:"ساعة"},{v:120,l:"ساعتين"},{v:1440,l:"يوم"}].map(({v,l})=>(
              <button key={v} onClick={()=>setReminderMins(v)}
                style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${reminderMins===v?"var(--p)":"#2a2a3a"}`,background:reminderMins===v?"var(--pa12)":"#1a1a2e",color:reminderMins===v?"var(--p)":"#888",cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:700}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"#888",flexShrink:0}}>أو أدخل دقائق:</span>
            <input type="number" min="1" max="10080"
              style={{width:80,padding:"6px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"center",direction:"ltr"}}
              value={reminderMins} onChange={e=>setReminderMins(Math.max(1,+e.target.value))}/>
            <span style={{fontSize:11,color:"#888"}}>دقيقة</span>
          </div>
        </div>
        {history.length===0?<div style={G.empty}>لا توجد حجوزات سابقة</div>:
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {[...history].reverse().map((h,i)=>{
              const s=salons.find(x=>x.id===h.salonId||x.id===Number(h.salonId));
              // نجيب الحالة الحقيقية من بيانات الصالون بمقارنة مرنة
              const realBooking=s?.bookings?.find(b=>
                b.date===h.date && b.time===h.time &&
                (b.phone===h.phone || b.name===customer.name)
              ) || s?.bookings?.find(b=>b.date===h.date&&b.time===h.time);
              const status=realBooking?.status||h.status||"pending";
              const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":status==="cancelled"?"#888":"#f39c12";
              const stLabel=status==="approved"?"✅ مقبول":status==="rejected"?"❌ مرفوض":status==="cancelled"?"🚫 ملغى":"⏳ بانتظار الموافقة";
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s?.name||h.salonName||"صالون"}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>📅 {h.date} - 🕐 {h.time}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>💰 {h.total||0} ريال</div>
                      <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=h.rating?"#f0c040":"#333"}}>★</span>)}</div>}
                      {s&&<button style={{...G.bookBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{setSelSalon(s);setView("book");}}>🔄 احجز مجدداً</button>}
                      <button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>🔔 ذكّرني</button>
                      {(status==="pending"||status==="approved")&&realBooking?.id&&(<>
                        <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid var(--p)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit"}} onClick={()=>{if(window.confirm("هل تريد تعديل موعدك؟ سيُلغى الحجز الحالي عند تأكيد الجديد.")){setRescheduleId(realBooking.id);setSelSalon(s);setView("book");}}}>✏️ تعديل</button>
                        <button style={{fontSize:10,padding:"4px 8px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}} onClick={async()=>{
                          if(!window.confirm("هل تريد إلغاء هذا الحجز؟"))return;
                          try{
                            const bookDT=new Date(`${h.date}T${h.time}`);
                            const hoursUntil=(bookDT-new Date())/(1000*60*60);
                            const window_h=s?.cancellationWindow||2;
                            const lateCancel=hoursUntil>=0&&hoursUntil<window_h;
                            await sb("bookings","PATCH",{status:"cancelled",...(lateCancel?{attendance:"no_show"}:{})},"?id=eq."+realBooking.id);
                            sb("notifications","POST",{target_type:"all",title:"إلغاء حجز",body:`${customer?.name||""} ألغى حجزه في ${h.date} - ${h.time}${lateCancel?" (إلغاء متأخر)":""}`,icon:"🚫"}).catch(()=>{});
                            await loadData({silent:true});
                          }catch(e){toast$("❌ خطأ في الإلغاء","err");}
                        }}>🚫 إلغاء</button>
                      </>)}
                    </div>
                  </div>
                  {/* التقييم فقط بعد القبول */}
                  {status==="approved"&&<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                    // تحديث history العميل محلياً (لعرضه في "حجوزاتي")
                    const rev=[...history].reverse();
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated}:c));
                    try{await sb("customers","PATCH",{history:updated},`?id=eq.${customer.id}`);}catch{}
                    // كتابة التقييم في جدول reviews المستقل
                    try{
                      const salonId=Number(h.salonId);
                      const existing=(reviews||[]).find(rv=>Number(rv.salon_id)===salonId&&Number(rv.customer_id)===Number(customer.id)&&rv.booking_date===h.date);
                      let allSalonReviews=(reviews||[]).filter(rv=>Number(rv.salon_id)===salonId);
                      if(existing){
                        await sb("reviews","PATCH",{rating:r,comment},`?id=eq.${existing.id}`);
                        allSalonReviews=allSalonReviews.map(rv=>rv.id===existing.id?{...rv,rating:r,comment}:rv);
                        setReviews(p=>p.map(rv=>rv.id===existing.id?{...rv,rating:r,comment}:rv));
                      }else{
                        const res=await sb("reviews","POST",{salon_id:salonId,customer_id:Number(customer.id),customer_name:customer.name,rating:r,comment,booking_date:h.date});
                        if(res&&res[0]){allSalonReviews=[...allSalonReviews,res[0]];setReviews(p=>[...p,res[0]]);}
                      }
                      // حساب المتوسط من كل تقييمات الصالون (دقيق 100%)
                      const newRating=allSalonReviews.length?Math.round(allSalonReviews.reduce((a,rv)=>a+rv.rating,0)/allSalonReviews.length*10)/10:r;
                      await sb("salons","PATCH",{rating:newRating},`?id=eq.${salonId}`);
                      setSalons(p=>p.map(s=>Number(s.id)===salonId?{...s,rating:newRating}:s));
                    }catch(e){console.error(e);}
                  }}/>}
                </div>
              );
            })}
          </div>}
      </>}

      {/* إشعارات العميل */}
      {tab==="notif"&&(()=>{
        const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
        const clearAll=()=>{localStorage.setItem("dork_notifs","[]");localStorage.setItem("dork_notif_count","0");};
        return(
          <div>
            {notifs.length>0&&<button style={{...G.pageBtn,width:"100%",marginBottom:10,color:"#e74c3c",border:"1px solid #e74c3c"}} onClick={clearAll}>🗑 مسح الكل</button>}
            {notifs.length===0
              ?<div style={G.empty}>🔔 لا توجد إشعارات</div>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {notifs.map(n=>(
                  <div key={n.id} style={{...G.bItem,borderRight:`3px solid ${n.read?"#2a2a3a":"var(--p)"}`}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <span style={{fontSize:20}}>{n.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.title}</div>
                        <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{n.body}</div>
                        <div style={{fontSize:10,color:"#555",marginTop:3}}>{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        );
      })()}

      {/* إعدادات الحساب */}
      {tab==="settings"&&(
        <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>⚙ إعدادات الحساب</div>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>{setTab("settings");setEditMode(true);}}>✏ تعديل البيانات</button>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>setEditPinStep("select")}>🔐 تغيير رمز PIN</button>
          <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>🗑 حذف الحساب نهائياً</button>
          <div style={{fontSize:10,color:"#555",marginTop:8,textAlign:"center"}}>تحذير: حذف الحساب لا يمكن التراجع عنه</div>
        </div>
      )}

      {/* حوار تغيير PIN */}
      {editPinStep&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
          <div style={{background:"#13131f",borderRadius:20,padding:24,maxWidth:350,width:"100%",border:"1.5px solid var(--pa25)"}}>
            {editPinStep==="select"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>🔐 تغيير رمز PIN</div>
              <div style={{fontSize:12,color:"#888",textAlign:"center",marginBottom:20}}>اختر عدد الأرقام</div>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <button onClick={()=>{setEditPinLength(4);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===4?"rgba(212,160,23,.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  4 أرقام
                </button>
                <button onClick={()=>{setEditPinLength(6);setEditPinStep("enter");}} style={{flex:1,padding:16,borderRadius:12,border:"2px solid var(--p)",background:editPinLength===6?"rgba(212,160,23,.3)":"transparent",color:"var(--p)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  6 أرقام
                </button>
              </div>
            </>:editPinStep==="enter"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>أدخل PIN الجديد ({editPinLength} أرقام)</div>
              <input type="password" maxLength={editPinLength} value={editTempPin} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditTempPin(val);if(val.length===editPinLength)setTimeout(()=>setEditPinStep("confirm"),300);}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--p)",background:"#0d0d1a",color:"#f0f0f0",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editTempPin.length===editPinLength)setEditPinStep("confirm");}} />
            </>:editPinStep==="confirm"?<>
              <div style={{fontSize:16,fontWeight:700,color:"var(--p)",textAlign:"center",marginBottom:20}}>أعد إدخال PIN للتأكيد</div>
              <input type="password" maxLength={editPinLength} value={editPinConfirm} onChange={(e)=>{const val=e.target.value.replace(/\D/g,"").slice(0,editPinLength);setEditPinConfirm(val);if(val.length===editPinLength&&editTempPin!==val){setEditPinErr("الأرقام غير متطابقة");}else{setEditPinErr("");}}} style={{width:"100%",padding:"12px",borderRadius:10,border:`1.5px solid ${editPinErr?"#e74c3c":"var(--p)"}`,background:"#0d0d1a",color:"#f0f0f0",fontSize:18,fontFamily:"inherit",outline:"none",textAlign:"center",letterSpacing:"4px",fontWeight:700,direction:"ltr"}} placeholder="•••••" autoFocus onKeyDown={(e)=>{if(e.key==="Enter"&&editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm){const customerIdStr=String(customer.id);localStorage.setItem(`dork_customer_pin_${customerIdStr}`,editTempPin);localStorage.setItem(`dork_customer_pin_length_${customerIdStr}`,String(editPinLength));setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}}} />
              {editPinErr&&<div style={{color:"#e74c3c",fontSize:12,textAlign:"center",marginTop:10}}>{editPinErr}</div>}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={()=>{if(editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm){const customerIdStr=String(customer.id);localStorage.setItem(`dork_customer_pin_${customerIdStr}`,editTempPin);localStorage.setItem(`dork_customer_pin_length_${customerIdStr}`,String(editPinLength));setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");toast$&&toast$("✅ تم تحديث PIN بنجاح");}}} disabled={editPinConfirm.length!==editPinLength||editTempPin!==editPinConfirm} style={{flex:1,padding:12,borderRadius:10,border:"none",background:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"var(--p)":"#2a2a3a",color:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"#000":"#555",cursor:editPinConfirm.length===editPinLength&&editTempPin===editPinConfirm?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  حفظ
                </button>
                <button onClick={()=>{setEditPinStep(null);setEditPinLength(4);setEditTempPin("");setEditPinConfirm("");setEditPinErr("");}} style={{flex:1,padding:12,borderRadius:10,border:"none",background:"rgba(255,255,255,.1)",color:"#888",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  إلغاء
                </button>
              </div>
            </>:null}
          </div>
        </div>
      )}

      {/* حذف الحساب - Dialog */}
      {showDeleteConfirm&&(
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
          <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:24,border:"1.5px solid #d4a017",boxShadow:"0 20px 60px rgba(212,160,23,0.2)",maxWidth:"90%",animation:"slideUp 0.3s ease"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
              <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:8}}>حذف الحساب نهائياً</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>هل أنت متأكد من رغبتك في حذف حسابك؟</div>
            </div>

            <div style={{background:"rgba(212,160,23,0.08)",border:"1px solid rgba(212,160,23,0.2)",borderRadius:12,padding:14,marginBottom:20,fontSize:12,color:"#ddd",lineHeight:1.8}}>
              <div style={{marginBottom:8,fontWeight:700,color:"#f0c040"}}>سيتم حذف:</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>✗ <span>حسابك بشكل نهائي</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>✗ <span>جميع معلوماتك الشخصية</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>✗ <span>سجل حجوزاتك</span></div>
            </div>

            <div style={{background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.3)",borderRadius:10,padding:12,marginBottom:20,textAlign:"center",fontSize:11,color:"#ff6b6b",fontWeight:700}}>
              ⚡ تنبيه: لا يمكن استرجاع البيانات بعد الحذف</div>

            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"transparent",border:"1.5px solid #2a2a3a",color:"#aaa",padding:"12px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",transition:"all 0.2s"}} onClick={()=>setShowDeleteConfirm(false)}>
                ↩️ إلغاء
              </button>
              <button style={{flex:1,background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",padding:"12px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",border:"none",transition:"all 0.2s",boxShadow:"0 4px 12px rgba(231,76,60,0.3)"}} onClick={confirmDeleteAccount}>
                🗑️ حذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

    </div></div>
  );
}


export { CustomerDash };

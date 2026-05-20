import React, { useState } from "react";
import { G } from "../styles";
import { supabase, sb } from "../api/supabase";
import { SLOT_MIN, MONTHS_AR, normalizeBgId, makeSlots, getSlotsForSalon, todayStr, openMaps, calcTotal, normPhone } from "../utils/helpers";

function OwnerDash({salon,setView,setOwnerSession,updateBookingStatus,setSalons,toast$,refreshSalonBookings,reviews,setReviews,customers=[]}){
  const[tab,setTab]=useState(null);
  const[activeCard,setActiveCard]=useState(null);
  const[ownerNotifs,setOwnerNotifs]=useState(()=>{try{return JSON.parse(localStorage.getItem("dork_notifs")||"[]");}catch{return[];}});
  const[oathDone,setOathDone]=useState(()=>{
    try{return localStorage.getItem(`dork_oath_${salon?.id}`)==="1";}catch{return false;}
  });
  const[oathChecked,setOathChecked]=useState(false);

  if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>{">"}</button><h2 style={G.ft}>لوحة الصالون</h2></div><div style={G.empty}>الصالون غير موجود</div></div></div>;

  // شاشة القسم — تظهر لمرة واحدة فقط
  if(!oathDone) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0d0d1a,#1a1228)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Cairo',sans-serif",direction:"rtl"}}>
      <div style={{maxWidth:460,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>📜</div>
          <div style={{fontSize:20,fontWeight:900,color:"var(--p,#d4a017)",marginBottom:4}}>القسم الشرعي</div>
          <div style={{fontSize:12,color:"#888"}}>يُعرض لمرة واحدة فقط عند أول دخول</div>
        </div>
        <div style={{background:"rgba(212,160,23,.06)",border:"1.5px solid rgba(212,160,23,.3)",borderRadius:14,padding:"20px 18px",marginBottom:18}}>
          <div style={{fontSize:14,color:"#f0c040",lineHeight:2.1,textAlign:"center",fontWeight:600}}>
            «أقسم بالله العظيم، أن ألتزم بالأمانة والصدق في دفع عمولة الوساطة المستحقة لتطبيق (دورك) بواقع (1 ريال) عن كل حجز مكتمل يتم عبر المنصة، وألا أتحايل على النظام بأي وسيلة كانت، وأن أراقب الله في ذلك.. والله على ما أقول شهيد»
          </div>
        </div>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16,cursor:"pointer",padding:"12px 14px",background:"rgba(212,160,23,.05)",borderRadius:10,border:`1.5px solid ${oathChecked?"var(--p,#d4a017)":"#2a2a3a"}`}}>
          <input type="checkbox" checked={oathChecked} onChange={e=>setOathChecked(e.target.checked)} style={{width:18,height:18,marginTop:2,flexShrink:0,cursor:"pointer"}}/>
          <span style={{fontSize:13,color:"#fff",lineHeight:1.7}}>أقر بأنني قرأت القسم كاملاً وأقسمت بالله العظيم على الالتزام به</span>
        </label>
        <button
          disabled={!oathChecked}
          onClick={async()=>{
            try{await sb("salons","PATCH",{oath_done:true},`?id=eq.${salon.id}`);}catch{}
            localStorage.setItem(`dork_oath_${salon.id}`,"1");
            setOathDone(true);
          }}
          style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:oathChecked?"linear-gradient(135deg,var(--p,#d4a017),#f0c040)":"#2a2a3a",color:oathChecked?"#000":"#555",fontSize:15,fontWeight:900,cursor:oathChecked?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .3s"}}>
          قبول ودخول لوحة التحكم
        </button>
      </div>
    </div>
  );

  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const statusColor=salon.status==="approved"?"#27ae60":salon.status==="rejected"?"#e74c3c":"var(--pl)";
  const statusLabel=salon.status==="approved"?"✅ مفعّل":salon.status==="rejected"?"❌ مرفوض":"⏳ انتظار موافقة الإدارة";

  const approvedBookings=salon.bookings.filter(b=>b.status==="approved");
  const totalEarned=approvedBookings.length;
  const totalPaid=salon.totalPaid||0;
  const balance=totalEarned-totalPaid;

  const[showBalanceModal,setShowBalanceModal]=useState(false);

  // ── حسابات ملخص اليوم ──
  const _td=new Date().toISOString().slice(0,10);
  const _tdBks=salon.bookings.filter(b=>b.date===_td);
  const _tdApproved=_tdBks.filter(b=>b.status==="approved");
  const _tdPending=_tdBks.filter(b=>b.status==="pending");
  const _tdRevenue=_tdApproved.reduce((s,b)=>s+(b.total||0),0);
  const _now=new Date();
  const _nowMins=_now.getHours()*60+_now.getMinutes();
  const _nextBk=_tdApproved
    .filter(b=>{const[h,m]=(b.time||"0:0").split(":").map(Number);return h*60+m>_nowMins;})
    .sort((a,b)=>(a.time||"").localeCompare(b.time||""))[0];
  const _totalSlots=Math.max((getSlotsForSalon(salon).length)*(salon.barbers?.length||1),1);
  const _occ=Math.min(100,Math.round(_tdApproved.length/_totalSlots*100));
  const _dNames=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const _mNames=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const _dayLabel=`${_dNames[_now.getDay()]}، ${_now.getDate()} ${_mNames[_now.getMonth()]}`;

  return(
    <div style={G.page}>
      <style>{`
        @keyframes fadeInUp {from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideInFromRight {from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
        @keyframes scaleIn {from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        @keyframes growBar {from{transform:scaleX(0);}to{transform:scaleX(1);}}
        @keyframes pulse {0%,100%{opacity:1;}50%{opacity:.6;}}
        .stat-card{animation:fadeInUp .45s ease-out both;transition:all .25s ease;}
        .stat-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(212,160,23,.18);}
        .tab-button{transition:all .2s ease;}
        .balance-tab{animation:slideInFromRight .4s cubic-bezier(0.4,0,0.2,1);}
        .notif-banner{animation:fadeInUp .4s ease-out;transition:all .3s ease;}
        .today-card{animation:scaleIn .4s ease-out;}
        .occ-bar{animation:growBar 1.2s cubic-bezier(0.4,0,0.2,1);}
        .pending-pulse{animation:pulse 2s infinite;}
      `}</style>
      <div style={G.fp}>

      {/* ── صف أيقونات التبويبات ── */}
      <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",marginBottom:12,paddingBottom:2}}>
        <button
          onClick={()=>{setTab(null);setActiveCard(null);}}
          style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,height:68,background:tab===null?"rgba(212,160,23,.13)":"rgba(255,255,255,.04)",border:`1px solid ${tab===null?"rgba(212,160,23,.4)":"rgba(255,255,255,.07)"}`,borderRadius:12,padding:"7px 10px",cursor:"pointer",flexShrink:0,fontFamily:"inherit",transition:"all .2s ease",minWidth:48}}>
          <span style={{fontSize:18}}>📋</span>
          <span style={{fontSize:8,color:tab===null?"#d4a017":"#666",fontWeight:tab===null?700:400,whiteSpace:"nowrap"}}>لوحتي</span>
        </button>
        {[
          {id:"messages",icon:"💬",label:"رسائل"},
          {id:"calendar",icon:"🗓",label:"تقويم"},
          {id:"reviews",icon:"⭐",label:"تقييمات"},
          {id:"stats",icon:"📊",label:"إحصائيات"},
          {id:"balance",icon:"💰",label:"الميزان"},
          {id:"settings",icon:"⚙",label:"إعدادات"},
        ].map(({id,icon,label})=>{
          const isActive=tab===id;
          const hasBadge=(id==="messages"&&parseInt(localStorage.getItem("dork_notif_count")||"0")>0)||(id==="balance"&&balance>0);
          return(
            <button key={id}
              onClick={()=>{
                if(id==="messages")localStorage.setItem("dork_notif_count","0");
                setTab(t=>t===id?null:id);
                setActiveCard(null);
              }}
              style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,height:68,background:isActive?"rgba(212,160,23,.13)":"rgba(255,255,255,.04)",border:`1px solid ${isActive?"rgba(212,160,23,.4)":"rgba(255,255,255,.07)"}`,borderRadius:12,padding:"7px 10px",cursor:"pointer",flexShrink:0,position:"relative",fontFamily:"inherit",transition:"all .2s ease",minWidth:48}}>
              <span style={{fontSize:18}}>{icon}</span>
              <span style={{fontSize:8,color:isActive?"#d4a017":"#666",fontWeight:isActive?700:400,whiteSpace:"nowrap"}}>{label}</span>
              {hasBadge&&<div style={{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",background:"#e74c3c",boxShadow:"0 0 4px #e74c3c"}}/>}
            </button>
          );
        })}
        <button
          onClick={()=>{if(window.confirm("هل أنت متأكد من الخروج؟")){setOwnerSession(null);setView("home");}}}
          style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,height:68,background:"rgba(231,76,60,.07)",border:"1px solid rgba(231,76,60,.2)",borderRadius:12,padding:"7px 10px",cursor:"pointer",flexShrink:0,fontFamily:"inherit",transition:"all .2s ease",minWidth:48}}>
          <span style={{fontSize:18}}>🚪</span>
          <span style={{fontSize:8,color:"#e74c3c",fontWeight:600,whiteSpace:"nowrap"}}>خروج</span>
        </button>
      </div>

      {/* ── بادج الصالون المحسّن ── */}
      <div style={{display:"flex",alignItems:"center",gap:10,background:"linear-gradient(135deg,rgba(212,160,23,.1),rgba(212,160,23,.04))",border:"1px solid rgba(212,160,23,.22)",borderRadius:14,padding:"11px 14px",marginBottom:10}}>
        <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#d4a017,#f0c040)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,boxShadow:"0 4px 12px rgba(212,160,23,.35)"}}>✂</div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#fff",letterSpacing:.3}}>{salon.name}</div>
          <div style={{fontSize:11,color:"#999",marginTop:1}}>📍 {salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div>
        </div>
        <span style={{fontSize:11,fontWeight:700,color:statusColor,background:`${statusColor}18`,padding:"4px 10px",borderRadius:10,border:`1px solid ${statusColor}33`}}>{statusLabel}</span>
      </div>

      {salon.status!=="approved"&&(
        <div style={{background:"rgba(240,192,64,.07)",border:"1px solid rgba(240,192,64,.25)",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:12,color:"var(--pl)"}}>
          🔔 صالونك في انتظار موافقة الإدارة — سيظهر للعملاء بعد القبول
        </div>
      )}

      {/* بانر إشعارات الإدارة */}
      {ownerNotifs.filter(n=>n.title&&(n.title.includes("إدارة")||n.title.includes("اشتراك")||n.title.includes("تحذير")||n.title.includes("إعلان"))).slice(0,1).map(n=>(
        <div key={n.id} className="notif-banner" style={{background:"linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.06))",border:"1px solid rgba(212,160,23,.35)",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--p)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{n.icon} {n.title} — {n.body}</span>
          <button onClick={()=>setOwnerNotifs(p=>p.filter(x=>x.id!==n.id))} style={{background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:14,padding:0}}>✕</button>
        </div>
      ))}

      {/* ── الواجهة الرئيسية (لوحتي) ── */}
      {tab===null&&(
        <>

      {/* ── بطاقة ملخص اليوم ── */}
      <div className="today-card" style={{background:"linear-gradient(145deg,#16112a,#0e0e1e)",borderRadius:18,padding:"16px",marginBottom:12,border:"1px solid rgba(212,160,23,.2)",boxShadow:"0 0 30px rgba(212,160,23,.06),inset 0 1px 0 rgba(212,160,23,.08)"}}>

        {/* التاريخ + حالة المعلقة */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"#d4a017"}}>🌅 {_dayLabel}</div>
          {_tdPending.length>0
            ?<div className="pending-pulse" style={{fontSize:10,color:"#f39c12",background:"rgba(243,156,18,.12)",padding:"3px 9px",borderRadius:8,fontWeight:700,border:"1px solid rgba(243,156,18,.25)"}}>⏳ {_tdPending.length} بانتظارك</div>
            :<div style={{fontSize:10,color:"#27ae60",background:"rgba(39,174,96,.1)",padding:"3px 9px",borderRadius:8,fontWeight:700,border:"1px solid rgba(39,174,96,.2)"}}>✅ لا معلقة</div>
          }
        </div>

        {/* حجوزات اليوم + إيراد اليوم */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:"rgba(212,160,23,.07)",borderRadius:13,padding:"13px",border:"1px solid rgba(212,160,23,.15)",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-8,right:-8,fontSize:36,opacity:.06}}>📅</div>
            <div style={{fontSize:30,fontWeight:900,color:"#d4a017",lineHeight:1}}>{_tdApproved.length}</div>
            <div style={{fontSize:10,color:"#888",marginTop:5}}>حجز مقبول اليوم</div>
          </div>
          <div style={{background:"rgba(39,174,96,.07)",borderRadius:13,padding:"13px",border:"1px solid rgba(39,174,96,.15)",textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-8,right:-8,fontSize:36,opacity:.06}}>💰</div>
            <div style={{fontSize:30,fontWeight:900,color:"#27ae60",lineHeight:1}}>{_tdRevenue}</div>
            <div style={{fontSize:10,color:"#888",marginTop:5}}>ريال إيراد اليوم</div>
          </div>
        </div>

        {/* شريط الامتلاء */}
        <div style={{marginBottom:_nextBk?14:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,color:"#777"}}>امتلاء اليوم</div>
            <div style={{fontSize:12,fontWeight:800,color:_occ>=80?"#e74c3c":_occ>=50?"#d4a017":"#27ae60"}}>{_occ}%</div>
          </div>
          <div style={{height:7,background:"rgba(255,255,255,.05)",borderRadius:10,overflow:"hidden"}}>
            <div className="occ-bar" style={{height:"100%",width:`${_occ}%`,background:_occ>=80?"linear-gradient(90deg,#c0392b,#e74c3c)":_occ>=50?"linear-gradient(90deg,#a07810,#f0c040)":"linear-gradient(90deg,#1e8449,#27ae60)",borderRadius:10,transformOrigin:"right center",boxShadow:_occ>0?`0 0 8px ${_occ>=80?"rgba(231,76,60,.5)":_occ>=50?"rgba(212,160,23,.5)":"rgba(39,174,96,.5)"}`:""}}/>
          </div>
        </div>

        {/* الحجز القادم */}
        {_nextBk&&(
          <div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(212,160,23,.06)",borderRadius:11,padding:"10px 12px",border:"1px dashed rgba(212,160,23,.2)"}}>
            <div style={{width:32,height:32,borderRadius:9,background:"rgba(212,160,23,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>⏰</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,color:"#666",marginBottom:2}}>الحجز القادم</div>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {_nextBk.customerName||_nextBk.customer_name||"عميل"} — {_nextBk.time}
              </div>
            </div>
            <div style={{fontSize:11,fontWeight:800,color:"#d4a017",background:"rgba(212,160,23,.12)",padding:"4px 9px",borderRadius:8,flexShrink:0,whiteSpace:"nowrap"}}>
              {(()=>{
                const[h,m]=(_nextBk.time||"0:0").split(":").map(Number);
                const diff=h*60+m-_nowMins;
                if(diff<=0)return"الآن";
                if(diff>=60)return`${Math.floor(diff/60)}س ${diff%60}د`;
                return`${diff} دقيقة`;
              })()}
            </div>
          </div>
        )}
        {!_nextBk&&(
          <div style={{fontSize:11,color:"#444",textAlign:"center",paddingTop:_tdApproved.length>0?8:0}}>
            {_tdApproved.length>0?"✓ انتهت جميع حجوزات اليوم":"لا توجد حجوزات مؤكدة لهذا اليوم"}
          </div>
        )}
      </div>

      {/* ── الـ 4 مربعات ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:activeCard?0:14}}>
            {[
              {label:"الكل",value:salon.bookings.length,color:"#d4a017",filter:"all",delay:0},
              {label:"انتظار",value:pending,color:"#f39c12",filter:"pending",delay:80},
              {label:"مقبول",value:approvedBookings.length,color:"#27ae60",filter:"approved",delay:160},
              {label:"مرفوض",value:salon.bookings.filter(b=>b.status==="rejected").length,color:"#e74c3c",filter:"rejected",delay:240}
            ].map(({label,value,color,filter,delay})=>{
              const isOpen=activeCard===filter;
              return(
                <div key={label} className="stat-card"
                  onClick={()=>{setActiveCard(c=>c===filter?null:filter);if(filter==="all"||filter==="approved")refreshSalonBookings(salon.id);}}
                  style={{background:isOpen?`${color}18`:`${color}0f`,borderRadius:isOpen?"13px 13px 0 0":13,padding:"11px 6px",height:68,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:`1.5px solid ${isOpen?`${color}55`:`${color}1a`}`,borderBottom:isOpen?`1.5px solid ${color}55`:"",textAlign:"center",animationDelay:`${delay}ms`,cursor:"pointer",transition:"all .22s ease",boxShadow:isOpen?`0 0 14px ${color}1a`:"none"}}>
                  <div style={{fontSize:22,fontWeight:900,color,marginBottom:2,lineHeight:1}}>{value}</div>
                  <div style={{fontSize:10,color:isOpen?color:"#666",fontWeight:600,marginBottom:3}}>{label}</div>
                  <div style={{fontSize:9,color:isOpen?color:"#444",lineHeight:1,transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
                </div>
              );
            })}
          </div>

          {/* قائمة الحجوزات المنسدلة */}
          {activeCard&&(
            <div style={{animation:"fadeInUp .3s ease-out",marginBottom:14,border:`1.5px solid ${activeCard==="all"?"#d4a017":activeCard==="pending"?"#f39c12":activeCard==="approved"?"#27ae60":"#e74c3c"}33`,borderTop:"none",borderRadius:"0 0 14px 14px",overflow:"hidden",background:"rgba(255,255,255,.02)"}}>
              <NotifPanel key={activeCard} salon={salon} onUpdate={updateBookingStatus} customers={customers} defaultFilter={activeCard} refreshSalonBookings={refreshSalonBookings}/>
            </div>
          )}
        </>
      )}
      {tab==="messages"&&(
        <div>
          {ownerNotifs.length>0&&(
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:12,color:"var(--p)",fontWeight:700}}>🔔 إشعارات الإدارة</div>
                <button onClick={()=>{if(window.confirm("هل تريد مسح كل الإشعارات؟")){localStorage.setItem("dork_notifs","[]");localStorage.setItem("dork_notif_count","0");setOwnerNotifs([]);}}} style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}>🗑 مسح الكل</button>
              </div>
              {ownerNotifs.slice(0,5).map(n=>(
                <div key={n.id} style={{...G.bItem,borderRight:"3px solid var(--p)",marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.icon} {n.title}</div>
                  <div style={{fontSize:12,color:"#aaa"}}>{n.body}</div>
                  <div style={{fontSize:10,color:"#555",marginTop:2}}>{n.time}</div>
                </div>
              ))}
            </div>
          )}
          <MessagesPanel salon={salon} toast$={toast$}/>
        </div>
      )}
      {tab==="calendar"&&<BookingCalendar salon={salon} onUpdate={updateBookingStatus}/>}
      {tab==="reviews"&&<OwnerReviewsPanel salon={salon} reviews={reviews} setReviews={setReviews} toast$={toast$}/>}
      {tab==="stats"&&<StatsPanel salon={salon}/>}
      {tab==="balance"&&(
        <div style={{paddingTop:8}}>
          <div className="balance-tab" style={{background:"linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.06))",borderRadius:14,padding:16,border:"1.5px solid rgba(212,160,23,.3)",marginBottom:12}}>
            <div style={{fontSize:11,color:"#888",marginBottom:8}}>رصيدك المتاح</div>
            <div style={{fontSize:32,fontWeight:900,color:"#d4a017",marginBottom:10,transition:"all .3s ease"}}>{balance} <span style={{fontSize:14}}>ريال</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"rgba(39,174,96,.1)",borderRadius:10,padding:"10px",border:"1px solid #27ae6055",transition:"all .3s ease",cursor:"pointer"}}>
                <div style={{fontSize:10,color:"#888",marginBottom:3}}>المستحق</div>
                <div style={{fontSize:16,fontWeight:700,color:"#27ae60"}}>{totalEarned} ر</div>
              </div>
              <div style={{background:"rgba(212,160,23,.1)",borderRadius:10,padding:"10px",border:"1px solid rgba(212,160,23,.3)",transition:"all .3s ease",cursor:"pointer"}}>
                <div style={{fontSize:10,color:"#888",marginBottom:3}}>المدفوع</div>
                <div style={{fontSize:16,fontWeight:700,color:"#d4a017"}}>{totalPaid} ر</div>
              </div>
            </div>
            {balance>0&&<div style={{background:"rgba(231,76,60,.1)",border:"1px solid #e74c3c55",borderRadius:8,padding:"10px",fontSize:11,color:"#e74c3c",marginTop:10,textAlign:"center",animation:"fadeInUp .5s ease-out .2s both"}}>⚠ يوجد مبلغ مستحق — يُرجى السداد</div>}
          </div>
        </div>
      )}
      {tab==="settings"&&<OwnerSettings salon={salon} setSalons={setSalons} toast$={toast$}/>}
    </div></div>
  );
}


export { OwnerDash };

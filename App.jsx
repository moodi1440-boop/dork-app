        </div>
        {locMethod==="link"
          ?<F error={errors.locationUrl}><input style={fi(errors.locationUrl)} placeholder="https://maps.google.com/..." value={form.locationUrl} onChange={e=>setForm(p=>({...p,locationUrl:e.target.value}))}/><div style={{fontSize:10,color:"#555",marginTop:3}}>افتح Google Maps → الموقع → شارك → انسخ</div></F>
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
        <SL>الحلاقون {errors.barbers&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>— {errors.barbers}</span>}</SL>
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
        <SL>الخدمات والأسعار {errors.services&&<span style={{color:"#e74c3c",fontSize:10,fontWeight:400}}>— {errors.services}</span>}</SL>
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
              <button style={G.pmBtn} onClick={()=>adjustPrice(s,-5)}>−</button>
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

// ══════════════════════════════════════════════
//  ADMIN VIEW
// ══════════════════════════════════════════════
function AdminView({salons,setSalons,customers,setCustomers,setView,deleteSalon,approveSalon,onEnter,adminSession,onPage,setSelSalon,toast$}){
  const[pw,setPw]=useState(""); const[err,setErr]=useState(false);
  const[tab,setTab]=useState("pending");
  const[search,setSearch]=useState("");
  const[adminPwd,setAdminPwd]=useState(ADMIN_PWD);
  const[pwForm,setPwForm]=useState({old:"",n1:"",n2:"",err:""});

  if(!adminSession)return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>لوحة الإدارة</h2></div>
      <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:24,border:"1px solid #2a2a3a",marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔐</div>
        <div style={{fontSize:18,fontWeight:900,color:"#fff",marginBottom:4}}>دخول المشرف</div>
        <div style={{fontSize:12,color:"#666",marginBottom:20}}>منطقة مخصصة للإدارة فقط</div>
        <input type="password" style={{...fi(err),textAlign:"center",fontSize:16,letterSpacing:4,marginBottom:8}} placeholder="••••••••" value={pw}
          onChange={e=>{setPw(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&(pw===adminPwd?onEnter():setErr(true))}/>
        {err&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:8}}>❌ كلمة المرور غير صحيحة</div>}
        <button style={{...G.sub,marginTop:4}} onClick={()=>pw===adminPwd?onEnter():setErr(true)}>دخول</button>
        <div style={{fontSize:10,color:"#333",marginTop:10}}>للتجربة: admin123</div>
      </div>
    </div></div>
  );

  const pending=salons.filter(s=>s.status==="pending");
  const approved=salons.filter(s=>s.status==="approved");
  const rejected=salons.filter(s=>s.status==="rejected");
  const totalBk=salons.reduce((a,s)=>a+s.bookings.length,0);
  const todayBk=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.date===todayStr()).length,0);
  const totalRev=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status==="approved").reduce((x,b)=>x+(b.total||0),0),0);
  const todayRev=salons.reduce((a,s)=>a+s.bookings.filter(b=>b.status==="approved"&&b.date===todayStr()).reduce((x,b)=>x+(b.total||0),0),0);

  const q=search.trim().toLowerCase();
  const filterSalons=list=>!q?list:list.filter(s=>[s.name,s.owner,s.phone,s.ownerPhone,s.region,s.gov,s.village].join(" ").toLowerCase().includes(q));
  const allBookings=salons.flatMap(s=>s.bookings.map(b=>({...b,salonName:s.name}))).sort((a,b)=>b.date>a.date?1:-1);
  const filteredBookings=!q?allBookings:allBookings.filter(b=>[b.name,b.phone,b.salonName,b.date].join(" ").toLowerCase().includes(q));
  const filteredCustomers=!q?customers:customers.filter(c=>[c.name,c.phone].join(" ").toLowerCase().includes(q));

  // رسم بياني — آخر 6 أشهر
  const monthlyData=(()=>{
    const months=[];
    for(let i=5;i>=0;i--){
      const d=new Date(); d.setMonth(d.getMonth()-i);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()];
      const count=allBookings.filter(b=>b.date?.startsWith(key)).length;
      months.push({label,count,key});
    }
    return months;
  })();
  const maxCount=Math.max(...monthlyData.map(m=>m.count),1);

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>🔐 لوحة الإدارة</h2></div>

      {/* إشعار صالون جديد */}
      {pending.length>0&&(
        <div style={{background:"rgba(212,160,23,.1)",border:"1.5px solid var(--pa4)",borderRadius:11,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🔔</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--p)"}}>يوجد {pending.length} طلب {pending.length===1?"جديد":"جديدة"} بانتظار مراجعتك</div>
            <div style={{fontSize:11,color:"#888"}}>{pending.map(s=>s.name).join(" · ")}</div>
          </div>
          <button style={{...G.tabBtn,...G.tabOn,fontSize:11,padding:"5px 10px",flexShrink:0}} onClick={()=>setTab("pending")}>عرض</button>
        </div>
      )}

      {/* احصائيات */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {[
          {n:approved.length,l:"صالون مفعّل",c:"#27ae60",i:"✂"},
          {n:pending.length,l:"بانتظار الموافقة",c:"var(--p)",i:"⏳"},
          {n:totalBk,l:"إجمالي الحجوزات",c:"#6aadff",i:"📅"},
          {n:todayBk,l:"حجوزات اليوم",c:"#a78bfa",i:"🕐"},
          {n:totalRev,l:"إجمالي الإيرادات",c:"#f0c040",i:"💰",s:" ر"},
          {n:todayRev,l:"إيرادات اليوم",c:"#34d399",i:"💵",s:" ر"},
        ].map(({n,l,c,i,s})=>(
          <div key={l} style={{background:"#13131f",borderRadius:13,padding:"13px 10px",textAlign:"center",border:`1px solid ${c}33`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:8,right:10,fontSize:20,opacity:.12}}>{i}</div>
            <div style={{fontSize:22,fontWeight:900,color:c,marginBottom:2}}>{n}{s||""}</div>
            <div style={{fontSize:10,color:"#888"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* رسم بياني — الحجوزات الشهرية */}
      <div style={{background:"#13131f",borderRadius:13,padding:"14px 12px",marginBottom:12,border:"1px solid #2a2a3a"}}>
        <div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:12}}>📈 الحجوزات — آخر 6 أشهر</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:70}}>
          {monthlyData.map((m,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:10,color:"var(--p)",fontWeight:700}}>{m.count||""}</div>
              <div style={{width:"100%",background:`linear-gradient(180deg,var(--p),var(--pd))`,borderRadius:"4px 4px 0 0",height:`${Math.max((m.count/maxCount)*50,m.count?4:0)}px`,minHeight:m.count?4:0,transition:"height .3s"}}/>
              <div style={{fontSize:9,color:"#555",textAlign:"center",lineHeight:1.2}}>{m.label.slice(0,3)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* بحث */}
      <div style={{...G.searchRow,marginBottom:12}}>
        <span style={{fontSize:14,color:"#555"}}>🔍</span>
        <input style={G.searchInput} placeholder="ابحث بالاسم أو الجوال أو المنطقة..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {search&&<button style={G.searchClear} onClick={()=>setSearch("")}>✕</button>}
      </div>

      {/* تبويبات */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:12}}>
        {[
          {k:"pending",l:"⏳ الطلبات",n:pending.length},
          {k:"approved",l:"✅ المفعّلة",n:approved.length},
          {k:"rejected",l:"❌ المرفوضة",n:rejected.length},
          {k:"salons",l:"✂ الصالونات",n:salons.length},
          {k:"bookings",l:"📋 الحجوزات",n:totalBk},
          {k:"customers",l:"👥 العملاء",n:customers.length},
          {k:"password",l:"🔑 كلمة المرور",n:0},
        ].map(({k,l,n})=>(
          <button key={k} style={{...G.tabBtn,fontSize:11,...(tab===k?G.tabOn:{})}} onClick={()=>setTab(k)}>
            {l}{n>0&&k!=="password"&&<span style={{...G.notifDot,background:tab===k?"var(--p)":"#555",marginRight:3}}>{n}</span>}
          </button>
        ))}
      </div>

      {/* الطلبات */}
      {tab==="pending"&&(filterSalons(pending).length===0
        ?<div style={G.empty}>{search?"لا نتائج":"لا توجد طلبات معلّقة 🎉"}</div>
        :<>
          {filterSalons(pending).length>1&&(
            <button style={{...G.accBtn,width:"100%",marginBottom:10,padding:10}} onClick={()=>{if(confirm(`قبول جميع الطلبات (${filterSalons(pending).length}) دفعة واحدة؟`))filterSalons(pending).forEach(s=>approveSalon(s.id,"approved"));}}>
              ✅ قبول الكل ({filterSalons(pending).length})
            </button>
          )}
          {filterSalons(pending).map(s=>(
            <div key={s.id} style={{...G.bItem,marginBottom:10,border:"1px solid var(--pa25)",borderRight:"4px solid var(--p)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                  <div style={{fontSize:11,color:"#aaa"}}>👤 {s.owner} · 📞 {s.phone}</div>
                  <div style={{fontSize:11,color:"#aaa"}}>📍 {s.gov||s.region}{s.village?` · ${s.village}`:""}</div>
                  <div style={{fontSize:11,color:"#aaa"}}>🕐 {s.shiftEnabled?`${s.shift1Start}-${s.shift1End} | ${s.shift2Start}-${s.shift2End}`:`${s.workStart}-${s.workEnd}`}</div>
                </div>
                <button style={G.pageBtn} onClick={()=>{setSelSalon(s);setView("salon");}}>معاينة</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {(s.services||[]).map(sv=><span key={sv} style={G.tag}>{sv}</span>)}
              </div>
              <div style={{display:"flex",gap:7}}>
                <button style={{...G.accBtn,flex:2}} onClick={()=>approveSalon(s.id,"approved")}>✅ قبول ونشر</button>
                <button style={{...G.rejBtn,flex:1}} onClick={()=>{
                  const reason=prompt("سبب الرفض (اختياري):");
                  approveSalon(s.id,"rejected",reason||"");
                }}>❌ رفض</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* المفعّلة */}
      {tab==="approved"&&(filterSalons(approved).length===0
        ?<div style={G.empty}>{search?"لا نتائج":"لا توجد صالونات مفعّلة"}</div>
        :<>
          <button style={{...G.sub,marginBottom:10,background:"#1a3a1a",border:"1px solid #27ae60",color:"#4caf50"}} onClick={()=>{
            const rows=[["الاسم","المالك","الجوال","المنطقة","المحافظة","الحجوزات","التقييم"],...filterSalons(approved).map(s=>[s.name,s.owner,s.phone,s.region,s.gov||"",s.bookings.length,s.rating||""])];
            const csv=rows.map(r=>r.join(",")).join("\n");
            const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);a.download="salons.csv";a.click();
          }}>📥 تصدير CSV</button>
          <AdminApprovedList salons={filterSalons(approved)} setSalons={setSalons} deleteSalon={deleteSalon} setSelSalon={setSelSalon} setView={setView} toast$={toast$}/>
        </>
      )}

      {/* المرفوضة */}
      {tab==="rejected"&&(filterSalons(rejected).length===0
        ?<div style={G.empty}>{search?"لا نتائج":"لا توجد صالونات مرفوضة"}</div>
        :filterSalons(rejected).map(s=>(
          <div key={s.id} style={{...G.bItem,marginBottom:8,borderRight:"3px solid #e74c3c"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                <div style={{fontSize:11,color:"#888"}}>{s.phone}</div>
              </div>
              <div style={{display:"flex",gap:5}}>
                <button style={G.accBtn} onClick={()=>approveSalon(s.id,"approved")}>✅ قبول</button>
                <button style={G.delBtn} onClick={()=>deleteSalon(s.id)}>🗑</button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* الحجوزات */}
      {tab==="bookings"&&(filteredBookings.length===0
        ?<div style={G.empty}>{search?"لا نتائج":"لا توجد حجوزات"}</div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filteredBookings.map((b,i)=>{
            const sc=b.status==="approved"?"#27ae60":b.status==="rejected"?"#e74c3c":"var(--p)";
            const sl=b.status==="approved"?"✅ مقبول":b.status==="rejected"?"❌ مرفوض":"⏳ انتظار";
            return(
              <div key={i} style={{...G.bItem,borderRight:`3px solid ${sc}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {b.salonName}</div>
                    <div style={{fontSize:11,color:"#aaa"}}>👤 {b.name} · 📞 {b.phone}</div>
                    <div style={{fontSize:11,color:"#aaa"}}>📅 {b.date} · 🕐 {b.time}</div>
                    <div style={{fontSize:11,color:"#aaa"}}>{(b.services||[]).join(" + ")}</div>
                  </div>
                  <div style={{textAlign:"left",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>{b.total||0} ر</div>
                    <div style={{fontSize:10,color:sc,marginTop:3}}>{sl}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* الصالونات بالاسم */}
      {tab==="salons"&&(()=>{
        const allSalons=!q?salons:salons.filter(s=>[s.name,s.owner,s.phone,s.region,s.gov].join(" ").toLowerCase().includes(q));
        const sorted=[...allSalons].sort((a,b)=>a.name.localeCompare(b.name,"ar"));
        return sorted.length===0
          ?<div style={G.empty}>{search?"لا نتائج":"لا توجد صالونات"}</div>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(s=>{
              const stColor=s.status==="approved"?"#27ae60":s.status==="rejected"?"#e74c3c":"var(--p)";
              const stLabel=s.status==="approved"?"✅":"❌";
              return(
                <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name} {stLabel}</div>
                      <div style={{fontSize:11,color:"#888"}}>👤 {s.owner} · 📞 {s.phone}</div>
                      <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?" · "+s.village:""}</div>
                      <div style={{display:"flex",gap:8,marginTop:3}}>
                        <span style={{fontSize:10,color:"#4caf50"}}>📅 {s.bookings.length} حجز</span>
                        <span style={{fontSize:10,color:"var(--p)"}}>⭐ {s.rating||0}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{setSelSalon(s);setView("salon");}}>📋 صفحة</button>
                      {s.status==="pending"&&<button style={{...G.accBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>approveSalon(s.id,"approved")}>✅ قبول</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>;
      })()}

      {/* العملاء */}
      {tab==="customers"&&(filteredCustomers.length===0
        ?<div style={G.empty}>{search?"لا نتائج":"لا يوجد عملاء مسجلون"}</div>
        :<AdminCustomerList customers={filteredCustomers} salons={salons} toast$={toast$} setCustomers={setCustomers}/>
      )}

      {/* كلمة المرور */}
      {tab==="password"&&(
        <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>🔑 تغيير كلمة مرور الإدارة</div>
          {[{l:"كلمة المرور الحالية",k:"old"},{l:"كلمة المرور الجديدة",k:"n1"},{l:"تأكيد كلمة المرور",k:"n2"}].map(({l,k})=>(
            <div key={k} style={{marginBottom:10}}>
              <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4,fontWeight:600}}>{l}</label>
              <input type="password" style={fi(pwForm.err&&k==="old")} value={pwForm[k]} onChange={e=>setPwForm(p=>({...p,[k]:e.target.value,err:""}))}/>
            </div>
          ))}
          {pwForm.err&&<div style={{color:"#e74c3c",fontSize:12,marginBottom:8}}>❌ {pwForm.err}</div>}
          <button style={G.sub} onClick={()=>{
            if(pwForm.old!==adminPwd){setPwForm(p=>({...p,err:"كلمة المرور الحالية غير صحيحة"}));return;}
            if(pwForm.n1.length<4){setPwForm(p=>({...p,err:"كلمة المرور قصيرة جداً"}));return;}
            if(pwForm.n1!==pwForm.n2){setPwForm(p=>({...p,err:"كلمتا المرور غير متطابقتين"}));return;}
            setAdminPwd(pwForm.n1);
            setPwForm({old:"",n1:"",n2:"",err:""});
            toast$&&toast$("✅ تم تغيير كلمة المرور");
          }}>💾 حفظ كلمة المرور الجديدة</button>
          <div style={{fontSize:11,color:"#555",marginTop:8}}>⚠️ تُحفظ في الجلسة الحالية فقط</div>
        </div>
      )}

    </div></div>
  );
}

// ══════════════════════════════════════════════
//  OWNER LOGIN + DASHBOARD
// ══════════════════════════════════════════════
function OwnerLogin({salons,setOwnerSession,setView,toast$}){
  const[phone,setPhone]=useState(""); const[err,setErr]=useState("");
  const login=()=>{
    const s=salons.find(x=>x.ownerPhone===phone.trim()||x.phone===phone.trim());
    if(!s){setErr("لا يوجد صالون بهذا الرقم");return;}
    setOwnerSession(s.id); setView("ownerDash");
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>دخول صاحب الصالون</h2></div>
      <div style={G.fc}>
        <SL>أدخل رقم جوالك المسجّل</SL>
        <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
        <button style={G.sub} onClick={login}>دخول</button>
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
function OwnerDash({salon,setView,setOwnerSession,updateBookingStatus,setSalons,toast$}){
  const[tab,setTab]=useState("notif");
  if(!salon)return <div style={G.page}><div style={G.fp}><div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>لوحة الصالون</h2></div><div style={G.empty}>الصالون غير موجود</div></div></div>;
  const pending=salon.bookings.filter(b=>b.status==="pending").length;
  const statusColor=salon.status==="approved"?"#27ae60":salon.status==="rejected"?"#e74c3c":"var(--pl)";
  const statusLabel=salon.status==="approved"?"✅ مفعّل":salon.status==="rejected"?"❌ مرفوض":"⏳ انتظار موافقة الإدارة";
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={{...G.ft,flex:1}}>لوحة صالوني</h2><button style={{...G.delBtn,border:"1.5px solid #888",color:"#aaa",background:"transparent"}} onClick={()=>{setOwnerSession(null);setView("home");}}>خروج</button></div>
      <div style={G.salonBadge}>
        <span style={{fontSize:20,color:"var(--p)"}}>✂</span>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{salon.name}</div><div style={{fontSize:11,color:"#888"}}>{salon.gov||salon.region}{salon.village?` · ${salon.village}`:""}</div></div>
        <span style={{fontSize:11,fontWeight:700,color:statusColor,background:`${statusColor}22`,padding:"3px 8px",borderRadius:8}}>{statusLabel}</span>
      </div>
      {salon.status!=="approved"&&<div style={{background:"rgba(240,192,64,.08)",border:"1px solid var(--pl)55",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--pl)"}}>🔔 صالونك في انتظار موافقة الإدارة — سيظهر للعملاء بعد القبول</div>}
      <div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="notif"?G.tabOn:{})}} onClick={()=>setTab("notif")}>🔔 الحجوزات {pending>0&&<span style={G.notifDot}>{pending}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="stats"?G.tabOn:{})}} onClick={()=>setTab("stats")}>📊 إحصائيات</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙️ إعدادات</button>
      </div>
      {tab==="notif"&&<NotifPanel salon={salon} onUpdate={updateBookingStatus}/>}
      {tab==="stats"&&<StatsPanel salon={salon}/>}
      {tab==="settings"&&<OwnerSettings salon={salon} setSalons={setSalons} toast$={toast$}/>}
    </div></div>
  );
}

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
        {[{id:"info",icon:"📋",label:"المعلومات"},{id:"hours",icon:"🕐",label:"الأوقات"},{id:"services",icon:"✂",label:"الخدمات"},{id:"barbers",icon:"💈",label:"الحلاقون"},{id:"tone",icon:"🔔",label:"النغمة"}].map(s=>(
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
          <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,background:"#0d0d1a",borderRadius:9,padding:"9px 11px",border:"1px solid #2a2a3a"}}>
            <span style={{fontSize:16}}>💈</span>
            <input style={{...inp,flex:1,padding:"6px 10px"}} value={b.name} onChange={e=>setF(p=>({...p,barbers:p.barbers.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))}/>
            <button style={G.xBtn} onClick={()=>setF(p=>({...p,barbers:p.barbers.filter((_,j)=>j!==i)}))}>✕</button>
          </div>
        ))}
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <input style={{...inp,flex:1}} placeholder="اسم الحلاق الجديد" value={newBarber} onChange={e=>setNewBarber(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim()}]}));setNewBarber("");}}}/>
          <button style={{...G.sub,width:"auto",padding:"0 14px",marginTop:0}} onClick={()=>{if(newBarber.trim()){setF(p=>({...p,barbers:[...p.barbers,{id:`b_${Date.now()}`,name:newBarber.trim()}]}));setNewBarber("");}}}>+ إضافة</button>
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

      <button style={{...G.sub,marginTop:4,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
        {saving?"⏳ جاري الحفظ...":"💾 حفظ التعديلات"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════
//  CUSTOMER LOGIN + DASHBOARD
// ══════════════════════════════════════════════
function CustomerLogin({customers,setCustomers,setCustomerSession,setView,toast$}){
  const[tab,setTab]=useState("login");
  const[phone,setPhone]=useState(""); const[name,setName]=useState(""); const[err,setErr]=useState("");
  const login=async()=>{
    try{
      const rows=await sb("customers","GET",null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
      if(!rows.length){setErr("لا يوجد حساب بهذا الرقم");return;}
      const c=toAppCustomer(rows[0]);
      setCustomerSession(c); setView("custDash");
    }catch(e){setErr("خطأ: "+e.message);}
  };
  const register=async()=>{
    if(!name.trim()||!phone.trim()){setErr("أدخل الاسم والجوال");return;}
    try{
      const exists=await sb("customers","GET",null,`?phone=eq.${encodeURIComponent(phone.trim())}`);
      if(exists.length){setErr("الرقم مسجل بالفعل");return;}
      const rows=await sb("customers","POST",{name:name.trim(),phone:phone.trim(),history:[],favs:[],points:0},"");
      const nc=toAppCustomer(rows[0]);
      setCustomerSession(nc); setView("custDash");
    }catch(e){setErr("خطأ: "+e.message);}
  };
  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>حساب العميل 👤</h2></div>
      <div style={{display:"flex",gap:7,marginBottom:14}}>
        <button style={{...G.toggleBtn,...(tab==="login"?G.toggleOn:{})}} onClick={()=>{setTab("login");setErr("");}}>دخول</button>
        <button style={{...G.toggleBtn,...(tab==="reg"?G.toggleOn:{})}} onClick={()=>{setTab("reg");setErr("");}}>حساب جديد</button>
      </div>
      <div style={G.fc}>
        {tab==="login"?<>
          <SL>تسجيل الدخول</SL>
          <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <button style={G.sub} onClick={login}>دخول</button>
        </>:<>
          <SL>إنشاء حساب جديد</SL>
          <F label="الاسم"><input style={fi()} placeholder="اسمك الكريم" value={name} onChange={e=>setName(e.target.value)}/></F>
          <F label="رقم الجوال" error={err}><input style={fi(err)} placeholder="05XXXXXXXX" value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}}/></F>
          <button style={G.sub} onClick={register}>إنشاء الحساب</button>
        </>}
      </div>
    </div></div>
  );
}
function CustomerDash({customer,salons,setSalons,setView,setCustomerSession,setSelSalon,toggleFav,favSet,setCustomers}){
  const[tab,setTab]=useState("favs");
  const[editMode,setEditMode]=useState(false);
  const[editName,setEditName]=useState(customer?.name||"");
  const[editPhone,setEditPhone]=useState(customer?.phone||"");
  const[reminderMins,setReminderMins]=useState(60);
  if(!customer)return null;

  const favSalons=salons.filter(s=>favSet.has(s.id)&&s.status==="approved");
  const history=customer.history||[];
  const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
  const points=customer.points!==undefined?customer.points:history.length*10;
  const badge=points>=200?"🏆 عميل مميز":points>=100?"⭐ عميل نشط":"🆕 عميل جديد";
  
  // avatar بالحرف الأول
  const initials=(customer.name||"?")[0];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

  const saveEdit=async()=>{
    if(!editName.trim()){return;}
    try{
      await sb("customers","PATCH",{name:editName.trim(),phone:editPhone.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim()}:c));
      setEditMode(false);
    }catch(e){alert("خطأ: "+e.message);}
  };

  const deleteAccount=async()=>{
    if(!confirm("حذف حسابك نهائياً؟ لا يمكن التراجع!")){return;}
    try{
      await sb("customers","DELETE",null,`?id=eq.${customer.id}`);
      setCustomerSession(null);setView("home");
    }catch(e){alert("خطأ: "+e.message);}
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
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={{...G.ft,flex:1}}>حسابي</h2><button style={{...G.delBtn,border:"1.5px solid #888",color:"#aaa",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("home");}}>خروج</button></div>

      {/* بروفايل العميل */}
      {!editMode?(
        <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1px solid #2a2a3a",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#000",flexShrink:0}}>{initials}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{customer.name}</div>
              <div style={{fontSize:12,color:"#888"}}>📞 {customer.phone}</div>
              <div style={{fontSize:11,color:avatarColor,marginTop:2}}>{badge}</div>
            </div>
            <button style={{...G.pageBtn,fontSize:11}} onClick={()=>setEditMode(true)}>✏️ تعديل</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{v:history.length,l:"حجز",c:"#6aadff"},{v:totalSpent+" ر",l:"إجمالي",c:"#f0c040"},{v:points,l:"نقطة 🎁",c:"#27ae60"}].map(({v,l,c})=>(
              <div key={l} style={{background:"#0d0d1a",borderRadius:10,padding:"10px 6px",textAlign:"center",border:`1px solid ${c}33`}}>
                <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:10,color:"#888"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      ):(
        <div style={{background:"#13131f",borderRadius:16,padding:16,border:"1px solid var(--pa25)",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>✏️ تعديل البيانات</div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>الاسم</label><input style={inp2} value={editName} onChange={e=>setEditName(e.target.value)}/></div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>رقم الجوال</label><input style={inp2} value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></div>
          <div style={{display:"flex",gap:8}}>
            <button style={G.sub} onClick={saveEdit}>💾 حفظ</button>
            <button style={{...G.delBtn,padding:"12px 14px"}} onClick={()=>setEditMode(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* تبويبات */}
      <div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>♥ المفضلة {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>📋 حجوزاتي</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙️ الحساب</button>
      </div>

      {/* المفضلة */}
      {tab==="favs"&&<>
        {favSalons.length===0?<div style={G.empty}>لم تضف صالوناً للمفضلة بعد</div>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {favSalons.map(s=>(
              <div key={s.id} style={G.bItem}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                    <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?` · ${s.village}`:""}</div>
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
              const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":"#f39c12";
              const stLabel=status==="approved"?"✅ مقبول":status==="rejected"?"❌ مرفوض":"⏳ بانتظار الموافقة";
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s?.name||h.salonName||"صالون"}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>📅 {h.date} · 🕐 {h.time}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>💰 {h.total||0} ريال</div>
                      <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=h.rating?"#f0c040":"#333"}}>★</span>)}</div>}
                      {s&&<button style={{...G.bookBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{setSelSalon(s);setView("book");}}>🔄 احجز مجدداً</button>}
                      <button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>🔔 ذكّرني</button>
                    </div>
                  </div>
                  {/* التقييم فقط بعد القبول */}
                  {status==="approved"&&<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                    const rev=[...history].reverse();
                    const wasRated=rev[i]?.rating>0;
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    const bonusPoints=wasRated?0:5;
                    const newPoints=(customer.points||0)+bonusPoints;
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated,points:newPoints}:c));
                    try{await sb("customers","PATCH",{history:updated,points:newPoints},`?id=eq.${customer.id}`);}catch{
                      try{localStorage.setItem(`hist_${customer.id}`,JSON.stringify(updated));}catch{}
                      try{localStorage.setItem(`pts_${customer.id}`,String(newPoints));}catch{}
                    }
                    try{
                      const salonId=h.salonId;
                      const allRatings=updated.filter(x=>Number(x.salonId)===Number(salonId)&&x.rating>0).map(x=>x.rating);
                      const newRating=allRatings.length?Math.round(allRatings.reduce((a,x)=>a+x,0)/allRatings.length*10)/10:r;
                      await sb("salons","PATCH",{rating:newRating},`?id=eq.${salonId}`);
                      setSalons(p=>p.map(s=>s.id===Number(salonId)||s.id===salonId?{...s,rating:newRating}:s));
                    }catch{}
                  }}/>}
                </div>
              );
            })}
          </div>}
      </>}

      {/* إعدادات الحساب */}
      {tab==="settings"&&(
        <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>⚙️ إعدادات الحساب</div>
          <div style={{fontSize:12,color:"#888",marginBottom:16,lineHeight:1.8}}>
            <div>👤 الاسم: <span style={{color:"#fff",fontWeight:700}}>{customer.name}</span></div>
            <div>📞 الجوال: <span style={{color:"#fff",fontWeight:700}}>{customer.phone}</span></div>
            <div>🎁 النقاط: <span style={{color:"#27ae60",fontWeight:700}}>{points} نقطة</span></div>
            <div>📋 الحجوزات: <span style={{color:"var(--p)",fontWeight:700}}>{history.length} حجز</span></div>
          </div>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>{setTab("favs");setEditMode(true);}}>✏️ تعديل البيانات</button>
          <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>🗑 حذف الحساب نهائياً</button>
          <div style={{fontSize:10,color:"#555",marginTop:8,textAlign:"center"}}>تحذير: حذف الحساب لا يمكن التراجع عنه</div>
        </div>
      )}

    </div></div>
  );
}



function InlineStarRating({rated,comment,onRate}){
  const[hover,setHover]=useState(0);
  const[sel,setSel]=useState(0);
  const[txt,setTxt]=useState("");
  const labels=["","ضعيف","مقبول","جيد","جيد جداً","ممتاز"];
  if(rated>0) return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{display:"flex",gap:1,marginBottom:comment?4:0}}>
        {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=rated?"#f0c040":"#333"}}>★</span>)}
        <span style={{fontSize:11,color:"#888",marginRight:6,alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment&&<div style={{fontSize:12,color:"#aaa",fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );
  return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{fontSize:11,color:"#666",marginBottom:5}}>قيّم تجربتك في هذا الصالون:</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{fontSize:28,cursor:"pointer",color:n<=(hover||sel)?"#f0c040":"#2a2a3a",transition:"color .1s",lineHeight:1,userSelect:"none"}}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}>★</span>
        ))}
        {(hover||sel)>0&&<span style={{fontSize:11,color:"var(--p)",marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel>0&&<>
        <textarea
          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"none",minHeight:60,marginBottom:8}}
          placeholder="أضف تعليقاً (اختياري)..."
          value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button style={{...G.sub,padding:"8px 0",fontSize:12}} onClick={()=>onRate(sel,txt)}>
          إرسال التقييم ⭐
        </button>
      </>}
    </div>
  );
}

function AdminCustomerList({customers,salons,toast$,setCustomers}){
  const[selId,setSelId]=useState(null);
  const[notes,setNotes]=useState({});
  const[blocked,setBlocked]=useState({});
  const[custSearch,setCustSearch]=useState("");
  const[pointsAdj,setPointsAdj]=useState("");
  const sel=selId?customers.find(c=>c.id===selId):null;

  const filtered=!custSearch.trim()?customers:customers.filter(c=>
    c.name?.toLowerCase().includes(custSearch.toLowerCase())||
    c.phone?.includes(custSearch.trim())
  );

  const adjustPoints=async(customerId,delta,reason)=>{
    const c=customers.find(x=>x.id===customerId);
    if(!c)return;
    const newPoints=Math.max(0,(c.points||0)+delta);
    try{
      await sb("customers","PATCH",{points:newPoints},`?id=eq.${customerId}`);
      setCustomers(p=>p.map(x=>x.id===customerId?{...x,points:newPoints}:x));
      try{localStorage.setItem(`pts_${customerId}`,String(newPoints));}catch{}
      toast$&&toast$(`✅ تم تعديل النقاط: ${delta>0?"+":""}${delta} — ${reason||"يدوي"}`);
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
  };

  if(sel){
    const history=sel.history||[];
    const favs=sel.favs||[];
    const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
    const currentPoints=sel.points!==undefined?sel.points:history.length*10;
    const isBlocked=blocked[sel.id];
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button style={G.bb} onClick={()=>setSelId(null)}>→</button>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>👤 {sel.name}</span>
          {isBlocked&&<span style={{fontSize:11,background:"rgba(231,76,60,.2)",color:"#e74c3c",padding:"2px 8px",borderRadius:20,fontWeight:700}}>محظور</span>}
        </div>

        {/* معلومات */}
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>معلومات العميل</div>
          <div style={{fontSize:13,color:"#fff",marginBottom:4}}>👤 {sel.name}</div>
          <div style={{fontSize:12,color:"#888",marginBottom:4}}>📞 {sel.phone}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:10}}>
            {[{v:history.length,l:"حجز",c:"#6aadff"},{v:totalSpent+" ر",l:"إجمالي",c:"#f0c040"},{v:currentPoints,l:"نقطة",c:"#27ae60"},{v:favs.length,l:"مفضلة",c:"#e74c3c"}].map(({v,l,c})=>(
              <div key={l} style={{background:"#0d0d1a",borderRadius:9,padding:"9px 4px",textAlign:"center",border:`1px solid ${c}33`}}>
                <div style={{fontSize:15,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:9,color:"#888"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* إدارة النقاط */}
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #1e3a1e",marginBottom:10}}>
          <div style={{fontSize:12,color:"#27ae60",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>🎁 إدارة نقاط العميل</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{fontSize:22,fontWeight:900,color:"#27ae60"}}>{currentPoints}</div>
            <div style={{fontSize:11,color:"#888"}}>نقطة متاحة</div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            {[{d:10,l:"+10",c:"#27ae60"},{d:25,l:"+25",c:"#27ae60"},{d:50,l:"+50",c:"#27ae60"},{d:-10,l:"-10",c:"#e74c3c"},{d:-25,l:"-25",c:"#e74c3c"}].map(({d,l,c})=>(
              <button key={l} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${c}44`,background:`${c}18`,color:c,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
                onClick={()=>adjustPoints(sel.id,d,d>0?"مكافأة يدوية":"خصم يدوي")}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <input type="number" placeholder="قيمة مخصصة..." value={pointsAdj} onChange={e=>setPointsAdj(e.target.value)}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",direction:"rtl"}}/>
            <button style={{...G.sub,width:"auto",padding:"0 12px",marginTop:0,background:"rgba(39,174,96,.2)",border:"1px solid #27ae60",color:"#27ae60"}}
              onClick={()=>{const v=parseInt(pointsAdj);if(!isNaN(v)&&v!==0){adjustPoints(sel.id,v,v>0?"إضافة مخصصة":"خصم مخصص");setPointsAdj("");}}}>✓ تطبيق</button>
          </div>
        </div>

        {/* سجل الحجوزات */}
        {history.length>0&&<div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>📋 سجل الحجوزات</div>
          {[...history].reverse().slice(0,5).map((h,i)=>{
            const s=salons.find(x=>x.id===h.salonId);
            return(
              <div key={i} style={{padding:"7px 0",borderBottom:"1px solid #1e1e2e"}}>
                <div style={{fontSize:12,color:"#fff",fontWeight:600}}>✂ {s?.name||"صالون محذوف"}</div>
                <div style={{fontSize:11,color:"#888"}}>📅 {h.date} · 💰 {h.total||0} ر</div>
              </div>
            );
          })}
        </div>}

        {/* ملاحظة */}
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8}}>📝 ملاحظة داخلية</div>
          <textarea style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"vertical",minHeight:70}}
            placeholder="ملاحظة خاصة عن هذا العميل..." value={notes[sel.id]||""}
            onChange={e=>setNotes(p=>({...p,[sel.id]:e.target.value}))}/>
          <button style={{...G.sub,marginTop:6}} onClick={()=>toast$&&toast$("✅ تم حفظ الملاحظة")}>💾 حفظ الملاحظة</button>
        </div>

        {/* أزرار الإجراءات */}
        <div style={{display:"flex",gap:8}}>
          <button style={{flex:1,padding:"10px 0",borderRadius:9,border:`1.5px solid ${isBlocked?"#27ae60":"#f39c12"}`,background:isBlocked?"rgba(39,174,96,.12)":"rgba(243,156,18,.12)",color:isBlocked?"#27ae60":"#f39c12",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
            onClick={()=>{setBlocked(p=>({...p,[sel.id]:!isBlocked}));toast$&&toast$(isBlocked?"✅ تم رفع الحظر":"🚫 تم حظر العميل");}}>
            {isBlocked?"✅ رفع الحظر":"🚫 حظر العميل"}
          </button>
          <button style={{...G.delBtn,flex:1,padding:"10px 0",textAlign:"center"}} onClick={async()=>{
            const reason=prompt("سبب الحذف (اختياري):");
            if(!confirm(`حذف العميل "${sel.name}"؟${reason?"\nالسبب: "+reason:""}`))return;
            try{
              await sb("customers","DELETE",null,`?id=eq.${sel.id}`);
              setCustomers(p=>p.filter(c=>c.id!==sel.id));
              toast$&&toast$("🗑 تم حذف العميل"+(reason?" — السبب: "+reason:""));
              setSelId(null);
            }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
          }}>🗑 حذف</button>
        </div>
      </div>
    );
  }

  return(
    <div>
      {/* بحث العملاء */}
      <div style={{...G.searchRow,marginBottom:10}}>
        <span style={{fontSize:14,color:"#555"}}>🔍</span>
        <input style={G.searchInput} placeholder="ابحث بالاسم أو رقم الجوال..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
        {custSearch&&<button style={G.searchClear} onClick={()=>setCustSearch("")}>✕</button>}
      </div>
      {filtered.length===0&&<div style={G.empty}>لا نتائج</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(c=>{
          const isBlocked=blocked[c.id];
          return(
            <div key={c.id} style={{...G.bItem,borderRight:`3px solid ${isBlocked?"#e74c3c":"#6aadff"}`,cursor:"pointer"}} onClick={()=>setSelId(c.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>👤 {c.name}</div>
                    {isBlocked&&<span style={{fontSize:10,background:"rgba(231,76,60,.2)",color:"#e74c3c",padding:"1px 6px",borderRadius:20}}>محظور</span>}
                  </div>
                  <div style={{fontSize:11,color:"#888"}}>📞 {c.phone}</div>
                </div>
                <div style={{textAlign:"left",flexShrink:0}}>
                  <div style={{fontSize:11,color:"#a78bfa"}}>📋 {(c.history||[]).length} حجز</div>
                  <div style={{fontSize:11,color:"#27ae60",marginTop:2}}>🎁 {c.points!==undefined?c.points:(c.history||[]).length*10} نقطة</div>
                  <div style={{fontSize:11,color:"#e74c3c",marginTop:2}}>♥ {(c.favs||[]).length} مفضلة</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminApprovedList({salons,setSalons,deleteSalon,setSelSalon,setView,toast$}){
  const[editId,setEditId]=useState(null);
  const[ef,setEf]=useState(null);
  const[pinned,setPinned]=useState(()=>{try{return JSON.parse(localStorage.getItem("pinned_salons")||"[]");}catch{return[];}});
  const sel=editId?salons.find(s=>s.id===editId):null;

  const togglePin=(id)=>{
    const newPinned=pinned.includes(id)?pinned.filter(x=>x!==id):[...pinned,id];
    setPinned(newPinned);
    localStorage.setItem("pinned_salons",JSON.stringify(newPinned));
    toast$&&toast$(pinned.includes(id)?"📌 تم إلغاء التثبيت":"📌 تم تثبيت الصالون");
  };

  // ترتيب: المثبتة أولاً
  const sortedSalons=[...salons].sort((a,b)=>{
    const ap=pinned.includes(a.id)?1:0;
    const bp=pinned.includes(b.id)?1:0;
    return bp-ap;
  });

  const startEdit=s=>{setEditId(s.id);setEf({name:s.name,owner:s.owner,phone:s.phone,ownerPhone:s.ownerPhone||s.phone,address:s.address,rating:s.rating||5});};
  const save=async()=>{
    try{
      await sb("salons","PATCH",{name:ef.name,owner:ef.owner,phone:ef.phone,owner_phone:ef.ownerPhone,address:ef.address,rating:ef.rating},`?id=eq.${editId}`);
      setSalons(p=>p.map(s=>s.id===editId?{...s,...ef,ownerPhone:ef.ownerPhone}:s));
      toast$&&toast$("✅ تم حفظ التعديلات");setEditId(null);setEf(null);
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
  };

  if(editId&&ef&&sel) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <button style={G.bb} onClick={()=>{setEditId(null);setEf(null);}}>→</button>
        <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>✏️ تعديل بيانات: {sel.name}</span>
      </div>
      <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid var(--pa25)",marginBottom:8}}>
        <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:12,borderBottom:"1px solid #2a2a3a",paddingBottom:6}}>معلومات الصالون</div>
        {[["اسم الصالون","name"],["اسم المالك","owner"],["جوال الصالون","phone"],["جوال المالك (للدخول)","ownerPhone"],["العنوان","address"]].map(([l,k])=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:3,fontWeight:600}}>{l}</label>
            <input style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}}
              value={ef[k]||""} onChange={e=>setEf(f=>({...f,[k]:e.target.value}))}/>
          </div>
        ))}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:3,fontWeight:600}}>التقييم ⭐ (1.0 – 5.0)</label>
          <input type="number" min="1" max="5" step="0.1"
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}}
            value={ef.rating} onChange={e=>setEf(f=>({...f,rating:+e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={G.sub} onClick={save}>💾 حفظ التعديلات</button>
          <button style={{...G.delBtn,padding:"12px 14px",flexShrink:0}} onClick={()=>{const r=prompt("سبب الحذف (اختياري):");if(confirm(`حذف هذا الصالون نهائياً؟${r?"\nالسبب: "+r:""}`)){deleteSalon(editId);setEditId(null);setEf(null);}}}>🗑</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sortedSalons.map(s=>{
        const isPinned=pinned.includes(s.id);
        const lastBk=s.bookings.length?[...s.bookings].sort((a,b)=>b.date>a.date?1:-1)[0]:null;
        return(
        <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${isPinned?"#f0c040":"#27ae60"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                {isPinned&&<span style={{fontSize:10,color:"#f0c040"}}>📌</span>}
              </div>
              <div style={{fontSize:11,color:"#888"}}>👤 {s.owner} · 📞 {s.phone}</div>
              {s.ownerPhone&&s.ownerPhone!==s.phone&&<div style={{fontSize:11,color:"#888"}}>📱 مالك: {s.ownerPhone}</div>}
              <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?" · "+s.village:""}</div>
              <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#4caf50"}}>📅 {s.bookings.length} حجز</span>
                <span style={{fontSize:10,color:"var(--p)"}}>⭐ {s.rating}</span>
                {lastBk&&<span style={{fontSize:10,color:"#6aadff"}}>🕐 آخر نشاط: {lastBk.date}</span>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px",background:isPinned?"rgba(240,192,64,.15)":"rgba(100,60,180,.15)",border:`1px solid ${isPinned?"#f0c040":"#7c4dff"}`,color:isPinned?"#f0c040":"#b39ddb"}} onClick={()=>togglePin(s.id)}>{isPinned?"📌 مثبت":"📌 تثبيت"}</button>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px",background:"rgba(212,160,23,.12)",border:"1px solid var(--p)",color:"var(--p)"}} onClick={()=>startEdit(s)}>✏️ تعديل</button>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{setSelSalon(s);setView("salon");}}>📋 صفحة</button>
              <button style={{...G.delBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{const r=prompt("سبب الحذف (اختياري):");if(confirm(`حذف؟${r?"\nالسبب: "+r:""}`))deleteSalon(s.id);}}>🗑</button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
//  SETTINGS VIEW
// ══════════════════════════════════════════════
function SettingsView({settings,setSettings,setView,toast$}){
  const THEME_OPTIONS=[
    {id:"gold",    label:"ذهبي",    color:"#d4a017",emoji:"✨"},
    {id:"emerald", label:"زمردي",   color:"#10b981",emoji:"🌿"},
    {id:"sapphire",label:"ياقوتي",  color:"#3b82f6",emoji:"💎"},
    {id:"rose",    label:"وردي",    color:"#ec4899",emoji:"🌸"},
    {id:"violet",  label:"بنفسجي",  color:"#8b5cf6",emoji:"🔮"},
    {id:"crimson", label:"قرمزي",   color:"#ef4444",emoji:"🔴"},
  ];

  const applyTheme=(id)=>{
    const t=THEMES[id]||THEMES.gold;
    const r=document.documentElement.style;
    r.setProperty("--p",  t.primary);
    r.setProperty("--pl", t.light);
    r.setProperty("--pd", t.dark);
    r.setProperty("--pll",t.lightest);
    r.setProperty("--pr", t.rgb);
    ["5","07","08","12","15","18","2","25","3","4"].forEach(a=>{
      const pct=a==="4"?.45:a==="3"?.3:a==="25"?.25:a==="2"?.2:a==="18"?.18:a==="15"?.15:a==="12"?.12:a==="08"?.08:a==="07"?.07:.05;
      r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);
    });
    r.setProperty("--grad", `linear-gradient(135deg,${t.primary},${t.light})`);
    r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
    setSettings(s=>({...s,theme:id}));
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>⚙ الإعدادات</h2></div>

      {/* Theme Picker */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:4,paddingBottom:5,borderBottom:"1px solid #2a2a3a"}}>🎨 لون واجهة التطبيق</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>اختر اللون الذي يناسبك — يُطبَّق فوراً</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {THEME_OPTIONS.map(t=>{
            const active=settings.theme===t.id;
            return(
              <button key={t.id} onClick={()=>applyTheme(t.id)}
                style={{padding:"14px 6px",borderRadius:12,border:`2px solid ${active?t.color:"#2a2a3a"}`,background:active?t.color+"22":"#1a1a2e",color:"#fff",cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:active?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all .2s",transform:active?"scale(1.04)":"scale(1)"}}>
                <span style={{fontSize:22}}>{t.emoji}</span>
                <div style={{width:24,height:24,borderRadius:"50%",background:t.color,boxShadow:active?`0 0 0 3px ${t.color}55`:"none"}}/>
                <span style={{fontSize:11,color:active?t.color:"#888"}}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone Picker */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:4,paddingBottom:5,borderBottom:"1px solid #2a2a3a"}}>🔔 نغمة التنبيه</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>اضغط للمعاينة — تُستخدم كنغمة افتراضية للصالونات الجديدة</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(t=>{
            const active=settings.defaultTone===t.id;
            return(
              <button key={t.id} onClick={()=>{setSettings(s=>({...s,defaultTone:t.id}));playTone(t.id,0.8);}}
                style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:active?700:400,textAlign:"center"}}>
                {t.label} {active&&"✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* App Info */}
      <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:16,padding:20,border:"1px solid var(--pa25)",marginBottom:12,textAlign:"center"}}>
        <div style={{fontSize:28,fontWeight:900,color:"var(--p)",letterSpacing:1,marginBottom:4}}>دورك</div>
        <div style={{fontSize:12,color:"#888",marginBottom:2}}>وسيطك للحلاقة والصالونات</div>
        <div style={{fontSize:10,color:"#555"}}>الإصدار 1.0.0 · 2025</div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14}}>
          {[["✂","صالونات"],["👤","عملاء"],["📅","حجوزات"]].map(([i,l])=>(
            <div key={l} style={{textAlign:"center"}}><div style={{fontSize:20}}>{i}</div><div style={{fontSize:10,color:"#666",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #c0392b33",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #c0392b33"}}>⚠️ منطقة الخطر</div>
        <div style={{fontSize:11,color:"#888",marginBottom:12}}>حذف جميع البيانات وإعادة التطبيق لحالته الأولى</div>
        <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{
          if(confirm("⚠️ سيتم حذف جميع البيانات!\n\n• الصالونات\n• الحجوزات\n• حسابات العملاء\n• الإعدادات\n\nهل أنت متأكد؟")){
            localStorage.clear(); 
            alert("⚠️ البيانات في Supabase لن تُحذف من هنا. اذهب إلى Supabase Dashboard لحذف السجلات.");
            window.location.reload();
          }
        }}>🗑 حذف جميع البيانات</button>
      </div>
    </div></div>
  );
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function SL({children}){return <div style={G.sl2}>{children}</div>;}
function F({label,error,children,style}){return <div style={{marginBottom:11,...style}}>{label&&<label style={{display:"block",fontSize:12,color:"#aaa",marginBottom:3,fontWeight:600}}>{label}</label>}{children}{error&&<div style={G.err}>{error}</div>}</div>;}
const fi=(err)=>({width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${err?"#e74c3c":"#2a2a3a"}`,background:"#13131f",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"});

// ══════════════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════════════
const CSS=`
  :root {
    --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23;
    --pa5: rgba(212,160,23,.05); --pa07: rgba(212,160,23,.07); --pa08: rgba(212,160,23,.08);
    --pa12: rgba(212,160,23,.12); --pa15: rgba(212,160,23,.15); --pa18: rgba(212,160,23,.18);
    --pa2: rgba(212,160,23,.2); --pa25: rgba(212,160,23,.25); --pa3: rgba(212,160,23,.3);
    --pa4: rgba(212,160,23,.45);
    --grad: linear-gradient(135deg,#d4a017,#f0c040);
    --grad2: linear-gradient(135deg,#f0c040,#d4a017);
  }
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{direction:rtl;font-family:'Cairo',sans-serif;background:#0d0d1a;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--p);border-radius:4px;}
  .hcard{transition:transform .18s,box-shadow .18s;} .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;}
  input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;} button:active{opacity:.82;}
`;

const G={
  searchRow:{display:"flex",alignItems:"center",gap:8,background:"#13131f",borderRadius:10,border:"1.5px solid #2a2a3a",padding:"9px 12px"},
  searchInput:{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:14,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  searchClear:{background:"#2a2a3a",border:"none",color:"#aaa",cursor:"pointer",borderRadius:"50%",width:22,height:22,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  sortChip:{padding:"6px 12px",borderRadius:20,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0},
  sortChipOn:{background:"var(--pa15)",border:"1.5px solid var(--p)",color:"var(--p)"},
  app:{minHeight:"100vh",background:"#0d0d1a",color:"#f0f0f0",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  page:{maxWidth:480,margin:"0 auto",minHeight:"100vh",paddingBottom:30},
  toast:{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",padding:"10px 22px",borderRadius:11,color:"#fff",fontWeight:700,zIndex:9999,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"},

  // TOP BAR
  topBar:{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"#0d0d1a",borderBottom:"1px solid #2a2a3a",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",maxWidth:480,margin:"0 auto"},
  roleBtn:{width:36,height:36,borderRadius:10,border:"1.5px solid #2a2a3a",background:"#13131f",color:"#aaa",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  roleBtnActive:{border:"1.5px solid var(--p)",color:"var(--p)",background:"rgba(var(--pr),.1)"},
  roleDot:{position:"absolute",top:-4,right:-4,background:"#e74c3c",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  registerTopBtn:{background:"var(--grad)",color:"#000",border:"none",padding:"7px 13px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  fRow:{display:"flex",alignItems:"center",background:"#13131f",borderRadius:9,border:"1.5px solid #2a2a3a",padding:"7px 11px",gap:7},
  fSel:{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},

  toggleBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  toggleOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},

  section:{padding:"10px 14px 0"},
  badge:{background:"var(--p)",color:"#000",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700},
  empty:{textAlign:"center",color:"#555",padding:"36px 0",fontSize:13},

  card:{background:"#13131f",borderRadius:14,padding:13,border:"1px solid #2a2a3a",boxShadow:"0 4px 16px rgba(0,0,0,.3)"},
  cav:{width:38,height:38,borderRadius:10,background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0},
  tag:{background:"#1e1e30",color:"var(--p)",padding:"2px 8px",borderRadius:20,fontSize:10,border:"1px solid #2a2a3a"},
  favBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#555",padding:0,lineHeight:1},
  favOn:{color:"#e74c3c"},

  mapsBtn:{background:"rgba(42,109,217,.12)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  pageBtn:{background:"rgba(100,60,180,.15)",border:"1.5px solid #7c4dff",color:"#b39ddb",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  bookBtn:{flex:1,background:"var(--grad)",color:"#000",border:"none",padding:"8px 0",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},
  delBtn:{background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"5px 9px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  accBtn:{flex:1,background:"rgba(39,174,96,.15)",border:"1.5px solid #27ae60",color:"#4caf50",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},
  rejBtn:{flex:1,background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},

  fp:{padding:"0 13px 24px"},
  fh:{display:"flex",alignItems:"center",gap:8,padding:"12px 0 13px",position:"sticky",top:56,background:"#0d0d1a",zIndex:10},
  bb:{background:"#1a1a2e",border:"none",color:"var(--p)",fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  ft:{fontSize:17,fontWeight:700,color:"#fff"},
  fc:{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10},
  sl2:{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:9,paddingBottom:5,borderBottom:"1px solid #2a2a3a"},
  err:{color:"#e74c3c",fontSize:11,marginTop:2},
  sub:{width:"100%",background:"var(--grad)",color:"#000",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,fontFamily:"'Cairo',sans-serif"},

  salonBadge:{display:"flex",alignItems:"center",gap:8,background:"rgba(var(--pr),.06)",border:"1px solid var(--pa2)",borderRadius:10,padding:"10px 12px",marginBottom:11},
  tabRow:{display:"flex",gap:6,marginBottom:11},
  tabBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3},
  tabOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  notifDot:{background:"#e74c3c",color:"#fff",borderRadius:20,fontSize:9,padding:"1px 5px",fontWeight:700},

  steps:{display:"flex",marginBottom:11},
  si:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.3,transition:"opacity .2s"},
  sd:{width:24,height:24,borderRadius:"50%",background:"var(--p)",color:"#000",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"},

  chip:{padding:"5px 11px",borderRadius:20,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  chipOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  totalBox:{background:"var(--pa07)",border:"1px solid var(--pa2)",borderRadius:8,padding:"7px 11px",fontSize:12,color:"#f0f0f0",marginBottom:10},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10},
  ts:{padding:"8px 3px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#f0f0f0",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",textAlign:"center"},
  tsF:{background:"#160a0a",color:"#444",borderColor:"#2a1414",cursor:"not-allowed"},
  tsS:{background:"var(--pa15)",borderColor:"var(--p)",color:"var(--p)",fontWeight:700},

  bItem:{background:"#13131f",borderRadius:10,padding:"10px 12px",border:"1px solid #2a2a3a"},
  pmBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0},

  locTab:{flex:1,padding:"7px 0",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  locTabOn:{background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff"},
  detectBtn:{width:"100%",background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"10px 0",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  otherBtn:{marginTop:6,width:"100%",background:"transparent",border:"1.5px dashed #2a6dd9",color:"#6aadff",padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  addBarberBtn:{width:"100%",background:"transparent",border:"1.5px dashed var(--p)",color:"var(--p)",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",marginBottom:3},
  ratingBadge:{background:"var(--pa15)",border:"1px solid rgba(var(--pr),.4)",borderRadius:8,padding:"3px 8px",fontSize:12,fontWeight:700,color:"var(--p)",flexShrink:0,display:"flex",alignItems:"center",gap:3},
  heartCardBtn:{width:36,height:36,borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#888",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cairo',sans-serif"},
  heartCardOn:{border:"1.5px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c"},
  xBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #c0392b",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
};
  // avatar بالحرف الأول
  const initials=(customer.name||"?")[0];
  const avatarColors=["#d4a017","#27ae60","#3b82f6","#8b5cf6","#e74c3c"];
  const avatarColor=avatarColors[customer.name?.charCodeAt(0)%avatarColors.length||0];

  const saveEdit=async()=>{
    if(!editName.trim()){return;}
    try{
      await sb("customers","PATCH",{name:editName.trim(),phone:editPhone.trim()},`?id=eq.${customer.id}`);
      setCustomers(p=>p.map(c=>c.id===customer.id?{...c,name:editName.trim(),phone:editPhone.trim()}:c));
      setEditMode(false);
    }catch(e){alert("خطأ: "+e.message);}
  };

  const deleteAccount=async()=>{
    if(!confirm("حذف حسابك نهائياً؟ لا يمكن التراجع!")){return;}
    try{
      await sb("customers","DELETE",null,`?id=eq.${customer.id}`);
      setCustomerSession(null);setView("home");
    }catch(e){alert("خطأ: "+e.message);}
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
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={{...G.ft,flex:1}}>حسابي</h2><button style={{...G.delBtn,border:"1.5px solid #888",color:"#aaa",background:"transparent"}} onClick={()=>{setCustomerSession(null);setView("home");}}>خروج</button></div>

      {/* بروفايل العميل */}
      {!editMode?(
        <div style={{background:"linear-gradient(135deg,#13131f,#1a1a2e)",borderRadius:16,padding:16,border:"1px solid #2a2a3a",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#000",flexShrink:0}}>{initials}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{customer.name}</div>
              <div style={{fontSize:12,color:"#888"}}>📞 {customer.phone}</div>
              <div style={{fontSize:11,color:avatarColor,marginTop:2}}>{badge}</div>
            </div>
            <button style={{...G.pageBtn,fontSize:11}} onClick={()=>setEditMode(true)}>✏️ تعديل</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{v:history.length,l:"حجز",c:"#6aadff"},{v:totalSpent+" ر",l:"إجمالي",c:"#f0c040"},{v:points,l:"نقطة 🎁",c:"#27ae60"}].map(({v,l,c})=>(
              <div key={l} style={{background:"#0d0d1a",borderRadius:10,padding:"10px 6px",textAlign:"center",border:`1px solid ${c}33`}}>
                <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:10,color:"#888"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      ):(
        <div style={{background:"#13131f",borderRadius:16,padding:16,border:"1px solid var(--pa25)",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:12}}>✏️ تعديل البيانات</div>
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>الاسم</label><input style={inp2} value={editName} onChange={e=>setEditName(e.target.value)}/></div>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:4}}>رقم الجوال</label><input style={inp2} value={editPhone} onChange={e=>setEditPhone(e.target.value)}/></div>
          <div style={{display:"flex",gap:8}}>
            <button style={G.sub} onClick={saveEdit}>💾 حفظ</button>
            <button style={{...G.delBtn,padding:"12px 14px"}} onClick={()=>setEditMode(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* تبويبات */}
      <div style={{...G.tabRow,flexWrap:"nowrap"}}>
        <button style={{...G.tabBtn,...(tab==="favs"?G.tabOn:{})}} onClick={()=>setTab("favs")}>♥ المفضلة {favSalons.length>0&&<span style={G.notifDot}>{favSalons.length}</span>}</button>
        <button style={{...G.tabBtn,...(tab==="hist"?G.tabOn:{})}} onClick={()=>setTab("hist")}>📋 حجوزاتي</button>
        <button style={{...G.tabBtn,...(tab==="settings"?G.tabOn:{})}} onClick={()=>setTab("settings")}>⚙️ الحساب</button>
      </div>

      {/* المفضلة */}
      {tab==="favs"&&<>
        {favSalons.length===0?<div style={G.empty}>لم تضف صالوناً للمفضلة بعد</div>:
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {favSalons.map(s=>(
              <div key={s.id} style={G.bItem}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                    <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?` · ${s.village}`:""}</div>
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
              const realBooking=s?.bookings?.find(b=>
                b.date===h.date && b.time===h.time &&
                (b.phone===h.phone || b.name===customer.name)
              ) || s?.bookings?.find(b=>b.date===h.date&&b.time===h.time);
              const status=realBooking?.status||h.status||"pending";
              const stColor=status==="approved"?"#27ae60":status==="rejected"?"#e74c3c":"#f39c12";
              const stLabel=status==="approved"?"✅ مقبول":status==="rejected"?"❌ مرفوض":"⏳ بانتظار الموافقة";
              return(
                <div key={i} style={{...G.bItem,borderRight:`3px solid ${stColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s?.name||h.salonName||"صالون"}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>📅 {h.date} · 🕐 {h.time}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{Array.isArray(h.services)?h.services.join(" + "):h.service||""}</div>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--p)"}}>💰 {h.total||0} ريال</div>
                      <div style={{fontSize:11,fontWeight:700,color:stColor,marginTop:3}}>{stLabel}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                      {h.rating>0&&<div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=h.rating?"#f0c040":"#333"}}>★</span>)}</div>}
                      {s&&<button style={{...G.bookBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>{setSelSalon(s);setView("book");}}>🔄 احجز مجدداً</button>}
                      <button style={{...G.pageBtn,fontSize:10,padding:"4px 8px"}} onClick={()=>scheduleReminder({...h,salonName:s?.name})}>🔔 ذكّرني</button>
                    </div>
                  </div>
                  {status==="approved"&&<InlineStarRating rated={h.rating||0} comment={h.comment||""} onRate={async(r,comment)=>{
                    const rev=[...history].reverse();
                    const wasRated=rev[i]?.rating>0;
                    rev[i]={...rev[i],rating:r,comment};
                    const updated=[...rev].reverse();
                    const bonusPoints=wasRated?0:5;
                    const newPoints=(customer.points||0)+bonusPoints;
                    setCustomers(p=>p.map(c=>c.id===customer.id?{...c,history:updated,points:newPoints}:c));
                    try{await sb("customers","PATCH",{history:updated,points:newPoints},`?id=eq.${customer.id}`);}catch{
                      try{localStorage.setItem(`hist_${customer.id}`,JSON.stringify(updated));}catch{}
                      try{localStorage.setItem(`pts_${customer.id}`,String(newPoints));}catch{}
                    }
                    try{
                      const salonId=h.salonId;
                      const allRatings=updated.filter(x=>Number(x.salonId)===Number(salonId)&&x.rating>0).map(x=>x.rating);
                      const newRating=allRatings.length?Math.round(allRatings.reduce((a,x)=>a+x,0)/allRatings.length*10)/10:r;
                      await sb("salons","PATCH",{rating:newRating},`?id=eq.${salonId}`);
                      setSalons(p=>p.map(s=>s.id===Number(salonId)||s.id===salonId?{...s,rating:newRating}:s));
                    }catch{}
                  }}/>}
                </div>
              );
            })}
          </div>}
      </>}

      {/* إعدادات الحساب */}
      {tab==="settings"&&(
        <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid #2a2a3a"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:14,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>⚙️ إعدادات الحساب</div>
          <div style={{fontSize:12,color:"#888",marginBottom:16,lineHeight:1.8}}>
            <div>👤 الاسم: <span style={{color:"#fff",fontWeight:700}}>{customer.name}</span></div>
            <div>📞 الجوال: <span style={{color:"#fff",fontWeight:700}}>{customer.phone}</span></div>
            <div>🎁 النقاط: <span style={{color:"#27ae60",fontWeight:700}}>{points} نقطة</span></div>
            <div>📋 الحجوزات: <span style={{color:"var(--p)",fontWeight:700}}>{history.length} حجز</span></div>
          </div>
          <button style={{...G.sub,background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",marginBottom:10}} onClick={()=>{setTab("favs");setEditMode(true);}}>✏️ تعديل البيانات</button>
          <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13}} onClick={deleteAccount}>🗑 حذف الحساب نهائياً</button>
          <div style={{fontSize:10,color:"#555",marginTop:8,textAlign:"center"}}>تحذير: حذف الحساب لا يمكن التراجع عنه</div>
        </div>
      )}

    </div></div>
  );
}



function InlineStarRating({rated,comment,onRate}){
  const[hover,setHover]=useState(0);
  const[sel,setSel]=useState(0);
  const[txt,setTxt]=useState("");
  const labels=["","ضعيف","مقبول","جيد","جيد جداً","ممتاز"];
  if(rated>0) return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{display:"flex",gap:1,marginBottom:comment?4:0}}>
        {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18,color:n<=rated?"#f0c040":"#333"}}>★</span>)}
        <span style={{fontSize:11,color:"#888",marginRight:6,alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment&&<div style={{fontSize:12,color:"#aaa",fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );
  return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{fontSize:11,color:"#666",marginBottom:5}}>قيّم تجربتك في هذا الصالون:</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{fontSize:28,cursor:"pointer",color:n<=(hover||sel)?"#f0c040":"#2a2a3a",transition:"color .1s",lineHeight:1,userSelect:"none"}}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}>★</span>
        ))}
        {(hover||sel)>0&&<span style={{fontSize:11,color:"var(--p)",marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel>0&&<>
        <textarea
          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"none",minHeight:60,marginBottom:8}}
          placeholder="أضف تعليقاً (اختياري)..."
          value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button style={{...G.sub,padding:"8px 0",fontSize:12}} onClick={()=>onRate(sel,txt)}>
          إرسال التقييم ⭐
        </button>
      </>}
    </div>
  );
}

function AdminCustomerList({customers,salons,toast$,setCustomers}){
  const[selId,setSelId]=useState(null);
  const[notes,setNotes]=useState({});
  const[blocked,setBlocked]=useState({});
  const[custSearch,setCustSearch]=useState("");
  const[pointsAdj,setPointsAdj]=useState("");
  const sel=selId?customers.find(c=>c.id===selId):null;

  const filtered=!custSearch.trim()?customers:customers.filter(c=>
    c.name?.toLowerCase().includes(custSearch.toLowerCase())||
    c.phone?.includes(custSearch.trim())
  );

  const adjustPoints=async(customerId,delta,reason)=>{
    const c=customers.find(x=>x.id===customerId);
    if(!c)return;
    const newPoints=Math.max(0,(c.points||0)+delta);
    try{
      await sb("customers","PATCH",{points:newPoints},`?id=eq.${customerId}`);
      setCustomers(p=>p.map(x=>x.id===customerId?{...x,points:newPoints}:x));
      try{localStorage.setItem(`pts_${customerId}`,String(newPoints));}catch{}
      toast$&&toast$(`✅ تم تعديل النقاط: ${delta>0?"+":""}${delta} — ${reason||"يدوي"}`);
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
  };

  if(sel){
    const history=sel.history||[];
    const favs=sel.favs||[];
    const totalSpent=history.reduce((a,h)=>a+(h.total||0),0);
    const currentPoints=sel.points!==undefined?sel.points:history.length*10;
    const isBlocked=blocked[sel.id];
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button style={G.bb} onClick={()=>setSelId(null)}>→</button>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>👤 {sel.name}</span>
          {isBlocked&&<span style={{fontSize:11,background:"rgba(231,76,60,.2)",color:"#e74c3c",padding:"2px 8px",borderRadius:20,fontWeight:700}}>محظور</span>}
        </div>

        {/* معلومات */}
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>معلومات العميل</div>
          <div style={{fontSize:13,color:"#fff",marginBottom:4}}>👤 {sel.name}</div>
          <div style={{fontSize:12,color:"#888",marginBottom:4}}>📞 {sel.phone}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:10}}>
            {[{v:history.length,l:"حجز",c:"#6aadff"},{v:totalSpent+" ر",l:"إجمالي",c:"#f0c040"},{v:currentPoints,l:"نقطة",c:"#27ae60"},{v:favs.length,l:"مفضلة",c:"#e74c3c"}].map(({v,l,c})=>(
              <div key={l} style={{background:"#0d0d1a",borderRadius:9,padding:"9px 4px",textAlign:"center",border:`1px solid ${c}33`}}>
                <div style={{fontSize:15,fontWeight:900,color:c}}>{v}</div>
                <div style={{fontSize:9,color:"#888"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* إدارة النقاط */}
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #1e3a1e",marginBottom:10}}>
          <div style={{fontSize:12,color:"#27ae60",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>🎁 إدارة نقاط العميل</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{fontSize:22,fontWeight:900,color:"#27ae60"}}>{currentPoints}</div>
            <div style={{fontSize:11,color:"#888"}}>نقطة متاحة</div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            {[{d:10,l:"+10",c:"#27ae60"},{d:25,l:"+25",c:"#27ae60"},{d:50,l:"+50",c:"#27ae60"},{d:-10,l:"-10",c:"#e74c3c"},{d:-25,l:"-25",c:"#e74c3c"}].map(({d,l,c})=>(
              <button key={l} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${c}44`,background:`${c}18`,color:c,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
                onClick={()=>adjustPoints(sel.id,d,d>0?"مكافأة يدوية":"خصم يدوي")}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <input type="number" placeholder="قيمة مخصصة..." value={pointsAdj} onChange={e=>setPointsAdj(e.target.value)}
              style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",direction:"rtl"}}/>
            <button style={{...G.sub,width:"auto",padding:"0 12px",marginTop:0,background:"rgba(39,174,96,.2)",border:"1px solid #27ae60",color:"#27ae60"}}
              onClick={()=>{const v=parseInt(pointsAdj);if(!isNaN(v)&&v!==0){adjustPoints(sel.id,v,v>0?"إضافة مخصصة":"خصم مخصص");setPointsAdj("");}}}>✓ تطبيق</button>
          </div>
        </div>

        {/* سجل الحجوزات */}
        {history.length>0&&<div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:10,paddingBottom:6,borderBottom:"1px solid #2a2a3a"}}>📋 سجل الحجوزات</div>
          {[...history].reverse().slice(0,5).map((h,i)=>{
            const s=salons.find(x=>x.id===h.salonId);
            return(
              <div key={i} style={{padding:"7px 0",borderBottom:"1px solid #1e1e2e"}}>
                <div style={{fontSize:12,color:"#fff",fontWeight:600}}>✂ {s?.name||"صالون محذوف"}</div>
                <div style={{fontSize:11,color:"#888"}}>📅 {h.date} · 💰 {h.total||0} ر</div>
              </div>
            );
          })}
        </div>}

        {/* ملاحظة */}
        <div style={{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10}}>
          <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:8}}>📝 ملاحظة داخلية</div>
          <textarea style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"vertical",minHeight:70}}
            placeholder="ملاحظة خاصة عن هذا العميل..." value={notes[sel.id]||""}
            onChange={e=>setNotes(p=>({...p,[sel.id]:e.target.value}))}/>
          <button style={{...G.sub,marginTop:6}} onClick={()=>toast$&&toast$("✅ تم حفظ الملاحظة")}>💾 حفظ الملاحظة</button>
        </div>

        {/* أزرار الإجراءات */}
        <div style={{display:"flex",gap:8}}>
          <button style={{flex:1,padding:"10px 0",borderRadius:9,border:`1.5px solid ${isBlocked?"#27ae60":"#f39c12"}`,background:isBlocked?"rgba(39,174,96,.12)":"rgba(243,156,18,.12)",color:isBlocked?"#27ae60":"#f39c12",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}
            onClick={()=>{setBlocked(p=>({...p,[sel.id]:!isBlocked}));toast$&&toast$(isBlocked?"✅ تم رفع الحظر":"🚫 تم حظر العميل");}}>
            {isBlocked?"✅ رفع الحظر":"🚫 حظر العميل"}
          </button>
          <button style={{...G.delBtn,flex:1,padding:"10px 0",textAlign:"center"}} onClick={async()=>{
            const reason=prompt("سبب الحذف (اختياري):");
            if(!confirm(`حذف العميل "${sel.name}"؟${reason?"\nالسبب: "+reason:""}`))return;
            try{
              await sb("customers","DELETE",null,`?id=eq.${sel.id}`);
              setCustomers(p=>p.filter(c=>c.id!==sel.id));
              toast$&&toast$("🗑 تم حذف العميل"+(reason?" — السبب: "+reason:""));
              setSelId(null);
            }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
          }}>🗑 حذف</button>
        </div>
      </div>
    );
  }

  return(
    <div>
      {/* بحث العملاء */}
      <div style={{...G.searchRow,marginBottom:10}}>
        <span style={{fontSize:14,color:"#555"}}>🔍</span>
        <input style={G.searchInput} placeholder="ابحث بالاسم أو رقم الجوال..." value={custSearch} onChange={e=>setCustSearch(e.target.value)}/>
        {custSearch&&<button style={G.searchClear} onClick={()=>setCustSearch("")}>✕</button>}
      </div>
      {filtered.length===0&&<div style={G.empty}>لا نتائج</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(c=>{
          const isBlocked=blocked[c.id];
          return(
            <div key={c.id} style={{...G.bItem,borderRight:`3px solid ${isBlocked?"#e74c3c":"#6aadff"}`,cursor:"pointer"}} onClick={()=>setSelId(c.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>👤 {c.name}</div>
                    {isBlocked&&<span style={{fontSize:10,background:"rgba(231,76,60,.2)",color:"#e74c3c",padding:"1px 6px",borderRadius:20}}>محظور</span>}
                  </div>
                  <div style={{fontSize:11,color:"#888"}}>📞 {c.phone}</div>
                </div>
                <div style={{textAlign:"left",flexShrink:0}}>
                  <div style={{fontSize:11,color:"#a78bfa"}}>📋 {(c.history||[]).length} حجز</div>
                  <div style={{fontSize:11,color:"#27ae60",marginTop:2}}>🎁 {c.points!==undefined?c.points:(c.history||[]).length*10} نقطة</div>
                  <div style={{fontSize:11,color:"#e74c3c",marginTop:2}}>♥ {(c.favs||[]).length} مفضلة</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminApprovedList({salons,setSalons,deleteSalon,setSelSalon,setView,toast$}){
  const[editId,setEditId]=useState(null);
  const[ef,setEf]=useState(null);
  const[pinned,setPinned]=useState(()=>{try{return JSON.parse(localStorage.getItem("pinned_salons")||"[]");}catch{return[];}});
  const sel=editId?salons.find(s=>s.id===editId):null;

  const togglePin=(id)=>{
    const newPinned=pinned.includes(id)?pinned.filter(x=>x!==id):[...pinned,id];
    setPinned(newPinned);
    localStorage.setItem("pinned_salons",JSON.stringify(newPinned));
    toast$&&toast$(pinned.includes(id)?"📌 تم إلغاء التثبيت":"📌 تم تثبيت الصالون");
  };

  const sortedSalons=[...salons].sort((a,b)=>{
    const ap=pinned.includes(a.id)?1:0;
    const bp=pinned.includes(b.id)?1:0;
    return bp-ap;
  });

  const startEdit=s=>{setEditId(s.id);setEf({name:s.name,owner:s.owner,phone:s.phone,ownerPhone:s.ownerPhone||s.phone,address:s.address,rating:s.rating||5});};
  const save=async()=>{
    try{
      await sb("salons","PATCH",{name:ef.name,owner:ef.owner,phone:ef.phone,owner_phone:ef.ownerPhone,address:ef.address,rating:ef.rating},`?id=eq.${editId}`);
      setSalons(p=>p.map(s=>s.id===editId?{...s,...ef,ownerPhone:ef.ownerPhone}:s));
      toast$&&toast$("✅ تم حفظ التعديلات");setEditId(null);setEf(null);
    }catch(e){toast$&&toast$("❌ خطأ: "+e.message,"err");}
  };

  if(editId&&ef&&sel) return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <button style={G.bb} onClick={()=>{setEditId(null);setEf(null);}}>→</button>
        <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>✏️ تعديل بيانات: {sel.name}</span>
      </div>
      <div style={{background:"#13131f",borderRadius:13,padding:16,border:"1px solid var(--pa25)",marginBottom:8}}>
        <div style={{fontSize:12,color:"var(--p)",fontWeight:700,marginBottom:12,borderBottom:"1px solid #2a2a3a",paddingBottom:6}}>معلومات الصالون</div>
        {[["اسم الصالون","name"],["اسم المالك","owner"],["جوال الصالون","phone"],["جوال المالك (للدخول)","ownerPhone"],["العنوان","address"]].map(([l,k])=>(
          <div key={k} style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:3,fontWeight:600}}>{l}</label>
            <input style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}}
              value={ef[k]||""} onChange={e=>setEf(f=>({...f,[k]:e.target.value}))}/>
          </div>
        ))}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:11,color:"#aaa",marginBottom:3,fontWeight:600}}>التقييم ⭐ (1.0 – 5.0)</label>
          <input type="number" min="1" max="5" step="0.1"
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",direction:"rtl",boxSizing:"border-box"}}
            value={ef.rating} onChange={e=>setEf(f=>({...f,rating:+e.target.value}))}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={G.sub} onClick={save}>💾 حفظ التعديلات</button>
          <button style={{...G.delBtn,padding:"12px 14px",flexShrink:0}} onClick={()=>{const r=prompt("سبب الحذف (اختياري):");if(confirm(`حذف هذا الصالون نهائياً؟${r?"\nالسبب: "+r:""}`)){deleteSalon(editId);setEditId(null);setEf(null);}}}>🗑</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sortedSalons.map(s=>{
        const isPinned=pinned.includes(s.id);
        const lastBk=s.bookings.length?[...s.bookings].sort((a,b)=>b.date>a.date?1:-1)[0]:null;
        return(
        <div key={s.id} style={{...G.bItem,borderRight:`3px solid ${isPinned?"#f0c040":"#27ae60"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>✂ {s.name}</div>
                {isPinned&&<span style={{fontSize:10,color:"#f0c040"}}>📌</span>}
              </div>
              <div style={{fontSize:11,color:"#888"}}>👤 {s.owner} · 📞 {s.phone}</div>
              {s.ownerPhone&&s.ownerPhone!==s.phone&&<div style={{fontSize:11,color:"#888"}}>📱 مالك: {s.ownerPhone}</div>}
              <div style={{fontSize:11,color:"#888"}}>📍 {s.gov||s.region}{s.village?" · "+s.village:""}</div>
              <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#4caf50"}}>📅 {s.bookings.length} حجز</span>
                <span style={{fontSize:10,color:"var(--p)"}}>⭐ {s.rating}</span>
                {lastBk&&<span style={{fontSize:10,color:"#6aadff"}}>🕐 آخر نشاط: {lastBk.date}</span>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px",background:isPinned?"rgba(240,192,64,.15)":"rgba(100,60,180,.15)",border:`1px solid ${isPinned?"#f0c040":"#7c4dff"}`,color:isPinned?"#f0c040":"#b39ddb"}} onClick={()=>togglePin(s.id)}>{isPinned?"📌 مثبت":"📌 تثبيت"}</button>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px",background:"rgba(212,160,23,.12)",border:"1px solid var(--p)",color:"var(--p)"}} onClick={()=>startEdit(s)}>✏️ تعديل</button>
              <button style={{...G.pageBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{setSelSalon(s);setView("salon");}}>📋 صفحة</button>
              <button style={{...G.delBtn,fontSize:10,padding:"5px 9px"}} onClick={()=>{const r=prompt("سبب الحذف (اختياري):");if(confirm(`حذف؟${r?"\nالسبب: "+r:""}`))deleteSalon(s.id);}}>🗑</button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
//  SETTINGS VIEW
// ══════════════════════════════════════════════
function SettingsView({settings,setSettings,setView,toast$}){
  const THEME_OPTIONS=[
    {id:"gold",    label:"ذهبي",    color:"#d4a017",emoji:"✨"},
    {id:"emerald", label:"زمردي",   color:"#10b981",emoji:"🌿"},
    {id:"sapphire",label:"ياقوتي",  color:"#3b82f6",emoji:"💎"},
    {id:"rose",    label:"وردي",    color:"#ec4899",emoji:"🌸"},
    {id:"violet",  label:"بنفسجي",  color:"#8b5cf6",emoji:"🔮"},
    {id:"crimson", label:"قرمزي",   color:"#ef4444",emoji:"🔴"},
  ];

  const applyTheme=(id)=>{
    const t=THEMES[id]||THEMES.gold;
    const r=document.documentElement.style;
    r.setProperty("--p",  t.primary);
    r.setProperty("--pl", t.light);
    r.setProperty("--pd", t.dark);
    r.setProperty("--pll",t.lightest);
    r.setProperty("--pr", t.rgb);
    ["5","07","08","12","15","18","2","25","3","4"].forEach(a=>{
      const pct=a==="4"?.45:a==="3"?.3:a==="25"?.25:a==="2"?.2:a==="18"?.18:a==="15"?.15:a==="12"?.12:a==="08"?.08:a==="07"?.07:.05;
      r.setProperty(`--pa${a}`,`rgba(${t.rgb},${pct})`);
    });
    r.setProperty("--grad", `linear-gradient(135deg,${t.primary},${t.light})`);
    r.setProperty("--grad2",`linear-gradient(135deg,${t.light},${t.primary})`);
    setSettings(s=>({...s,theme:id}));
  };

  return(
    <div style={G.page}><div style={G.fp}>
      <div style={G.fh}><button style={G.bb} onClick={()=>setView("home")}>→</button><h2 style={G.ft}>⚙ الإعدادات</h2></div>

      {/* Theme Picker */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:4,paddingBottom:5,borderBottom:"1px solid #2a2a3a"}}>🎨 لون واجهة التطبيق</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>اختر اللون الذي يناسبك — يُطبَّق فوراً</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {THEME_OPTIONS.map(t=>{
            const active=settings.theme===t.id;
            return(
              <button key={t.id} onClick={()=>applyTheme(t.id)}
                style={{padding:"14px 6px",borderRadius:12,border:`2px solid ${active?t.color:"#2a2a3a"}`,background:active?t.color+"22":"#1a1a2e",color:"#fff",cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:active?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all .2s",transform:active?"scale(1.04)":"scale(1)"}}>
                <span style={{fontSize:22}}>{t.emoji}</span>
                <div style={{width:24,height:24,borderRadius:"50%",background:t.color,boxShadow:active?`0 0 0 3px ${t.color}55`:"none"}}/>
                <span style={{fontSize:11,color:active?t.color:"#888"}}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone Picker */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #2a2a3a",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:4,paddingBottom:5,borderBottom:"1px solid #2a2a3a"}}>🔔 نغمة التنبيه</div>
        <div style={{fontSize:11,color:"#666",marginBottom:12}}>اضغط للمعاينة — تُستخدم كنغمة افتراضية للصالونات الجديدة</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {TONES.map(t=>{
            const active=settings.defaultTone===t.id;
            return(
              <button key={t.id} onClick={()=>{setSettings(s=>({...s,defaultTone:t.id}));playTone(t.id,0.8);}}
                style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${active?"var(--p)":"#2a2a3a"}`,background:active?"var(--pa12)":"#1a1a2e",color:active?"var(--p)":"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:active?700:400,textAlign:"center"}}>
                {t.label} {active&&"✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* App Info */}
      <div style={{background:"linear-gradient(135deg,var(--pa08),var(--pa05))",borderRadius:16,padding:20,border:"1px solid var(--pa25)",marginBottom:12,textAlign:"center"}}>
        <div style={{fontSize:28,fontWeight:900,color:"var(--p)",letterSpacing:1,marginBottom:4}}>دورك</div>
        <div style={{fontSize:12,color:"#888",marginBottom:2}}>وسيطك للحلاقة والصالونات</div>
        <div style={{fontSize:10,color:"#555"}}>الإصدار 1.0.0 · 2025</div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:14}}>
          {[["✂","صالونات"],["👤","عملاء"],["📅","حجوزات"]].map(([i,l])=>(
            <div key={l} style={{textAlign:"center"}}><div style={{fontSize:20}}>{i}</div><div style={{fontSize:10,color:"#666",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div style={{background:"#13131f",borderRadius:16,padding:18,border:"1px solid #c0392b33",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e74c3c",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #c0392b33"}}>⚠️ منطقة الخطر</div>
        <div style={{fontSize:11,color:"#888",marginBottom:12}}>حذف جميع البيانات وإعادة التطبيق لحالته الأولى</div>
        <button style={{...G.delBtn,width:"100%",padding:12,fontSize:13,fontWeight:700}} onClick={()=>{
          if(confirm("⚠️ سيتم حذف جميع البيانات!\n\n• الصالونات\n• الحجوزات\n• حسابات العملاء\n• الإعدادات\n\nهل أنت متأكد؟")){
            localStorage.clear(); 
            alert("⚠️ البيانات في Supabase لن تُحذف من هنا. اذهب إلى Supabase Dashboard لحذف السجلات.");
            window.location.reload();
          }
        }}>🗑 حذف جميع البيانات</button>
      </div>
    </div></div>
  );
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function SL({children}){return <div style={G.sl2}>{children}</div>;}
function F({label,error,children,style}){return <div style={{marginBottom:11,...style}}>{label&&<label style={{display:"block",fontSize:12,color:"#aaa",marginBottom:3,fontWeight:600}}>{label}</label>}{children}{error&&<div style={G.err}>{error}</div>}</div>;}
const fi=(err)=>({width:"100%",padding:"10px 12px",borderRadius:9,border:`1.5px solid ${err?"#e74c3c":"#2a2a3a"}`,background:"#13131f",color:"#f0f0f0",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl"});

// ══════════════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════════════
const CSS=`
  :root {
    --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23;
    --pa5: rgba(212,160,23,.05); --pa07: rgba(212,160,23,.07); --pa08: rgba(212,160,23,.08);
    --pa12: rgba(212,160,23,.12); --pa15: rgba(212,160,23,.15); --pa18: rgba(212,160,23,.18);
    --pa2: rgba(212,160,23,.2); --pa25: rgba(212,160,23,.25); --pa3: rgba(212,160,23,.3);
    --pa4: rgba(212,160,23,.45);
    --grad: linear-gradient(135deg,#d4a017,#f0c040);
    --grad2: linear-gradient(135deg,#f0c040,#d4a017);
  }
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{direction:rtl;font-family:'Cairo',sans-serif;background:#0d0d1a;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--p);border-radius:4px;}
  .hcard{transition:transform .18s,box-shadow .18s;} .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;}
  input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;} button:active{opacity:.82;}
`;

const G={
  searchRow:{display:"flex",alignItems:"center",gap:8,background:"#13131f",borderRadius:10,border:"1.5px solid #2a2a3a",padding:"9px 12px"},
  searchInput:{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:14,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  searchClear:{background:"#2a2a3a",border:"none",color:"#aaa",cursor:"pointer",borderRadius:"50%",width:22,height:22,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  sortChip:{padding:"6px 12px",borderRadius:20,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0},
  sortChipOn:{background:"var(--pa15)",border:"1.5px solid var(--p)",color:"var(--p)"},
  app:{minHeight:"100vh",background:"#0d0d1a",color:"#f0f0f0",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  page:{maxWidth:480,margin:"0 auto",minHeight:"100vh",paddingBottom:30},
  toast:{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",padding:"10px 22px",borderRadius:11,color:"#fff",fontWeight:700,zIndex:9999,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"},

  // TOP BAR
  topBar:{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"#0d0d1a",borderBottom:"1px solid #2a2a3a",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",maxWidth:480,margin:"0 auto"},
  roleBtn:{width:36,height:36,borderRadius:10,border:"1.5px solid #2a2a3a",background:"#13131f",color:"#aaa",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  roleBtnActive:{border:"1.5px solid var(--p)",color:"var(--p)",background:"rgba(var(--pr),.1)"},
  roleDot:{position:"absolute",top:-4,right:-4,background:"#e74c3c",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  registerTopBtn:{background:"var(--grad)",color:"#000",border:"none",padding:"7px 13px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  fRow:{display:"flex",alignItems:"center",background:"#13131f",borderRadius:9,border:"1.5px solid #2a2a3a",padding:"7px 11px",gap:7},
  fSel:{flex:1,background:"transparent",border:"none",color:"#f0f0f0",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},

  toggleBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  toggleOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},

  section:{padding:"10px 14px 0"},
  badge:{background:"var(--p)",color:"#000",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700},
  empty:{textAlign:"center",color:"#555",padding:"36px 0",fontSize:13},

  card:{background:"#13131f",borderRadius:14,padding:13,border:"1px solid #2a2a3a",boxShadow:"0 4px 16px rgba(0,0,0,.3)"},
  cav:{width:38,height:38,borderRadius:10,background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0},
  tag:{background:"#1e1e30",color:"var(--p)",padding:"2px 8px",borderRadius:20,fontSize:10,border:"1px solid #2a2a3a"},
  favBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"#555",padding:0,lineHeight:1},
  favOn:{color:"#e74c3c"},

  mapsBtn:{background:"rgba(42,109,217,.12)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  pageBtn:{background:"rgba(100,60,180,.15)",border:"1.5px solid #7c4dff",color:"#b39ddb",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  bookBtn:{flex:1,background:"var(--grad)",color:"#000",border:"none",padding:"8px 0",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},
  delBtn:{background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"5px 9px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  accBtn:{flex:1,background:"rgba(39,174,96,.15)",border:"1.5px solid #27ae60",color:"#4caf50",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},
  rejBtn:{flex:1,background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},

  fp:{padding:"0 13px 24px"},
  fh:{display:"flex",alignItems:"center",gap:8,padding:"12px 0 13px",position:"sticky",top:56,background:"#0d0d1a",zIndex:10},
  bb:{background:"#1a1a2e",border:"none",color:"var(--p)",fontSize:16,cursor:"pointer",width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  ft:{fontSize:17,fontWeight:700,color:"#fff"},
  fc:{background:"#13131f",borderRadius:13,padding:14,border:"1px solid #2a2a3a",marginBottom:10},
  sl2:{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:9,paddingBottom:5,borderBottom:"1px solid #2a2a3a"},
  err:{color:"#e74c3c",fontSize:11,marginTop:2},
  sub:{width:"100%",background:"var(--grad)",color:"#000",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,fontFamily:"'Cairo',sans-serif"},

  salonBadge:{display:"flex",alignItems:"center",gap:8,background:"rgba(var(--pr),.06)",border:"1px solid var(--pa2)",borderRadius:10,padding:"10px 12px",marginBottom:11},
  tabRow:{display:"flex",gap:6,marginBottom:11},
  tabBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3},
  tabOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  notifDot:{background:"#e74c3c",color:"#fff",borderRadius:20,fontSize:9,padding:"1px 5px",fontWeight:700},

  steps:{display:"flex",marginBottom:11},
  si:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.3,transition:"opacity .2s"},
  sd:{width:24,height:24,borderRadius:"50%",background:"var(--p)",color:"#000",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"},

  chip:{padding:"5px 11px",borderRadius:20,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  chipOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  totalBox:{background:"var(--pa07)",border:"1px solid var(--pa2)",borderRadius:8,padding:"7px 11px",fontSize:12,color:"#f0f0f0",marginBottom:10},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10},
  ts:{padding:"8px 3px",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#f0f0f0",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",textAlign:"center"},
  tsF:{background:"#160a0a",color:"#444",borderColor:"#2a1414",cursor:"not-allowed"},
  tsS:{background:"var(--pa15)",borderColor:"var(--p)",color:"var(--p)",fontWeight:700},

  bItem:{background:"#13131f",borderRadius:10,padding:"10px 12px",border:"1px solid #2a2a3a"},
  pmBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0},

  locTab:{flex:1,padding:"7px 0",borderRadius:8,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#aaa",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  locTabOn:{background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff"},
  detectBtn:{width:"100%",background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"10px 0",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  otherBtn:{marginTop:6,width:"100%",background:"transparent",border:"1.5px dashed #2a6dd9",color:"#6aadff",padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  addBarberBtn:{width:"100%",background:"transparent",border:"1.5px dashed var(--p)",color:"var(--p)",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",marginBottom:3},
  ratingBadge:{background:"var(--pa15)",border:"1px solid rgba(var(--pr),.4)",borderRadius:8,padding:"3px 8px",fontSize:12,fontWeight:700,color:"var(--p)",flexShrink:0,display:"flex",alignItems:"center",gap:3},
  heartCardBtn:{width:36,height:36,borderRadius:9,border:"1.5px solid #2a2a3a",background:"#1a1a2e",color:"#888",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cairo',sans-serif"},
  heartCardOn:{border:"1.5px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c"},
  xBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #c0392b",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
};

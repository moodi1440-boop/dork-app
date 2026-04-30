/**
 * الجزء الأول: الأنماط العامة (CSS)
 */
const CSS_STYLES = `
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
  .hcard{transition:transform .18s,box-shadow .18s;} 
  .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;}
  input[type=date]::-webkit-calendar-picker-indicator,input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;} 
  button:active{opacity:.82;}
`;

/**
 * الجزء الثاني: المكونات المساعدة
 */
function SL({children}){return <div style={G.sl2}>{children}</div>;}
function F({label,error,children,style}){
  return (
    <div style={{marginBottom:11,...style}}>
      {label&&<label style={{display:"block",fontSize:12,color:"#aaa",marginBottom:3,fontWeight:600}}>{label}</label>}
      {children}
      {error&&<div style={G.err}>{error}</div>}
    </div>
  );
}

/**
 * الجزء ١-٣: منطق التقييم والحساب (Logic)
 */
function InlineStarRating({rated, comment, onRate}) {
  const [hover, setHover] = useState(0);
  const [sel, setSel] = useState(0);
  const [txt, setTxt] = useState("");
  const labels = ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];

  if (rated > 0) return (
    <div style={{marginTop:8, borderTop:"1px solid #1e1e2e", paddingTop:8}}>
      <div style={{display:"flex", gap:1, marginBottom:comment?4:0}}>
        {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:18, color:n<=rated?"#f0c040":"#333"}}>★</span>)}
        <span style={{fontSize:11, color:"#888", marginRight:6, alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment && <div style={{fontSize:12, color:"#aaa", fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );

  return (
    <div style={{marginTop:8, borderTop:"1px solid #1e1e2e", paddingTop:8}}>
      <div style={{fontSize:11, color:"#666", marginBottom:5}}>قيّم تجربتك:</div>
      <div style={{display:"flex", alignItems:"center", gap:3, marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{fontSize:28, cursor:"pointer", color:n<=(hover||sel)?"#f0c040":"#2a2a3a", transition:"color .1s"}}
            onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)} onClick={()=>setSel(n)}>★</span>
        ))}
        {(hover||sel)>0 && <span style={{fontSize:11, color:"var(--p)", marginRight:6, fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel > 0 && (
        <>
          <textarea style={{width:"100%", padding:"8px 10px", borderRadius:8, border:"1.5px solid #2a2a3a", background:"#0d0d1a", color:"#f0f0f0", fontSize:12, direction:"rtl", minHeight:60, marginBottom:8}}
            placeholder="أضف تعليقاً..." value={txt} onChange={e=>setTxt(e.target.value)}/>
          <button style={{...G.sub, padding:"8px 0", fontSize:12}} onClick={()=>onRate(sel, txt)}>إرسال التقييم ⭐</button>
        </>
      )}
    </div>
  );
}

/**
 * الجزء ٢-٣: لوحات التحكم (Admin & Settings)
 */
function AdminCustomerList({customers, salons, toast$, setCustomers}) {
  // كود إدارة العملاء المذكور سابقاً
}

function AdminApprovedList({salons, setSalons, deleteSalon, setSelSalon, setView, toast$}) {
  // كود إدارة الصالونات المذكور سابقاً
}

function SettingsView({settings, setSettings, setView, toast$}) {
  // كود الإعدادات المذكور سابقاً
}

/**
 * الجزء ٣-٣: كائن التنسيق G
 */
const G = {
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

/**
 * الجزء الرابع: المكون الرئيسي للتطبيق
 */
export default function App() {
  // هنا تضع الحالة العامة (State) وتجمع المكونات السابقة
  return (
    <div style={G.page}>
      <style>{CSS_STYLES}</style>
      {/* محتوى التطبيق */}
    </div>
  );
}

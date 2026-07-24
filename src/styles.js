// أنماط CSS المشتركة (CSS الجذري + كائن الأنماط G) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)

export const CSS=`
  :root {
    --p: #d4a017; --pl: #f0c040; --pd: #a07810; --pll: #f5d76e; --pr: 212,160,23;
    --pa5: rgba(var(--gold-rgb),.05); --pa07: rgba(var(--gold-rgb),.07); --pa08: rgba(var(--gold-rgb),.08);
    --pa12: rgba(var(--gold-rgb),.12); --pa15: rgba(var(--gold-rgb),.15); --pa18: rgba(var(--gold-rgb),.18);
    --pa2: rgba(var(--gold-rgb),.2); --pa25: rgba(var(--gold-rgb),.25); --pa3: rgba(var(--gold-rgb),.3);
    --pa4: rgba(var(--gold-rgb),.45);
    --grad: linear-gradient(135deg,#d4a017,#f0c040);
    --grad2: linear-gradient(135deg,#f0c040,#d4a017);
    --shell-bg: #0d0d1a; --surface-1: #13131f; --surface-2: #1a1a2e; --border-ui: #2a2a3a;
    --text-primary: #f0f0f0; --text-muted: #888;
  }
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{direction:rtl;font-family:'Cairo',sans-serif;background:var(--shell-bg);}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--p);border-radius:4px;}
  .hcard{transition:transform .18s,box-shadow .18s;} .hcard:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(var(--pr),.18)!important;}
  html.dork-dark input[type=date]::-webkit-calendar-picker-indicator,
  html.dork-dark input[type=time]::-webkit-calendar-picker-indicator,
  html.dork-dim input[type=date]::-webkit-calendar-picker-indicator,
  html.dork-dim input[type=time]::-webkit-calendar-picker-indicator{filter:invert(1);}
  select option{background:#1a1a2e;color:#f0f0f0;}
  html.dork-light select option,html.dork-lgray select option{background:#ffffff;color:#1c1c1e;}
  html.dork-dim select option{background:#28282f;color:#ededf2;}
  html.dork-light body,html.dork-light body *{scrollbar-color:#e0e0e0 #f7f7f7;}
  html.dork-lgray body,html.dork-lgray body *{scrollbar-color:#5a5a5c #9e9b98;}
  html.dork-lgray body{font-weight:500;}
  html.dork-light{color-scheme:light;}
  html.dork-lgray{color-scheme:light;}
  html.dork-dim{color-scheme:dark;}
  html.dork-light input,html.dork-light textarea,html.dork-light select,
  html.dork-lgray input,html.dork-lgray textarea,html.dork-lgray select{
    background:var(--bg-input)!important;color:var(--text-primary)!important;
    border-color:var(--border-ui)!important;}
  html.dork-dim input,html.dork-dim textarea,html.dork-dim select{
    background:var(--bg-input)!important;color:var(--text-primary)!important;
    border-color:var(--border-ui)!important;}
  button:active{opacity:.82;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes promoPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(231,76,60,.5);}60%{transform:scale(1.06);box-shadow:0 0 0 7px rgba(231,76,60,0);}}
  .promo-badge-anim{animation:promoPulse 1.8s ease-in-out infinite;}
  @keyframes fadeInCards{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes promoBounce{0%,100%{transform:scale(1) rotate(-6deg);}50%{transform:scale(1.28) rotate(6deg);}}
  .promo-fire-anim{animation:promoBounce 1.1s ease-in-out infinite;display:inline-block;}
  @keyframes promoGlow{0%,100%{box-shadow:0 4px 18px rgba(var(--pr),.35);}50%{box-shadow:0 4px 32px rgba(var(--pr),.65),0 0 0 5px rgba(var(--pr),.12);}}
  .promo-book-glow{animation:promoGlow 1.8s ease-in-out infinite;}
`;

export const G={
  searchRow:{display:"flex",alignItems:"center",gap:8,background:"var(--surface-1)",borderRadius:10,border:"1.5px solid var(--border-ui)",padding:"9px 12px"},
  searchInput:{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontSize:14,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  searchClear:{background:"var(--border-ui)",border:"none",color:"var(--text-muted)",cursor:"pointer",borderRadius:"50%",width:22,height:22,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
  sortChip:{padding:"6px 12px",borderRadius:20,border:"1.5px solid var(--chip-border)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0},
  sortChipOn:{background:"var(--pa15)",border:"1.5px solid var(--p)",color:"var(--p)"},
  app:{minHeight:"100vh",background:"var(--shell-bg)",color:"var(--text-primary)",fontFamily:"'Cairo',sans-serif",direction:"rtl"},
  page:{maxWidth:480,margin:"0 auto",minHeight:"100vh",paddingBottom:30},
  toast:{position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",padding:"10px 22px",borderRadius:11,color:"#fff",fontWeight:700,zIndex:9999,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"},

  // TOP BAR
  topBar:{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"var(--shell-bg)",borderBottom:"1px solid var(--border-ui)",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px",maxWidth:480,margin:"0 auto"},
  roleBtn:{width:36,height:36,borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--surface-1)",color:"var(--text-muted)",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
  roleBtnActive:{border:"1.5px solid var(--p)",color:"var(--p)",background:"rgba(var(--pr),.1)"},
  roleDot:{position:"absolute",top:-4,right:-4,background:"#e74c3c",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  registerTopBtn:{background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"7px 13px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  fRow:{display:"flex",alignItems:"center",background:"var(--surface-1)",borderRadius:9,border:"1.5px solid var(--border-ui)",padding:"7px 11px",gap:7},
  fSel:{flex:1,background:"transparent",border:"none",color:"var(--text-primary)",fontSize:12,outline:"none",fontFamily:"'Cairo',sans-serif",direction:"rtl"},

  toggleBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  toggleOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},

  section:{padding:"10px 14px 0"},
  badge:{background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700},
  empty:{textAlign:"center",color:"var(--text-muted)",padding:"36px 0",fontSize:13},

  card:{background:"rgba(var(--pr),0.07)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:14,padding:13,border:"1.5px solid rgba(var(--pr),.28)",boxShadow:"0 4px 16px rgba(0,0,0,.3)"},
  cav:{width:38,height:38,borderRadius:10,background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0},
  tag:{background:"var(--surface-2)",color:"var(--p)",padding:"2px 8px",borderRadius:20,fontSize:10,border:"1px solid var(--border-ui)"},
  favBtn:{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:"var(--text-muted)",padding:0,lineHeight:1},
  favOn:{color:"#e74c3c"},

  mapsBtn:{background:"rgba(42,109,217,.12)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  pageBtn:{background:"rgba(100,60,180,.15)",border:"1.5px solid #7c4dff",color:"#b39ddb",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600,whiteSpace:"nowrap"},
  bookBtn:{flex:1,background:"var(--pa12)",color:"var(--p)",border:"1px solid rgba(var(--pr),.3)",padding:"8px 0",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},
  delBtn:{background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"5px 9px",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  accBtn:{flex:1,background:"rgba(39,174,96,.15)",border:"1.5px solid #27ae60",color:"#4caf50",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},
  rejBtn:{flex:1,background:"rgba(192,57,43,.15)",border:"1.5px solid #c0392b",color:"#e74c3c",padding:"8px 0",borderRadius:9,cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700},

  fp:{padding:"0 13px 24px"},
  fh:{display:"flex",alignItems:"center",gap:8,padding:"12px 0 13px",position:"sticky",top:64,background:"var(--shell-bg)",zIndex:10},
  bb:{background:"rgba(var(--gold-rgb),.08)",border:"1.5px solid rgba(var(--gold-rgb),.3)",color:"var(--p)",fontSize:12,fontWeight:700,cursor:"pointer",padding:"6px 14px",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontFamily:"'Cairo',sans-serif",flexShrink:0,WebkitAppearance:"none",appearance:"none"},
  ft:{fontSize:17,fontWeight:700,color:"var(--text-primary)"},
  fc:{background:"var(--surface-1)",borderRadius:13,padding:14,border:"1px solid var(--border-ui)",marginBottom:10},
  sl2:{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:9,paddingBottom:5,borderBottom:"1px solid var(--border-ui)"},
  err:{color:"#e74c3c",fontSize:11,marginTop:2},
  sub:{width:"100%",background:"var(--grad)",color:"var(--p-text,#000)",border:"none",padding:"12px",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4,fontFamily:"'Cairo',sans-serif"},

  salonBadge:{display:"flex",alignItems:"center",gap:8,background:"rgba(var(--pr),.06)",border:"1px solid var(--pa2)",borderRadius:10,padding:"10px 12px",marginBottom:11},
  tabRow:{display:"flex",gap:6,marginBottom:11},
  tabBtn:{flex:1,padding:"8px 0",borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:3},
  tabOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  notifDot:{background:"#e74c3c",color:"#fff",borderRadius:20,fontSize:9,padding:"1px 5px",fontWeight:700},

  steps:{display:"flex",marginBottom:11},
  si:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,opacity:.3,transition:"opacity .2s"},
  sd:{width:24,height:24,borderRadius:"50%",background:"var(--p)",color:"var(--p-text)",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"},

  chip:{padding:"5px 11px",borderRadius:20,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  chipOn:{background:"var(--pa12)",border:"1.5px solid var(--p)",color:"var(--p)"},
  totalBox:{background:"var(--pa07)",border:"1px solid var(--pa2)",borderRadius:8,padding:"7px 11px",fontSize:12,color:"var(--text-primary)",marginBottom:10},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10},
  ts:{padding:"8px 3px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",textAlign:"center"},
  tsF:{background:"var(--surface-2)",color:"var(--text-muted)",borderColor:"var(--border-ui)",cursor:"not-allowed",opacity:.5},
  tsS:{background:"var(--pa15)",borderColor:"var(--p)",color:"var(--p)",fontWeight:700},

  bItem:{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)"},
  pmBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--p)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0},

  locTab:{flex:1,padding:"7px 0",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  locTabOn:{background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff"},
  detectBtn:{width:"100%",background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"10px 0",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  otherBtn:{marginTop:6,width:"100%",background:"transparent",border:"1.5px dashed #2a6dd9",color:"#6aadff",padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  addBarberBtn:{width:"100%",background:"transparent",border:"1.5px dashed var(--p)",color:"var(--p)",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",marginBottom:3},
  ratingBadge:{background:"var(--pa15)",border:"1px solid rgba(var(--pr),.4)",borderRadius:8,padding:"3px 8px",fontSize:12,fontWeight:700,color:"var(--p)",flexShrink:0,display:"flex",alignItems:"center",gap:3},
  heartCardBtn:{width:36,height:36,borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cairo',sans-serif"},
  heartCardOn:{border:"1.5px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c"},
  xBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #c0392b",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
};


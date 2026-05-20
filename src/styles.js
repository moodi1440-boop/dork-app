const G={
  rootDiv:{minHeight:"100vh",display:"flex",flexDirection:"column",background:"var(--bg-main)",color:"var(--txt-main)",fontFamily:"'Cairo',sans-serif",direction:"rtl",overflow:"hidden"},
  topBar:{background:"var(--surface-1)",height:65,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",gap:8,borderBottom:"1.5px solid var(--border)"},
  roleBtn:{width:40,height:40,borderRadius:8,border:"1.5px solid var(--border-ui)",background:"transparent",color:"#888",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0,transition:"all .2s"},
  roleBtnActive:{background:"rgba(var(--pr),.08)",border:"1.5px solid var(--p)",color:"var(--p)"},

  shell:{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"},
  scroller:{flex:1,overflowY:"auto",overflowX:"hidden"},
  ctn:{padding:12,display:"flex",flexDirection:"column",gap:12},

  h1:{fontSize:28,fontWeight:700,marginBottom:0},
  h2:{fontSize:20,fontWeight:700,marginBottom:0},
  p:{color:"var(--txt-sub)",fontSize:13},

  sec:{background:"var(--surface-1)",borderRadius:12,padding:12,border:"1px solid var(--border-ui)"},

  pill:{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:20,background:"var(--surface-2)",border:"1px solid var(--border-ui)",color:"var(--text-primary)",fontSize:12,fontWeight:600,cursor:"pointer"},
  pillOn:{background:"rgba(var(--pr),.15)",border:"1.5px solid var(--p)",color:"var(--p)"},

  chip:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,background:"var(--surface-2)",border:"1px solid var(--border-ui)",color:"var(--text-primary)",fontSize:13,cursor:"pointer",fontWeight:500},
  chipOn:{background:"rgba(var(--pr),.1)",border:"1.5px solid var(--p)",color:"var(--p)"},

  btn:{padding:"10px 16px",borderRadius:10,border:"none",background:"var(--p)",color:"#000",cursor:"pointer",fontSize:13,fontFamily:"'Cairo',sans-serif",fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8},
  btnDim:{background:"#888",color:"#fff"},
  btnOutline:{background:"transparent",border:"1.5px solid var(--p)",color:"var(--p)"},

  inp:{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"'Cairo',sans-serif",boxSizing:"border-box"},
  ta:{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:13,fontFamily:"'Cairo',sans-serif",boxSizing:"border-box",resize:"vertical",minHeight:80},

  card:{background:"var(--surface-1)",borderRadius:12,padding:12,border:"1px solid var(--border-ui)",display:"flex",flexDirection:"column",gap:8},

  err:{color:"#e74c3c",fontSize:12,marginTop:4},

  badge:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"4px 10px",borderRadius:6,background:"rgba(var(--pr),.15)",color:"var(--p)",fontSize:12,fontWeight:700},

  fRow:{display:"flex",flexDirection:"row",gap:8,alignItems:"flex-start",marginBottom:10},
  fCol:{display:"flex",flexDirection:"column",gap:8},

  hr:{height:"1px",background:"var(--border-ui)",margin:"12px 0",border:"none"},

  sl2:{display:"inline-flex",alignItems:"center",gap:3,color:"var(--text-muted)",fontSize:12},

  msg:{padding:12,borderRadius:10,background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.3)",color:"#34d399",fontSize:13,marginBottom:10},

  reviewRow:{background:"var(--surface-1)",borderRadius:10,padding:10,border:"1px solid var(--border-ui)"},
  rStar:{color:"#e8c04a",fontSize:12,fontWeight:700},

  bgWrap:{position:"relative",minHeight:"100vh"},
  bgLayer:{position:"fixed",inset:0,zIndex:-1,pointerEvents:"none"},

  homeSearch:{display:"flex",gap:8,flexDirection:"column"},
  homeFilter:{display:"flex",gap:6,flexWrap:"wrap"},
  homeSalonList:{display:"flex",flexDirection:"column",gap:8},
  homeSalon:{background:"var(--surface-1)",borderRadius:10,padding:10,border:"1px solid var(--border-ui)",display:"flex",gap:10},

  topHeader:{padding:"16px 12px",background:"var(--surface-1)",borderBottom:"1.5px solid var(--border-ui)"},
  topSubtitle:{color:"var(--text-muted)",fontSize:12,marginTop:4},

  ownerDashSec:{background:"var(--surface-1)",borderRadius:12,padding:12,border:"1px solid var(--border-ui)",marginBottom:10},
  ownerTab:{padding:10,borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontWeight:600,flex:1,textAlign:"center"},
  ownerTabOn:{background:"rgba(var(--pr),.1)",border:"1.5px solid var(--p)",color:"var(--p)"},

  bookRow:{background:"var(--surface-1)",borderRadius:10,padding:10,border:"1px solid var(--border-ui)",marginBottom:8},
  bookTime:{fontSize:13,fontWeight:700,color:"var(--p)"},
  bookAct:{display:"flex",gap:6},

  bookCalHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  bookCalGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:12},
  bookCalDay:{padding:8,borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",textAlign:"center",cursor:"pointer",fontSize:11,fontWeight:600},
  bookCalDayOn:{background:"rgba(var(--pr),.15)",border:"1.5px solid var(--p)",color:"var(--p)"},

  timeGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10},
  ts:{padding:"8px 3px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-primary)",cursor:"pointer",fontSize:11,fontFamily:"'Cairo',sans-serif",textAlign:"center"},
  tsF:{background:"#160a0a",color:"#444",borderColor:"#2a1414",cursor:"not-allowed"},
  tsS:{background:"var(--pa15)",borderColor:"var(--p)",color:"var(--p)",fontWeight:700},

  bItem:{background:"var(--surface-1)",borderRadius:10,padding:"10px 12px",border:"1px solid var(--border-ui)"},
  pmBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #2a2a3a",background:"#0d0d1a",color:"var(--p)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",fontWeight:700,padding:0},

  locTab:{flex:1,padding:"7px 0",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"var(--text-muted)",cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",fontWeight:600},
  locTabOn:{background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff"},
  detectBtn:{width:"100%",background:"rgba(42,109,217,.1)",border:"1.5px solid #2a6dd9",color:"#6aadff",padding:"10px 0",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif"},

  otherBtn:{marginTop:6,width:"100%",background:"transparent",border:"1.5px dashed #2a6dd9",color:"#6aadff",padding:"6px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif"},
  addBarberBtn:{width:"100%",background:"transparent",border:"1.5px dashed var(--p)",color:"var(--p)",padding:"7px 0",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"'Cairo',sans-serif",marginBottom:3},
  ratingBadge:{background:"var(--pa15)",border:"1px solid rgba(var(--pr),.4)",borderRadius:8,padding:"3px 8px",fontSize:12,fontWeight:700,color:"var(--p)",flexShrink:0,display:"flex",alignItems:"center",gap:3},
  heartCardBtn:{width:36,height:36,borderRadius:9,border:"1.5px solid var(--border-ui)",background:"var(--surface-2)",color:"#888",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cairo',sans-serif"},
  heartCardOn:{border:"1.5px solid #e74c3c",background:"rgba(231,76,60,.1)",color:"#e74c3c"},
  xBtn:{width:26,height:26,borderRadius:7,border:"1.5px solid #c0392b",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",flexShrink:0},
};

export { G };

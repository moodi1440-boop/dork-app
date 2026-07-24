// حدود الأخطاء (Error Boundary) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React from "react";
import i18n from "../../i18n.js";
import { IconWarning } from "./Icons.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={err:null,info:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,info){this.setState({info:info?.componentStack||""});}
  render(){
    if(this.state.err)return(
      <div style={{minHeight:"100vh",background:"#09112e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Cairo',sans-serif",direction:"rtl",padding:20,gap:12}}>
        <div style={{display:"flex",justifyContent:"center"}}><IconWarning size={32}/></div>
        <div style={{color:"#e74c3c",fontSize:14,fontWeight:700}}>{i18n.t('ui.app_error')}</div>
        <div style={{color:"var(--text-muted)",fontSize:11,background:"var(--surface-2)",padding:"12px 16px",borderRadius:8,maxWidth:340,wordBreak:"break-all",textAlign:"left",direction:"ltr"}}>{String(this.state.err)}</div>
        {this.state.info&&<div style={{color:"#666",fontSize:9,background:"#111",padding:"8px 12px",borderRadius:8,maxWidth:340,wordBreak:"break-all",textAlign:"left",direction:"ltr",maxHeight:120,overflow:"auto"}}>{this.state.info}</div>}
        <button onClick={()=>window.location.reload()} style={{background:"var(--gold)",color:"var(--p-text)",border:"none",borderRadius:8,padding:"8px 20px",fontFamily:"'Cairo',sans-serif",fontWeight:700,cursor:"pointer"}}>{i18n.t('ui.reload')}</button>
      </div>
    );
    return this.props.children;
  }
}

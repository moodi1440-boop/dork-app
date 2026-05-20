import React from "react";
import { G } from "../styles.js";

function TopBar({ownerSession,customerSession,setView,setOwnerSession,setCustomerSession,darkMode,setDarkMode,resetHome}){
  return(
    <div style={G.topBar}>
      {/* LEFT: role buttons */}
      <div style={{display:"flex",gap:5,alignItems:"center"}}>
        <button style={{...G.roleBtn,...(ownerSession?G.roleBtnActive:{})}} onClick={()=>setView(ownerSession?"ownerDash":"ownerLogin")}>✂</button>
        <button style={{...G.roleBtn,...(customerSession?G.roleBtnActive:{})}} onClick={()=>setView(customerSession?"custDash":"custLogin")}>👤</button>
        <button style={G.roleBtn} onClick={()=>setView("settings")}>⚙</button>
        <button style={{...G.roleBtn,background:"var(--pa12)",border:"1.5px solid var(--pa25)",color:"var(--p)"}} onClick={()=>resetHome&&resetHome()}>🏠</button>
      </div>
      {/* RIGHT: شعار دورك — أيقونة فوق + DORK تحت */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,cursor:"pointer",lineHeight:1}} onClick={()=>resetHome&&resetHome()}>
        <img src="/Logo-gold.svg" alt="DORK" style={{height:52,width:"auto",display:"block"}}/>
      </div>
    </div>
  );
}


export { TopBar };

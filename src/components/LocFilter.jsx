import React from "react";
import { G } from "../styles.js";

function LocFilter({icon,label,value,onChange,options,all}){
  return(
    <div style={G.fRow}>
      <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
      <span style={{fontSize:11,color:"var(--p)",flexShrink:0,minWidth:50}}>{label}</span>
      <select style={G.fSel} value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}


export { LocFilter };

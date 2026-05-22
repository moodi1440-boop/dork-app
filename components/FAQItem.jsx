import React, { useState } from "react";


function FAQItem({q,a}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:8,borderRadius:10,border:"1px solid #2a2a3a",overflow:"hidden"}}>
      <button style={{width:"100%",padding:"11px 14px",background:"#0d0d1a",border:"none",color:"#fff",fontSize:13,fontWeight:700,textAlign:"right",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>setOpen(p=>!p)}>
        <span>{q}</span><span style={{color:"var(--p)",fontSize:14,transform:open?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>v</span>
      </button>
      {open&&<div style={{padding:"10px 14px",background:"#13131f",fontSize:12,color:"#aaa",lineHeight:1.7}}>{a}</div>}
    </div>
  );
}


export { FAQItem };

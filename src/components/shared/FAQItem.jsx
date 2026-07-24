// عناصر واجهة صغيرة إضافية: إدخال OTP، تقييم نجوم مضمّن، محتوى الخصوصية، عنصر أسئلة شائعة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState } from "react";


export function FAQItem({q,a}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:8,borderRadius:10,border:"1px solid var(--border-ui)",overflow:"hidden"}}>
      <button style={{width:"100%",padding:"11px 14px",background:"var(--bg-input)",border:"none",color:"var(--text-primary)",fontSize:13,fontWeight:700,textAlign:"right",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>setOpen(p=>!p)}>
        <span>{q}</span><span style={{color:"var(--p)",fontSize:14,transform:open?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>v</span>
      </button>
      {open&&<div style={{padding:"10px 14px",background:"var(--surface-1)",fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>{a}</div>}
    </div>
  );
}

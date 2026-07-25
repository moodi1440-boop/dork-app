// عناصر واجهة صغيرة إضافية: إدخال OTP، تقييم نجوم مضمّن، محتوى الخصوصية، عنصر أسئلة شائعة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../../styles.js";
import { IconStar } from "./Icons.jsx";


export function InlineStarRating({rated,comment,onRate}){
  const{t}=useTranslation();
  const[hover,setHover]=useState(0);
  const[sel,setSel]=useState(0);
  const[txt,setTxt]=useState("");
  const[sending,setSending]=useState(false);
  const sendingLockRef=useRef(false);
  const labels=["","ضعيف","مقبول","جيد","جيد جداً","ممتاز"];
  if(rated>0) return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{display:"flex",gap:1,marginBottom:comment?4:0}}>
        {[1,2,3,4,5].map(n=><IconStar key={n} size={18} color={n<=rated?"var(--gold)":"#333"}/>)}
        <span style={{fontSize:11,color:"var(--text-muted)",marginRight:6,alignSelf:"center"}}>{labels[rated]}</span>
      </div>
      {comment&&<div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>"{comment}"</div>}
    </div>
  );
  return(
    <div style={{marginTop:8,borderTop:"1px solid #1e1e2e",paddingTop:8}}>
      <div style={{fontSize:11,color:"#666",marginBottom:5}}>{t('ui.rate_experience')}</div>
      <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:8}}>
        {[1,2,3,4,5].map(n=>(
          <span key={n}
            style={{cursor:"pointer",transition:"color .1s",lineHeight:1,userSelect:"none"}}
            onMouseEnter={()=>setHover(n)}
            onMouseLeave={()=>setHover(0)}
            onClick={()=>setSel(n)}><IconStar size={28} color={n<=(hover||sel)?"var(--gold)":"var(--border-ui)"}/></span>
        ))}
        {(hover||sel)>0&&<span style={{fontSize:11,color:"var(--p)",marginRight:6,fontWeight:600}}>{labels[hover||sel]}</span>}
      </div>
      {sel>0&&<>
        <textarea
          style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--border-ui)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",direction:"rtl",resize:"none",minHeight:60,marginBottom:8}}
          placeholder={t('ui.add_comment_ph')}
          value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button disabled={sending} style={{...G.sub,padding:"8px 0",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5,opacity:sending?0.6:1,cursor:sending?"not-allowed":"pointer"}} onClick={async()=>{if(sendingLockRef.current)return;sendingLockRef.current=true;setSending(true);try{await onRate(sel,txt);}finally{sendingLockRef.current=false;setSending(false);}}}>
          {sending?"...":"إرسال التقييم"} <IconStar size={12}/>
        </button>
      </>}
    </div>
  );
}

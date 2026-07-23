// عناصر واجهة صغيرة إضافية: إدخال OTP، تقييم نجوم مضمّن، محتوى الخصوصية، عنصر أسئلة شائعة — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { G } from "../styles.js";
import { IconStar } from "./icons.jsx";
import { fi } from "./ui.jsx";

export function OtpInput({value,onChange,error,disabled=false,use6Boxes=false}){
  const inputRef=useRef(null);
  const autofillRef=useRef(null);
  const boxRefs=useRef([]);

  // توزيع الكود على الخانات بترتيب صحيح (Index 0..5 LTR)
  const distributeDigits=(rawInput,startIndex=0)=>{
    const digits=String(rawInput||"").replace(/\D/g,"");
    if(!digits){
      const arr=value.split("");
      arr[startIndex]="";
      onChange(arr.join("").substring(0,6));
      return;
    }
    const arr=value.split("");
    const toFill=digits.substring(0,6-startIndex);
    for(let i=0;i<toFill.length;i++){
      arr[startIndex+i]=toFill[i];
    }
    const newValue=arr.slice(0,6).join("").substring(0,6);
    onChange(newValue);
    const nextIndex=Math.min(startIndex+toFill.length,5);
    setTimeout(()=>{
      if(boxRefs.current[nextIndex]){
        boxRefs.current[nextIndex].focus();
        try{boxRefs.current[nextIndex].select();}catch(_){}
      }
    },0);
  };

  const handleChange=(e)=>{
    const val=String(e.target.value||"").replace(/\D/g,"").slice(0,6);
    onChange(val);
  };

  const handleBoxChange=(index,rawInput)=>{
    distributeDigits(rawInput,index);
  };

  const handlePaste=(index,e)=>{
    e.preventDefault();
    const pasted=e.clipboardData?.getData("text")||"";
    distributeDigits(pasted,index);
  };

  const handleBoxKeyDown=(index,e)=>{
    if(e.key==="Backspace"){
      if(!value[index]&&index>0){
        e.preventDefault();
        const arr=value.split("");
        arr[index-1]="";
        onChange(arr.join("").substring(0,6));
        boxRefs.current[index-1]?.focus();
      }
    }else if(e.key==="ArrowLeft"&&index>0){
      e.preventDefault();
      boxRefs.current[index-1]?.focus();
    }else if(e.key==="ArrowRight"&&index<5){
      e.preventDefault();
      boxRefs.current[index+1]?.focus();
    }
  };

  // التعامل مع الـ autofill من iOS
  const handleAutofill=(e)=>{
    const val=String(e.target.value||"").replace(/\D/g,"").slice(0,6);
    if(val.length>0){
      onChange(val);
      setTimeout(()=>{
        if(boxRefs.current[0]){
          boxRefs.current[0].focus();
        }
      },10);
    }
  };

  if(use6Boxes){
    return(
      <div dir="ltr" style={{display:"flex",gap:8,justifyContent:"space-between",direction:"ltr",unicodeBidi:"plaintext"}}>
        {/* حقل مخفي للـ autofill من iOS - iOS يملأ هذا الحقل تلقائياً عند وصول الكود */}
        <input
          ref={autofillRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          name="otp"
          maxLength="6"
          value={value}
          onChange={handleAutofill}
          id="otp-input"
          style={{position: 'absolute', opacity: 0.01, height: "1px", width: "1px", zIndex: -1, pointerEvents: 'none', top: "50%"}}
        />
        {/* الـ 6 صناديق المرئية */}
        {[0,1,2,3,4,5].map(i=>(
          <input
            key={i}
            ref={el=>boxRefs.current[i]=el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={1}
            value={value[i]||""}
            onChange={e=>handleBoxChange(i,e.target.value)}
            onPaste={e=>handlePaste(i,e)}
            onKeyDown={e=>handleBoxKeyDown(i,e)}
            onFocus={e=>{try{e.target.select();}catch(_){}}}
            disabled={disabled}
            dir="ltr"
            style={{
              ...fi(error),
              width:"40px",
              height:"44px",
              padding:"0",
              fontSize:"18px",
              fontWeight:"700",
              direction:"ltr",
              textAlign:"center",
              unicodeBidi:"plaintext"
            }}
          />
        ))}
      </div>
    );
  }

  return(
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      name="otp"
      autoComplete="one-time-code"
      maxLength="6"
      value={value}
      onChange={handleChange}
      placeholder="000000"
      disabled={disabled}
      dir="ltr"
      style={{...fi(error),direction:"ltr",textAlign:"center",letterSpacing:"4px",fontWeight:"700"}}
    />
  );
}

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

export function PrivacyPolicyContent(){
  const{t}=useTranslation();
  const box={background:"var(--surface-1)",borderRadius:13,padding:16,border:"1px solid var(--border-ui)",marginBottom:12};
  const hdr={fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--border-ui)"};
  const sections=t("settings.privacy_sections",{returnObjects:true})||[];
  return(
    <div style={box}>
      <div style={hdr}>{t("settings.privacy_header")}</div>
      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:12}}>{t("settings.privacy_updated")}</div>
      {sections.map(({title,content},i)=>(
        <div key={i} style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--p)",marginBottom:5}}>{title}</div>
          <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.8}}>{content}</div>
        </div>
      ))}
    </div>
  );
}

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


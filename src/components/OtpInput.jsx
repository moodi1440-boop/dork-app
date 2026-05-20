import React, { useRef } from "react";


function OtpInput({value,onChange,error,disabled=false,use6Boxes=false}){
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


export { OtpInput };

import React from "react";
import { G } from "../styles.js";

function ShareBtn({salon}){
  const shareUrl=`${window.location.origin}${window.location.pathname}?salon=${salon.id}`;
  const shareText=`✂ ${salon.name}\n📍 ${salon.gov||salon.region}\n⭐ ${salon.rating||5}\n\nاحجز الآن: ${shareUrl}`;

  const share=async()=>{
    if(navigator.share){
      try{await navigator.share({title:salon.name,text:shareText,url:shareUrl});}catch{}
    }else{
      try{await navigator.clipboard.writeText(shareUrl);alert("✅ تم نسخ رابط الصالون!");}catch{alert(shareUrl);}
    }
  };

  return(
    <button style={{...G.pageBtn,fontSize:11,padding:"5px 10px"}} onClick={share}>
      📤 مشاركة
    </button>
  );
}


export { ShareBtn };

// إشعارات محلية (localStorage + Notification API) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import { NOTIF_TEXTS } from "./constants.js";
import { sb } from "./api.js";

export async function requestNotifPermission(){
  if(!("Notification" in window))return false;
  if(Notification.permission==="granted")return true;
  const p=await Notification.requestPermission();
  return p==="granted";
}

export const ntxt=(lang)=>NOTIF_TEXTS[lang]||NOTIF_TEXTS.ar;

export function sendNotif(title,body,icon="✂",targetType="all",targetId=null){
  // زيادة عداد الجرس
  const count=parseInt(localStorage.getItem("dork_notif_count")||"0");
  localStorage.setItem("dork_notif_count",String(count+1));
  // حفظ الإشعار محلياً
  try{
    const notifs=JSON.parse(localStorage.getItem("dork_notifs")||"[]");
    notifs.unshift({id:Date.now(),title,body,icon,time:new Date().toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit",hour12:true}),read:false});
    localStorage.setItem("dork_notifs",JSON.stringify(notifs.slice(0,50)));
  }catch{}
  // حفظ الإشعار في Supabase لمزامنة الويب
  sb("notifications","POST",{target_type:targetType,target_id:targetId,title,body,icon}).catch(()=>{});
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{new Notification(`${icon} ${title}`,{body,icon:"/favicon.ico",dir:"rtl",lang:"ar"});}catch{}
}

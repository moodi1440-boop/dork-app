// لوحة مراجعات صاحب الصالون وتقويم الحجوزات — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n.js";
import { G } from "../../styles.js";

import { IconCalendar, IconStar, IconUser } from "../shared/Icons.jsx";
import { sb } from "../../api.js";


export function OwnerReviewsPanel({salon,reviews,setReviews,toast$}){
  const{t}=useTranslation();
  const gold="var(--p)";
  const goldStar="var(--gold)";
  const[replyDraft,setReplyDraft]=useState({});
  const[saving,setSaving]=useState(null);

  const salonReviews=useMemo(()=>{
    if(!reviews||!salon)return[];
    return (reviews||[])
      .filter(r=>Number(r.salon_id)===Number(salon.id))
      .sort((a,b)=>(b.booking_date||b.created_at||"").localeCompare(a.booking_date||a.created_at||""));
  },[reviews,salon]);

  const avg=salonReviews.length
    ?Math.round(salonReviews.reduce((s,r)=>s+r.rating,0)/salonReviews.length*10)/10:0;

  const saveReply=async(reviewId)=>{
    const text=(replyDraft[reviewId]||"").trim();
    if(!text)return;
    setSaving(reviewId);
    try{
      await sb("reviews","PATCH",{owner_reply:text},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:text}:r));
      setReplyDraft(p=>({...p,[reviewId]:""}));
      toast$(t("owner_dash.reply_saved"));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
    finally{setSaving(null);}
  };

  const deleteReply=async(reviewId)=>{
    try{
      await sb("reviews","PATCH",{owner_reply:null},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:null}:r));
      toast$(t("owner_dash.reply_deleted"));
    }catch(e){toast$(i18n.t('ui.error_prefix')+e.message,"err");}
  };

  return(
    <div style={{paddingTop:8}}>
      {/* ملخص */}
      <div style={{background:"rgba(var(--gold-rgb),.07)",border:"1px solid rgba(var(--gold-rgb),.18)",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:900,color:goldStar,lineHeight:1}}>{avg||"—"}</div>
          <div style={{display:"flex",gap:1,justifyContent:"center",margin:"4px 0"}}>
            {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=Math.round(avg)?goldStar:"rgba(var(--gold-rgb),.2)"}/>)}
          </div>
          <div style={{fontSize:10,color:"var(--text-muted)"}}>{salonReviews.length} {t("salon_page.reviews_count")}</div>
        </div>
        <div style={{flex:1}}>
          {[5,4,3,2,1].map(s=>{
            const cnt=salonReviews.filter(r=>r.rating===s).length;
            const pct=salonReviews.length?Math.round(cnt/salonReviews.length*100):0;
            return(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:10,color:goldStar,width:8}}>{s}</span>
                <div style={{flex:1,height:5,background:"rgba(var(--gold-rgb),.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:gold,borderRadius:3,transition:"width .4s"}}/>
                </div>
                <span style={{fontSize:9,color:"#666",width:24,textAlign:"left"}}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {salonReviews.length===0&&<div style={G.empty}>{t("owner_dash.reviews_empty")}</div>}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {salonReviews.map(r=>{
          const hasReply=r.owner_reply&&r.owner_reply.trim();
          const draft=replyDraft[r.id]??r.owner_reply??"";
          return(
            <div key={r.id} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              {/* العميل */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><IconUser size={11}/>{r.customer_name||t("owner_dash.customer_fallback")}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><IconStar key={n} size={13} color={n<=r.rating?goldStar:"rgba(var(--gold-rgb),.18)"}/>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:4}}>«{r.comment}»</div>}
              <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:8,display:"flex",alignItems:"center",gap:3}}><IconCalendar size={9}/>{r.booking_date||r.created_at?.split("T")[0]||"—"}</div>

              {/* رد موجود */}
              {hasReply&&!(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply)&&(
                <div style={{padding:"8px 10px",background:"rgba(var(--pr),.07)",borderRight:"3px solid var(--p)",borderRadius:"0 8px 8px 0",marginBottom:6}}>
                  <div style={{fontSize:10,color:gold,fontWeight:700,marginBottom:2}}>{t("owner_dash.reply_label")}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{r.owner_reply}</div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>setReplyDraft(p=>({...p,[r.id]:r.owner_reply}))} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit"}}>{t("owner_dash.reply_edit")}</button>
                    <button onClick={()=>deleteReply(r.id)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid #e74c3c55",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}>{t("owner_dash.reply_delete")}</button>
                  </div>
                </div>
              )}

              {/* حقل الرد */}
              {(!hasReply||(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply))&&(
                <div>
                  <textarea
                    value={draft}
                    onChange={e=>setReplyDraft(p=>({...p,[r.id]:e.target.value}))}
                    placeholder={t("owner_dash.reply_ph")}
                    rows={2}
                    style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--pa25)",background:"var(--bg-input)",color:"var(--text-primary)",fontSize:12,fontFamily:"'Cairo',sans-serif",resize:"none",outline:"none",direction:"rtl"}}
                  />
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button
                      onClick={()=>saveReply(r.id)}
                      disabled={saving===r.id||!draft.trim()}
                      style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:draft.trim()?"linear-gradient(135deg,var(--p),var(--pl))":"var(--border-ui)",color:draft.trim()?"#000":"#555",fontWeight:700,cursor:draft.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12}}>
                      {saving===r.id?t("owner_dash.reply_sending"):t("owner_dash.reply_send")}
                    </button>
                    {hasReply&&<button onClick={()=>setReplyDraft(p=>{const n={...p};delete n[r.id];return n;})} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>{t("owner_dash.reply_cancel")}</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

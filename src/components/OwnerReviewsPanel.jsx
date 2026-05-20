import React, { useState, useMemo } from "react";
import { G } from "../styles";
import { supabase, sb } from "../api/supabase";

function OwnerReviewsPanel({salon,reviews,setReviews,toast$}){
  const gold="#d4a017";
  const goldStar="#e8c04a";
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
      toast$("✅ تم حفظ ردّك");
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
    finally{setSaving(null);}
  };

  const deleteReply=async(reviewId)=>{
    try{
      await sb("reviews","PATCH",{owner_reply:null},`?id=eq.${reviewId}`);
      setReviews(p=>p.map(r=>r.id===reviewId?{...r,owner_reply:null}:r));
      toast$("تم حذف الرد");
    }catch(e){toast$("❌ خطأ: "+e.message,"err");}
  };

  return(
    <div style={{paddingTop:8}}>
      {/* ملخص */}
      <div style={{background:"rgba(212,160,23,.07)",border:"1px solid rgba(212,160,23,.18)",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:900,color:goldStar,lineHeight:1}}>{avg||"—"}</div>
          <div style={{display:"flex",gap:1,justifyContent:"center",margin:"4px 0"}}>
            {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=Math.round(avg)?goldStar:"rgba(212,160,23,.2)"}}>★</span>)}
          </div>
          <div style={{fontSize:10,color:"#888"}}>{salonReviews.length} تقييم</div>
        </div>
        <div style={{flex:1}}>
          {[5,4,3,2,1].map(s=>{
            const cnt=salonReviews.filter(r=>r.rating===s).length;
            const pct=salonReviews.length?Math.round(cnt/salonReviews.length*100):0;
            return(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:10,color:goldStar,width:8}}>{s}</span>
                <div style={{flex:1,height:5,background:"rgba(212,160,23,.1)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:gold,borderRadius:3,transition:"width .4s"}}/>
                </div>
                <span style={{fontSize:9,color:"#666",width:24,textAlign:"left"}}>{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      {salonReviews.length===0&&<div style={G.empty}>لا توجد تقييمات بعد</div>}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {salonReviews.map(r=>{
          const hasReply=r.owner_reply&&r.owner_reply.trim();
          const draft=replyDraft[r.id]??r.owner_reply??"";
          return(
            <div key={r.id} style={{background:"var(--surface-1)",border:"1px solid var(--border-ui)",borderRadius:12,padding:"12px 13px"}}>
              {/* العميل */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:12,color:"#c0c0d0",fontWeight:700}}>👤 {r.customer_name||"عميل"}</span>
                <div style={{display:"flex",gap:1}}>
                  {[1,2,3,4,5].map(n=><span key={n} style={{fontSize:13,color:n<=r.rating?goldStar:"rgba(212,160,23,.18)"}}>★</span>)}
                </div>
              </div>
              {r.comment&&<div style={{fontSize:11,color:"#a8a8bc",fontStyle:"italic",lineHeight:1.5,marginBottom:4}}>«{r.comment}»</div>}
              <div style={{fontSize:9,color:"#444",marginBottom:8}}>📅 {r.booking_date||r.created_at?.split("T")[0]||"—"}</div>

              {/* رد موجود */}
              {hasReply&&!(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply)&&(
                <div style={{padding:"8px 10px",background:"rgba(212,160,23,.07)",borderRight:"3px solid #d4a017",borderRadius:"0 8px 8px 0",marginBottom:6}}>
                  <div style={{fontSize:10,color:gold,fontWeight:700,marginBottom:2}}>✂ ردّك</div>
                  <div style={{fontSize:11,color:"#c8c8a8",lineHeight:1.5}}>{r.owner_reply}</div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>setReplyDraft(p=>({...p,[r.id]:r.owner_reply}))} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid var(--pa25)",background:"transparent",color:"var(--p)",cursor:"pointer",fontFamily:"inherit"}}>✏ تعديل</button>
                    <button onClick={()=>deleteReply(r.id)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:"1px solid #e74c3c55",background:"transparent",color:"#e74c3c",cursor:"pointer",fontFamily:"inherit"}}>🗑 حذف</button>
                  </div>
                </div>
              )}

              {/* حقل الرد */}
              {(!hasReply||(replyDraft[r.id]!=null&&replyDraft[r.id]!==r.owner_reply))&&(
                <div>
                  <textarea
                    value={draft}
                    onChange={e=>setReplyDraft(p=>({...p,[r.id]:e.target.value}))}
                    placeholder="اكتب ردّك على هذا التقييم..."
                    rows={2}
                    style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1.5px solid var(--pa25)",background:"#0d0d1a",color:"#f0f0f0",fontSize:12,fontFamily:"'Cairo',sans-serif",resize:"none",outline:"none",direction:"rtl"}}
                  />
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button
                      onClick={()=>saveReply(r.id)}
                      disabled={saving===r.id||!draft.trim()}
                      style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:draft.trim()?"linear-gradient(135deg,var(--p),#f0c040)":"#2a2a3a",color:draft.trim()?"#000":"#555",fontWeight:700,cursor:draft.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12}}>
                      {saving===r.id?"جاري الحفظ...":"💬 إرسال الرد"}
                    </button>
                    {hasReply&&<button onClick={()=>setReplyDraft(p=>{const n={...p};delete n[r.id];return n;})} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #333",background:"transparent",color:"#888",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>إلغاء</button>}
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


export { OwnerReviewsPanel };

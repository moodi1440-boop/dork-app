import React, { useState } from "react";


function TermsView({onAccept}){
  const[checked,setChecked]=useState(false);
  return(
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Cairo',sans-serif",direction:"rtl"}}>
      <div style={{maxWidth:480,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:50,marginBottom:8}}>✂</div>
          <div style={{fontSize:28,fontWeight:900,color:"var(--p,#d4a017)",letterSpacing:2}}>دورك</div>
          <div style={{fontSize:13,color:"#888",marginTop:4}}>الشروط والأحكام</div>
        </div>
        <div style={{background:"#13131f",borderRadius:16,padding:20,border:"1px solid #2a2a3a",marginBottom:16,maxHeight:300,overflowY:"auto"}}>
          {[
            {t:"١. التزام العميل",c:"يلتزم العميل بالحضور في الوقت المحدد للحجز. في حال التأخر أو الغياب بدون إشعار مسبق، يحق للصالون إلغاء الحجز."},
            {t:"٢. التزام الصالون",c:"يلتزم الصالون بتقديم الخدمة في الوقت المحجوز، ومتابعة طلبات العملاء والرد عليها في أقرب وقت ممكن."},
            {t:"٣. سياسة الإلغاء",c:"يمكن إلغاء الحجز قبل الموعد بساعة على الأقل. الإلغاء المتكرر قد يؤثر على أولوية الحجز."},
            {t:"٤. خصوصية البيانات",c:"تُحفظ بيانات المستخدمين بسرية تامة ولا تُشارك مع أطراف ثالثة إلا بموافقة صريحة."},
            {t:"٥. التزامات الإدارة",c:"تحتفظ إدارة دورك بحق تعليق أو إلغاء أي حساب يخالف شروط الاستخدام."},
            {t:"٦. جودة الخدمة",c:"الإدارة غير مسؤولة عن جودة الخدمة المقدمة من الصالون، وأي نزاع يُحل مباشرة بين العميل والصالون."},
            {t:"٧. التعديلات",c:"تحتفظ إدارة دورك بحق تعديل هذه الشروط في أي وقت مع إشعار المستخدمين."},
          ].map(({t,c})=>(
            <div key={t} style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--p,#d4a017)",marginBottom:4}}>{t}</div>
              <div style={{fontSize:12,color:"#aaa",lineHeight:1.7}}>{c}</div>
            </div>
          ))}
        </div>
        <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer",padding:"12px 16px",background:"#13131f",borderRadius:10,border:`1.5px solid ${checked?"var(--p,#d4a017)":"#2a2a3a"}`}}>
          <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} style={{width:18,height:18,cursor:"pointer"}}/>
          <span style={{fontSize:13,color:"#fff",fontWeight:600}}>أوافق على الشروط والأحكام</span>
        </label>
        <button style={{width:"100%",padding:14,borderRadius:12,border:"none",background:checked?"linear-gradient(135deg,var(--p,#d4a017),var(--pl,#f0c040))":"#2a2a3a",color:checked?"#000":"#555",fontSize:15,fontWeight:900,cursor:checked?"pointer":"not-allowed",fontFamily:"inherit"}}
          disabled={!checked} onClick={onAccept}>
          دخول التطبيق ✂
        </button>
      </div>
    </div>
  );
}


export { TermsView };

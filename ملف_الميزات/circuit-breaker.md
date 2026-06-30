# ميزة: Circuit Breaker (قاطع الدائرة)

> **الملف المصدر:** `App.jsx` — الأسطر 123–155 + 1874 + 2457
> **النقطة:** 25 في الفحص الشامل
> **الحالة:** ✅ مُنجزة — L116

---

## ما هي الميزة؟

تمنع الـ Circuit Breaker من إرسال طلبات لقاعدة البيانات بعد 3 فشل متتاليين، وتنتظر 30 ثانية قبل المحاولة مجدداً — تحمي المستخدم من حلقات لانهائية وتُخفّف الحمل عن Supabase عند وجود عطل.

---

## الكود الكامل

### 1. الحالة (متغيرات خارج الـ Component)
```js
// App.jsx:123–124
const _cb = { fails: 0, openUntil: 0 };
```

### 2. دالة sb() — تحتوي كل منطق الـ Circuit Breaker
```js
// App.jsx:126–155
async function sb(table, method, body, query = "", authToken = null) {
  // إذا كان الـ circuit مفتوحاً → رمّ خطأ فوري
  if (_cb.openUntil > Date.now()) {
    throw new Error("circuit_open");
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${authToken || SUPABASE_ANON}`,
        "Content-Type": "application/json",
        "Prefer": method === "POST" ? "return=representation" : "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // فشل network → زيادة العدّاد
    if (++_cb.fails >= 3) { _cb.openUntil = Date.now() + 30_000; _cb.fails = 0; }
    throw e;
  }
  if (!res.ok) {
    const err = await res.text();
    // فشل HTTP → زيادة العدّاد
    if (++_cb.fails >= 3) { _cb.openUntil = Date.now() + 30_000; _cb.fails = 0; }
    throw new Error(`Supabase ${method} ${table}: ${err}`);
  }
  _cb.fails = 0; // نجاح → إعادة ضبط العدّاد
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}
```

### 3. عرض خطأ الاتصال للمستخدم
```jsx
// App.jsx:1874 — في دالة loadSalons
setDbError(e.message === "circuit_open"
  ? "الخدمة متوقفة مؤقتاً — سيُعاد المحاولة خلال 30 ثانية"
  : e.message);

// App.jsx:2457 — البانر المرئي
{dbError && !loading && (
  <div style={{ position:"fixed", top:64, left:0, right:0, zIndex:998,
    background:"rgba(231,76,60,.12)", borderBottom:"1px solid rgba(231,76,60,.3)",
    color:"#e74c3c", padding:"8px 16px", fontSize:12, textAlign:"center" }}>
    <IconError size={14}/>
    {dbError.startsWith("الخدمة متوقفة") ? dbError : t('ui.db_error')}
  </div>
)}
```

---

## منطق العمل

```
طلب → هل circuit مفتوح؟
         ↓ نعم → رمّ "circuit_open" فوراً (بدون طلب شبكة)
         ↓ لا  → أرسل الطلب
                 ↓ نجح → _cb.fails = 0
                 ↓ فشل → _cb.fails++
                          هل fails ≥ 3؟
                            ↓ نعم → openUntil = now + 30s، fails = 0
                            ↓ لا  → ابق مفتوحاً للطلب القادم
```

---

## القرارات التقنية

| القرار | السبب |
|--------|-------|
| 3 محاولات قبل الفتح | توازن بين الحساسية والصبر (أقل يُعطّل عند مشاكل شبكة عابرة) |
| 30 ثانية انتظار | وقت كافٍ لاستعادة Supabase + لا يُحبط المستخدم |
| متغير خارج Component | الحالة تُحفَظ حتى عند unmount وremount |
| لا إعادة تعيين تلقائية | المستخدم يرى البانر ويُقرر هو متى يحاول |

---

## الاختبار

1. أوقف الإنترنت (أو أدخل SUPABASE_URL خاطئ مؤقتاً)
2. افتح التطبيق → سيظهر بانر "الخدمة متوقفة مؤقتاً"
3. أعد الإنترنت → بعد 30 ثانية يختفي البانر تلقائياً

---

## الملفات المرتبطة

- `App.jsx:123–155` — الكود الأساسي
- `App.jsx:1874` — رسالة الخطأ
- `App.jsx:2457` — البانر المرئي
- `الفحص-الشامل.md:نقطة 25` — توثيق الإنجاز

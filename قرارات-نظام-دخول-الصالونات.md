# قرارات تصميم Auth للصالونات — النسخة النهائية المعتمدة

> **الحالة:** قرارات مؤكدة — لم يُنفَّذ أي شيء بعد  
> **المرجع:** نقاش مطوّل بين Claude + Gemini في جلسة 2026-06-30  
> **الهدف:** ربط الصالونات بـ Supabase Auth لتفعيل RLS

---

## المشكلة الأصلية

1. الصالونات تسجل الدخول بـ PIN فقط — لا يوجد لها `auth_uid` في Supabase Auth
2. `sb()` في App.jsx تستخدم raw fetch مع ANON key — RLS لا يعمل
3. بدون `auth.uid()` مربوط بالصالون — لا يمكن تطبيق RLS على أي جدول

---

## القرارات النهائية (7 قرارات)

### ① hashOwnerPin يبقى كما هو ✅
- نظام التحقق من PIN الحالي (`hashOwnerPin(pin, salonId)`) **لا يتغير أبداً**
- PIN لا يصبح Password في Supabase Auth
- السبب: Dual Source of Truth خطير ويسبب desync

### ② إضافة `auth_uid` column في جدول `salons` ✅
```sql
ALTER TABLE salons ADD COLUMN auth_uid UUID REFERENCES auth.users(id);
```
- هذا العمود يربط الصالون بـ Supabase Auth user
- يُستخدم في RLS policies لاحقاً

### ③ آلية إصدار Supabase Session بعد التحقق من PIN ✅
في `api/owner-auth.js` — بعد نجاح التحقق من PIN:

```
admin.generateLink({type:'magiclink', email: salon.owner_email})
  → يجيب: data.properties.email_otp
  
regularClient.auth.verifyOtp({token: email_otp, type:'email', email})
  → يجيب: {access_token, refresh_token, user}
  
إرسال {access_token, refresh_token} للـ client في response body
```

- الـ `generateLink` يستخدم **admin client** (service role)
- الـ `verifyOtp` يستخدم **regular client** (anon key)
- لا يُرسَل OTP للمستخدم — العملية كلها server-side فقط

### ④ تعديل `sb()` في App.jsx ✅
إضافة `authToken` parameter اختياري:
```javascript
// قبل
function sb(table, authType) { ... }

// بعد
function sb(table, authType, authToken) {
  // إذا وُجد authToken → يُضاف Authorization: Bearer ${authToken}
}
```

### ⑤ استدعاء `supabase.auth.setSession()` في OwnerLogin ✅
بعد نجاح login في App.jsx:
```javascript
// بعد جلب {access_token, refresh_token} من owner-auth API
await supabase.auth.setSession({ access_token, refresh_token });
// هذا يُفعّل auto-refresh للـ token
```

### ⑥ Migration Script للصالونات الموجودة ✅
الملف: `scripts/migrate-salon-auth.js`  
المنطق:
1. جلب كل الصالونات التي عندها `owner_email` و `auth_uid IS NULL`
2. لكل صالون: `admin.auth.admin.createUser({email, email_confirm: true})`
3. تحديث `auth_uid` في جدول `salons`

**مهم:** يجب عمل backup من جدول salons قبل تشغيله

### ⑦ تعديل `register-salon.js` للصالونات الجديدة ✅
عند تسجيل صالون جديد — إذا وُجد `owner_email`:
```javascript
const {data: authUser} = await admin.auth.admin.createUser({
  email: owner_email,
  email_confirm: true
});
// حفظ authUser.user.id في عمود auth_uid
```

---

## ترتيب التنفيذ (لا تتجاوزه)

```
1. SQL في Supabase SQL Editor (backup + ALTER TABLE)
2. scripts/migrate-salon-auth.js (كتابة + تشغيل يدوي من أحمد)
3. api/owner-auth.js (إضافة generateLink + verifyOtp)
4. App.jsx — sb() function (إضافة authToken parameter)
5. App.jsx — OwnerLogin (إضافة setSession بعد login)
6. api/register-salon.js (إضافة createUser للصالونات الجديدة)
```

---

## SQL الكامل (خطوة 1)

```sql
-- ① Backup
CREATE TABLE salons_backup_auth_migration AS SELECT * FROM salons;

-- ② إضافة العمود
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users(id);

-- ③ تحقق
SELECT COUNT(*) FROM salons WHERE auth_uid IS NULL AND owner_email IS NOT NULL;
```

---

## ملاحظات حرجة

- **الصالونات بدون `owner_email`:** لا يمكن إنشاء auth user لها — تبقى `auth_uid = NULL`، تسجيل الدخول يشتغل بنفس الطريقة القديمة (cookie فقط) إلى أن يُضاف email لها من الإدارة
- **RLS Policies:** لا تُكتب الآن — تُكتب بعد اكتمال migration وتأكيد الـ auth_uid لكل الصالونات
- **الـ regular client في owner-auth.js:** يحتاج `SUPABASE_URL` + `SUPABASE_ANON_KEY` كـ env vars (موجودة في Vercel بالفعل)
- **لا تغيير على OwnerLogin PIN flow:** نفس الشاشة، نفس الـ API — فقط الـ response يزيد `{access_token, refresh_token}`

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `api/owner-auth.js` | تعديل — إضافة generateLink + verifyOtp |
| `App.jsx` — `sb()` | تعديل — إضافة authToken parameter |
| `App.jsx` — `OwnerLogin` | تعديل — إضافة setSession |
| `api/register-salon.js` | تعديل — إضافة createUser |
| `scripts/migrate-salon-auth.js` | جديد — migration script |
| Supabase SQL Editor | يدوي من أحمد — ALTER TABLE |

---

*آخر تحديث: 2026-06-30*

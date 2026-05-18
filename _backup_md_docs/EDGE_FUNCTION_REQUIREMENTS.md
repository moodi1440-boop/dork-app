# 🔧 متطلبات Environment Variables للـ Edge Function

**إجابة مباشرة على سؤالك:**

---

## ✅ المتغيرات المطلوبة في Supabase Dashboard

عند نشر Edge Function، يجب أن تضيف هذه المتغيرات في:

```
Supabase Dashboard > Functions > send-fcm-notification > Configuration
```

### **الجدول الكامل:**

| # | المتغير | المطلوب | الوصف |
|---|---------|--------|-------|
| 1️⃣ | **FIREBASE_SERVICE_ACCOUNT** | ✅ مطلوب | ملف JSON كامل من Firebase Service Accounts |
| 2️⃣ | **SUPABASE_URL** | ✅ مطلوب | رابط Supabase (من Project Settings > API) |
| 3️⃣ | **SUPABASE_SERVICE_ROLE_KEY** | ✅ مطلوب | Service Role Key من Supabase (حساس!) |
| 4️⃣ | **FIREBASE_SERVER_API_KEY** | ⚠️ اختياري | API Key من Firebase (كـ backup) |

---

## 📝 الخطوات التفصيلية

### **متغير #1: FIREBASE_SERVICE_ACCOUNT**

```
اسم: FIREBASE_SERVICE_ACCOUNT
نوع: Secret (مهم جداً!)
الحجم: حوالي 2KB
المصدر: Firebase Console > Project Settings > Service Accounts
```

**الخطوات:**
1. اذهب إلى: https://console.firebase.google.com/
2. اختر مشروع: dork-app
3. Project Settings > Service Accounts
4. اضغط: Generate New Private Key
5. سيحمل ملف JSON
6. انسخ محتوى الملف كاملاً (بدون تعديل)
7. الصق في Supabase

**ملاحظات:**
- ✅ انسخ الملف JSON **كاملاً** بدون قطع
- ✅ بدون أي مسافات إضافية
- ❌ لا تعدّل أي شيء فيه

---

### **متغير #2: SUPABASE_URL**

```
اسم: SUPABASE_URL
نوع: String (عادي)
مثال: https://[project-id].supabase.co
```

**الخطوات:**
1. اذهب إلى: https://app.supabase.com/
2. اختر المشروع: dork-app
3. Settings > API
4. انسخ "Project URL"
5. الصق في Supabase

---

### **متغير #3: SUPABASE_SERVICE_ROLE_KEY**

```
اسم: SUPABASE_SERVICE_ROLE_KEY
نوع: Secret (مهم جداً!)
الحجم: حوالي 200 حرف
```

**الخطوات:**
1. اذهب إلى: https://app.supabase.com/
2. اختر المشروع: dork-app
3. Settings > API
4. انسخ "service_role" key (أسفل الصفحة)
5. الصق في Supabase

**تحذير:**
- ⚠️ هذا مفتاح وصول **كامل**
- ⚠️ حساس جداً - احمِ هذا المفتاح
- ❌ لا تنشره على GitHub

---

### **متغير #4 (اختياري): FIREBASE_SERVER_API_KEY**

```
اسم: FIREBASE_SERVER_API_KEY
نوع: Secret (اختياري)
الحجم: حوالي 100 حرف
```

**الخطوات:**
1. اذهب إلى Firebase Console
2. Project Settings > API & Services > Credentials
3. انسخ أي API Key
4. الصق في Supabase

**ملاحظة:**
- ⭐ اختياري لكن يفضل إضافته كـ backup
- أقل حساسية من Service Account JSON

---

## ✅ Checklist التحقق

```bash
في Supabase Dashboard > Functions > send-fcm-notification > Configuration:

□ FIREBASE_SERVICE_ACCOUNT
  ├── Type: Secret ✓
  └── Value: JSON كامل من Firebase ✓

□ SUPABASE_URL
  ├── Type: String ✓
  └── Value: رابط من Supabase ✓

□ SUPABASE_SERVICE_ROLE_KEY
  ├── Type: Secret ✓
  └── Value: service_role key من Supabase ✓

□ FIREBASE_SERVER_API_KEY (optional)
  ├── Type: Secret ✓
  └── Value: API Key من Firebase ✓

□ جميع المتغيرات محفوظة (Save/Update)
```

---

## 🧪 الاختبار

بعد إضافة المتغيرات:

```bash
# 1. أعد نشر الـ Function
supabase functions deploy send-fcm-notification --project-id dork-app

# 2. اختبر الـ Function
curl -X POST https://[project-id].supabase.co/functions/v1/send-fcm-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -d '{"record":{"id":1,"salon_id":1,"customer_id":1,"date":"2026-05-15","time":"14:00","status":"confirmed","service":"قص","customer_name":"محمد","customer_phone":"0501234567"}}'

# 3. شوف الـ Logs
# في Supabase Dashboard > Functions > send-fcm-notification > Logs
```

---

## 🐛 حل الأخطاء الشائعة

| الخطأ | السبب | الحل |
|-----|------|------|
| "Cannot read property" | متغير ناقص | تأكد من وجود المتغيرات الثلاثة |
| "Invalid JSON" | FIREBASE_SERVICE_ACCOUNT مكسور | انسخ JSON من Firebase مجدداً |
| "Supabase connection failed" | URL أو Key خاطئ | تحقق من القيم من Supabase |
| "Function timeout" | Firebase غير responsive | انتظر وأعد المحاولة |

---

## 📊 الملخص

**المتغيرات المطلوبة:**
- ✅ 3 متغيرات **مطلوبة** (FIREBASE_SERVICE_ACCOUNT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- ⭐ 1 متغير **اختياري** (FIREBASE_SERVER_API_KEY)

**مكان الإضافة:**
- Supabase Dashboard > Functions > Configuration

**المدة الزمنية:**
- ⏱️ 5-10 دقائق للإضافة والاختبار

---

## 🎯 الإجابة المباشرة على سؤالك

**س: هل أحتاج لرفع FIREBASE_SERVER_KEY؟**

**ج:** 
```
✅ لا: لا يجب رفع "FIREBASE_SERVER_KEY"
✅ نعم: يجب رفع "FIREBASE_SERVICE_ACCOUNT" (JSON كامل)
⭐ اختياري: "FIREBASE_SERVER_API_KEY" (يفضل لـ backup)

الترتيب الصحيح:
1. FIREBASE_SERVICE_ACCOUNT (مطلوب)
2. SUPABASE_URL (مطلوب)
3. SUPABASE_SERVICE_ROLE_KEY (مطلوب)
4. FIREBASE_SERVER_API_KEY (اختياري لكن موصى به)
```

---

**الآن أنت مجهز بـ 100%! 🚀**

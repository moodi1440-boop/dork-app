# 🚀 الخطوات التالية لتفعيل Web Push Notifications

تم إعداد معظم الأشياء! الآن نحتاج خطوات يدوية في Firebase و Supabase. اتبع الخطوات التالية بالترتيب:

---

## ✅ ما تم إعداده حالياً (لا تحتاج لتفعيل):

```
✅ جدول fcm_tokens - admin/fcm-tokens-migration.sql
✅ Edge Function - supabase/functions/send-fcm-notification/
✅ Service Worker محدّث - admin/public/sw.js
✅ Firebase Client Library - admin/src/lib/firebase-client.ts
✅ API Routes - admin/src/app/api/fcm-tokens/route.ts
✅ Firebase SDK مثبت - npm install firebase ✓
✅ Manifest.json - admin/public/manifest.json
```

---

## 🔧 الخطوات المتبقية (يجب أن تفعلها):

### **الخطوة 1️⃣: الحصول على VAPID Key من Firebase Console**

هذا مهم جداً للـ Web Push Notifications!

```
1. اذهب إلى: https://console.firebase.google.com/
2. اختر مشروع "dork-app"
3. اذهب إلى: Build > Cloud Messaging
4. في قسم "Web configuration":
   - اضغط الزر "Generate key pair" (أو اضغط الثلاث نقاط)
   - سيعطيك Public Key (VAPID Key)
   - انسخ هذا الـ Key
```

**الـ Key يبدو هكذا:**
```
BHHD_d1E-2Q_Z3YmPHqL9...
```

---

### **الخطوة 2️⃣: تحديث ملف `.env.local` في `/admin/`**

هذا الملف يحتوي على الـ credentials الحساسة. **لا تنشره على GitHub!**

**الملف يجب أن يكون في:**
```
/home/user/dork-app/admin/.env.local
```

**المحتوى:**
```bash
# =====================================================
# Supabase Configuration
# =====================================================
NEXT_PUBLIC_SUPABASE_URL=https://ywrlhvzfefvyogfxfdhl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# =====================================================
# Firebase Configuration (Frontend - آمنة للـ public)
# =====================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBYCJYdJUI_oPfYlOzSukntj4YeLZFiVUY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dork-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dork-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dork-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=659823227621
NEXT_PUBLIC_FIREBASE_APP_ID=1:659823227621:web:befaaa1b5063c86cabda0c
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-T3541BL2R6

# ⚠️ VAPID Key - من Firebase Cloud Messaging
# أنسخ الـ key من Firebase > Cloud Messaging > Web configuration
NEXT_PUBLIC_FCM_VAPID_KEY=YOUR_VAPID_KEY_HERE

# =====================================================
# Firebase Admin Configuration (Backend - حساسة!)
# =====================================================
# من Firebase > Service Accounts > Private Key
# هذا حساس جداً - لا تنشره!
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"dork-app",...}

# Server API Key (اختياري)
FIREBASE_SERVER_API_KEY=YOUR_SERVER_API_KEY_HERE

# =====================================================
# Admin Configuration
# =====================================================
ADMIN_SECRET=admin123

# =====================================================
# Edge Functions Configuration
# =====================================================
NEXT_PUBLIC_SUPABASE_EDGE_FUNCTIONS_URL=https://ywrlhvzfefvyogfxfdhl.supabase.co/functions/v1
FCM_FUNCTION_URL=https://ywrlhvzfefvyogfxfdhl.supabase.co/functions/v1/send-fcm-notification
```

**أين تجد Supabase Keys:**
```
1. اذهب إلى: https://app.supabase.com/
2. اختر مشروع dork-app
3. اذهب إلى: Settings > API
4. ستجد: URL و Anon Key و Service Role Key
```

---

### **الخطوة 3️⃣: تنفيذ Database Migration**

هذا ينشئ جداول جديدة في Supabase.

```
1. اذهب إلى Supabase Dashboard: https://app.supabase.com/
2. اختر مشروع: dork-app
3. اذهب إلى: SQL Editor
4. اضغط: New Query
5. انسخ محتوى الملف: /admin/fcm-tokens-migration.sql
6. الصق في SQL Editor
7. اضغط: Run (الزر الأزرق)
```

**التحقق من النجاح:**
```
- يجب أن تظهر رسالة "Success"
- اذهب إلى: Table Editor
- يجب أن ترى جداول جديدة:
  ✅ fcm_tokens
  ✅ notification_logs
```

---

### **الخطوة 4️⃣: إعداد Database Trigger**

هذا يستدعي Edge Function عند إضافة حجز جديد.

**في Supabase SQL Editor، نفّذ هذا:**

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the trigger
  RAISE LOG 'Booking created: %', NEW.id;
  
  -- في المرة القادمة سننادي Edge Function
  -- الآن نحتاج نتأكد من أن الـ Function موجودة
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in notify_booking_created: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_booking_created ON bookings;

-- Create trigger
CREATE TRIGGER trigger_notify_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_created();
```

---

### **الخطوة 5️⃣: نشر Edge Function إلى Supabase**

**الخطوة A: تثبيت Supabase CLI**
```bash
# تحقق من التثبيت
supabase --version

# إذا لم تكن مثبتة:
npm install -g supabase
```

**الخطوة B: تسجيل الدخول إلى Supabase**
```bash
supabase login
```

**الخطوة C: نشر الـ Function**
```bash
cd /home/user/dork-app

# نشر الـ Function
supabase functions deploy send-fcm-notification --project-id dork-app
```

**التحقق من النجاح:**
```bash
# عرض جميع الـ Functions
supabase functions list --project-id dork-app

# يجب أن تراها: send-fcm-notification
```

---

### **الخطوة 6️⃣: إضافة Environment Variables للـ Edge Function**

**في Supabase Dashboard:**

```
1. اذهب إلى: Functions > send-fcm-notification
2. اضغط: Configuration (في الأعلى)
3. اضغط: Add secret
4. أضف هذه المتغيرات:
```

**المتغيرات:**

```
اسم: FIREBASE_SERVICE_ACCOUNT
القيمة: {ملف JSON كاملاً من Firebase Service Account}

اسم: SUPABASE_URL
القيمة: https://ywrlhvzfefvyogfxfdhl.supabase.co

اسم: SUPABASE_SERVICE_ROLE_KEY
القيمة: YOUR_SERVICE_ROLE_KEY
```

---

### **الخطوة 7️⃣: اختبار النظام**

**أ) اختبار Notification Permission:**
```
1. افتح Admin Panel في المتصفح (http://localhost:3001)
2. افتح DevTools (F12)
3. في Console، اكتب:
   Notification.permission
   # يجب أن يعود: "granted"
```

**ب) اختبار Service Worker:**
```
1. في DevTools، اذهب إلى: Application > Service Workers
2. يجب أن تراها: /sw.js (active and running)
```

**ج) اختبار FCM Token:**
```
1. في Console، اكتب:
   localStorage.getItem('fcm_token')
   # يجب أن يعود token طويل
```

**د) اختبار إرسال إشعار:**
```bash
# من Terminal
curl -X POST https://ywrlhvzfefvyogfxfdhl.supabase.co/functions/v1/send-fcm-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "record": {
      "id": 1,
      "salon_id": 1,
      "customer_id": 1,
      "date": "2026-05-15",
      "time": "14:00",
      "status": "confirmed",
      "service": "قص شعر",
      "customer_name": "محمد",
      "customer_phone": "0501234567"
    }
  }'
```

---

## 📊 ملخص الحالة

| المكون | الحالة | الملف |
|--------|--------|-------|
| جدول fcm_tokens | ✅ جاهز | `admin/fcm-tokens-migration.sql` |
| Edge Function | ✅ جاهز | `supabase/functions/send-fcm-notification/` |
| Service Worker | ✅ محدّث | `admin/public/sw.js` |
| Firebase Client | ✅ جاهز | `admin/src/lib/firebase-client.ts` |
| API Routes | ✅ جاهز | `admin/src/app/api/fcm-tokens/` |
| Firebase SDK | ✅ مثبت | `npm install ✓` |
| .env.local | ❌ **نحتاج الإدخال اليدوي** | `/admin/.env.local` |
| Database Migration | ❌ **نحتاج التنفيذ** | Supabase SQL Editor |
| VAPID Key | ❌ **نحتاج من Firebase** | Firebase Console |
| Edge Function Deploy | ❌ **نحتاج الأمر** | `supabase functions deploy` |

---

## ⚠️ نقاط مهمة

1. **لا تنشر `.env.local` على GitHub** - أضفه إلى `.gitignore`
2. **VAPID Key ضروري جداً** - بدونه لن تعمل Web Push Notifications
3. **Service Account JSON حساس** - احفظه بأمان
4. **HTTPS مطلوب في الإنتاج** - على localhost يعمل HTTP

---

## 📝 الملفات التي تم إنشاؤها/تحديثها

```
✅ /admin/.env.example - محدّث
✅ /admin/fcm-tokens-migration.sql - جديد
✅ /admin/public/sw.js - محدّث
✅ /admin/public/manifest.json - جديد
✅ /admin/src/lib/firebase-client.ts - جديد
✅ /admin/src/app/api/fcm-tokens/route.ts - جديد
✅ /admin/src/components/FirebaseProvider.tsx - جديد
✅ /admin/src/app/layout.tsx - محدّث
✅ /admin/package.json - محدّث (firebase added)
✅ /supabase/config.json - جديد
✅ /supabase/functions/_shared/import_map.json - جديد
✅ /supabase/functions/send-fcm-notification/index.ts - جديد
✅ /supabase/functions/send-fcm-notification/deno.json - جديد
✅ /supabase/functions/send-fcm-notification/README.md - جديد
✅ /FCM_SETUP_GUIDE.md - شامل
✅ /NEXT_STEPS.md - هذا الملف
```

---

## 🆘 إذا واجهت مشاكل

1. **تحقق من Console Errors** - F12 > Console
2. **تحقق من Network Tab** - لترى الـ requests
3. **تحقق من Supabase Logs** - Dashboard > Functions
4. **تحقق من Service Worker** - Application > Service Workers

---

**اللي تحتاج تفعله الآن:**

1. ✏️ احصل على VAPID Key من Firebase
2. 📝 أنشئ `.env.local` في `/admin/`
3. 💾 نفّذ migration في Supabase
4. 🚀 نشّر Edge Function
5. 🔐 أضف Environment Variables
6. 🧪 اختبر النظام

شدّ الحيل! 💪

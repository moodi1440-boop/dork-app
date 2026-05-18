# دليل إعداد Web Push Notifications و Firebase Cloud Messaging

هذا الدليل يشرح الخطوات الكاملة لتفعيل نظام الإشعارات عبر Firebase Cloud Messaging (FCM).

## 📋 ما تم إعداده حالياً

✅ **جدول `fcm_tokens`** - لتخزين device tokens
✅ **جدول `notification_logs`** - لتتبع الإشعارات المرسلة
✅ **Edge Function** - `send-fcm-notification` للترسيل التلقائي
✅ **Service Worker محدّث** - للاستقبال في الخلفية
✅ **Firebase Client Library** - `firebase-client.ts`
✅ **API Routes** - `/api/fcm-tokens`
✅ **Manifest.json** - لـ PWA support
✅ **Environment variables** - جاهزة للإضافة

---

## 🔧 الخطوات المتبقية

### **الخطوة 1: تحديث ملف البيئة (.env.local)**

انسخ المعلومات إلى `/admin/.env.local`:

```bash
# Firebase Configuration (استخدم القيم المعطاة)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBYCJYdJUI_oPfYlOzSukntj4YeLZFiVUY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dork-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dork-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dork-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=659823227621
NEXT_PUBLIC_FIREBASE_APP_ID=1:659823227621:web:befaaa1b5063c86cabda0c
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-T3541BL2R6

# Firebase Admin (Service Account - سيُرسل بشكل منفصل)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"dork-app",...}
FIREBASE_SERVER_API_KEY=xxxxxx
```

### **الخطوة 2: تحديث جاعدة البيانات**

نفّذ migration جديد في Supabase SQL Editor:

```sql
-- انسخ محتوى:
-- /admin/fcm-tokens-migration.sql

-- ثم نفّذ الأمر في Supabase Dashboard > SQL Editor
```

**الملفات:**
- `admin/fcm-tokens-migration.sql` - إنشاء جداول fcm_tokens و notification_logs

### **الخطوة 3: إعداد Database Trigger**

في Supabase SQL Editor، نفّذ:

```sql
-- Trigger لاستدعاء Edge Function عند إضافة حجز جديد
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _response record;
BEGIN
  -- استدعاء Edge Function
  SELECT http_post(
    'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-fcm-notification',
    jsonb_build_object(
      'record', row_to_json(NEW)
    ),
    ('{"Content-Type": "application/json", "Authorization": "Bearer ' || 
      current_setting('app.fcm_jwt_secret', true) || 
    '"}')::jsonb
  ) INTO _response;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error calling send-fcm-notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create/replace trigger
DROP TRIGGER IF EXISTS trigger_notify_booking_created ON bookings;
CREATE TRIGGER trigger_notify_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_created();
```

### **الخطوة 4: نشر Edge Function**

```bash
# تحقق من تثبيت Supabase CLI
supabase --version

# إذا لم تكن مثبتة:
npm install -g supabase

# نشر الـ Function
cd /home/user/dork-app
supabase functions deploy send-fcm-notification --project-id dork-app

# التحقق من النشر
supabase functions list --project-id dork-app
```

### **الخطوة 5: إضافة متغيرات البيئة للـ Edge Function**

في Supabase Dashboard:
1. اذهب إلى: Project > Functions > send-fcm-notification
2. اضغط: "Configuration"
3. أضف المتغيرات:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_SERVER_API_KEY=xxxxxx
SUPABASE_URL=https://ywrlhvzfefvyogfxfdhl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **الخطوة 6: تثبيت Firebase SDK**

```bash
cd /home/user/dork-app/admin
npm install firebase
```

### **الخطوة 7: إضافة Vapor Key (VAPID Key) للـ FCM**

**من Firebase Console:**

1. اذهب إلى: Project Settings > Cloud Messaging
2. في القسم "Web configuration"، اضغط: "Generate key pair"
3. انسخ الـ Public key (VAPID Key)
4. أضفها إلى `.env.local`:

```
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key_here
```

### **الخطوة 8: تحديث Firebase Client Library**

في `admin/src/lib/firebase-client.ts`، حدّث:

```typescript
vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY || 
           process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
```

---

## 🧪 الاختبار

### **اختبار Notification Permission:**

```bash
# في DevTools Console
> Notification.requestPermission().then(p => console.log(p))
// يجب أن يعود "granted"
```

### **اختبار Service Worker:**

```bash
# في DevTools > Application > Service Workers
# يجب أن يظهر: /sw.js (active and running)
```

### **اختبار FCM Token:**

```bash
# في localStorage
> localStorage.getItem('fcm_token')
# يجب أن يعود token
```

### **اختبار إرسال إشعار تجريبي:**

من Supabase Function Invoker أو عبر curl:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-fcm-notification \
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
      "service": "قص",
      "customer_name": "محمد أحمد",
      "customer_phone": "0501234567"
    }
  }'
```

---

## 📁 البنية النهائية

```
/home/user/dork-app/
├── admin/
│   ├── public/
│   │   ├── sw.js                    ✅ محدّث
│   │   └── manifest.json            ✅ جديد
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           ✅ محدّث
│   │   │   ├── api/
│   │   │   │   └── fcm-tokens/
│   │   │   │       └── route.ts     ✅ جديد
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── FirebaseProvider.tsx ✅ جديد
│   │   │   ├── NotifListener.tsx    ✅ موجود
│   │   │   └── ...
│   │   └── lib/
│   │       ├── firebase-client.ts   ✅ جديد
│   │       └── supabase-browser.ts
│   ├── .env.example                 ✅ محدّث
│   ├── .env.local                   ❌ نحتاج تعديل يدوي
│   └── package.json                 ✅ محدّث
├── supabase/
│   ├── config.json                  ✅ جديد
│   └── functions/
│       ├── send-fcm-notification/
│       │   ├── index.ts             ✅ جديد
│       │   ├── deno.json            ✅ جديد
│       │   └── README.md            ✅ جديد
│       └── _shared/
│           └── import_map.json      ✅ جديد
├── admin/
│   ├── fcm-tokens-migration.sql     ✅ جديد
│   └── realtime-settings-migration.sql
└── FCM_SETUP_GUIDE.md               ✅ هذا الملف
```

---

## 🔐 ملاحظات الأمان

⚠️ **مهم جداً:**

1. **لا تنشر المفاتيح على GitHub:**
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `FIREBASE_SERVER_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **استخدم `.env.local` و `.env` في `.gitignore`**

3. **في الإنتاج:**
   - استخدم Supabase Secrets للـ environment variables
   - فعّل JWT verification على Edge Functions
   - استخدم HTTPS فقط
   - قيّد الوصول بـ API keys

4. **الأمان على النطاق:**
   ```
   NEXT_PUBLIC_* = آمن (يظهر في الـ client)
   بدون NEXT_PUBLIC_ = حساس (Backend فقط)
   ```

---

## 🐛 استكشاف الأخطاء

### **المشكلة: Notification.requestPermission() مرفوضة**

```
الحل: 
- تأكد أن الموقع على HTTPS (أو localhost)
- تحقق من browser settings
- امسح Browser Data وأعد المحاولة
```

### **المشكلة: Service Worker لا يسجل**

```
الحل:
- تأكد من وجود /sw.js
- تحقق من console errors
- امسح Service Workers وأعد تحميل الصفحة
```

### **المشكلة: FCM Token لا يُحفظ في DB**

```
الحل:
- تحقق من قيم API keys
- تحقق من RLS policies على جدول fcm_tokens
- شغّل الـ Network tab وشوف الـ request/response
```

### **المشكلة: Edge Function لا تعمل**

```
الحل:
- تأكد من نشر الـ Function (supabase functions list)
- تحقق من Environment variables في Supabase
- شوف الـ Function logs في Supabase Dashboard
```

---

## ✅ Checklist النهائي

- [ ] تحديث `.env.local` بقيم Firebase
- [ ] تنفيذ migration في Supabase
- [ ] نشر Edge Function
- [ ] إضافة Environment variables للـ Function
- [ ] تثبيت Firebase SDK
- [ ] الحصول على VAPID Key من Firebase
- [ ] اختبار Notification Permission
- [ ] اختبار Service Worker
- [ ] اختبار FCM Token Storage
- [ ] اختبار إرسال إشعار تجريبي
- [ ] التحقق من الإشعار في الخلفية
- [ ] التحقق من نقر الإشعار

---

## 📞 الدعم

للمزيد من التفاصيل، راجع:
- Firebase Docs: https://firebase.google.com/docs/cloud-messaging
- Supabase Functions: https://supabase.com/docs/guides/functions
- Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

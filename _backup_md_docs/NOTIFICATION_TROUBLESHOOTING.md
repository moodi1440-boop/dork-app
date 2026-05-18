# دليل استكشاف أخطاء نظام الإشعارات

## 🔴 الأخطاء الشائعة والحلول

### 1️⃣ **خطأ 500 في Edge Function**

#### الأعراض:
```
Response: 500 Internal Server Error
{
  "success": false,
  "error": "Unknown error"
}
```

#### الأسباب المحتملة والحلول:

| السبب | الحل |
|------|------|
| FIREBASE_SERVER_API_KEY ناقص | أضفها في Environment Variables |
| SUPABASE_URL أو KEY خاطئ | تحقق من القيم في Supabase Dashboard |
| جدول notifications لا يوجد | قم بتشغيل migration SQL |
| صلاحيات RLS غير صحيحة | تأكد من RLS policies تسمح بـ insert |

#### خطوات التصحيح:
```bash
1. اذهب Supabase → Edge Functions → send-fcm-notification
2. انقر على Test
3. افتح Developer Tools → Network
4. ابحث عن Response details
5. تحقق من جميع المتغيرات في Configuration
```

---

### 2️⃣ **Service Worker لا يتم تسجيله**

#### الأعراض:
```
DevTools → Application → Service Workers
(لا توجد service-worker.js)
```

#### الأسباب المحتملة:

| السبب | الحل |
|------|------|
| `/public/service-worker.js` لا يوجد | تأكد من وجود الملف |
| المسار خاطئ | استخدم `/service-worker.js` بدون `public/` |
| HTTPS مطلوب | Service Workers يعمل فقط على HTTPS أو localhost |
| Content-Type خاطئ | يجب أن يكون `text/javascript` |

#### خطوات التصحيح:
```javascript
// في console
navigator.serviceWorker.register('/service-worker.js')
  .then(reg => console.log('Registered:', reg))
  .catch(err => console.error('Registration failed:', err));
```

---

### 3️⃣ **FCM Token لا يُحفظ في Supabase**

#### الأعراض:
```
جدول fcm_tokens فارغ حتى بعد التسجيل
```

#### الأسباب المحتملة:

| السبب | الحل |
|------|------|
| FIREBASE_VAPID_KEY خاطئ | تحقق من القيمة في Firebase Console |
| Notification.requestPermission() تم رفضها | اطلب من المستخدم تفعيل الإشعارات |
| Supabase RLS policies ناقصة | أضف policy للـ insert: `CREATE POLICY "anon_insert" ON fcm_tokens FOR INSERT WITH CHECK (true)` |
| SUPABASE_ANON_KEY لا تملك صلاحيات | استخدم SERVICE_ROLE_KEY للـ backend |

#### خطوات التصحيح:
```bash
1. افتح DevTools → Console
2. ابحث عن أخطاء FCM
3. تحقق من Notification.permission
4. تحقق من إدراج البيانات في Supabase
```

---

### 4️⃣ **الإشعار يظهر ولكن لا يعمل الضغط عليه**

#### الأعراض:
```
الإشعار يظهر، لكن الضغط عليه لا يفتح الرابط
```

#### الأسباب المحتملة:

| السبب | الحل |
|------|------|
| notificationclick handler خاطئ | تحقق من `/public/service-worker.js` |
| البيانات لا تُرسل مع الإشعار | تأكد من `data: messageData` في Edge Function |
| clients.openWindow لا يعمل | استخدم `clients.matchAll()` أولاً |

#### خطوات التصحيح:
```javascript
// في Service Worker
self.addEventListener('notificationclick', (event) => {
  console.log('Clicked:', event.notification.data);
  // ...
});
```

---

### 5️⃣ **خطأ CORS عند إرسال FCM**

#### الأعراض:
```
Error: CORS policy
Response is blocked
```

#### الأسباب المحتملة:

| السبب | الحل |
|------|------|
| Edge Function تستدعيها من جهاز العميل | يجب استدعاء من backend فقط |
| Authorization header خاطئ | استخدم `Bearer {firebaseKey}` |
| Firebase API key ناقص | تأكد من FIREBASE_SERVER_API_KEY |

---

### 6️⃣ **الإشعار يرسل لكن لا يظهر على الجهاز**

#### الأعراض:
```
{
  "fcm_sent": 1,
  "fcm_failed": 0
}
لكن الجهاز لا يستقبل الإشعار
```

#### الأسباب المحتملة:

| السبب | الحل |
|------|------|
| التطبيق مغلق والـ notifications disabled | فعّل الإشعارات في إعدادات الجهاز |
| FCM Token قديم | حتّث Service Worker: `registration.update()` |
| Battery Saver أو Doze mode | أوقف هذه الأوضاع للاختبار |
| WebPush غير مدعوم | استخدم متصفح حديث (Chrome, Firefox, Edge) |

#### خطوات التصحيح:
```bash
1. تحقق من جدول fcm_tokens - هل Token موجود؟
2. تحقق من جدول notification_logs - هل status='sent'؟
3. جرّب على جهاز/متصفح مختلف
```

---

## 🔍 أدوات الـ Debugging

### **DevTools Console Logs:**

```javascript
// تحقق من جميع الرسائل
localStorage.setItem('DEBUG_NOTIFICATIONS', 'true');

// في الكود ستشوف جميع الـ console.logs
```

### **Supabase Logs:**

```bash
# في Supabase Dashboard
1. Functions → send-fcm-notification → Logs
2. ابحث عن error messages
3. تحقق من الوقت (timestamp) للعملية
```

### **Firebase Console:**

```bash
# في Firebase Console
1. Functions → send-fcm-notification → Logs
2. ابحث عن Failed Sends
3. نسخ error details
```

### **Network Inspector:**

```bash
1. DevTools → Network
2. اختر XHR فقط
3. ابحث عن requests إلى:
   - firebase.googleapis.com
   - supabase.co
```

---

## ✅ Checklist التشخيص

عند حدوث مشكلة، تتبع هذا الترتيب:

- [ ] هل Service Worker مسجل؟
  ```
  DevTools → Application → Service Workers
  ```

- [ ] هل FCM Token موجود في Supabase؟
  ```sql
  SELECT * FROM fcm_tokens WHERE user_id = 1;
  ```

- [ ] هل الإشعار يُنشأ في جدول notifications؟
  ```sql
  SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
  ```

- [ ] هل Edge Function ترسل FCM بنجاح؟
  ```sql
  SELECT * FROM notification_logs WHERE status = 'failed';
  ```

- [ ] هل Firebase API Key صحيح؟
  ```bash
  curl -X POST https://fcm.googleapis.com/v1/projects/dork-app/messages:send \
    -H "Authorization: Bearer YOUR_KEY"
  ```

- [ ] هل متصفح يدعم Web Push؟
  ```javascript
  console.log('Notifications supported:', 'Notification' in window);
  console.log('Service Worker supported:', 'serviceWorker' in navigator);
  ```

---

## 🧪 الاختبار اليدوي

### **اختبار كامل من البداية:**

```bash
# 1. افتح التطبيق
# 2. انتظر تسجيل Service Worker
# 3. انتظر طلب إذن الإشعارات
# 4. اضغط Allow

# 5. فتح Supabase SQL Editor
# 6. أضف حجز جديد:
INSERT INTO bookings (salon_id, customer_id, customer_name, date, time)
VALUES (1, 1, 'Test User', '2026-05-15', '14:00');

# 7. تحقق من:
# - DevTools Notifications ظهرت؟
# - جدول notification_logs يحتوي على record؟
# - جدول fcm_tokens يحتوي على token؟
```

---

## 📞 الدعم الإضافي

إذا استمرت المشاكل:

1. **تحقق من الـ Logs:**
   - Supabase Dashboard → Functions → Logs
   - Firebase Console → Functions → Logs

2. **جرّب على متصفح مختلف:**
   - Chrome (الأفضل للـ FCM)
   - Firefox (مدعوم)
   - Safari (قد لا يدعم Web Push)

3. **جرّب على جهاز مختلف:**
   - Desktop vs Mobile
   - محاكي (Simulator) vs جهاز حقيقي

4. **راجع الملفات:**
   - Service Worker syntax
   - Firebase config
   - Supabase permissions

---

**آخر تحديث:** 2026-05-13

# 🚀 دليل تشغيل نظام الإشعارات - خطوة بخطوة

## المتطلبات قبل البدء:
- ✅ Node.js و npm مثبتة
- ✅ Supabase project متوفر
- ✅ Firebase project متوفر (dork-app)
- ✅ All backend code deployed (Edge Functions, migrations)

---

## الخطوات العملية:

### **الخطوة 1: احصل على VAPID_KEY من Firebase**

1. اذهب: https://console.firebase.google.com
2. اختر مشروع: **dork-app**
3. Settings (⚙️) → Project Settings
4. Tab: **Cloud Messaging**
5. Section: **Web Push Certificates**
6. انسخ المفتاح الطويل (يبدأ بـ BCD...)

**سيكون شيء مثل:**
```
BCDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### **الخطوة 2: ضيف VAPID_KEY في .env.local**

**الملف:** `/home/user/dork-app/admin/.env.local`

**ابحث عن هذا السطر:**
```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

**استبدله بـ:**
```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BCDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

(استخدم المفتاح الحقيقي من Firebase)

---

### **الخطوة 3: شغل التطبيق**

```bash
cd /home/user/dork-app/admin
npm run dev
```

**انتظر الرسالة:**
```
> ready - started server on 0.0.0.0:3001, url: http://localhost:3001
```

---

### **الخطوة 4: افتح التطبيق في المتصفح**

```
http://localhost:3001
```

---

### **الخطوة 5: تحقق من Console**

اضغط **F12** وانقر **Console** وابحث عن رسائل خضراء:

```
✅ [Firebase] Initialized successfully
✅ [FCM] Permission granted by user
✅ [FCM] Service Worker registered
✅ [FCM] Token obtained: BCD...
✅ [FCM] Token saved to database
```

**إذا رأيت أخطاء حمراء، ابلغني بها.**

---

### **الخطوة 6: اختبر الإشعارات**

**في Supabase SQL Editor:**

```sql
-- أضف حجز جديد
INSERT INTO bookings (salon_id, customer_id, customer_name, date, time)
VALUES (1, 1, 'محمد أحمد', '2026-05-15', '14:00');
```

**يجب أن:**
1. ✅ يظهر إشعار على الشاشة 🔔
2. ✅ يحتوي على النص "حجز جديد"
3. ✅ يمكنك الضغط عليه وينقلك لصفحة الحجز

---

### **الخطوة 7: تحقق من قاعدة البيانات**

**في Supabase SQL Editor:**

```sql
-- تحقق من حفظ Token
SELECT * FROM fcm_tokens ORDER BY created_at DESC LIMIT 1;

-- تحقق من الإشعارات
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 3;

-- تحقق من سجل الإرسال
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 5;
```

---

## 🐛 استكشاف الأخطاء:

### **خطأ: VAPID_KEY غير صحيح**
```
Error: Invalid VAPID key
```
**الحل:** أعد نسخ VAPID_KEY من Firebase بعناية

### **خطأ: Service Worker لا يتم تسجيله**
```
Service Worker registration error
```
**الحل:** 
- تأكد من أن `/public/service-worker.js` موجود
- استخدم `http://localhost` أو `https://` (https مطلوب في الإنتاج)

### **خطأ: لا يظهر إشعار**
```
No notification appeared
```
**الحل:**
1. تحقق من أن السماح بالإشعارات مفعل (DevTools → Console)
2. تحقق من أن FCM Token حُفظ في Supabase
3. جرب على متصفح مختلف (Chrome أفضل)

---

## ✅ Checklist التحقق النهائي

- [ ] VAPID_KEY من Firebase محضرة
- [ ] VAPID_KEY مضافة في `.env.local`
- [ ] `npm run dev` يعمل بدون أخطاء
- [ ] التطبيق يفتح في `http://localhost:3001`
- [ ] Console لا يحتوي على أخطاء حمراء
- [ ] Service Worker مسجل (DevTools → Application → Service Workers)
- [ ] FCM Token موجود في Supabase
- [ ] إضافة حجز يؤدي لظهور إشعار
- [ ] الضغط على الإشعار يفتح الصفحة الصحيحة

---

## 📞 للمساعدة:

إذا حصل أي خطأ:
1. صور لي رسالة الخطأ من Console
2. أخبرني أي خطوة فشلت
3. أرسل لي قيمة `navigator.userAgent` من Console

---

**آخر تحديث:** 2026-05-13

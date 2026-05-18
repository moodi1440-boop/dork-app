# شرح كامل نظام الإشعارات - Web Push Notifications

## 📋 نظرة عامة

نظام الإشعارات يتكون من **3 أجزاء رئيسية**:

### 1️⃣ **Backend (Edge Function)**
- `/supabase/functions/send-fcm-notification/index.ts`
- ترسل إشعارات FCM الفعلية عند إضافة حجز جديد
- تحفظ سجل الإشعارات في `notifications`, `notification_logs`

### 2️⃣ **Service Worker (Frontend)**
- `/public/service-worker.js`
- يستقبل الإشعارات في الخلفية
- يتعامل مع الضغط على الإشعار
- يفتح الرابط الصحيح عند الضغط

### 3️⃣ **Frontend Registration (Next.js)**
- `admin/src/hooks/useFCMRegistration.ts`
- تسجيل الجهاز وحفظ FCM Token
- الاستماع للإشعارات أثناء استخدام التطبيق
- معالجة أذونات الإشعارات

---

## 🔧 خطوات الإعداد

### **الخطوة 1: Firebase Configuration**

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. اختر مشروع `dork-app`
3. انقر على **Project Settings** → **Web Apps**
4. نسخ قيمة `Messaging` → `VAPID Key`

**ضيفها في `admin/.env.local`:**
```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

---

### **الخطوة 2: Supabase Database Tables**

تأكد من أن الجداول التالية موجودة:

```sql
-- 1️⃣ جدول الإشعارات (موجود بالفعل)
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial primary key,
  target_type text not null,
  target_id bigint,
  title text not null,
  body text,
  icon text default '🔔',
  read boolean default false,
  created_at timestamptz default now()
);

-- 2️⃣ جدول رموز الأجهزة (FCM Tokens)
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id bigserial primary key,
  user_type text not null,
  user_id bigint not null,
  device_token text not null unique,
  device_name text,
  is_active boolean default true,
  last_used_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 3️⃣ جدول سجل الإرسال
CREATE TABLE IF NOT EXISTS notification_logs (
  id bigserial primary key,
  notification_id bigint references notifications(id),
  fcm_token_id bigint references fcm_tokens(id),
  user_type text not null,
  user_id bigint not null,
  status text default 'sent',
  error_message text,
  sent_at timestamptz default now()
);
```

**لتشغيل هذا:**
1. اذهب **Supabase Dashboard** → **SQL Editor**
2. نسخ الكود أعلاه
3. اضغط **Run**

---

### **الخطوة 3: Edge Function Environment Variables**

في **Supabase Dashboard** → **Edge Functions** → **send-fcm-notification** → **Configuration**:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FIREBASE_PROJECT_ID=dork-app
FIREBASE_SERVER_API_KEY=your_firebase_server_api_key
```

**للحصول على FIREBASE_SERVER_API_KEY:**
1. Firebase Console → Project Settings → Service Accounts
2. اضغط **Generate New Private Key**
3. افتح الملف JSON وانسخ قيمة `"private_key"`

---

### **الخطوة 4: استخدام في Admin App**

في الـ main layout أو app component:

```tsx
// app/layout.tsx أو pages/_app.tsx
import { NotificationInitializer } from '@/components/NotificationInitializer';
import { useAuth } from '@/hooks/useAuth'; // أو طريقتك في الـ auth

export default function Layout() {
  const { user } = useAuth();

  return (
    <>
      {user && (
        <NotificationInitializer 
          userType="admin"
          userId={user.id}
          userName={user.name}
        />
      )}
      {/* باقي التطبيق */}
    </>
  );
}
```

---

## 🎯 كيفية الاستخدام

### **الاستماع للإشعارات الجديدة:**

```tsx
import { getUnreadNotifications, subscribeToNotifications } from '@/lib/notificationHandler';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // جلب الإشعارات الحالية
    const fetchNotifications = async () => {
      const data = await getUnreadNotifications('admin', 1);
      setNotifications(data);
    };

    fetchNotifications();

    // الاستماع للإشعارات الجديدة
    const subscription = subscribeToNotifications('admin', 1, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id}>{notif.title}</div>
      ))}
    </div>
  );
}
```

### **تحديث حالة قراءة الإشعار:**

```tsx
import { markNotificationAsRead } from '@/lib/notificationHandler';

async function handleNotificationClick(id: number) {
  await markNotificationAsRead(id);
  // الذهاب للرابط
}
```

---

## 🧪 الاختبار

### **اختبر المكونات الأساسية:**

```bash
# 1️⃣ تأكد من أن Service Worker يعمل
# افتح Developer Tools → Application → Service Workers
# يجب أن تشوف "service-worker.js" مسجل

# 2️⃣ اختبر الإشعارات
# اذهب إلى Supabase Dashboard → SQL Editor
# أضف حجز جديد:
INSERT INTO bookings (salon_id, customer_id, customer_name, date, time)
VALUES (1, 1, 'محمد', '2026-05-15', '14:00');

# 3️⃣ تحقق من الإشعار
# يجب أن يظهر إشعار على جهازك
```

---

## 🐛 حل المشاكل

### **مشكلة: الإشعار لا يظهر**

- ✅ تأكد من Service Worker مسجل (DevTools → Application)
- ✅ تأكد من إذن الإشعارات مفعل (DevTools → Console)
- ✅ تأكد من FIREBASE_VAPID_KEY صحيح
- ✅ تأكد من Firebase credentials صحيح

### **مشكلة: Service Worker Error**

```
Error: Failed to fetch script as a worklet script
```

- ✅ تأكد من `/public/service-worker.js` موجود
- ✅ تأكد من المسار صحيح: `/service-worker.js`

### **مشكلة: FCM Token لا يُحفظ**

- ✅ تأكد من جدول `fcm_tokens` موجود
- ✅ تأكد من RLS policies صحيحة
- ✅ تحقق من DevTools → Console للأخطاء

---

## 📊 Flow الإشعارات

```
1. المستخدم يفتح التطبيق
   ↓
2. NotificationInitializer يسجل الجهاز
   ↓
3. Service Worker يتم تسجيله
   ↓
4. FCM Token يُحفظ في Supabase
   ↓
5. إضافة حجز جديد في قاعدة البيانات
   ↓
6. Supabase Trigger يستدعي Edge Function
   ↓
7. Edge Function ترسل FCM Notification
   ↓
8. Service Worker يستقبل الإشعار
   ↓
9. الإشعار يظهر على الجهاز
   ↓
10. المستخدم يضغط على الإشعار
    ↓
11. Service Worker يفتح الرابط الصحيح
```

---

## 🔒 الأمان

⚠️ **تنبيهات أمنية:**

- لا تنشر `FIREBASE_SERVER_API_KEY` على GitHub
- استخدم Supabase Secrets للمفاتيح الحساسة
- فعّل CORS properly في الإنتاج
- تأكد من RLS policies محمية بشكل صحيح

---

## 📚 روابط مفيدة

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Service Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## ✅ Checklist الإعداد الكامل

- [ ] إضافة VAPID_KEY في `.env.local`
- [ ] إنشاء جداول Supabase (fcm_tokens, notification_logs)
- [ ] إضافة Environment Variables في Edge Function
- [ ] تشغيل Edge Function Deploy
- [ ] إضافة NotificationInitializer في Layout
- [ ] اختبار تسجيل Service Worker
- [ ] اختبار إضافة حجز واستقبال الإشعار
- [ ] التحقق من حفظ FCM Token في Supabase

---

**آخر تحديث:** 2026-05-13

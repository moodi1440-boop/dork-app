# Send FCM Notification Edge Function

هذه الـ Edge Function ترسل إشعارات Firebase Cloud Messaging عند إضافة حجز جديد.

## المتطلبات

1. **Supabase Project** - مع تفعيل Edge Functions
2. **Firebase Service Account Key** - ملف JSON يحتوي على credentials
3. **جداول Supabase**:
   - `bookings` - جدول الحجوزات
   - `salons` - جدول الصالونات
   - `fcm_tokens` - جدول رموز الأجهزة
   - `customers` - جدول العملاء (اختياري)
   - `notification_logs` - جدول سجلات الإشعارات

## خطوات التنفيذ

### 1. إنشاء Trigger في Supabase

في Supabase SQL Editor، نفّذ:

```sql
-- Trigger لاستدعاء Edge Function عند إضافة حجز جديد
CREATE OR REPLACE FUNCTION send_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- استدعاء Edge Function
  SELECT
    net.http_post(
      url := current_setting('app.fcm_function_url'),
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.fcm_jwt_token') || '"}'::jsonb,
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    ) INTO NULL;
  RETURN NEW;
END;
$$;

-- تعريف الـ Trigger
DROP TRIGGER IF EXISTS send_notification_on_booking_insert ON bookings;
CREATE TRIGGER send_notification_on_booking_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_booking_notification();
```

### 2. إضافة متغيرات البيئة

في Supabase Dashboard → Project Settings → Edge Functions:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"dork-app",...}
FIREBASE_SERVER_API_KEY=your_server_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3. نشر الـ Function

```bash
# من جذر المشروع
supabase functions deploy send-fcm-notification --project-id dork-app
```

## الإشعارات التي يتم إرسالها

### 1. للصالون (Salon Owner)
```
العنوان: ✂️ حجز جديد في [اسم الصالون]
النص: عميل: [الاسم] | الساعة: [الوقت]
الصوت: نعم
الاهتزاز: نعم
```

### 2. للعميل (Customer)
```
العنوان: تم تأكيد حجزك ✓
النص: في [اسم الصالون] بتاريخ [التاريخ] الساعة [الوقت]
الصوت: نعم
الاهتزاز: نعم
```

### 3. للمسؤول (Admin)
```
العنوان: 📊 حجز جديد
النص: [الاسم] → [اسم الصالون]
الصوت: نعم
الاهتزاز: نعم
```

## المتغيرات المرسلة في البيانات

```json
{
  "booking_id": "123",
  "salon_id": "456",
  "customer_id": "789",
  "type": "new_booking",
  "timestamp": "2026-05-13T10:30:00Z"
}
```

## معالجة الأخطاء

إذا فشل الإرسال:
- يتم تسجيل الخطأ في `notification_logs`
- يمكن إعادة محاولة الإرسال يدوياً
- في الإنتاج، يجب إضافة retry mechanism

## الاختبار

```bash
# محلياً
supabase functions serve

# استدعاء الـ function
curl -X POST http://localhost:54321/functions/v1/send-fcm-notification \
  -H "Content-Type: application/json" \
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

## ملاحظات أمان

⚠️ **هام جداً:**
- لا تنشر `FIREBASE_SERVICE_ACCOUNT` على GitHub
- استخدم Supabase Secrets لتخزين المفاتيح الحساسة
- تأكد من تفعيل JWT verification في Production
- قيّد الوصول إلى الـ function بـ API key

## التوثيق

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Firebase Cloud Messaging API](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Deno Documentation](https://deno.land/manual)

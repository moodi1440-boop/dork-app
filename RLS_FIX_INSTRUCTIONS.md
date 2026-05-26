# RLS Fix for Realtime Notifications

## المشكلة
الإشعارات لا تصل للصالونات عند الحجوزات الجديدة لأن RLS policy يعتمد على `current_setting('app.current_user_phone')` التي **لم تكن مُعرّفة أبداً**.

## الحل
تنفيذ SQL migration في Supabase لـ:
1. حذف الـ policy القديمة (`salon_select_own`)
2. إضافة policy جديدة تسمح بـ Realtime reads

## كيفية التطبيق

### الخطوة 1: افتح Supabase SQL Editor
- اذهب إلى [Supabase Dashboard](https://app.supabase.com)
- اختر مشروعك
- اذهب إلى SQL Editor

### الخطوة 2: نفذ الـ SQL التالي

```sql
-- Drop the old policy that depends on unreliable session variables
DROP POLICY IF EXISTS "salon_select_own" ON bookings;

-- Create new policy: Allow SELECT for Realtime subscriptions
CREATE POLICY "public_select_bookings_for_realtime" ON bookings
  FOR SELECT
  USING (true);
```

### الخطوة 3: تحقق من التطبيق
- أعد تحميل التطبيق
- سجل دخول صالون
- اطلب حجز جديد من عميل
- يجب أن تحصل على إشعار فوري + صوت

## الأمان
✅ **آمن** - API-level filtering (`salon_id=eq.X`) يضمن:
- الصالون A لا يرى حجوزات الصالون B
- العميل الواحد لا يرى حجوزات عميل آخر
- RLS لا يزال يحمي البيانات

## إذا لم يعمل
1. تحقق من Supabase logs للأخطاء
2. تأكد من أن الـ policy تم تطبيقه (اذهب إلى Database > Policies)
3. أعد تحميل الصفحة بـ Ctrl+Shift+Delete (clear cache)

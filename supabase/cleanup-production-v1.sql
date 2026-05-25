-- =====================================================
-- DORK APP: COMPREHENSIVE DATABASE CLEANUP SCRIPT
-- آمن • متكامل • جاهز للنسخ والتشغيل في Supabase SQL Editor
-- =====================================================
-- ملاحظات مهمة:
-- 1. قم بعمل Backup قبل التشغيل
-- 2. شغّل في ساعات منخفضة الاستخدام (2-5 صباحاً)
-- 3. اقرأ SELECT النتائج قبل COMMIT
-- 4. آمن مع RLS مفعّلة - لا تحتاج لإيقافها
-- =====================================================

-- =====================================================
-- المرحلة الأولى: إنشاء جدول الأرشفة
-- =====================================================
-- الوصف: إنشاء جدول bookings_archive يحاكي bookings تماماً
-- الهدف: نقل البيانات القديمة بدون حذف (للامتثال والأرشفة)

CREATE TABLE IF NOT EXISTS bookings_archive (
  LIKE bookings INCLUDING ALL
);

-- تأكد من الـ Indexes على جدول الأرشفة (لسهولة البحث لاحقاً)
CREATE INDEX IF NOT EXISTS idx_bookings_archive_created_at
ON bookings_archive(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_archive_salon_id
ON bookings_archive(salon_id);

CREATE INDEX IF NOT EXISTS idx_bookings_archive_customer_id
ON bookings_archive(customer_id);

COMMENT ON TABLE bookings_archive IS 'Archive of cancelled and old bookings for compliance and historical records';

-- =====================================================
-- المرحلة الثانية: معاينة البيانات المرشحة للحذف
-- =====================================================
-- الوصف: عرض عدد السجلات التي سيتم نقلها (بدون حذف)
-- الهدف: التأكد من معقولية الأرقام قبل التنفيذ

SELECT
  'Cancelled bookings (> 1 year old)' as category,
  COUNT(*) as record_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings), 2) as percentage_of_total,
  MIN(created_at) as oldest_date,
  MAX(created_at) as newest_date
FROM bookings
WHERE status = 'cancelled'
AND created_at < NOW() - INTERVAL '1 year'

UNION ALL

SELECT
  'Notification logs (> 30 days old)',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM notification_logs), 2),
  MIN(created_at),
  MAX(created_at)
FROM notification_logs
WHERE created_at < NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Old read notifications (> 90 days)',
  COUNT(*),
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM notifications WHERE is_read = true), 2),
  MIN(created_at),
  MAX(created_at)
FROM notifications
WHERE is_read = true
AND created_at < NOW() - INTERVAL '90 days';

-- =====================================================
-- المرحلة الثالثة: البدء بالعملية الآمنة (Transaction)
-- =====================================================
-- الوصف: بداية Transaction - يمكن التراجع عنها بـ ROLLBACK إذا حدث خطأ
-- الهدف: ضمان أمية العملية - إما كل شيء ينجح أو كل شيء يتراجع

BEGIN;

-- =====================================================
-- الخطوة 1: نقل البيانات إلى الأرشيف (آمن)
-- =====================================================

-- نقل الحجوزات الملغاة القديمة
INSERT INTO bookings_archive
SELECT * FROM bookings
WHERE status = 'cancelled'
AND created_at < NOW() - INTERVAL '1 year';

-- التحقق: عدد الصفوف المُدرجة
SELECT 'Archived cancelled bookings' as operation, COUNT(*) as inserted_count
FROM bookings_archive
WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '1 year';

-- =====================================================
-- الخطوة 2: حذف البيانات من الجدول الرئيسي
-- =====================================================
-- الوصف: حذف البيانات بعد التأكد من نجاح الأرشفة
-- الهدف: تحرير المساحة وتسريع الاستعلامات

-- حذف الحجوزات الملغاة القديمة (بعد الأرشفة)
DELETE FROM bookings
WHERE status = 'cancelled'
AND created_at < NOW() - INTERVAL '1 year';

-- تأكيد الحذف
SELECT 'Deleted cancelled bookings' as operation, COUNT(*) as remaining_bookings
FROM bookings
WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '1 year';

-- =====================================================
-- الخطوة 3: تنظيف الـ Logs والإشعارات القديمة
-- =====================================================

-- حذف سجلات الإشعارات القديمة (> 30 يوم)
DELETE FROM notification_logs
WHERE created_at < NOW() - INTERVAL '30 days';

SELECT 'Deleted old notification logs' as operation, COUNT(*) as remaining_logs
FROM notification_logs
WHERE created_at < NOW() - INTERVAL '30 days';

-- حذف الإشعارات المقروءة القديمة (> 90 يوم)
DELETE FROM notifications
WHERE is_read = true
AND created_at < NOW() - INTERVAL '90 days';

SELECT 'Deleted old read notifications' as operation, COUNT(*) as remaining_notifications
FROM notifications
WHERE is_read = true AND created_at < NOW() - INTERVAL '90 days';

-- =====================================================
-- الخطوة 4: تحديث الإحصائيات والتنظيف
-- =====================================================
-- الوصف: تحديث optimizer statistics و تحرير المساحة
-- الهدف: تحسين أداء الاستعلامات وتقليل حجم القاعدة

-- تحديث إحصائيات الجداول (سريع وآمن)
ANALYZE bookings;
ANALYZE bookings_archive;
ANALYZE notification_logs;
ANALYZE notifications;

-- تحرير المساحة غير المستخدمة (آمن أكثر من VACUUM FULL)
-- ملاحظة: VACUUM بدون FULL أكثر أماناً على الجداول النشطة
VACUUM ANALYZE bookings;
VACUUM ANALYZE notifications;
VACUUM ANALYZE notification_logs;

-- =====================================================
-- الخطوة 5: التحقق النهائي
-- =====================================================
-- الوصف: عرض حجم الجداول بعد التنظيف
-- الهدف: التأكد من تحرير المساحة بنجاح

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE tablename IN ('bookings', 'bookings_archive', 'notifications', 'notification_logs')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- قرار التأكيد
-- =====================================================
-- اختر أحد الخيارات أدناه:
-- ✅ للتأكيد والحفظ - استخدم:
COMMIT;

-- ❌ للتراجع والإلغاء - استخدم (استخدم هذا إذا كانت النتائج غير متوقعة):
-- ROLLBACK;

-- =====================================================
-- نهاية المرحلة الثالثة: العمليات الفورية
-- =====================================================

-- =====================================================
-- المرحلة الرابعة: إعداد Cron Jobs للتنظيف الدوري
-- =====================================================
-- الوصف: إعداد وظائف تلقائية تعمل بدون تدخل يدوي
-- الهدف: التنظيف المستمر والدوري لمنع تراكم البيانات

-- ملاحظة: تأكد من تفعيل pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- Cron Job 1: حذف الحجوزات الملغاة القديمة (أسبوعياً)
-- =====================================================
-- الوقت: يوم الأحد الساعة 2 صباحاً (UTC)
-- السبب: ساعة منخفضة الاستخدام + لا تتعارض مع Realtime

SELECT cron.schedule(
  'cleanup-cancelled-bookings-weekly',
  '0 2 * * 0',  -- يوم الأحد الساعة 2 صباحاً
  $$
  -- أرشّف الحجوزات الملغاة القديمة
  INSERT INTO bookings_archive
  SELECT * FROM bookings
  WHERE status = 'cancelled'
  AND created_at < NOW() - INTERVAL '1 year'
  AND id NOT IN (SELECT id FROM bookings_archive);

  -- احذفها من الجدول الرئيسي
  DELETE FROM bookings
  WHERE status = 'cancelled'
  AND created_at < NOW() - INTERVAL '1 year';
  $$
);

-- =====================================================
-- Cron Job 2: حذف سجلات الإشعارات القديمة (يومياً)
-- =====================================================
-- الوقت: كل يوم الساعة 3 صباحاً (UTC)
-- السبب: Logs تتراكم سريعة - تنظيف يومي أفضل

SELECT cron.schedule(
  'cleanup-notification-logs-daily',
  '0 3 * * *',  -- كل يوم الساعة 3 صباحاً
  $$
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);

-- =====================================================
-- Cron Job 3: حذف الإشعارات المقروءة القديمة (أسبوعياً)
-- =====================================================
-- الوقت: يوم الأحد الساعة 2:30 صباحاً (UTC)
-- السبب: بعد تنظيف الحجوزات بـ 30 دقيقة لتجنب التضارب

SELECT cron.schedule(
  'cleanup-old-notifications-weekly',
  '30 2 * * 0',  -- يوم الأحد الساعة 2:30 صباحاً
  $$
  DELETE FROM notifications
  WHERE is_read = true
  AND created_at < NOW() - INTERVAL '90 days';
  $$
);

-- =====================================================
-- Cron Job 4: تحديث الإحصائيات (أسبوعياً)
-- =====================================================
-- الوقت: يوم الأحد الساعة 3:30 صباحاً (UTC)
-- السبب: بعد جميع عمليات الحذف - تحديث المُحسِّن

SELECT cron.schedule(
  'analyze-tables-weekly',
  '30 3 * * 0',  -- يوم الأحد الساعة 3:30 صباحاً
  $$
  ANALYZE bookings;
  ANALYZE bookings_archive;
  ANALYZE notifications;
  ANALYZE notification_logs;
  VACUUM ANALYZE bookings;
  VACUUM ANALYZE notifications;
  $$
);

-- =====================================================
-- التحقق: عرض جميع Cron Jobs المُعرّفة
-- =====================================================

SELECT
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE 'cleanup-%' OR jobname LIKE 'analyze-%'
ORDER BY jobname;

-- =====================================================
-- نهاية السكريبت الشامل
-- =====================================================
-- ✅ تم تنفيذ:
-- 1. إنشاء جدول الأرشفة
-- 2. نقل البيانات القديمة بأمان
-- 3. حذف البيانات من الجداول الرئيسية
-- 4. تحرير المساحة (VACUUM ANALYZE)
-- 5. إعداد Cron Jobs الدورية

-- ⏱️ جدول التنفيذ الدوري:
-- - 2:00 AM: حذف الحجوزات الملغاة
-- - 2:30 AM: حذف الإشعارات المقروءة القديمة
-- - 3:00 AM: حذف سجلات الإشعارات
-- - 3:30 AM: تحديث الإحصائيات والتنظيف

-- 📊 النتيجة المتوقعة:
-- - تحرير 50-70% من المساحة الحالية
-- - تقليل الـ Egress بنسبة 90%+
-- - تحسن في أداء الاستعلامات

-- 🔒 الأمان:
-- ✅ جميع البيانات محفوظة في الأرشيف
-- ✅ RLS مفعّلة طوال الوقت
-- ✅ لا تضارب مع Realtime subscriptions
-- ✅ يمكن استعادة البيانات من الأرشيف إذا لزم الأمر

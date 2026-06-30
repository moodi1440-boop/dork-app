-- نقطة 51: أرشفة الحجوزات الأقدم من 6 أشهر
-- الجدول يُنشأ الآن — Cron Job يُفعَّل عند الحاجة (بعد تراكم البيانات)

-- جدول الأرشيف — بنية مطابقة لـ bookings
CREATE TABLE IF NOT EXISTS bookings_archive (
  LIKE bookings INCLUDING ALL
);

-- تعليق توضيحي
COMMENT ON TABLE bookings_archive IS 'حجوزات أقدم من 6 أشهر — منقولة تلقائياً من bookings';

-- دالة الأرشفة: تنقل الحجوزات المنتهية (approved/cancelled/rejected)
-- الأقدم من 6 أشهر إلى bookings_archive ثم تحذفها من bookings
CREATE OR REPLACE FUNCTION archive_old_bookings()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  cutoff DATE := CURRENT_DATE - INTERVAL '6 months';
BEGIN
  -- نسخ إلى الأرشيف
  INSERT INTO bookings_archive
  SELECT * FROM bookings
  WHERE date < cutoff
    AND status IN ('approved', 'cancelled', 'rejected')
  ON CONFLICT DO NOTHING;

  -- حذف المنقولة من الجدول الرئيسي
  DELETE FROM bookings
  WHERE date < cutoff
    AND status IN ('approved', 'cancelled', 'rejected')
    AND id IN (SELECT id FROM bookings_archive);
END;
$$;

-- تفعيل Cron Job (يتطلب pg_cron مفعّلاً في Supabase)
-- شغّل هذا السطر يدوياً عند الحاجة:
-- SELECT cron.schedule('archive-bookings', '0 3 1 * *', 'SELECT archive_old_bookings()');
-- يعمل: أول يوم من كل شهر الساعة 3 صباحاً

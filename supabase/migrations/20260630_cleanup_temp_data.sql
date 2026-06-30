-- نقطة 26: حذف تلقائي للبيانات المؤقتة (OTP sessions + rate_limits)
-- شغّل هذا في Supabase SQL Editor

-- دالة تنظيف rate_limits القديمة (أكثر من ساعة)
CREATE OR REPLACE FUNCTION cleanup_temp_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- حذف rate_limits القديمة (نافذة أكثر من 60 دقيقة)
  DELETE FROM rate_limits
  WHERE window_ts < (EXTRACT(EPOCH FROM NOW()) * 1000 / 60000)::BIGINT - 60;
END;
$$;

-- تفعيل Supabase Cron لتشغيل التنظيف كل ساعة
-- يلزم تفعيل امتداد pg_cron من Supabase Dashboard → Database → Extensions
SELECT cron.schedule(
  'cleanup-temp-data',
  '0 * * * *',
  $$ SELECT cleanup_temp_data(); $$
);

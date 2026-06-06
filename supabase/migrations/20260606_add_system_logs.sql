-- جدول system_logs: يُسجِّل أحداث FCM والأخطاء الحرجة تلقائياً
CREATE TABLE IF NOT EXISTS system_logs (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  level       text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event       text NOT NULL,
  details     jsonb,
  user_id     text,
  user_type   text
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_event      ON system_logs (event);

-- الجدول للقراءة عبر service role فقط — لا وصول عام
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- حذف تلقائي للسجلات الأقدم من 30 يوماً (يُشغَّل يدوياً أو عبر cron)
-- DELETE FROM system_logs WHERE created_at < now() - interval '30 days';

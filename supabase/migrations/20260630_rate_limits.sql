-- جدول Rate Limiting — نقطة 37 + 57 من الفحص الشامل
-- نافذة زمنية = دقيقة واحدة لكل (IP + endpoint)

CREATE TABLE IF NOT EXISTS rate_limits (
  ip       TEXT    NOT NULL,
  endpoint TEXT    NOT NULL,
  window_ts BIGINT NOT NULL,
  count    INT     NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, endpoint, window_ts)
);

-- دالة atomic increment تمنع race condition
CREATE OR REPLACE FUNCTION rl_increment(
  p_ip       TEXT,
  p_endpoint TEXT,
  p_window_ts BIGINT
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO rate_limits (ip, endpoint, window_ts, count)
  VALUES (p_ip, p_endpoint, p_window_ts, 1)
  ON CONFLICT (ip, endpoint, window_ts)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

-- تنظيف الصفوف القديمة (أكثر من ساعة) — يُشغَّل يدوياً أو عبر Supabase Cron
-- DELETE FROM rate_limits WHERE window_ts < (EXTRACT(EPOCH FROM NOW()) * 1000 / 60000)::BIGINT - 60;

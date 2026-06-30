-- نقطة 29: مراقبة Table Bloat وجدولة VACUUM دورياً

-- ============================================================
-- view لمراقبة Table Bloat (شغّله يدوياً من Dashboard عند الحاجة)
-- ============================================================
CREATE OR REPLACE VIEW table_bloat_monitor AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename))       AS table_size,
  pg_size_pretty(
    pg_total_relation_size(schemaname||'.'||tablename) -
    pg_relation_size(schemaname||'.'||tablename)
  ) AS index_size,
  n_dead_tup,
  n_live_tup,
  CASE WHEN n_live_tup > 0
    THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 1)
    ELSE 0
  END AS dead_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================
-- جدولة VACUUM ANALYZE شهرياً عبر pg_cron
-- يتطلب تفعيل pg_cron من Dashboard → Database → Extensions
-- ============================================================
SELECT cron.schedule(
  'monthly-vacuum',
  '0 2 1 * *',
  $$
    VACUUM ANALYZE bookings;
    VACUUM ANALYZE salons;
    VACUUM ANALYZE customers;
    VACUUM ANALYZE waiting_list;
    VACUUM ANALYZE notifications;
  $$
);

-- لمعرفة الجداول التي تحتاج VACUUM الآن، شغّل:
-- SELECT * FROM table_bloat_monitor WHERE dead_pct > 10;

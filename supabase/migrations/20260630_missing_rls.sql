-- نقطة 39: تطبيق RLS على الجداول المتبقية بدون حماية

-- ============================================================
-- waiting_list
-- ============================================================
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- القراءة: الصالون يرى قائمته فقط (عبر service_role من الـ API)
-- anon لا يحتاج قراءة مباشرة — كل عمليات الانتظار تمر عبر API
REVOKE SELECT, INSERT, UPDATE, DELETE ON waiting_list FROM anon;
GRANT ALL ON waiting_list TO service_role;

-- ============================================================
-- messages (رسائل الأدمن ↔ الصالون)
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

REVOKE SELECT, INSERT, UPDATE, DELETE ON messages FROM anon;
GRANT ALL ON messages TO service_role;

-- ============================================================
-- admin_config
-- ============================================================
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- لا قراءة عامة — فقط service_role (من API)
REVOKE SELECT, INSERT, UPDATE, DELETE ON admin_config FROM anon;
GRANT ALL ON admin_config TO service_role;

-- ============================================================
-- rate_limits (داخلية — service_role فقط)
-- ============================================================
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE SELECT, INSERT, UPDATE, DELETE ON rate_limits FROM anon;
GRANT ALL ON rate_limits TO service_role;

-- ============================================================
-- bookings_archive (أرشيف — قراءة فقط للصالون عبر API)
-- ============================================================
ALTER TABLE bookings_archive ENABLE ROW LEVEL SECURITY;

REVOKE SELECT, INSERT, UPDATE, DELETE ON bookings_archive FROM anon;
GRANT ALL ON bookings_archive TO service_role;

-- ============================================================
-- centers (مناطق/مدن — قراءة عامة فقط)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='centers') THEN
    EXECUTE 'ALTER TABLE centers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'GRANT SELECT ON centers TO anon, authenticated';
    EXECUTE 'CREATE POLICY centers_public_read ON centers FOR SELECT USING (true)';
  END IF;
END $$;

-- ============================================================
-- promo_codes / promotions (إن وُجدا)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promo_codes') THEN
    EXECUTE 'ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON promo_codes FROM anon';
    EXECUTE 'GRANT SELECT ON promo_codes TO anon';
    EXECUTE 'CREATE POLICY promo_codes_public_read ON promo_codes FOR SELECT USING (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promotions') THEN
    EXECUTE 'ALTER TABLE promotions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON promotions FROM anon';
    EXECUTE 'GRANT SELECT ON promotions TO anon';
    EXECUTE 'CREATE POLICY promotions_public_read ON promotions FOR SELECT USING (true)';
  END IF;
END $$;

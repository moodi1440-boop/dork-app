-- =====================================================
-- 1) أعمدة الرقم السري (PIN) لمالك الصالون + قفل المحاولات
--    (يدعم لوحة "إعدادات الحلاك" في App.jsx وتسجيل دخول
--    لوحة مالك الصالون في admin/owner-login)
-- =====================================================
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_hash         text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_fails         integer NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_locked_until  timestamptz;

-- =====================================================
-- 2) تنظيف نهائي لسياسات fcm_tokens
--    المشكلة: ملفات الترحيل السابقة (fcm-tokens-migration.sql,
--    secure-rls-policies.sql, production-rls-v2.sql) أنشأت
--    سياسات بأسماء مختلفة لكل مرة دون حذف القديمة بالكامل،
--    فبقيت سياسات قديمة مسموحة للجميع (anon_select_active,
--    anon_update_own, anon_delete_own, service_role_all) فعّالة
--    بجانب أي سياسة "آمنة" لاحقة. وبما أن RLS تجمع كل السياسات
--    بـ OR، تبقى القراءة/الكتابة مفتوحة لأي شخص يملك anon key
--    حتى بعد "تطبيق" السياسات الآمنة.
--    هذا الملف يحذف كل الأسماء المعروفة من الإصدارات الثلاثة
--    ثم يبني مجموعة واحدة نهائية لا غموض فيها.
-- =====================================================
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- من fcm-tokens-migration.sql
DROP POLICY IF EXISTS "anon_insert"        ON fcm_tokens;
DROP POLICY IF EXISTS "anon_update_own"    ON fcm_tokens;
DROP POLICY IF EXISTS "anon_delete_own"    ON fcm_tokens;
DROP POLICY IF EXISTS "anon_select_active" ON fcm_tokens;
DROP POLICY IF EXISTS "service_role_all"   ON fcm_tokens;

-- من secure-rls-policies.sql
DROP POLICY IF EXISTS "anyone_insert"          ON fcm_tokens;
DROP POLICY IF EXISTS "anyone_select"          ON fcm_tokens;
DROP POLICY IF EXISTS "anyone_register_token"  ON fcm_tokens;
DROP POLICY IF EXISTS "service_role_select"    ON fcm_tokens;
DROP POLICY IF EXISTS "service_role_update"    ON fcm_tokens;

-- من production-rls-v2.sql
DROP POLICY IF EXISTS "anyone_register_fcm_token" ON fcm_tokens;
DROP POLICY IF EXISTS "service_role_read_tokens"  ON fcm_tokens;
DROP POLICY IF EXISTS "service_role_update_tokens" ON fcm_tokens;

-- السياسات النهائية الوحيدة المعتمدة:
-- - الجهاز يسجّل توكنه (إدراج) ويستطيع فقط تحديث وقت آخر استخدام
--   أو إلغاء تفعيل توكنه (is_active) — وهذا فعليًا ما يستخدمه
--   useFCMRegistration.ts حاليًا، لذلك لا نكسر الميزة.
-- - لا قراءة (SELECT) ولا حذف (DELETE) لـ anon — لم تَعُد هناك
--   حاجة فعلية لذلك في الكود، وكانت تسمح لأي شخص يملك anon key
--   بقراءة كل توكنات الإشعارات أو حذفها.
-- - السيرفر (service role) له كل الصلاحيات كما هو متعارف عليه.
CREATE POLICY "fcm_anon_insert_only" ON fcm_tokens
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "fcm_anon_update_status_only" ON fcm_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fcm_service_role_all" ON fcm_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- تقييد إضافي على مستوى الأعمدة: anon يحدّث فقط حالة التفعيل
-- ووقت آخر تحديث، ولا يستطيع تغيير device_token أو user_id أو
-- user_type لأي صف (وهو ما كان يسمح، نظريًا، بخطف رمز إشعارات
-- صالون آخر عبر إعادة ربطه برقم مستخدم مختلف).
REVOKE UPDATE ON fcm_tokens FROM anon;
GRANT UPDATE (updated_at, is_active) ON fcm_tokens TO anon;

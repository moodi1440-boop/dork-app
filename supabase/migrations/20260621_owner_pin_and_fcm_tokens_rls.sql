-- =====================================================
-- خطوة 1: أعمدة الرقم السري (PIN) لمالك الصالون + قفل المحاولات
-- شغّل هذا القسم وحده أولاً، تحقق من النجاح، ثم انتقل للخطوة 2
-- =====================================================
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_hash         text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_fails         integer NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_locked_until  timestamptz;

-- =====================================================
-- خطوة 2: حذف كل سياسات fcm_tokens الموجودة فعلياً (بأي اسم)
-- ثم بناء مجموعة واحدة نهائية. نحذف ديناميكيًا (لا نخمّن الأسماء)
-- لأن قاعدة البيانات الحية فيها أسماء سياسات لم تَرِد في أي ملف
-- ترحيل موجود بالمستودع (من تجارب/تعديلات سابقة على Dashboard).
-- =====================================================
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol text;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'fcm_tokens'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON fcm_tokens', pol);
  END LOOP;
END $$;

-- السياسات النهائية الوحيدة المعتمدة:
-- - الجهاز يسجّل توكنه (إدراج) ويستطيع فقط تحديث حالة التفعيل
--   ووقت آخر تحديث — وهذا فعليًا ما يستخدمه useFCMRegistration.ts.
-- - لا قراءة (SELECT) ولا حذف (DELETE) لـ anon أو authenticated —
--   لم تَعُد هناك حاجة فعلية لذلك بالكود، وكانت تسمح لأي شخص
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

-- =====================================================
-- خطوة 3: تقييد إضافي على مستوى الأعمدة — anon يحدّث فقط حالة
-- التفعيل ووقت آخر تحديث، ولا يستطيع تغيير device_token أو
-- user_id أو user_type لأي صف (وهو ما كان يسمح، نظريًا، بخطف
-- رمز إشعارات صالون آخر عبر إعادة ربطه برقم مستخدم مختلف).
-- =====================================================
REVOKE UPDATE ON fcm_tokens FROM anon;
GRANT UPDATE (updated_at, is_active) ON fcm_tokens TO anon;

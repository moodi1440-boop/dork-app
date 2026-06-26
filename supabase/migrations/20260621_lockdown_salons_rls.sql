-- ============================================================
-- تأمين جدول salons: إغلاق ثغرة "public_all" (USING(true) على كل
-- العمليات لـ role anon) التي كانت تسمح لأي شخص يعرف المفتاح العام
-- (مكشوف بالضرورة في كود الواجهة) بالقراءة والتعديل والحذف لأي صف
-- في الجدول دون أي قيد — بما في ذلك owner_pin_hash وحقول الإدارة
-- (status, banned, frozen, rating, total_paid...).
--
-- الحل الجذري المطبّق في الكود: كل كتابة على salons أصبحت تمر عبر
-- دوال سيرفرلس تستخدم مفتاح service_role (يتجاوز RLS أصلاً، وهذا
-- متوقع ومقصود)، وهي:
--   /api/register-salon  (تسجيل صالون جديد + تهيئة PIN)
--   /api/owner-salon      (تعديلات صاحب الصالون + تغيير PIN)
--   /api/submit-review    (تحديث rating بعد التحقق من حجز معتمد فعلي)
-- لذلك لم تَعُد الواجهة (مفتاح anon) تحتاج أي صلاحية INSERT/UPDATE/
-- DELETE على هذا الجدول إطلاقاً — القراءة العامة فقط للصالونات
-- المعتمدة (status='approved')، وبأعمدة محددة لا تشمل أي حقل سري.
-- ============================================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

-- حذف كل سياسة موجودة فعليًا على الجدول بأي اسم (لا نخمّن الأسماء،
-- لأن القاعدة الحية قد تحتوي سياسات من تجارب سابقة على الـ Dashboard
-- لم ترِد في أي ملف ترحيل بالمستودع — كما حدث مع fcm_tokens).
DO $$
DECLARE
  pol text;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'salons'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON salons', pol);
  END LOOP;
END $$;

-- =====================================================
-- صلاحيات الجدول (Grants) — قبل سياسات RLS، لأن REVOKE/GRANT
-- على مستوى الأعمدة يعمل بمعزل عن RLS ويمنع حتى لو سياسة ما
-- سمحت بطريق الخطأ بكل الأعمدة لاحقًا.
-- =====================================================
REVOKE INSERT, UPDATE, DELETE ON salons FROM anon;
REVOKE SELECT ON salons FROM anon;

-- anon يقرأ فقط الأعمدة العامة الآمنة (نفس القائمة المستخدمة فعليًا
-- في استعلام App.jsx لعرض الصالونات) — باستثناء صريح لـ
-- owner_pin_hash و owner_pin_fails و owner_pin_locked_until.
GRANT SELECT (
  id, name, owner, owner_phone, region, gov, center, village,
  phone, address, location_url, services, prices,
  shift_enabled, shift1_start, shift1_end, shift2_start, shift2_end,
  work_start, work_end, barbers, tone, rating, status, paused,
  frozen, banned, welcome_msg, closed_days, slot_min,
  cancellation_window, total_paid, social, lang, created_at
) ON salons TO anon;

-- =====================================================
-- سياسات RLS النهائية
-- =====================================================

-- القراءة العامة: فقط الصالونات المعتمدة (anon لا يملك أصلاً صلاحية
-- INSERT/UPDATE/DELETE بعد الـ REVOKE أعلاه، فلا حاجة لسياسات لها).
CREATE POLICY "salons_public_select_approved" ON salons
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- السيرفر (service role) يستخدمه فقط الكود في /api/*.js بمفتاح
-- service_role، وهو ما يدير كل كتابة فعلية على الجدول الآن.
CREATE POLICY "salons_service_role_all" ON salons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

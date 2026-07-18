-- Tier 2: تشديد RLS لـ customers/bookings/reviews/promo_codes بالاعتماد
-- على auth.uid() الحقيقي بدل USING(true) المفتوحة. يُطبَّق أولاً على
-- DAWRAK-TEST فقط (راجع ملف_الاتفاقيات بند 25، والنقاط-المتبقية).
-- ✅ طُبِّق فعلياً ومؤكَّد حياً على DAWRAK-TEST بتاريخ 2026-07-17.
--
-- الأسماء الحالية للسياسات مؤكَّدة حياً عبر pg_policies بتاريخ 2026-07-17
-- (Phase 0) — هذا الملف يعكس فعلياً ما كان مطبَّقاً وقت الكتابة، لا
-- افتراضات من ملفات هجرة قديمة متروكة.

-- ============================================================
-- customers
-- ============================================================

DROP POLICY IF EXISTS customers_public_select ON customers;
CREATE POLICY customers_select_own ON customers
  FOR SELECT
  USING (auth_uid = auth.uid());

-- صاحب الصالون يشوف (بس لا يعدّل) أي عميل حجز فعلياً عنده — لازم
-- لعرض تصنيف العميل (VIP/متكرر) بلوحة الصالون
CREATE POLICY customers_select_by_salon_owner ON customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN salons s ON s.id = b.salon_id
      WHERE b.customer_id = customers.id
        AND s.auth_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS customers_public_update ON customers;
CREATE POLICY customers_update_own ON customers
  FOR UPDATE
  USING (auth_uid = auth.uid())
  WITH CHECK (auth_uid = auth.uid());

-- anyone_create_customer (INSERT، WITH CHECK true) تبقى كما هي —
-- التسجيل يبقى مفتوحاً، لا تسريب بيانات موجودة بالإضافة وحدها.

-- فجوة مكتشفة بـPhase 0: anon كان عنده GRANT INSERT على أعمدة حساسة
-- بجدول عميل جديد (لا علاقة لها بمسار التسجيل الفعلي بالتطبيق أصلاً)
REVOKE INSERT (pin_hash, pin_fails, pin_locked_until, admin_notes, blocked) ON customers FROM anon, authenticated;

-- ============================================================
-- bookings — التسريب الفعلي المؤكَّد (اسم/جوال العميل يقرأه أي زائر)
-- ============================================================

-- anon يبقى يشوف وجود الحجز (تاريخ/وقت/حالة) لميزات العد العلني ومنع
-- تعارض الأوقات أثناء الحجز — بدون اسم/جوال/رقم العميل
REVOKE SELECT (customer_name, customer_phone, customer_id) ON bookings FROM anon;

DROP POLICY IF EXISTS public_select_bookings_for_realtime ON bookings;

CREATE POLICY bookings_select_public_nonpii ON bookings
  FOR SELECT TO anon
  USING (true);

CREATE POLICY bookings_select_own ON bookings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE auth_uid = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE auth_uid = auth.uid())
  );

DROP POLICY IF EXISTS bookings_public_update ON bookings;
CREATE POLICY bookings_update_own ON bookings
  FOR UPDATE TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE auth_uid = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_uid = auth.uid())
    OR salon_id IN (SELECT id FROM salons WHERE auth_uid = auth.uid())
  );

-- anyone_insert_booking (INSERT، WITH CHECK true) تبقى كما هي —
-- الحجز يبقى مفتوحاً، مطابق للسلوك الحالي.

-- ============================================================
-- reviews — القراءة/الإضافة سليمتان أصلاً (INSERT محصور بـservice_role
-- عبر submit-review.js، ما فيه سياسة INSERT عامة إطلاقاً بـPhase 0).
-- الفجوة الوحيدة الحقيقية: owner_reply بلا أي تحقق ملكية.
-- ============================================================

DROP POLICY IF EXISTS reviews_public_update ON reviews;
CREATE POLICY reviews_owner_reply_update ON reviews
  FOR UPDATE TO authenticated
  USING (salon_id IN (SELECT id FROM salons WHERE auth_uid = auth.uid()))
  WITH CHECK (salon_id IN (SELECT id FROM salons WHERE auth_uid = auth.uid()));

-- public_read_reviews تبقى كما هي — القراءة عامة بالتصميم (تصفّح الصالون).

-- ============================================================
-- promo_codes — بعد نقل كل التعديل (تطبيق العميل + إدارة الصالون
-- الإدارية) لمسارات service_role (api/redeem-promo-code.js،
-- admin/api/promo-codes)، ما بقي أي كود بالتطبيق يقرأ/يكتب مباشرة
-- بمفتاح anon/authenticated — قفل كامل، service_role فقط.
-- ============================================================

DROP POLICY IF EXISTS promo_codes_public_read ON promo_codes;
DROP POLICY IF EXISTS promo_codes_public_insert ON promo_codes;
DROP POLICY IF EXISTS promo_codes_public_update ON promo_codes;
DROP POLICY IF EXISTS promo_codes_public_delete ON promo_codes;

REVOKE SELECT, INSERT, UPDATE, DELETE ON promo_codes FROM anon, authenticated;
-- صلاحيات ثانوية متروكة من صلاحيات جدول افتراضية قديمة — غير قابلة
-- للاستغلال عبر واجهة PostgREST العادية، لكن نقفلها للنظافة والاتساق
-- مع نية "service_role فقط بالكامل"
REVOKE REFERENCES, TRIGGER, TRUNCATE ON promo_codes FROM anon, authenticated;

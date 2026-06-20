-- ============================================================
-- تأمين إضافة التقييمات: يشترط وجود حجز approved حقيقي
-- Secure reviews INSERT: require a real approved booking
-- ============================================================
-- المشكلة: السياسة القديمة "anyone_insert_review" (production-rls-v2.sql)
-- كانت WITH CHECK (true) — أي طلب INSERT مباشر على reviews يُقبل بأي
-- salon_id/customer_id/rating حتى بدون أي حجز حقيقي. الحماية الوحيدة
-- كانت في الواجهة (إخفاء زر التقييم)، وهذا قابل للتجاوز بسهولة.
--
-- الحل: دالة SECURITY DEFINER تتحقق من وجود حجز approved مطابق
-- (نفس الصالون + نفس العميل + نفس التاريخ)، وتُستخدم داخل WITH CHECK.
-- استخدام SECURITY DEFINER ضروري لأن جدول bookings نفسه محمي بـ RLS
-- يعتمد على app.session_token الذي لا يُفعّله التطبيق فعلياً — بدون
-- SECURITY DEFINER سيفشل تحقق EXISTS حتى للتقييمات الشرعية.
--
-- ⚠ تحذير مهم: لا تُعيد تشغيل /admin/fix-rls-policies.sql بعد هذا الملف
-- لأنه يعيد إنشاء سياسة "anon_insert" المفتوحة (WITH CHECK (true)) على
-- reviews ويُلغي هذا الإصلاح بالكامل.

CREATE OR REPLACE FUNCTION public.customer_has_approved_booking(
  p_salon_id text,
  p_customer_id text,
  p_booking_date text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.salon_id::text = p_salon_id
      AND b.customer_id::text = p_customer_id
      AND b.date::text = p_booking_date
      AND b.status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.customer_has_approved_booking(text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_has_approved_booking(text,text,text) TO anon, authenticated;

DROP POLICY IF EXISTS "anyone_insert_review" ON reviews;
DROP POLICY IF EXISTS "anon_insert" ON reviews;

CREATE POLICY "verified_booking_insert_review" ON reviews
  FOR INSERT
  WITH CHECK (
    public.customer_has_approved_booking(salon_id::text, customer_id::text, booking_date::text)
  );

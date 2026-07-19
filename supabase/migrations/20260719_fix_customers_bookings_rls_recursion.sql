-- إصلاح: تكرار لا نهائي (Postgres 42P17) بين سياستي RLS التاليتين،
-- اكتُشف حياً أثناء اختبار التسجيل على DAWRAK-TEST بتاريخ 2026-07-19:
--   customers_select_by_salon_owner  → تستعلم عن bookings
--   bookings_select_own              → تستعلم رجوعاً عن customers
-- أي عملية على customers (حتى INSERT بسبب return=representation
-- الافتراضي بـPostgREST) تدخل حلقة بين الجدولين.
--
-- الحل: دالة SECURITY DEFINER تتجاوز RLS داخلياً لكسر الحلقة —
-- النمط الموصى به رسمياً من Postgres/Supabase لهذي الحالة تحديداً.

CREATE OR REPLACE FUNCTION public.customer_booked_at_owner_salon(p_customer_id bigint, p_owner_auth_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN salons s ON s.id = b.salon_id
    WHERE b.customer_id = p_customer_id
      AND s.auth_uid = p_owner_auth_uid
  );
$$;

DROP POLICY IF EXISTS customers_select_by_salon_owner ON customers;
CREATE POLICY customers_select_by_salon_owner ON customers
  FOR SELECT TO authenticated
  USING ( public.customer_booked_at_owner_salon(id, auth.uid()) );

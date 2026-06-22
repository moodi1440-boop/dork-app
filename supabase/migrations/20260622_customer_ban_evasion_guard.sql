-- يمنع العميل المحظور (customers.blocked) من التحايل على الحظر بحذف
-- حسابه والتسجيل من جديد بهوية نظيفة.
--
-- 1) auth_uid يربط صف العميل بحساب Supabase Auth الحقيقي (يُعبّى عند
--    التسجيل من نتيجة verifyOtp في App.jsx) — يُستخدم لاحقًا لحذف
--    حساب Auth فعليًا عند حذف الحساب (عبر edge function بمفتاح
--    service_role)، بدل ترك حساب Auth يتيمًا بلا صف عميل.
--
-- 2) REVOKE على عمود blocked وعلى DELETE من anon: يمنع عميلاً محظورًا
--    من رفع الحظر عن نفسه أو حذف حسابه مباشرة عبر REST API بالمفتاح
--    العام (anon) — كل ذلك أصبح يمر فقط عبر مفتاح service_role
--    (لوحة الإدارة عبر API route، أو edge function "delete-account").
--
-- 3) customer_blacklist: قائمة حظر دائمة بالهاتف/البريد، تُعبّى فقط
--    عند حذف حساب كان محظورًا فعليًا وقت الحذف (لا عند الحظر نفسه)،
--    حتى لا نمنع عميلاً غير محظور من حذف حسابه وإعادة التسجيل بشكل
--    طبيعي. الفحص متاح لـ anon فقط كنتيجة true/false عبر دالة
--    SECURITY DEFINER لا تكشف أي صف من الجدول.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_uid uuid;

REVOKE UPDATE (blocked, loyalty_points, loyalty_frozen, admin_notes) ON customers FROM anon;
REVOKE DELETE ON customers FROM anon;

CREATE TABLE IF NOT EXISTS customer_blacklist (
  id         bigserial PRIMARY KEY,
  phone      text,
  email      text,
  reason     text NOT NULL DEFAULT 'banned_account_deleted',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_phone ON customer_blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_email ON customer_blacklist(email);

ALTER TABLE customer_blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_blacklist" ON customer_blacklist;
CREATE POLICY "service_role_all_blacklist" ON customer_blacklist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION is_blacklisted(p_phone text, p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customer_blacklist
    WHERE (p_phone <> '' AND phone = p_phone)
       OR (p_email <> '' AND email = p_email)
  );
$$;

GRANT EXECUTE ON FUNCTION is_blacklisted(text, text) TO anon;

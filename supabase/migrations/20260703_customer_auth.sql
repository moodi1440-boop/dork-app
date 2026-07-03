-- نقطة: هوية حقيقية للعميل — تحقق رمز سري بالسيرفر بدل الاعتماد الكامل على
-- localStorage بالجهاز. نفس نمط أعمدة owner_pin_* على salons بالضبط.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_hash         text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_fails        integer NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_uid         uuid;

-- anon يحتاج يقرأ pin_hash/pin_fails/pin_locked_until؟ لا — التحقق كله يمر
-- عبر API بمفتاح service_role (نفس منطق owner-auth.js)، فما نمنح anon أي
-- صلاحية على هذي الأعمدة الأربعة تحديداً (عكس باقي أعمدة customers المفتوحة
-- بـ Tier 1 اليوم).
REVOKE SELECT (pin_hash, pin_fails, pin_locked_until), UPDATE (pin_hash, pin_fails, pin_locked_until, auth_uid)
  ON customers FROM anon;

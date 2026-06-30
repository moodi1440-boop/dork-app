-- نقطة 84: إضافة عمود auth_uid لجدول salons
-- شغّل هذا في Supabase SQL Editor قبل تشغيل migrate-salon-auth.js

-- ① نسخة احتياطية (مهمة — لا تتجاوزها)
CREATE TABLE IF NOT EXISTS salons_backup_auth_migration AS SELECT * FROM salons;

-- ② إضافة العمود
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users(id);

-- ③ تحقق — يجب أن يُظهر عدد الصالونات التي تحتاج migration
SELECT COUNT(*) AS needs_migration FROM salons WHERE auth_uid IS NULL AND owner_email IS NOT NULL;

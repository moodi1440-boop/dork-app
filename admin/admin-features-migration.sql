-- =====================================================
-- Admin Panel Migration - New Features
-- Run this in your Supabase SQL Editor
-- =====================================================

-- عمود الملاحظات الداخلية للعملاء (لا يراه العميل)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes text default '';

-- عمود الحظر للعملاء
ALTER TABLE customers ADD COLUMN IF NOT EXISTS blocked boolean default false;

-- تفعيل Realtime لجدول الصالونات (لإشعارات التسجيل الجديد)
-- نفّذ هذا إذا لم يكن مفعّلاً بالفعل:
ALTER PUBLICATION supabase_realtime ADD TABLE salons;

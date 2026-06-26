-- إضافة عمود lang لقائمة GRANT في RLS جدول salons
-- العمود كان ناقصاً رغم وجوده في استعلام App.jsx
-- يسبب خطأ "permission denied" للـ anon key → بانر خطأ قاعدة البيانات

GRANT SELECT (lang) ON salons TO anon;

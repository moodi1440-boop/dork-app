-- إعداد "القبول التلقائي للصوالين الجديدة" — مفتاح إيقاف/تشغيل
-- يُقرأ من /api/register-salon قبل إدراج الصالون. القيمة الافتراضية
-- false (متوقفة) بناءً على طلب صريح: لا قبول تلقائي في البداية،
-- يُفعَّل لاحقًا من لوحة الإدارة بعد بناء سجل ملاحظات لأصحاب الصوالين.
INSERT INTO admin_config (key, value) VALUES
  ('auto_approve_salons', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

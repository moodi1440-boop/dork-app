-- ============================================================
-- توثيق مستندات الصالون عند الموافقة (بند #20 من bug-list.md)
-- ============================================================
-- نسخة مبسّطة: رابط للمستند (يُرفع خارجياً ويُلصق رابطه) بدل تخزين
-- ملفات فعلياً — يتجنّب الحاجة لإعداد Supabase Storage bucket جديد
-- بهذه الدفعة. يمكن تطويره لرفع ملفات حقيقي لاحقاً دون كسر الجدول.

CREATE TABLE IF NOT EXISTS salon_documents (
  id           bigserial PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  salon_id     text NOT NULL,
  doc_type     text NOT NULL,   -- مثل: سجل_تجاري، هوية_المالك، رخصة_بلدية
  doc_url      text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_note   text,
  reviewed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_salon_documents_salon_id ON salon_documents (salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_documents_status   ON salon_documents (status);

-- لا سياسات عامة — القراءة/الكتابة فقط عبر service role (الإدارة).
-- المالك يرسل رابط المستند للإدارة حالياً عبر الشات الموجود مسبقاً
-- بدل إدراج مباشر، فلا حاجة لسياسة anon/owner بهذا الإصدار.
ALTER TABLE salon_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RBAC: حسابات إدارة متعددة بأدوار (بند #17 من bug-list.md)
-- ============================================================
-- إضافية بالكامل — لا تُغيّر آلية تسجيل الدخول الحالية بكلمة المرور
-- الموحّدة (ADMIN_SECRET/admin_config). حامل تلك الكلمة يبقى يُعامل
-- كـsuper_admin تلقائياً. هذا الجدول يضيف حسابات مُسمّاة اختيارية
-- فوق الآلية القديمة دون كسرها.

CREATE TABLE IF NOT EXISTS admin_users (
  id            bigserial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'editor', 'viewer')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- لا سياسات عامة — القراءة/الكتابة فقط عبر service role من راوتات الإدارة
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

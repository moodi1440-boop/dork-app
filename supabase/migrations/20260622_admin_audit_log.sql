-- ============================================================
-- سجل تتبّع إجراءات الإدارة (بند #18 من bug-list.md)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,   -- اسم المستخدم من admin_users، أو "admin" لكلمة المرور الموحّدة القديمة
  action      text NOT NULL,   -- مثل booking.update_status, salon.delete
  target_type text,
  target_id   text,
  details     jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON admin_audit_log (action);

-- لا سياسات عامة — القراءة/الكتابة فقط عبر service role
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

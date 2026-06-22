-- ============================================================
-- نظام دعم/تذاكر (بند #22 من bug-list.md)
-- ============================================================
-- يُفتح من بوابة المالك (/owner، عبر جلسة موقّعة) ويُدار من الإدارة.
-- الكتابة تتم فقط عبر service role (راوتات /api/owner و/api/support-tickets
-- المحمية)، فلا حاجة لسياسة RLS عامة بهذا الإصدار.

CREATE TABLE IF NOT EXISTS support_tickets (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  salon_id    text NOT NULL,
  subject     text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority    text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  admin_reply text
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_salon_id ON support_tickets (salon_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets (status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

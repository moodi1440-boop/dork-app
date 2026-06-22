-- ============================================================
-- نظام نزاعات/استرجاع أموال (بند #19 من bug-list.md)
-- ============================================================
-- يُنشأ النزاع من لوحة الإدارة فقط حالياً (موظف يسجّله بعد بلاغ
-- هاتفي/شات من العميل أو المالك) — لا إدراج مباشر من عميل/مالك
-- بهذا الإصدار، فلا حاجة لسياسة RLS عامة.

CREATE TABLE IF NOT EXISTS disputes (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  booking_id      text,
  salon_id        text,
  customer_name   text,
  customer_phone  text,
  reason          text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  refund_amount   numeric,
  admin_note      text,
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_disputes_status     ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes (created_at DESC);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

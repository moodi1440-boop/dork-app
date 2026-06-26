CREATE TABLE IF NOT EXISTS customer_messages (
  id            bigserial    PRIMARY KEY,
  salon_id      bigint       NOT NULL,
  customer_id   bigint       NOT NULL,
  booking_id    bigint,
  from_customer boolean      NOT NULL DEFAULT true,
  text          text         NOT NULL CHECK (length(text) BETWEEN 1 AND 1000),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  read_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cm_salon_customer_booking
  ON customer_messages(salon_id, customer_id, booking_id);

CREATE INDEX IF NOT EXISTS idx_cm_salon_created
  ON customer_messages(salon_id, created_at DESC);

ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

-- anon يقرأ (التطبيق دائماً يفلتر بـ salon_id + customer_id + booking_id)
CREATE POLICY "cm_select" ON customer_messages
  FOR SELECT TO anon USING (true);

-- anon يُرسل فقط كعميل (from_customer يجب أن يكون true)
CREATE POLICY "cm_insert_customer" ON customer_messages
  FOR INSERT TO anon WITH CHECK (from_customer = true);

-- service_role يتجاوز RLS تلقائياً (لردود المالك عبر API route)

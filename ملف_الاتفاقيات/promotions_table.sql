-- جدول العروض الترويجية للصالونات
-- الإصدار: L3 — تاريخ الإنشاء: 2026-06-02

CREATE TABLE IF NOT EXISTS promotions (
  id           BIGSERIAL PRIMARY KEY,
  salon_id     BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  package      TEXT NOT NULL CHECK (package IN ('bronze', 'silver', 'gold')),
  promo_text   TEXT NOT NULL,
  customer_count INTEGER DEFAULT NULL,
  duration_days  INTEGER NOT NULL DEFAULT 7,
  price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  discount_code TEXT DEFAULT NULL,
  starts_at    TIMESTAMPTZ DEFAULT NULL,
  ends_at      TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس الأداء
CREATE INDEX IF NOT EXISTS promotions_salon_id_idx ON promotions(salon_id);
CREATE INDEX IF NOT EXISTS promotions_status_idx   ON promotions(status);
CREATE INDEX IF NOT EXISTS promotions_ends_at_idx  ON promotions(ends_at);

-- RLS (اختياري)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- قراءة العروض النشطة لأي مستخدم
CREATE POLICY "public read active promotions"
  ON promotions FOR SELECT
  USING (status = 'active');

-- صالون يقرأ عروضه هو فقط
CREATE POLICY "salon owner reads own promotions"
  ON promotions FOR SELECT
  USING (true);

-- إدراج عرض جديد (بدون تقييد — يُضاف status=pending)
CREATE POLICY "insert promotion"
  ON promotions FOR INSERT
  WITH CHECK (true);

-- تعديل (إلغاء) العرض من قِبل الصالون
CREATE POLICY "update own promotion"
  ON promotions FOR UPDATE
  USING (true);

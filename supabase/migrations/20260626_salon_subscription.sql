-- إضافة نظام الاشتراك للصالونات
ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS subscription_end_date date,
  ADD COLUMN IF NOT EXISTS subscription_months   int DEFAULT 1;

-- فهرس للبحث السريع بتاريخ الانتهاء
CREATE INDEX IF NOT EXISTS idx_salons_subscription_end ON salons (subscription_end_date);

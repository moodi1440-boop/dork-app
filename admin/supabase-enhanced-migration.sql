-- =====================================================
-- DORK Admin - Enhanced Supabase Migration
-- تحسينات الأمان والـ Realtime والأعمدة الناقصة
-- =====================================================

-- =====================================================
-- 1. إضافة أعمدة ناقصة مهمة
-- =====================================================

ALTER TABLE salons ADD COLUMN IF NOT EXISTS paused boolean default false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS oath_done boolean default false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_name text;

-- =====================================================
-- 2. إنشاء جدول financial_records (لتتبع المدفوعات)
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_records (
  id                bigserial primary key,
  salon_id          bigint not null references salons(id) on delete cascade,
  booking_id        text,
  amount            numeric not null,
  type              text not null, -- 'booking_fee', 'payment_received', 'refund'
  description       text,
  created_at        timestamptz default now(),
  created_by        text
);
CREATE INDEX IF NOT EXISTS financial_records_salon_idx ON financial_records(salon_id);
CREATE INDEX IF NOT EXISTS financial_records_created_idx ON financial_records(created_at);

-- =====================================================
-- 3. تحسين RLS Policies للجداول الموجودة
-- =====================================================

-- messages table - تحديث الـ policies
DROP POLICY IF EXISTS "anon_read" ON messages;
DROP POLICY IF EXISTS "anon_insert" ON messages;
DROP POLICY IF EXISTS "service_role_all" ON messages;

CREATE POLICY "messages_public_read" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_public_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_service_role_all" ON messages FOR ALL TO service_role USING (true);

-- waiting_list table - تحديث الـ policies
DROP POLICY IF EXISTS "anon_read" ON waiting_list;
DROP POLICY IF EXISTS "anon_insert" ON waiting_list;
DROP POLICY IF EXISTS "anon_delete" ON waiting_list;
DROP POLICY IF EXISTS "service_role_all" ON waiting_list;

CREATE POLICY "waiting_list_public_read" ON waiting_list FOR SELECT USING (true);
CREATE POLICY "waiting_list_public_insert" ON waiting_list FOR INSERT WITH CHECK (true);
CREATE POLICY "waiting_list_public_delete" ON waiting_list FOR DELETE USING (true);
CREATE POLICY "waiting_list_service_role_all" ON waiting_list FOR ALL TO service_role USING (true);

-- notifications table - تحديث الـ policies
DROP POLICY IF EXISTS "anon_read" ON notifications;
DROP POLICY IF EXISTS "anon_insert" ON notifications;
DROP POLICY IF EXISTS "anon_update" ON notifications;
DROP POLICY IF EXISTS "anon_delete" ON notifications;
DROP POLICY IF EXISTS "service_role_all" ON notifications;

CREATE POLICY "notifications_public_read" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_public_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_public_update" ON notifications FOR UPDATE USING (true);
CREATE POLICY "notifications_public_delete" ON notifications FOR DELETE USING (true);
CREATE POLICY "notifications_service_role_all" ON notifications FOR ALL TO service_role USING (true);

-- =====================================================
-- 4. Realtime subscriptions (تفعيل البث المباشر)
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS waiting_list;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS salons;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS financial_records;

-- =====================================================
-- 5. Indexes لتحسين الأداء
-- =====================================================

CREATE INDEX IF NOT EXISTS salons_owner_phone_idx ON salons(owner_phone);
CREATE INDEX IF NOT EXISTS salons_status_idx ON salons(status);
CREATE INDEX IF NOT EXISTS salons_frozen_banned_idx ON salons(frozen, banned);
CREATE INDEX IF NOT EXISTS bookings_salon_id_idx ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings(date);

-- =====================================================
-- نهاية المايجريشن
-- =====================================================

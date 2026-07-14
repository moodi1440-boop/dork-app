-- =====================================================
-- DORK Admin - Supabase Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- جدول الرسائل بين الإدارة والصالونات
CREATE TABLE IF NOT EXISTS messages (
  id          bigserial primary key,
  salon_id    bigint not null references salons(id) on delete cascade,
  from_admin  boolean not null default false,
  text        text not null,
  created_at  timestamptz default now(),
  read_at     timestamptz
);
CREATE INDEX IF NOT EXISTS messages_salon_id_idx ON messages(salon_id);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read" ON messages FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "service_role_all" ON messages FOR ALL TO service_role USING (true);

-- جدول قائمة الانتظار
CREATE TABLE IF NOT EXISTS waiting_list (
  id          bigserial primary key,
  salon_id    bigint not null references salons(id) on delete cascade,
  name        text not null,
  phone       text,
  created_at  timestamptz default now()
);
CREATE INDEX IF NOT EXISTS waiting_list_salon_id_idx ON waiting_list(salon_id);
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read" ON waiting_list FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON waiting_list FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_delete" ON waiting_list FOR DELETE USING (true);
CREATE POLICY "service_role_all" ON waiting_list FOR ALL TO service_role USING (true);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id           bigserial primary key,
  target_type  text not null default 'all', -- 'salon' | 'customer' | 'all' | 'admin' | 'booking'
  target_id    bigint,
  title        text not null,
  body         text,
  icon         text default '🔔',
  read         boolean default false,
  created_at   timestamptz default now()
);
CREATE INDEX IF NOT EXISTS notifications_target_idx ON notifications(target_type, target_id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read"   ON notifications FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update" ON notifications FOR UPDATE USING (true);
CREATE POLICY "anon_delete" ON notifications FOR DELETE USING (true);
CREATE POLICY "service_role_all" ON notifications FOR ALL TO service_role USING (true);

-- جدول إعدادات الإدارة (pinned, week_salon, etc.)
-- ملاحظة: جدول app_settings موجود مسبقاً (social_links, ui_settings)
CREATE TABLE IF NOT EXISTS admin_config (
  key    text primary key,
  value  jsonb not null default 'null'
);
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON admin_config FOR ALL TO service_role USING (true);

-- بيانات افتراضية لإعدادات الإدارة
INSERT INTO admin_config (key, value) VALUES
  ('pinned',    '[]'),
  ('week_salon', 'null')
ON CONFLICT (key) DO NOTHING;

-- أعمدة إضافية في جدول الصالونات (إن لم تكن موجودة)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS frozen boolean default false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS banned boolean default false;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS total_paid numeric default 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS welcome_msg text default '';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS closed_days integer[] default '{}';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS slot_min integer default 40;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS password text;

-- أعمدة في جدول الحجوزات (إن لم تكن موجودة)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id bigint references customers(id) on delete set null;

-- تفعيل Realtime على الجداول الجديدة
-- نفّذ هذا في Supabase Dashboard > Database > Replication
-- أو من خلال:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE waiting_list;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- جدول bookings قد يكون مفعّلاً مسبقاً، إذا أعطى خطأ تجاهله
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

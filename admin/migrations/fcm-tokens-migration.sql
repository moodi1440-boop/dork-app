-- =====================================================
-- FCM Tokens Table - Supabase Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- جدول لحفظ FCM tokens الخاصة بأجهزة المستخدمين
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id              bigserial primary key,
  user_type       text not null, -- 'salon' | 'admin' | 'customer'
  user_id         bigint not null,
  device_token    text not null unique,
  device_name     text,
  is_active       boolean default true,
  last_used_at    timestamptz default now(),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS fcm_tokens_user_type_id_idx ON fcm_tokens(user_type, user_id);
CREATE INDEX IF NOT EXISTS fcm_tokens_device_token_idx ON fcm_tokens(device_token);
CREATE INDEX IF NOT EXISTS fcm_tokens_is_active_idx ON fcm_tokens(is_active);

-- تفعيل Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "anon_insert" ON fcm_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_own" ON fcm_tokens FOR UPDATE USING (true);
CREATE POLICY "anon_delete_own" ON fcm_tokens FOR DELETE USING (true);
CREATE POLICY "anon_select_active" ON fcm_tokens FOR SELECT USING (is_active = true);
CREATE POLICY "service_role_all" ON fcm_tokens FOR ALL TO service_role USING (true);

-- تفعيل Realtime على الجدول
ALTER PUBLICATION supabase_realtime ADD TABLE fcm_tokens;

-- جدول لتتبع الإشعارات المرسلة (اختياري - للإحصائيات)
CREATE TABLE IF NOT EXISTS notification_logs (
  id              bigserial primary key,
  notification_id bigint references notifications(id) on delete cascade,
  fcm_token_id    bigint references fcm_tokens(id) on delete cascade,
  user_type       text not null,
  user_id         bigint not null,
  status          text default 'sent', -- 'sent' | 'failed' | 'pending'
  error_message   text,
  sent_at         timestamptz default now()
);

CREATE INDEX IF NOT EXISTS notification_logs_notification_id_idx ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS notification_logs_user_type_id_idx ON notification_logs(user_type, user_id);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON notification_logs FOR ALL TO service_role USING (true);

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;

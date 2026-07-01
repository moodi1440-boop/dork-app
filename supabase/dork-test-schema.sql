-- =====================================================
-- DORK-TEST — سكيما كاملة للبيئة التجريبية
-- شغّل هذا في Supabase SQL Editor للمشروع: DORK-TEST
-- تاريخ الإنشاء: 2026-07-01
-- =====================================================
-- تعليمات:
-- 1. افتح DORK-TEST → SQL Editor → New Query
-- 2. انسخ محتوى هذا الملف كاملاً والصقه
-- 3. اضغط Run — انتظر حتى تنتهي كل الأوامر
-- 4. تحقق من عدم وجود أخطاء حمراء
-- =====================================================

-- ==================== الامتدادات ====================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== الجداول الأساسية ====================

-- جدول الصالونات
CREATE TABLE IF NOT EXISTS salons (
  id                      bigserial PRIMARY KEY,
  name                    text NOT NULL,
  owner                   text NOT NULL,
  owner_phone             text,
  owner_email             text,
  region                  text,
  gov                     text,
  center                  text,
  village                 text,
  phone                   text,
  address                 text,
  location_url            text,
  services                jsonb DEFAULT '[]'::jsonb,
  prices                  jsonb DEFAULT '{}'::jsonb,
  shift_enabled           boolean DEFAULT false,
  shift1_start            text,
  shift1_end              text,
  shift2_start            text,
  shift2_end              text,
  work_start              text DEFAULT '09:00',
  work_end                text DEFAULT '21:00',
  barbers                 jsonb DEFAULT '[]'::jsonb,
  tone                    text DEFAULT 'dark',
  rating                  numeric DEFAULT 0,
  status                  text DEFAULT 'pending',
  paused                  boolean DEFAULT false,
  frozen                  boolean DEFAULT false,
  banned                  boolean DEFAULT false,
  total_paid              numeric DEFAULT 0,
  welcome_msg             text DEFAULT '',
  closed_days             integer[] DEFAULT '{}',
  slot_min                integer DEFAULT 40,
  cancellation_window     integer DEFAULT 60,
  password                text,
  owner_pin_hash          text,
  owner_pin_fails         integer NOT NULL DEFAULT 0,
  owner_pin_locked_until  timestamptz,
  social                  jsonb DEFAULT '{}'::jsonb,
  lang                    text DEFAULT 'ar',
  subscription_end_date   date,
  subscription_months     int DEFAULT 1,
  auth_uid                uuid REFERENCES auth.users(id),
  created_at              timestamptz DEFAULT now()
);

COMMENT ON COLUMN salons.status               IS 'pending | approved | rejected';
COMMENT ON COLUMN salons.paused               IS 'true = الصالون أوقف الحجوزات مؤقتاً';
COMMENT ON COLUMN salons.frozen               IS 'true = مجمّد من الإدارة (يُخفى من القائمة)';
COMMENT ON COLUMN salons.banned               IS 'true = محظور نهائياً';
COMMENT ON COLUMN salons.owner_pin_hash       IS 'SHA-256 hash of (salonId + ":" + pin)';
COMMENT ON COLUMN salons.auth_uid             IS 'Supabase Auth user UUID للصالون (لتسجيل الدخول بـ OTP)';

-- جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
  id                  bigserial PRIMARY KEY,
  phone               text UNIQUE,
  name                text,
  email               text,
  pin_hash            text,
  pin_fails           integer DEFAULT 0,
  pin_locked_until    timestamptz,
  profile_img         text,
  loyalty_points      integer DEFAULT 0,
  loyalty_frozen      boolean DEFAULT false,
  admin_notes         text DEFAULT '',
  blocked             boolean DEFAULT false,
  auth_uid            uuid,
  created_at          timestamptz DEFAULT now()
);

-- جدول الحجوزات
CREATE TABLE IF NOT EXISTS bookings (
  id                    bigserial PRIMARY KEY,
  salon_id              bigint REFERENCES salons(id) ON DELETE CASCADE,
  barber_id             text DEFAULT 'any',
  barber_name           text,
  customer_id           bigint REFERENCES customers(id) ON DELETE SET NULL,
  customer_name         text,
  customer_phone        text,
  service               text,
  date                  text,
  time                  text,
  total                 numeric DEFAULT 0,
  status                text DEFAULT 'pending',
  attendance            text,
  notes                 text,
  slot_duration_minutes integer,
  reminder_minutes      integer NOT NULL DEFAULT 60,
  reminder_sent         boolean NOT NULL DEFAULT false,
  idempotency_key       uuid,
  created_at            timestamptz DEFAULT now()
);

COMMENT ON COLUMN bookings.status           IS 'pending | approved | rejected | cancelled';
COMMENT ON COLUMN bookings.attendance       IS 'NULL | attended | no_show';
COMMENT ON COLUMN bookings.idempotency_key  IS 'UUID فريد لمنع الحجز المزدوج عند إعادة المحاولة';

-- جدول التقييمات
CREATE TABLE IF NOT EXISTS reviews (
  id            bigserial PRIMARY KEY,
  salon_id      bigint REFERENCES salons(id) ON DELETE CASCADE,
  customer_id   bigint,
  customer_name text,
  rating        numeric CHECK (rating BETWEEN 1 AND 5),
  comment       text,
  booking_date  text,
  created_at    timestamptz DEFAULT now()
);

-- جدول إعدادات التطبيق
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT 'null'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- بيانات افتراضية لإعدادات التطبيق
INSERT INTO app_settings (key, value) VALUES
  ('loyalty_settings', '{"enabled":false,"points_per_booking":10,"redemption_rate":0.1}'::jsonb),
  ('ui_settings',      '{"show_reviews":true,"show_prices":true}'::jsonb),
  ('social_links',     '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==================== جداول الدعم ====================

-- جدول قائمة الانتظار
CREATE TABLE IF NOT EXISTS waiting_list (
  id          bigserial PRIMARY KEY,
  salon_id    bigint NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  customer_id bigint,
  slot_date   text,
  slot_time   text,
  status      text NOT NULL DEFAULT 'waiting',
  created_at  timestamptz DEFAULT now()
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id           bigserial PRIMARY KEY,
  target_type  text NOT NULL DEFAULT 'all',
  target_id    bigint,
  title        text NOT NULL,
  body         text,
  icon         text DEFAULT '🔔',
  read         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- جدول رسائل الأدمن ↔ الصالون
CREATE TABLE IF NOT EXISTS messages (
  id          bigserial PRIMARY KEY,
  salon_id    bigint NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  from_admin  boolean NOT NULL DEFAULT false,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  read_at     timestamptz
);

-- جدول إعدادات الإدارة
CREATE TABLE IF NOT EXISTS admin_config (
  key    text PRIMARY KEY,
  value  jsonb NOT NULL DEFAULT 'null'::jsonb
);

INSERT INTO admin_config (key, value) VALUES
  ('pinned',              '[]'::jsonb),
  ('week_salon',          'null'::jsonb),
  ('auto_approve_salons', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- جدول توكنات FCM
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id           bigserial PRIMARY KEY,
  user_type    text NOT NULL,
  user_id      bigint NOT NULL,
  device_token text NOT NULL UNIQUE,
  device_name  text,
  is_active    boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- جدول اشتراكات Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_type  text NOT NULL CHECK (user_type IN ('salon', 'customer')),
  user_id    integer NOT NULL,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL DEFAULT '',
  auth_key   text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول سجلات الإشعارات
CREATE TABLE IF NOT EXISTS notification_logs (
  id              bigserial PRIMARY KEY,
  notification_id bigint REFERENCES notifications(id) ON DELETE CASCADE,
  fcm_token_id    bigint REFERENCES fcm_tokens(id) ON DELETE CASCADE,
  user_type       text NOT NULL,
  user_id         bigint NOT NULL,
  status          text DEFAULT 'sent',
  error_message   text,
  sent_at         timestamptz DEFAULT now()
);

-- ==================== الجداول الإدارية ====================

-- جدول سجل تتبع الإجراءات الإدارية
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  details     jsonb
);

-- جدول حسابات الإدارة
CREATE TABLE IF NOT EXISTS admin_users (
  id            bigserial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'editor', 'viewer')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- جدول النزاعات واسترجاع الأموال
CREATE TABLE IF NOT EXISTS disputes (
  id             bigserial PRIMARY KEY,
  created_at     timestamptz NOT NULL DEFAULT now(),
  booking_id     text,
  salon_id       text,
  customer_name  text,
  customer_phone text,
  reason         text NOT NULL,
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  refund_amount  numeric,
  admin_note     text,
  resolved_at    timestamptz
);

-- جدول مستندات الصالون
CREATE TABLE IF NOT EXISTS salon_documents (
  id           bigserial PRIMARY KEY,
  created_at   timestamptz NOT NULL DEFAULT now(),
  salon_id     text NOT NULL,
  doc_type     text NOT NULL,
  doc_url      text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_note   text,
  reviewed_at  timestamptz
);

-- جدول تذاكر الدعم
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

-- جدول رسائل العملاء
CREATE TABLE IF NOT EXISTS customer_messages (
  id            bigserial PRIMARY KEY,
  salon_id      bigint NOT NULL,
  customer_id   bigint NOT NULL,
  booking_id    bigint,
  from_customer boolean NOT NULL DEFAULT true,
  text          text NOT NULL CHECK (length(text) BETWEEN 1 AND 1000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

-- جدول سجلات النظام
CREATE TABLE IF NOT EXISTS system_logs (
  id         bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  level      text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event      text NOT NULL,
  details    jsonb,
  user_id    text,
  user_type  text
);

-- جدول Rate Limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  ip        text NOT NULL,
  endpoint  text NOT NULL,
  window_ts bigint NOT NULL,
  count     int NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, endpoint, window_ts)
);

-- جدول إعدادات app_config (للـ cron)
CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO app_config (key, value) VALUES
  ('supabase_url', ''),
  ('cron_secret',  '')
ON CONFLICT (key) DO NOTHING;

-- جدول جلسات المستخدمين (قديم — يُستخدم في سياسات RLS القديمة فقط)
CREATE TABLE IF NOT EXISTS user_sessions (
  id            bigserial PRIMARY KEY,
  user_type     text NOT NULL CHECK (user_type IN ('customer', 'salon')),
  user_id       integer NOT NULL,
  session_token text UNIQUE NOT NULL,
  created_at    timestamp DEFAULT NOW(),
  expires_at    timestamp DEFAULT (NOW() + INTERVAL '30 days')
);

-- قائمة الحظر الدائمة
CREATE TABLE IF NOT EXISTS customer_blacklist (
  id         bigserial PRIMARY KEY,
  phone      text,
  email      text,
  reason     text NOT NULL DEFAULT 'banned_account_deleted',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- جدول الأرشيف (نفس بنية bookings)
CREATE TABLE IF NOT EXISTS bookings_archive (
  LIKE bookings INCLUDING ALL
);
COMMENT ON TABLE bookings_archive IS 'حجوزات أقدم من 6 أشهر — منقولة تلقائياً من bookings';

-- ==================== CHECK Constraints ====================
DO $$ BEGIN
  BEGIN
    ALTER TABLE salons     ADD CONSTRAINT chk_salons_status     CHECK (status IN ('pending','approved','rejected')) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE bookings   ADD CONSTRAINT chk_bookings_status   CHECK (status IN ('pending','approved','rejected','cancelled')) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE bookings   ADD CONSTRAINT chk_bookings_attendance CHECK (attendance IS NULL OR attendance IN ('attended','no_show')) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE waiting_list ADD CONSTRAINT chk_waiting_list_status CHECK (status IN ('waiting','accepted')) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ==================== الفهارس ====================

-- salons
CREATE INDEX IF NOT EXISTS idx_salons_status           ON salons(status);
CREATE INDEX IF NOT EXISTS idx_salons_created_at       ON salons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_salons_phone            ON salons(phone);
CREATE INDEX IF NOT EXISTS idx_salons_owner_phone      ON salons(owner_phone);
CREATE INDEX IF NOT EXISTS idx_salons_subscription_end ON salons(subscription_end_date);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id           ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_date         ON bookings(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_status_date  ON bookings(salon_id, status, date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id        ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at         ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_reminder           ON bookings(date, time) WHERE status = 'approved' AND reminder_sent = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- prevent double booking (unique index)
DROP INDEX IF EXISTS prevent_double_booking;
CREATE UNIQUE INDEX prevent_double_booking
  ON bookings (salon_id, barber_id, date, time)
  WHERE status NOT IN ('rejected', 'cancelled');

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON reviews(salon_id);

-- waiting_list
CREATE INDEX IF NOT EXISTS idx_waiting_list_salon_date   ON waiting_list(salon_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_waiting_list_salon_status ON waiting_list(salon_id, status);

-- messages
CREATE INDEX IF NOT EXISTS messages_salon_id_idx ON messages(salon_id);

-- customer_messages
CREATE INDEX IF NOT EXISTS idx_customer_messages_salon_id       ON customer_messages(salon_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_id    ON customer_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_salon_customer ON customer_messages(salon_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_booking_id     ON customer_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_cm_salon_customer_booking        ON customer_messages(salon_id, customer_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_cm_salon_created                 ON customer_messages(salon_id, created_at DESC);

-- fcm_tokens
CREATE INDEX IF NOT EXISTS fcm_tokens_user_type_id_idx ON fcm_tokens(user_type, user_id);
CREATE INDEX IF NOT EXISTS fcm_tokens_device_token_idx ON fcm_tokens(device_token);
CREATE INDEX IF NOT EXISTS fcm_tokens_is_active_idx    ON fcm_tokens(is_active);

-- push_subscriptions
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_type, user_id);

-- notifications
CREATE INDEX IF NOT EXISTS notifications_target_idx ON notifications(target_type, target_id);

-- notification_logs
CREATE INDEX IF NOT EXISTS notification_logs_notification_id_idx ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS notification_logs_user_type_id_idx    ON notification_logs(user_type, user_id);

-- admin_audit_log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON admin_audit_log(action);

-- disputes
CREATE INDEX IF NOT EXISTS idx_disputes_status     ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

-- salon_documents
CREATE INDEX IF NOT EXISTS idx_salon_documents_salon_id ON salon_documents(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_documents_status   ON salon_documents(status);

-- support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_salon_id ON support_tickets(salon_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets(status);

-- system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_event      ON system_logs(event);

-- customer_blacklist
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_phone ON customer_blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_email ON customer_blacklist(email);

-- bookings_archive
CREATE INDEX IF NOT EXISTS idx_bookings_archive_created_at ON bookings_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_archive_salon_id   ON bookings_archive(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_archive_customer_id ON bookings_archive(customer_id);

-- user_sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions(user_type, user_id);

-- rate_limits (لا فهرس إضافي — PK يكفي)

-- ==================== Grants على جدول salons ====================
REVOKE INSERT, UPDATE, DELETE ON salons FROM anon;
REVOKE SELECT ON salons FROM anon;

GRANT SELECT (
  id, name, owner, owner_phone, region, gov, center, village,
  phone, address, location_url, services, prices,
  shift_enabled, shift1_start, shift1_end, shift2_start, shift2_end,
  work_start, work_end, barbers, tone, rating, status, paused,
  frozen, banned, welcome_msg, closed_days, slot_min,
  cancellation_window, total_paid, social, lang, created_at
) ON salons TO anon;

REVOKE UPDATE (blocked, loyalty_points, loyalty_frozen, admin_notes) ON customers FROM anon;
REVOKE DELETE ON customers FROM anon;

REVOKE UPDATE ON fcm_tokens FROM anon;
GRANT UPDATE (updated_at, is_active) ON fcm_tokens TO anon;

REVOKE SELECT, INSERT, UPDATE, DELETE ON waiting_list FROM anon;
GRANT ALL ON waiting_list TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON messages FROM anon;
GRANT ALL ON messages TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON admin_config FROM anon;
GRANT ALL ON admin_config TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON rate_limits FROM anon;
GRANT ALL ON rate_limits TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON bookings_archive FROM anon;
GRANT ALL ON bookings_archive TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON user_sessions FROM anon;
GRANT ALL ON user_sessions TO service_role;

-- ==================== سياسات RLS ====================

-- تفعيل RLS على جميع الجداول
ALTER TABLE salons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings_archive  ENABLE ROW LEVEL SECURITY;

-- ---- حذف سياسات قديمة قبل إنشاء الجديدة ----
DO $$
DECLARE pol text; tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['salons','customers','bookings','reviews','app_settings',
    'waiting_list','notifications','messages','admin_config','fcm_tokens',
    'push_subscriptions','notification_logs','admin_audit_log','admin_users',
    'disputes','salon_documents','support_tickets','customer_messages',
    'system_logs','rate_limits','app_config','user_sessions','customer_blacklist',
    'bookings_archive'])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ---- salons ----
CREATE POLICY "salons_public_select_approved" ON salons
  FOR SELECT TO anon USING (status = 'approved');

CREATE POLICY "salons_service_role_all" ON salons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- customers ----
CREATE POLICY "anyone_create_customer" ON customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_role_all_customers" ON customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- bookings ----
-- الكل يقرأ (لـ Realtime) — التصفية تتم بـ API level
CREATE POLICY "public_select_bookings_for_realtime" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "anyone_insert_booking" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_role_all_bookings" ON bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- reviews ----
CREATE POLICY "public_read_reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "service_role_all_reviews" ON reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- app_settings ----
CREATE POLICY "public_read_app_settings" ON app_settings
  FOR SELECT USING (true);

CREATE POLICY "service_role_all_app_settings" ON app_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- notifications ----
CREATE POLICY "public_read_notifications" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "service_role_all_notifications" ON notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- messages ----
CREATE POLICY "service_role_all_messages" ON messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- admin_config ----
CREATE POLICY "service_role_all_admin_config" ON admin_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- fcm_tokens ----
CREATE POLICY "fcm_anon_insert_only" ON fcm_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "fcm_anon_update_status_only" ON fcm_tokens
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "fcm_service_role_all" ON fcm_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- push_subscriptions ----
CREATE POLICY "service_role_only" ON push_subscriptions
  USING (false) WITH CHECK (false);

-- ---- notification_logs ----
CREATE POLICY "service_role_all_notif_logs" ON notification_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- customer_messages ----
CREATE POLICY "cm_select" ON customer_messages
  FOR SELECT TO anon USING (true);

CREATE POLICY "cm_insert_customer" ON customer_messages
  FOR INSERT TO anon WITH CHECK (from_customer = true);

-- ---- app_config ----
CREATE POLICY "no_direct_access" ON app_config FOR ALL USING (false);

-- ---- user_sessions ----
CREATE POLICY "service_role_all_sessions" ON user_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- customer_blacklist ----
CREATE POLICY "service_role_all_blacklist" ON customer_blacklist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- bookings_archive ----
CREATE POLICY "service_role_all_archive" ON bookings_archive
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- rate_limits ----
CREATE POLICY "service_role_all_rate_limits" ON rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---- waiting_list ----
CREATE POLICY "service_role_all_waiting_list" ON waiting_list
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==================== الدوال ====================

-- دالة: التحقق من التعارض في الحجوزات (Trigger)
CREATE OR REPLACE FUNCTION prevent_double_booking_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_new_dur INT;
  v_conflict INT;
BEGIN
  IF NEW.status IN ('cancelled', 'rejected') THEN RETURN NEW; END IF;
  IF NEW.barber_id IS NULL OR NEW.barber_id = 'any' THEN RETURN NEW; END IF;
  v_new_dur := COALESCE(NEW.slot_duration_minutes, 30);
  SELECT COUNT(*) INTO v_conflict
  FROM bookings
  WHERE id <> NEW.id
    AND salon_id = NEW.salon_id
    AND barber_id = NEW.barber_id
    AND date = NEW.date
    AND status NOT IN ('cancelled', 'rejected')
    AND (
      (NEW.time::time >= time::time AND NEW.time::time < (time::time + (COALESCE(slot_duration_minutes, 30) || ' minutes')::interval))
      OR
      (time::time >= NEW.time::time AND time::time < (NEW.time::time + (v_new_dur || ' minutes')::interval))
    );
  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'booking_overlap: barber % is already booked at % on %', NEW.barber_id, NEW.time, NEW.date;
  END IF;
  RETURN NEW;
END;
$$;

-- دالة: إعادة تعيين reminder_sent عند تغيير موعد الحجز
CREATE OR REPLACE FUNCTION public.reset_reminder_on_reschedule()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.date != NEW.date OR OLD.time != NEW.time THEN
    NEW.reminder_sent := false;
  END IF;
  RETURN NEW;
END;
$$;

-- دالة: تسجيل التغييرات الحساسة في audit_log (Trigger)
CREATE OR REPLACE FUNCTION audit_sensitive_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  action_label text;
  details_val  jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    action_label := TG_TABLE_NAME || '.delete';
    details_val  := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    action_label := TG_TABLE_NAME || '.update';
    details_val  := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO admin_audit_log (actor, action, target_type, target_id, details)
  VALUES (
    current_setting('app.current_actor', true)::text,
    action_label,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    details_val
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- دالة: إرسال تذكيرات المواعيد
CREATE OR REPLACE FUNCTION public.process_appointment_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec  RECORD;
  appt TIMESTAMPTZ;
  fire TIMESTAMPTZ;
  url  text;
  tok  text;
  snm  text;
BEGIN
  SELECT value INTO url FROM public.app_config WHERE key = 'supabase_url';
  SELECT value INTO tok FROM public.app_config WHERE key = 'cron_secret';
  IF url IS NULL OR url = '' OR tok IS NULL OR tok = '' THEN RETURN; END IF;
  url := url || '/functions/v1/send-fcm-notification';
  FOR rec IN
    SELECT id, customer_id, date, time, reminder_minutes, salon_id
    FROM public.bookings
    WHERE status = 'approved' AND reminder_sent = false
      AND customer_id IS NOT NULL AND reminder_minutes > 0
  LOOP
    BEGIN
      appt := (rec.date || ' ' || rec.time)::timestamp AT TIME ZONE 'Asia/Riyadh';
    EXCEPTION WHEN OTHERS THEN CONTINUE;
    END;
    fire := appt - make_interval(mins => rec.reminder_minutes);
    IF now() >= fire AND now() < fire + INTERVAL '2 minutes' THEN
      SELECT name INTO snm FROM public.salons WHERE id::text = rec.salon_id::text;
      UPDATE public.bookings SET reminder_sent = true WHERE id = rec.id;
      PERFORM net.http_post(
        url     := url,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',tok),
        body    := jsonb_build_object(
          'target_type','single',
          'user_id',rec.customer_id,
          'user_type','customer',
          'title','reminder',
          'body','appointment at '||snm||' in '||rec.reminder_minutes||' mins',
          'data',jsonb_build_object(
            'type','appointment_reminder',
            'salon_id',rec.salon_id::text,
            'booking_id',rec.id::text
          )
        )::text
      );
    END IF;
  END LOOP;
END;
$$;

-- دالة: تنظيف البيانات المؤقتة
CREATE OR REPLACE FUNCTION cleanup_temp_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_ts < (EXTRACT(EPOCH FROM NOW()) * 1000 / 60000)::BIGINT - 60;
END;
$$;

-- دالة: أرشفة الحجوزات القديمة
CREATE OR REPLACE FUNCTION archive_old_bookings()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  cutoff DATE := CURRENT_DATE - INTERVAL '6 months';
BEGIN
  INSERT INTO bookings_archive
  SELECT * FROM bookings
  WHERE date < cutoff AND status IN ('approved', 'cancelled', 'rejected')
  ON CONFLICT DO NOTHING;

  DELETE FROM bookings
  WHERE date < cutoff
    AND status IN ('approved', 'cancelled', 'rejected')
    AND id IN (SELECT id FROM bookings_archive);
END;
$$;

-- دالة: التحقق من وجود حجز معتمد عند التقييم
CREATE OR REPLACE FUNCTION public.customer_has_approved_booking(
  p_salon_id text, p_customer_id text, p_booking_date text
) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.salon_id::text = p_salon_id
      AND b.customer_id::text = p_customer_id
      AND b.date::text = p_booking_date
      AND b.status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.customer_has_approved_booking(text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_has_approved_booking(text,text,text) TO anon, authenticated;

-- دالة: Rate Limiting atomic increment
CREATE OR REPLACE FUNCTION rl_increment(
  p_ip text, p_endpoint text, p_window_ts bigint
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count int;
BEGIN
  INSERT INTO rate_limits (ip, endpoint, window_ts, count)
  VALUES (p_ip, p_endpoint, p_window_ts, 1)
  ON CONFLICT (ip, endpoint, window_ts)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

-- دالة: التحقق من القائمة السوداء
CREATE OR REPLACE FUNCTION is_blacklisted(p_phone text, p_email text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM customer_blacklist
    WHERE (p_phone <> '' AND phone = p_phone)
       OR (p_email <> '' AND email = p_email)
  );
$$;

GRANT EXECUTE ON FUNCTION is_blacklisted(text, text) TO anon;

-- ==================== Triggers ====================

-- trigger: منع الحجز المزدوج
DROP TRIGGER IF EXISTS trg_prevent_double_booking ON bookings;
CREATE TRIGGER trg_prevent_double_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_double_booking_fn();

-- trigger: إعادة تعيين reminder_sent عند تغيير الموعد
DROP TRIGGER IF EXISTS trg_reset_reminder ON bookings;
CREATE TRIGGER trg_reset_reminder
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_on_reschedule();

-- trigger: تسجيل تغييرات bookings في audit_log
DROP TRIGGER IF EXISTS trg_audit_bookings ON bookings;
CREATE TRIGGER trg_audit_bookings
  AFTER DELETE OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- trigger: تسجيل تغييرات salons في audit_log
DROP TRIGGER IF EXISTS trg_audit_salons ON salons;
CREATE TRIGGER trg_audit_salons
  AFTER DELETE OR UPDATE OF prices, total_paid ON salons
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- trigger: تسجيل حذف العملاء في audit_log
DROP TRIGGER IF EXISTS trg_audit_customers ON customers;
CREATE TRIGGER trg_audit_customers
  AFTER DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- ==================== View: Table Bloat ====================
CREATE OR REPLACE VIEW table_bloat_monitor AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename))       AS table_size,
  pg_size_pretty(
    pg_total_relation_size(schemaname||'.'||tablename) -
    pg_relation_size(schemaname||'.'||tablename)
  ) AS index_size,
  n_dead_tup,
  n_live_tup,
  CASE WHEN n_live_tup > 0
    THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 1)
    ELSE 0
  END AS dead_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==================== Cron Jobs ====================
-- ملاحظة: يتطلب تفعيل pg_cron من Dashboard → Database → Extensions

-- تذكيرات المواعيد (كل دقيقة)
SELECT cron.unschedule('appointment-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders');

SELECT cron.schedule(
  'appointment-reminders',
  '* * * * *',
  'SELECT public.process_appointment_reminders()'
);

-- تنظيف البيانات المؤقتة (كل ساعة)
SELECT cron.unschedule('cleanup-temp-data')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-temp-data');

SELECT cron.schedule(
  'cleanup-temp-data',
  '0 * * * *',
  $$ SELECT cleanup_temp_data(); $$
);

-- تنظيف سجلات الإشعارات يومياً
SELECT cron.unschedule('cleanup-notification-logs-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-notification-logs-daily');

SELECT cron.schedule(
  'cleanup-notification-logs-daily',
  '0 3 * * *',
  $$ DELETE FROM notification_logs WHERE created_at < NOW() - INTERVAL '30 days'; $$
);

-- أرشفة الحجوزات (أول كل شهر)
SELECT cron.unschedule('archive-bookings')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archive-bookings');

SELECT cron.schedule(
  'archive-bookings',
  '0 3 1 * *',
  'SELECT archive_old_bookings()'
);

-- VACUUM شهرياً
SELECT cron.unschedule('monthly-vacuum')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-vacuum');

SELECT cron.schedule(
  'monthly-vacuum',
  '0 2 1 * *',
  $$
    VACUUM ANALYZE bookings;
    VACUUM ANALYZE salons;
    VACUUM ANALYZE customers;
    VACUUM ANALYZE waiting_list;
    VACUUM ANALYZE notifications;
  $$
);

-- ==================== Realtime ====================
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE waiting_list;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE salons;
ALTER PUBLICATION supabase_realtime ADD TABLE fcm_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

-- =====================================================
-- انتهى السكريبت — تحقق من عدم وجود أخطاء أعلاه
-- =====================================================

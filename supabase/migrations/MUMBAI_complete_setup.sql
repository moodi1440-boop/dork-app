-- ================================================================
-- DORK-TEST (Mumbai) — Complete Schema Setup
-- شغّل هذا الملف كاملاً مرة واحدة في SQL Editor بمشروع Mumbai
-- كل جملة مكتوبة بـ IF NOT EXISTS — آمن للتشغيل أكثر من مرة
-- ================================================================

-- ================================================================
-- SECTION 1: جداول جديدة كاملة
-- ================================================================

-- جدول جلسات المستخدمين
CREATE TABLE IF NOT EXISTS user_sessions (
  id           BIGSERIAL PRIMARY KEY,
  user_type    TEXT NOT NULL CHECK (user_type IN ('customer', 'salon')),
  user_id      INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  expires_at   TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions(user_type, user_id);

-- جدول logs النظام
CREATE TABLE IF NOT EXISTS system_logs (
  id         bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  level      text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  source     text,
  message    text,
  details    jsonb
);
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- جدول اشتراكات Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_type  text        NOT NULL CHECK (user_type IN ('salon', 'customer')),
  user_id    integer     NOT NULL,
  endpoint   text        NOT NULL,
  p256dh     text        NOT NULL,
  auth_key   text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_type, user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- جدول تحديد المعدّل (Rate Limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
  ip         TEXT    NOT NULL,
  endpoint   TEXT    NOT NULL,
  window_ts  BIGINT  NOT NULL,
  count      INT     NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, endpoint, window_ts)
);

-- دالة atomic increment لـ rate limiting
CREATE OR REPLACE FUNCTION rl_increment(
  p_ip       TEXT,
  p_endpoint TEXT,
  p_window_ts BIGINT
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO rate_limits (ip, endpoint, window_ts, count)
  VALUES (p_ip, p_endpoint, p_window_ts, 1)
  ON CONFLICT (ip, endpoint, window_ts)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

-- جدول سجل إجراءات الإدارة
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  details     jsonb
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON admin_audit_log (action);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- جدول مستخدمي الإدارة (RBAC)
CREATE TABLE IF NOT EXISTS admin_users (
  id            bigserial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'editor', 'viewer')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- جدول رسائل العملاء
CREATE TABLE IF NOT EXISTS customer_messages (
  id            bigserial    PRIMARY KEY,
  salon_id      bigint       NOT NULL,
  customer_id   bigint       NOT NULL,
  booking_id    bigint,
  direction     text         NOT NULL CHECK (direction IN ('to_customer', 'to_salon')),
  body          text         NOT NULL,
  read_at       timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_messages_salon    ON customer_messages(salon_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer ON customer_messages(customer_id);
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

-- جدول نزاعات/استرجاع الأموال
CREATE TABLE IF NOT EXISTS disputes (
  id           bigserial PRIMARY KEY,
  booking_id   bigint,
  salon_id     bigint,
  customer_id  bigint,
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolution   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- جدول مستندات الصالون
CREATE TABLE IF NOT EXISTS salon_documents (
  id         bigserial PRIMARY KEY,
  salon_id   bigint NOT NULL,
  label      text NOT NULL,
  url        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE salon_documents ENABLE ROW LEVEL SECURITY;

-- جدول تذاكر الدعم
CREATE TABLE IF NOT EXISTS support_tickets (
  id          bigserial PRIMARY KEY,
  salon_id    bigint,
  subject     text NOT NULL,
  body        text NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  admin_reply text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- جدول أرشيف الحجوزات
CREATE TABLE IF NOT EXISTS bookings_archive (
  LIKE bookings INCLUDING ALL
);

-- جدول حظر العملاء الدائم
CREATE TABLE IF NOT EXISTS customer_blacklist (
  id         bigserial PRIMARY KEY,
  phone      text,
  email      text,
  reason     text NOT NULL DEFAULT 'banned_account_deleted',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_phone ON customer_blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_customer_blacklist_email ON customer_blacklist(email);
ALTER TABLE customer_blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_blacklist" ON customer_blacklist;
CREATE POLICY "service_role_all_blacklist" ON customer_blacklist
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- دالة فحص الحظر (تُستخدم في RLS أو من API)
CREATE OR REPLACE FUNCTION is_blacklisted(p_phone text, p_email text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM customer_blacklist
    WHERE (p_phone IS NOT NULL AND phone = p_phone)
       OR (p_email IS NOT NULL AND email = p_email)
  );
$$;

-- ================================================================
-- SECTION 2: أعمدة جديدة على الجداول الموجودة
-- ================================================================

-- salons: رقم سري لصاحب الصالون
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_hash         text;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_fails        integer NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS owner_pin_locked_until timestamptz;

-- salons: روابط التواصل الاجتماعي
ALTER TABLE salons ADD COLUMN IF NOT EXISTS social jsonb DEFAULT '{}'::jsonb;

-- salons: الاشتراك
ALTER TABLE salons ADD COLUMN IF NOT EXISTS subscription_end_date date;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS subscription_months   int DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_salons_subscription_end ON salons(subscription_end_date);

-- salons: ربط بـ Supabase Auth
ALTER TABLE salons ADD COLUMN IF NOT EXISTS auth_uid UUID REFERENCES auth.users(id);

-- bookings: تذكير المواعيد
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 60;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent    boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON bookings (reminder_sent, date)
  WHERE reminder_sent = false;

-- bookings: مفتاح idempotency لمنع الحجز المزدوج
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- customers: ربط بـ Supabase Auth
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_uid uuid;

-- ================================================================
-- SECTION 3: إعدادات admin_config
-- ================================================================
INSERT INTO admin_config (key, value) VALUES
  ('auto_approve_salons', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- SECTION 4: فهارس الأداء
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_salons_status     ON salons(status);
CREATE INDEX IF NOT EXISTS idx_salons_created_at ON salons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot     ON bookings(date, time);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);

-- ================================================================
-- SECTION 5: trigger التدقيق (audit_sensitive_change)
-- نسخة معدّلة تتجاهل NULL actor — آمنة للصوالين وللإدارة
-- ================================================================
CREATE OR REPLACE FUNCTION audit_sensitive_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  action_label text;
  details_val  jsonb;
  v_actor      text;
BEGIN
  v_actor := current_setting('app.current_actor', true);

  -- تجاهل التسجيل إذا لم يكن هناك actor (عملية API بدون سياق إداري)
  IF v_actor IS NULL OR v_actor = '' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

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
    v_actor,
    action_label,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    details_val
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ربط الـ trigger بجدول salons (للتغييرات الحساسة)
DROP TRIGGER IF EXISTS audit_salons_changes ON salons;
CREATE TRIGGER audit_salons_changes
  AFTER UPDATE OR DELETE ON salons
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- ربط الـ trigger بجدول bookings (للتغييرات الحساسة)
DROP TRIGGER IF EXISTS audit_bookings_changes ON bookings;
CREATE TRIGGER audit_bookings_changes
  AFTER UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- ================================================================
-- SECTION 6: دالة تذكير المواعيد
-- ================================================================
CREATE OR REPLACE FUNCTION public.process_appointment_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec  RECORD;
  appt TIMESTAMPTZ;
BEGIN
  FOR rec IN
    SELECT b.id, b.salon_id, b.customer_id, b.date, b.time, b.reminder_minutes,
           c.phone AS customer_phone
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE b.status = 'approved'
      AND b.reminder_sent = false
  LOOP
    appt := (rec.date || 'T' || rec.time)::timestamptz;
    CONTINUE WHEN appt <= now() OR appt > now() + make_interval(mins => rec.reminder_minutes);

    INSERT INTO system_logs (level, source, message, details)
    VALUES ('info', 'reminder', 'reminder_due', jsonb_build_object(
      'booking_id', rec.id,
      'salon_id', rec.salon_id,
      'customer_id', rec.customer_id,
      'appt_time', appt
    ));
    UPDATE bookings SET reminder_sent = true WHERE id = rec.id;
  END LOOP;
END;
$$;

-- ================================================================
-- SECTION 7: GRANT الأعمدة المفقودة لـ anon
-- ================================================================
GRANT SELECT (lang) ON salons TO anon;
GRANT SELECT (social) ON salons TO anon;
GRANT SELECT (subscription_end_date, subscription_months) ON salons TO anon;

-- تقييد: anon لا يستطيع تعديل حقول الأمان مباشرة
REVOKE UPDATE (blocked, loyalty_points, loyalty_frozen, admin_notes) ON customers FROM anon;
REVOKE DELETE ON customers FROM anon;

-- fcm_tokens: تقييد anon على عمودَي التحديث فقط
REVOKE UPDATE ON fcm_tokens FROM anon;
GRANT UPDATE (updated_at, is_active) ON fcm_tokens TO anon;

-- ================================================================
-- SECTION 8: تحقق نهائي — شغّل هذا بعد انتهاء كل شيء
-- ================================================================
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_audit_log') AS audit_log_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='rate_limits')     AS rate_limits_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='push_subscriptions') AS push_subs_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='salons'   AND column_name='owner_pin_hash')  AS pin_hash_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='salons'   AND column_name='social')          AS social_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='bookings' AND column_name='reminder_minutes') AS reminder_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='bookings' AND column_name='idempotency_key')  AS idempotency_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='customers' AND column_name='auth_uid')        AS customer_auth_uid_exists;
-- كل قيمة يجب أن تكون = 1 ✓

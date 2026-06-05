-- ─────────────────────────────────────────────────────────────────────────────
-- Appointment Reminders — server-side delivery via pg_cron + FCM Edge Function
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add reminder columns to bookings ─────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS reminder_sent    boolean NOT NULL DEFAULT false;

-- Partial index: only un-sent, approved bookings need to be scanned
CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON public.bookings (date, time)
  WHERE status = 'approved' AND reminder_sent = false;

-- 2. Auto-reset reminder when a booking is rescheduled (date/time changed) ────
CREATE OR REPLACE FUNCTION public.reset_reminder_on_reschedule()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.date <> NEW.date OR OLD.time <> NEW.time THEN
    NEW.reminder_sent := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_reminder ON public.bookings;
CREATE TRIGGER trg_reset_reminder
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_on_reschedule();

-- 3. Config table (avoids ALTER DATABASE which requires superuser) ─────────────
--    RLS blocks all direct access; only SECURITY DEFINER functions can read it.
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_direct_access" ON public.app_config;
CREATE POLICY "no_direct_access" ON public.app_config FOR ALL USING (false);

-- Seed with empty placeholders — update values in Step 2 of setup guide
INSERT INTO public.app_config (key, value) VALUES
  ('supabase_url',      ''),
  ('service_role_key',  '')
ON CONFLICT (key) DO NOTHING;

-- 4. Core cron function ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b              RECORD;
  appointment_ts TIMESTAMPTZ;
  reminder_ts    TIMESTAMPTZ;
  fn_url         text;
  svc_key        text;
BEGIN
  -- Read config from table (bypasses RLS via SECURITY DEFINER)
  SELECT value INTO fn_url  FROM public.app_config WHERE key = 'supabase_url';
  SELECT value INTO svc_key FROM public.app_config WHERE key = 'service_role_key';

  IF fn_url IS NULL OR fn_url = '' OR svc_key IS NULL OR svc_key = '' THEN
    RAISE WARNING 'process_appointment_reminders: app_config not set — skipping';
    RETURN;
  END IF;

  fn_url := fn_url || '/functions/v1/send-fcm-notification';

  FOR b IN
    SELECT
      bk.id,
      bk.customer_id,
      bk.date,
      bk.time,
      bk.reminder_minutes,
      s.name AS salon_name,
      s.id   AS salon_id
    FROM   public.bookings bk
    JOIN   public.salons   s ON s.id::text = bk.salon_id::text
    WHERE  bk.status           = 'approved'
    AND    bk.reminder_sent    = false
    AND    bk.customer_id      IS NOT NULL
    AND    bk.reminder_minutes > 0
  LOOP
    -- Parse "YYYY-MM-DD HH:MM" as Riyadh local time → UTC for comparison
    BEGIN
      appointment_ts := (b.date || ' ' || b.time)::timestamp AT TIME ZONE 'Asia/Riyadh';
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    reminder_ts := appointment_ts - make_interval(mins => b.reminder_minutes);

    -- 2-minute window absorbs minor cron delays; duplicates blocked by reminder_sent flag
    IF now() >= reminder_ts AND now() < reminder_ts + INTERVAL '2 minutes' THEN

      -- Mark sent FIRST to prevent duplicate fires
      UPDATE public.bookings SET reminder_sent = true WHERE id = b.id;

      PERFORM net.http_post(
        url     := fn_url,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body    := jsonb_build_object(
          'target_type', 'single',
          'user_id',     b.customer_id,
          'user_type',   'customer',
          'title',       '⏰ تذكير بموعدك',
          'body',        'لديك موعد في ' || b.salon_name || ' خلال '
                         || b.reminder_minutes || ' دقيقة — الساعة ' || b.time,
          'data',        jsonb_build_object(
            'type',       'appointment_reminder',
            'salon_id',   b.salon_id::text,
            'booking_id', b.id::text
          )
        )::text
      );

    END IF;
  END LOOP;
END;
$$;

-- 5. Schedule: fire every minute ──────────────────────────────────────────────
SELECT cron.unschedule('appointment-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders');

SELECT cron.schedule(
  'appointment-reminders',
  '* * * * *',
  'SELECT public.process_appointment_reminders()'
);

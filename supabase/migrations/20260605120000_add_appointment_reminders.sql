ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS reminder_sent    boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder
  ON public.bookings (date, time)
  WHERE status = 'approved' AND reminder_sent = false;

CREATE OR REPLACE FUNCTION public.reset_reminder_on_reschedule()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.date != NEW.date OR OLD.time != NEW.time THEN
    NEW.reminder_sent := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_reminder ON public.bookings;
CREATE TRIGGER trg_reset_reminder
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.reset_reminder_on_reschedule();

CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_direct_access" ON public.app_config;
CREATE POLICY "no_direct_access" ON public.app_config FOR ALL USING (false);

INSERT INTO public.app_config (key, value) VALUES
  ('supabase_url',  ''),
  ('cron_secret',   '')
ON CONFLICT (key) DO NOTHING;

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
  cron_secret    text;
BEGIN
  SELECT value INTO fn_url      FROM public.app_config WHERE key = 'supabase_url';
  SELECT value INTO cron_secret FROM public.app_config WHERE key = 'cron_secret';

  IF fn_url IS NULL OR fn_url = '' OR cron_secret IS NULL OR cron_secret = '' THEN
    RAISE WARNING 'process_appointment_reminders: app_config not set';
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
    BEGIN
      appointment_ts := (b.date || ' ' || b.time)::timestamp AT TIME ZONE 'Asia/Riyadh';
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    reminder_ts := appointment_ts - make_interval(mins => b.reminder_minutes);

    IF now() >= reminder_ts AND now() < reminder_ts + INTERVAL '2 minutes' THEN

      UPDATE public.bookings SET reminder_sent = true WHERE id = b.id;

      PERFORM net.http_post(
        url     := fn_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-token', cron_secret
        ),
        body    := jsonb_build_object(
          'target_type', 'single',
          'user_id',     b.customer_id,
          'user_type',   'customer',
          'title',       'reminder',
          'body',        'appointment in ' || b.salon_name || ' in ' || b.reminder_minutes || ' mins at ' || b.time,
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

SELECT cron.unschedule('appointment-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders');

SELECT cron.schedule(
  'appointment-reminders',
  '* * * * *',
  'SELECT public.process_appointment_reminders()'
);

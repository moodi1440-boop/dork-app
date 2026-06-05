CREATE OR REPLACE FUNCTION public.process_appointment_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
  appt TIMESTAMPTZ;
  fire TIMESTAMPTZ;
  url text;
  tok text;
  snm text;
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
        url := url,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',tok),
        body := jsonb_build_object(
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

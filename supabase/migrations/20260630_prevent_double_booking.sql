-- نقطة 76: منع الحجز المزدوج على مستوى قاعدة البيانات

-- 1. Idempotency Key — يمنع إرسال نفس الحجز مرتين من نفس الجهاز
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency
  ON bookings(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. دالة تتحقق من تعارض الحجوزات قبل الإدراج
-- المنطق: نفس الحلاق + نفس الصالون + تداخل في الوقت = ممنوع
-- الاستثناء: barber_id = 'any' يتجاهل الفحص (يُدار من طرف الكود)
CREATE OR REPLACE FUNCTION prevent_double_booking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_slot_min INT;
  v_new_dur  INT;
  v_conflict INT;
BEGIN
  -- تجاهل الحجوزات الملغاة أو المرفوضة
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- تجاهل حالة "أي حلاق" — الكود يتحقق منها
  IF NEW.barber_id IS NULL OR NEW.barber_id = 'any' THEN
    RETURN NEW;
  END IF;

  -- مدة الحجز الجديد (من العمود أو افتراضي 30 دقيقة)
  v_new_dur := COALESCE(NEW.slot_duration_minutes, 30);

  -- التحقق من وجود تعارض: نفس الحلاق + نفس اليوم + تداخل في الوقت
  SELECT COUNT(*) INTO v_conflict
  FROM bookings
  WHERE id         <> NEW.id
    AND salon_id    = NEW.salon_id
    AND barber_id   = NEW.barber_id
    AND date        = NEW.date
    AND status NOT IN ('cancelled', 'rejected')
    AND (
      -- الحجز الجديد يبدأ داخل حجز موجود
      (NEW.time::time >= time::time
        AND NEW.time::time < (time::time + (COALESCE(slot_duration_minutes, 30) || ' minutes')::interval))
      OR
      -- الحجز الجديد يغطي حجزاً موجوداً
      (time::time >= NEW.time::time
        AND time::time < (NEW.time::time + (v_new_dur || ' minutes')::interval))
    );

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'booking_overlap: barber % is already booked at % on %',
      NEW.barber_id, NEW.time, NEW.date;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. ربط الدالة بجدول bookings
DROP TRIGGER IF EXISTS trg_prevent_double_booking ON bookings;
CREATE TRIGGER trg_prevent_double_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_double_booking();

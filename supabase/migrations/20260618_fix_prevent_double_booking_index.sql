-- القيد الحالي يستثني فقط status='rejected'، فيبقى يعتبر الحجوزات الملغاة (cancelled) "نشطة"
-- ويرفض حجز جديد بنفس الوقت بعد إلغاء حجز سابق في نفس الموعد
DROP INDEX IF EXISTS prevent_double_booking;

CREATE UNIQUE INDEX prevent_double_booking
ON bookings (salon_id, barber_id, date, time)
WHERE status NOT IN ('rejected', 'cancelled');

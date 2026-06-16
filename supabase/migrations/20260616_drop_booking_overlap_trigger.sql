-- حذف trigger التعارض — يتم التحقق من التعارض على مستوى الـ frontend
-- الـ trigger كان يمنع صاحب الصالون من قبول قائمة الانتظار
DROP TRIGGER IF EXISTS prevent_booking_overlap ON bookings;
DROP FUNCTION IF EXISTS check_booking_overlap() CASCADE;

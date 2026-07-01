-- نقطة 8: هيكلة أعمدة Supabase باحترافية
-- إضافة CHECK constraints على أعمدة enum لمنع القيم غير المعروفة
-- يُستخدم NOT VALID لتجنب فحص البيانات الموجودة (التحقق يبدأ من الصفوف الجديدة فقط)

-- salons.status
ALTER TABLE salons
  ADD CONSTRAINT chk_salons_status
  CHECK (status IN ('pending','approved','rejected'))
  NOT VALID;

-- bookings.status
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_status
  CHECK (status IN ('pending','approved','rejected','cancelled'))
  NOT VALID;

-- bookings.attendance
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_attendance
  CHECK (attendance IS NULL OR attendance IN ('attended','no_show'))
  NOT VALID;

-- waiting_list.status
ALTER TABLE waiting_list
  ADD CONSTRAINT chk_waiting_list_status
  CHECK (status IN ('waiting','accepted'))
  NOT VALID;

-- توثيق الأعمدة الرئيسية
COMMENT ON COLUMN salons.status IS 'pending | approved | rejected';
COMMENT ON COLUMN salons.paused IS 'true = الصالون أوقف الحجوزات مؤقتاً';
COMMENT ON COLUMN salons.frozen IS 'true = مجمّد من الإدارة (يُخفى من القائمة)';
COMMENT ON COLUMN salons.banned IS 'true = محظور نهائياً';
COMMENT ON COLUMN salons.owner_pin_hash IS 'SHA-256 hash of (salonId + ":" + pin)';
COMMENT ON COLUMN salons.auth_uid IS 'Supabase Auth user UUID للصالون (لتسجيل الدخول بـ OTP)';

COMMENT ON COLUMN bookings.status IS 'pending | approved | rejected | cancelled';
COMMENT ON COLUMN bookings.attendance IS 'NULL | attended | no_show';
COMMENT ON COLUMN bookings.idempotency_key IS 'UUID فريد لمنع الحجز المزدوج عند إعادة المحاولة';

COMMENT ON COLUMN waiting_list.status IS 'waiting | accepted';

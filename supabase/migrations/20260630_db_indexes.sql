-- نقطة 81: Database Indexes على الأعمدة الأكثر استعلاماً

-- salons: البحث بالحالة والترتيب بالتاريخ
CREATE INDEX IF NOT EXISTS idx_salons_status ON salons(status);
CREATE INDEX IF NOT EXISTS idx_salons_created_at ON salons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_salons_phone ON salons(phone);
CREATE INDEX IF NOT EXISTS idx_salons_owner_phone ON salons(owner_phone);

-- bookings: الأكثر استعلاماً — salon_id + date + status معاً
CREATE INDEX IF NOT EXISTS idx_bookings_salon_id ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON bookings(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_salon_status_date ON bookings(salon_id, status, date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- customer_messages: salon_id + customer_id معاً في كل استعلام تقريباً
CREATE INDEX IF NOT EXISTS idx_customer_messages_salon_id ON customer_messages(salon_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_id ON customer_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_salon_customer ON customer_messages(salon_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_booking_id ON customer_messages(booking_id);

-- reviews: البحث دائماً بـ salon_id
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON reviews(salon_id);

-- waiting_list: salon_id + slot_date + status
CREATE INDEX IF NOT EXISTS idx_waiting_list_salon_date ON waiting_list(salon_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_waiting_list_salon_status ON waiting_list(salon_id, status);

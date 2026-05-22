-- =====================================================
-- Fix RLS Policies for Public Read Access
-- Run this in your Supabase SQL Editor to enable public data fetching
-- =====================================================

-- Enable RLS on salons table and allow public read
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read" ON salons;
CREATE POLICY "anon_read" ON salons FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_role_all" ON salons;
CREATE POLICY "service_role_all" ON salons FOR ALL TO service_role USING (true);

-- Enable RLS on bookings table and allow public read
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read" ON bookings;
CREATE POLICY "anon_read" ON bookings FOR SELECT USING (true);
DROP POLICY IF EXISTS "anon_insert" ON bookings;
CREATE POLICY "anon_insert" ON bookings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update" ON bookings;
CREATE POLICY "anon_update" ON bookings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "service_role_all" ON bookings;
CREATE POLICY "service_role_all" ON bookings FOR ALL TO service_role USING (true);

-- Enable RLS on customers table and allow public read
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read" ON customers;
CREATE POLICY "anon_read" ON customers FOR SELECT USING (true);
DROP POLICY IF EXISTS "anon_insert" ON customers;
CREATE POLICY "anon_insert" ON customers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update" ON customers;
CREATE POLICY "anon_update" ON customers FOR UPDATE USING (true);
DROP POLICY IF EXISTS "service_role_all" ON customers;
CREATE POLICY "service_role_all" ON customers FOR ALL TO service_role USING (true);

-- Enable RLS on reviews table and allow public read
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read" ON reviews;
CREATE POLICY "anon_read" ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "anon_insert" ON reviews;
CREATE POLICY "anon_insert" ON reviews FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update" ON reviews;
CREATE POLICY "anon_update" ON reviews FOR UPDATE USING (true);
DROP POLICY IF EXISTS "service_role_all" ON reviews;
CREATE POLICY "service_role_all" ON reviews FOR ALL TO service_role USING (true);

-- Enable RLS on app_settings and allow public read
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read" ON app_settings;
CREATE POLICY "anon_read" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "anon_insert" ON app_settings;
CREATE POLICY "anon_insert" ON app_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update" ON app_settings;
CREATE POLICY "anon_update" ON app_settings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "service_role_all" ON app_settings;
CREATE POLICY "service_role_all" ON app_settings FOR ALL TO service_role USING (true);

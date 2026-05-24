-- =====================================================
-- Secure RLS Policies with Proper Access Control
-- Run this in your Supabase SQL Editor
-- =====================================================

-- ==================== BOOKINGS TABLE ====================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop old insecure policies
DROP POLICY IF EXISTS "anon_read" ON bookings;
DROP POLICY IF EXISTS "anon_insert" ON bookings;
DROP POLICY IF EXISTS "anon_update" ON bookings;
DROP POLICY IF EXISTS "service_role_all" ON bookings;

-- 1. SELECT: Customer sees only their own bookings
CREATE POLICY "customer_select_own" ON bookings
  FOR SELECT
  USING (customer_id = (SELECT id FROM customers WHERE phone = current_setting('app.current_customer_id', true))::integer);

-- 2. SELECT: Salon owner sees only their salon's bookings
CREATE POLICY "salon_select_own" ON bookings
  FOR SELECT
  USING (salon_id = (SELECT id FROM salons WHERE owner_phone = current_setting('app.current_user_phone', true))::integer);

-- 3. SELECT: Service role (backend/admin) sees all
CREATE POLICY "service_role_select_all" ON bookings
  FOR SELECT
  TO service_role
  USING (true);

-- 4. INSERT: Anyone can create a booking
CREATE POLICY "anyone_insert" ON bookings
  FOR INSERT
  WITH CHECK (true);

-- 5. UPDATE: Only the salon owner can update their bookings
CREATE POLICY "salon_update_own" ON bookings
  FOR UPDATE
  USING (salon_id = (SELECT id FROM salons WHERE owner_phone = current_setting('app.current_user_phone', true))::integer);

-- 6. UPDATE: Service role can update anything
CREATE POLICY "service_role_update_all" ON bookings
  FOR UPDATE
  TO service_role
  USING (true);

-- ==================== CUSTOMERS TABLE ====================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON customers;
DROP POLICY IF EXISTS "anon_insert" ON customers;
DROP POLICY IF EXISTS "anon_update" ON customers;
DROP POLICY IF EXISTS "service_role_all" ON customers;

-- 1. SELECT: Customer sees only their own profile
CREATE POLICY "customer_select_own" ON customers
  FOR SELECT
  USING (id = (SELECT id FROM customers WHERE phone = current_setting('app.current_customer_id', true))::integer);

-- 2. SELECT: Service role sees all
CREATE POLICY "service_role_select_all" ON customers
  FOR SELECT
  TO service_role
  USING (true);

-- 3. INSERT: Anyone can register
CREATE POLICY "anyone_insert" ON customers
  FOR INSERT
  WITH CHECK (true);

-- 4. UPDATE: Customer can only update themselves
CREATE POLICY "customer_update_own" ON customers
  FOR UPDATE
  USING (id = (SELECT id FROM customers WHERE phone = current_setting('app.current_customer_id', true))::integer);

-- 5. UPDATE: Service role can update anything
CREATE POLICY "service_role_update_all" ON customers
  FOR UPDATE
  TO service_role
  USING (true);

-- ==================== SALONS TABLE ====================
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON salons;
DROP POLICY IF EXISTS "service_role_all" ON salons;

-- 1. SELECT: Everyone can read salons (public data)
CREATE POLICY "public_read" ON salons
  FOR SELECT
  USING (true);

-- 2. UPDATE: Only owner can update their salon
CREATE POLICY "owner_update_own" ON salons
  FOR UPDATE
  USING (owner_phone = current_setting('app.current_user_phone', true));

-- 3. UPDATE: Service role can update anything
CREATE POLICY "service_role_update_all" ON salons
  FOR UPDATE
  TO service_role
  USING (true);

-- 4. INSERT: Service role only (admin registration)
CREATE POLICY "service_role_insert" ON salons
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ==================== REVIEWS TABLE ====================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON reviews;
DROP POLICY IF EXISTS "anon_insert" ON reviews;
DROP POLICY IF EXISTS "anon_update" ON reviews;
DROP POLICY IF EXISTS "service_role_all" ON reviews;

-- 1. SELECT: Everyone can read reviews (public)
CREATE POLICY "public_read" ON reviews
  FOR SELECT
  USING (true);

-- 2. INSERT: Anyone can leave a review
CREATE POLICY "anyone_insert" ON reviews
  FOR INSERT
  WITH CHECK (true);

-- 3. UPDATE: Only reviewer or salon owner can update
CREATE POLICY "reviewer_update_own" ON reviews
  FOR UPDATE
  USING (customer_id = (SELECT id FROM customers WHERE phone = current_setting('app.current_customer_id', true))::integer
    OR salon_id IN (SELECT id FROM salons WHERE owner_phone = current_setting('app.current_user_phone', true)));

-- 4. UPDATE: Service role can update anything
CREATE POLICY "service_role_update_all" ON reviews
  FOR UPDATE
  TO service_role
  USING (true);

-- ==================== NOTIFICATIONS TABLE ====================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON notifications;
DROP POLICY IF EXISTS "anon_insert" ON notifications;
DROP POLICY IF EXISTS "anon_update" ON notifications;
DROP POLICY IF EXISTS "service_role_all" ON notifications;

-- 1. SELECT: Can only see notifications meant for them
CREATE POLICY "target_select_own" ON notifications
  FOR SELECT
  USING (
    target_type = 'all'
    OR (target_type = 'customer' AND target_id = (SELECT id FROM customers WHERE phone = current_setting('app.current_customer_id', true))::integer)
    OR (target_type = 'salon' AND target_id IN (SELECT id FROM salons WHERE owner_phone = current_setting('app.current_user_phone', true)))
  );

-- 2. INSERT: Service role only
CREATE POLICY "service_role_insert" ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. UPDATE: Service role only
CREATE POLICY "service_role_update" ON notifications
  FOR UPDATE
  TO service_role
  USING (true);

-- ==================== APP_SETTINGS TABLE ====================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON app_settings;
DROP POLICY IF EXISTS "anon_insert" ON app_settings;
DROP POLICY IF EXISTS "anon_update" ON app_settings;
DROP POLICY IF EXISTS "service_role_all" ON app_settings;

-- 1. SELECT: Everyone can read settings
CREATE POLICY "public_read" ON app_settings
  FOR SELECT
  USING (true);

-- 2. UPDATE: Service role only
CREATE POLICY "service_role_update" ON app_settings
  FOR UPDATE
  TO service_role
  USING (true);

-- 3. INSERT: Service role only
CREATE POLICY "service_role_insert" ON app_settings
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ==================== FCM_TOKENS TABLE ====================
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert" ON fcm_tokens;
DROP POLICY IF EXISTS "anyone_select" ON fcm_tokens;

-- 1. INSERT: Anyone can register their token
CREATE POLICY "anyone_register_token" ON fcm_tokens
  FOR INSERT
  WITH CHECK (true);

-- 2. SELECT: Service role only (for sending notifications)
CREATE POLICY "service_role_select" ON fcm_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- 3. UPDATE: Service role only
CREATE POLICY "service_role_update" ON fcm_tokens
  FOR UPDATE
  TO service_role
  USING (true);

-- =====================================================
-- NOTE: Set these values before each request:
-- SELECT set_config('app.current_customer_id', '123', false);
-- SELECT set_config('app.current_user_phone', '0501234567', false);
-- =====================================================

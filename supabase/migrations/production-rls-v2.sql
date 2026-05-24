-- =====================================================
-- PRODUCTION-READY RLS Policies
-- Architecture: Integer-based Customer/Salon IDs with Secure Access
-- =====================================================

-- ==================== AUTHENTICATION TABLE ====================
-- Create a mapping table to link customers with their sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'salon')),
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_type, user_id);

-- ==================== BOOKINGS TABLE - SECURE RLS ====================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop all existing insecure policies
DROP POLICY IF EXISTS "customer_sees_own" ON bookings;
DROP POLICY IF EXISTS "anon_read" ON bookings;
DROP POLICY IF EXISTS "anon_insert" ON bookings;
DROP POLICY IF EXISTS "anon_update" ON bookings;
DROP POLICY IF EXISTS "service_role_all" ON bookings;
DROP POLICY IF EXISTS "customer_select_own" ON bookings;
DROP POLICY IF EXISTS "salon_select_own" ON bookings;

-- POLICY 1: Customers see only their own bookings
CREATE POLICY "customer_read_own_bookings" ON bookings
  FOR SELECT
  USING (
    customer_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'customer'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 2: Salon owners see only their salon's bookings
CREATE POLICY "salon_read_own_bookings" ON bookings
  FOR SELECT
  USING (
    salon_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'salon'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 3: Anyone can INSERT a booking (anonymous)
CREATE POLICY "anyone_insert_booking" ON bookings
  FOR INSERT
  WITH CHECK (true);

-- POLICY 4: Only salon owners can UPDATE their bookings
CREATE POLICY "salon_update_own_bookings" ON bookings
  FOR UPDATE
  USING (
    salon_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'salon'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 5: Service role (backend) can do everything
CREATE POLICY "service_role_all_bookings" ON bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== CUSTOMERS TABLE - SECURE RLS ====================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON customers;
DROP POLICY IF EXISTS "anon_insert" ON customers;
DROP POLICY IF EXISTS "anon_update" ON customers;
DROP POLICY IF EXISTS "customer_read_own" ON customers;
DROP POLICY IF EXISTS "customer_update_own" ON customers;

-- POLICY 1: Customers read only themselves
CREATE POLICY "customer_read_own_profile" ON customers
  FOR SELECT
  USING (
    id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'customer'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 2: Anyone can register
CREATE POLICY "anyone_create_customer" ON customers
  FOR INSERT
  WITH CHECK (true);

-- POLICY 3: Customers update only themselves
CREATE POLICY "customer_update_own_profile" ON customers
  FOR UPDATE
  USING (
    id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'customer'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 4: Service role full access
CREATE POLICY "service_role_all_customers" ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== SALONS TABLE - SECURE RLS ====================
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON salons;
DROP POLICY IF EXISTS "service_role_all" ON salons;

-- POLICY 1: Everyone can READ salons (public data)
CREATE POLICY "public_read_salons" ON salons
  FOR SELECT
  USING (status = 'approved');

-- POLICY 2: Salon owners update only their own
CREATE POLICY "salon_update_own_data" ON salons
  FOR UPDATE
  USING (
    id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'salon'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 3: Service role full access
CREATE POLICY "service_role_all_salons" ON salons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== NOTIFICATIONS TABLE - SECURE RLS ====================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON notifications;
DROP POLICY IF EXISTS "anon_insert" ON notifications;
DROP POLICY IF EXISTS "anon_update" ON notifications;

-- POLICY 1: Users see notifications meant for them
CREATE POLICY "user_read_own_notifications" ON notifications
  FOR SELECT
  USING (
    target_type = 'all'
    OR (target_type = 'customer' AND target_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'customer'
      AND expires_at > NOW()
      LIMIT 1
    ))
    OR (target_type = 'salon' AND target_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'salon'
      AND expires_at > NOW()
      LIMIT 1
    ))
  );

-- POLICY 2: Service role only for inserts
CREATE POLICY "service_role_insert_notifications" ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- POLICY 3: Service role only for updates
CREATE POLICY "service_role_update_notifications" ON notifications
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== REVIEWS TABLE - SECURE RLS ====================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read" ON reviews;
DROP POLICY IF EXISTS "anon_insert" ON reviews;
DROP POLICY IF EXISTS "anon_update" ON reviews;

-- POLICY 1: Everyone can READ reviews (public)
CREATE POLICY "public_read_reviews" ON reviews
  FOR SELECT
  USING (true);

-- POLICY 2: Anyone can INSERT reviews
CREATE POLICY "anyone_insert_review" ON reviews
  FOR INSERT
  WITH CHECK (true);

-- POLICY 3: Only reviewer or salon owner can UPDATE
CREATE POLICY "reviewer_update_own_review" ON reviews
  FOR UPDATE
  USING (
    customer_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'customer'
      AND expires_at > NOW()
      LIMIT 1
    )
    OR salon_id = (
      SELECT user_id FROM user_sessions
      WHERE session_token = current_setting('app.session_token', true)
      AND user_type = 'salon'
      AND expires_at > NOW()
      LIMIT 1
    )
  );

-- POLICY 4: Service role full access
CREATE POLICY "service_role_all_reviews" ON reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== FCM_TOKENS TABLE - SECURE RLS ====================
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert" ON fcm_tokens;
DROP POLICY IF EXISTS "anyone_select" ON fcm_tokens;

-- POLICY 1: Anyone can register their token
CREATE POLICY "anyone_register_fcm_token" ON fcm_tokens
  FOR INSERT
  WITH CHECK (true);

-- POLICY 2: Service role only (for sending notifications)
CREATE POLICY "service_role_read_tokens" ON fcm_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- POLICY 3: Service role update
CREATE POLICY "service_role_update_tokens" ON fcm_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- USAGE IN APPLICATION:
-- =====================================================
-- When customer logs in:
-- 1. Create session: INSERT INTO user_sessions (user_type, user_id, session_token)
-- 2. Store token in localStorage
-- 3. On each API call, set: SELECT set_config('app.session_token', token, false);
--
-- Example:
-- SELECT set_config('app.session_token', 'abc123def456...', false);
-- SELECT * FROM bookings;  -- ← Only shows customer's bookings
-- =====================================================

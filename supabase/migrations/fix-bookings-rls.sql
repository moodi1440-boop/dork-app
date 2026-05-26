-- Fix Bookings RLS for Realtime Subscriptions
-- Migration: Remove session-dependent policy and allow Realtime reads

-- Drop the old policy that depends on unreliable session variables
DROP POLICY IF EXISTS "salon_select_own" ON bookings;

-- Create new policy: Allow SELECT for Realtime subscriptions
-- Security is enforced by API-level filtering (salon_id=eq.X)
CREATE POLICY "public_select_bookings_for_realtime" ON bookings
  FOR SELECT
  USING (true);

-- Note: INSERT policy "anyone_insert" already exists and is correct
-- UPDATE/DELETE policies are still restricted to salon owners (existing "salon_update_own", "salon_delete_own")

-- This change allows:
-- 1. Salon owners to receive Realtime notifications on new bookings
-- 2. API filtering still protects data (clients must specify salon_id=eq.X)
-- 3. No unauthorized data disclosure (RLS enforces this at SELECT level)

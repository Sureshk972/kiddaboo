-- Migration 011: Admin role system with database-level security
-- Run this in the Supabase SQL Editor for project pdgtryghvibhmmroqvdk

-- ============================================
-- 1. Add role column to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Set the existing admin user
UPDATE profiles SET role = 'admin'
  WHERE id = '7fdf9710-231d-40c8-bea5-6a139709c07c';

-- ============================================
-- 2. Create is_admin() helper function
--    SECURITY DEFINER bypasses RLS to avoid
--    circular dependency on profiles table
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 3. Prevent non-admins from escalating roles
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================
-- 4. Admin RLS policies — full access for admins
-- ============================================

-- PROFILES: admin can update any profile (e.g., suspend users, change roles)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- PLAYGROUPS: admin can update any playgroup (e.g., toggle active, flag)
CREATE POLICY "Admins can update any playgroup"
  ON playgroups FOR UPDATE
  USING (public.is_admin());

-- MEMBERSHIPS: admin can delete memberships (e.g., during user suspension)
CREATE POLICY "Admins can delete any membership"
  ON memberships FOR DELETE
  USING (public.is_admin());

-- MEMBERSHIPS: admin can update memberships
CREATE POLICY "Admins can update any membership"
  ON memberships FOR UPDATE
  USING (public.is_admin());

-- REPORTS: admin can view all reports (not just own)
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  USING (public.is_admin());

-- REPORTS: admin can update report status
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING (public.is_admin());

-- REVIEWS: admin can delete any review
CREATE POLICY "Admins can delete any review"
  ON reviews FOR DELETE
  USING (public.is_admin());

-- SUBSCRIPTIONS: admin can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (public.is_admin());

-- PLAYGROUP_VIEWS: admin can view all analytics
CREATE POLICY "Admins can view all playgroup views"
  ON playgroup_views FOR SELECT
  USING (public.is_admin());

-- BLOCKS: admin can view all blocks
CREATE POLICY "Admins can view all blocks"
  ON blocks FOR SELECT
  USING (public.is_admin());

-- MESSAGES: admin can read all messages (moderation)
CREATE POLICY "Admins can read all messages"
  ON messages FOR SELECT
  USING (public.is_admin());

-- SESSIONS: admin can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  USING (public.is_admin());

-- PUSH_SUBSCRIPTIONS: admin can view all (for debugging)
CREATE POLICY "Admins can view all push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (public.is_admin());

-- JOIN_REQUEST_USAGE: admin can view all usage
CREATE POLICY "Admins can view all join request usage"
  ON join_request_usage FOR SELECT
  USING (public.is_admin());

-- ============================================
-- 5. Index for fast is_admin() lookups
-- ============================================
CREATE INDEX idx_profiles_role ON profiles(id, role);

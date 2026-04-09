-- 015_regression_fixes.sql
-- Regression fix migration: patches missing RLS policies, indexes, and
-- columns discovered after the initial rollout.

-- 1. Allow users to leave groups by deleting their own membership row.
CREATE POLICY "Users can leave groups"
  ON memberships FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Allow playgroup creators to remove members from their groups.
CREATE POLICY "Creators can remove members"
  ON memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.playgroup_id = memberships.playgroup_id
        AND m.user_id = auth.uid()
        AND m.role = 'creator'
    )
  );

-- 3. Index on memberships(role) to speed up RLS policy lookups.
CREATE INDEX idx_memberships_role ON memberships(role);

-- 4. Index on reports(created_at DESC) for admin dashboard queries.
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- 5. admin_audit_log.admin_id FK behaviour (RESTRICT) is intentionally kept:
--    audit logs must persist even after an admin account is deleted, so
--    ON DELETE SET NULL was considered but the current RESTRICT is correct.

-- 6. Track notification_prefs column that was added directly in Supabase.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}';

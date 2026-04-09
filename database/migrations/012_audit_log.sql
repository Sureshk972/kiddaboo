-- Migration 012: Admin audit log
-- Tracks all admin actions for accountability and debugging

CREATE TABLE admin_audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,        -- e.g., 'suspend_user', 'delete_review', 'update_report'
  target_type TEXT NOT NULL,        -- e.g., 'profile', 'review', 'report', 'playgroup'
  target_id   UUID NOT NULL,
  details     JSONB DEFAULT '{}',   -- before/after state, notes, reason
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON admin_audit_log FOR SELECT
  USING (public.is_admin());

-- Only admins can insert audit entries (must be their own admin_id)
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_log FOR INSERT
  WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

-- 016_grant_permissions.sql
-- Ensure authenticated role has proper table-level grants on all tables.
-- These may have been lost during ALTER TABLE operations in prior migrations.

GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON children TO authenticated;
GRANT SELECT, INSERT, UPDATE ON playgroups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO authenticated;
GRANT SELECT, INSERT ON reviews TO authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT, INSERT ON sessions TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocks TO authenticated;
GRANT SELECT, INSERT ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON join_request_usage TO authenticated;
GRANT SELECT ON playgroup_views TO authenticated;
GRANT SELECT, INSERT ON admin_audit_log TO authenticated;

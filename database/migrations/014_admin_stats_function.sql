-- Migration 014: Admin stats RPC function
-- Single query to fetch all platform statistics (replaces 7+ separate queries)

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'suspended_users', (SELECT count(*) FROM profiles WHERE is_suspended),
    'total_playgroups', (SELECT count(*) FROM playgroups WHERE is_active),
    'flagged_playgroups', (SELECT count(*) FROM playgroups WHERE is_flagged),
    'total_memberships', (SELECT count(*) FROM memberships WHERE role = 'member'),
    'pending_requests', (SELECT count(*) FROM memberships WHERE role = 'pending'),
    'total_reports', (SELECT count(*) FROM reports),
    'open_reports', (SELECT count(*) FROM reports WHERE status = 'pending'),
    'total_reviews', (SELECT count(*) FROM reviews),
    'total_blocks', (SELECT count(*) FROM blocks),
    'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active'),
    'mrr_cents', (SELECT coalesce(sum(
      CASE
        WHEN plan IN ('monthly', 'host_monthly') THEN price_cents
        WHEN plan IN ('annual', 'host_annual') THEN price_cents / 12
      END
    ), 0) FROM subscriptions WHERE status = 'active'),
    'users_by_month', (
      SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb) FROM (
        SELECT to_char(created_at, 'YYYY-MM') AS month, count(*)::int AS count
        FROM profiles GROUP BY 1 ORDER BY 1
      ) t
    ),
    'playgroups_by_month', (
      SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb) FROM (
        SELECT to_char(created_at, 'YYYY-MM') AS month, count(*)::int AS count
        FROM playgroups GROUP BY 1 ORDER BY 1
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

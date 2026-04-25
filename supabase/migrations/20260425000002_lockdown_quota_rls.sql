-- Lock down RLS so the free-tier join quota can't be bypassed.
--
-- Before this migration:
--   * memberships had a public INSERT policy keyed on auth.uid() = user_id,
--     so any authenticated user could open devtools and insert a membership
--     row directly, bypassing submit-join-request and its quota check.
--   * join_request_usage had INSERT and UPDATE policies on auth.uid() = user_id,
--     so a user could reset their own request_count back to 0.
--
-- After: both tables are written exclusively by service-role code paths
-- (submit-join-request and the host-side approve/decline flows on
-- memberships, which run through their own edge functions or the
-- creator-update policy). RLS still permits SELECT for the user's own
-- data on join_request_usage.
--
-- Also adds claim_join_request_quota() — an atomic
-- INSERT … ON CONFLICT … RETURNING that closes the read-modify-write
-- TOCTOU race in submit-join-request. Concurrent requests from the
-- same free user can no longer both pass the "used=0" check.

-- 1. Drop client INSERT on memberships. submit-join-request runs as
--    service role and bypasses RLS; that's the only legitimate path
--    for creating a membership row from the parent side.
DROP POLICY IF EXISTS "Users can request to join" ON memberships;

-- 2. Drop client INSERT/UPDATE on join_request_usage. Only the edge
--    function (service role) writes here.
DROP POLICY IF EXISTS "Users can upsert own usage" ON join_request_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON join_request_usage;

-- 3. Atomic claim. Returns the new count if the user is still under
--    the limit, NULL if they've hit it. Single statement, single
--    row lock — two concurrent calls cannot both succeed past the cap.
CREATE OR REPLACE FUNCTION claim_join_request_quota(
  p_user_id uuid,
  p_month text,
  p_limit integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO join_request_usage (user_id, month, request_count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month) DO UPDATE
    SET request_count = join_request_usage.request_count + 1
    WHERE join_request_usage.request_count < p_limit
  RETURNING request_count INTO new_count;

  RETURN new_count;
END;
$$;

-- Service role + authenticated callers only. The edge function uses
-- service role; lock down the function from anon entirely.
REVOKE ALL ON FUNCTION claim_join_request_quota(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_join_request_quota(uuid, text, integer) TO service_role;

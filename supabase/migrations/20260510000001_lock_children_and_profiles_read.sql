-- Tighten SELECT policies on `children` and `profiles` so anonymous
-- (unauthenticated) clients can no longer read user data via the
-- public Supabase REST endpoint.
--
-- Before: both tables had `SELECT true` for the `public` role, which
-- includes `anon`. A curl with just the (intentionally public) anon
-- key returned every child name + age in the database. This is the
-- gap identified in the 2026-05-10 RLS audit.
--
-- After:
--   children — readable only by the row's owner, an admin, or a
--     creator/member of a playgroup that the child's parent is in
--     (any role: creator, member, pending, waitlisted, declined).
--     The "pending" inclusion is intentional — it lets a host preview
--     a join-requester's children before approving.
--   profiles — readable by any authenticated user. Less restrictive
--     because the host's name/photo/trust appears on every Browse card
--     and tightening further would require non-trivial UI work; the
--     gain we need today is just "no anonymous internet readers".
--
-- All four existing write paths (frontend/src/hooks/useChildCount,
-- frontend/src/pages/EditProfile, frontend/src/pages/host/HostDashboard,
-- frontend/src/pages/admin/UserDetailPanel, and the Admin page query)
-- were audited against this policy. They all continue to work because
-- each falls into one of: own-user (EditProfile), admin (Admin pages),
-- or host-of-shared-playgroup (HostDashboard, useChildCount in
-- SessionCard).

BEGIN;

-- ── children ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Children are viewable by everyone" ON public.children;

CREATE POLICY "Children are viewable by owner, admin, or co-playgroup creators/members"
  ON public.children
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1
      FROM memberships m_me
      JOIN memberships m_them
        ON m_me.playgroup_id = m_them.playgroup_id
      WHERE m_me.user_id = auth.uid()
        AND m_them.user_id = children.user_id
        AND m_me.role::text IN ('creator', 'member')
    )
  );

-- ── profiles ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;

-- ── post-deploy verification ────────────────────────────────────────
-- Run after applying:
--   1. As anonymous (the curl-with-anon-key from the audit):
--        curl 'https://pdgtryghvibhmmroqvdk.supabase.co/rest/v1/children?select=*' \
--             -H "apikey: <anon-key>"
--      Expected: [] (empty array) or 401.
--   2. As an authenticated non-admin, non-co-member user:
--        Same query → should return ONLY their own children.
--   3. As a host signed in:
--        Open Host Dashboard, confirm members AND pending requesters
--        still show child names and age ranges.
--   4. As an admin:
--        Open Admin → User detail panel → confirm any user's children
--        still load.
--
-- ── rollback ────────────────────────────────────────────────────────
-- BEGIN;
-- DROP POLICY "Children are viewable by owner, admin, or co-playgroup creators/members" ON public.children;
-- CREATE POLICY "Children are viewable by everyone" ON public.children FOR SELECT USING (true);
-- DROP POLICY "Profiles are viewable by authenticated users" ON public.profiles;
-- CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
-- COMMIT;

-- 017_one_playgroup_per_host.sql
-- Enforce the "one active playgroup per host" business rule at the DB
-- level. Previously this was only checked client-side in two places:
--   * src/pages/host/CreatePlaygroup.jsx (route redirect on isHost)
--   * src/context/HostContext.jsx savePlaygroup (pre-insert SELECT)
-- Both are racy / bypassable, and production data already contained a
-- host with two active playgroups before this migration. See GitHub
-- issues #26 and #28 for the full write-up and discovery path.

-- Partial unique index: at most one row per creator_id where is_active.
-- Deactivated playgroups (is_active = false) are exempt so that a host
-- who has retired an old group can create a new one.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_playgroup_per_host
  ON playgroups (creator_id)
  WHERE is_active;

-- Note: this migration will FAIL if any host currently has >1 active
-- playgroup. Before applying, run:
--
--   SELECT creator_id, COUNT(*)
--   FROM playgroups
--   WHERE is_active
--   GROUP BY creator_id
--   HAVING COUNT(*) > 1;
--
-- and deactivate duplicates with:
--
--   UPDATE playgroups SET is_active = false WHERE id = '<dup-id>';
--
-- For the 2026-04-10 rollout, Suresh's account (7fdf9710-...) had two
-- active hosted groups — "Suresh Test Group" (d52b52ef-...) and "Hoth"
-- (289e9374-...) — and "Hoth" was deactivated before this migration
-- ran. No other hosts were affected.

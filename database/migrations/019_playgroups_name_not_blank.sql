-- 019_playgroups_name_not_blank.sql
-- Fix #27: the `playgroups` table has `name VARCHAR(200) NOT NULL`, but
-- NOT NULL alone accepts the empty string. `HostContext.savePlaygroup`
-- previously had no client-side name validation either, so a
-- `HostSuccess.jsx` auto-save reached via direct nav / back-forward /
-- state-restore race could insert a `name = ''` row, which later got
-- deactivated (is_active = false) and left sitting in the table forever.
-- Regression sweep on 2026-04-10 caught one such row:
--   id=6d19d69d-55a9-48fa-91db-83a232d80d8f
--   creator_id=7fdf9710-231d-40c8-bea5-6a139709c07c
--   name='', is_active=false
--
-- This migration does two things:
--
--   1. Deletes abandoned empty-name rows. Scoped narrowly — only rows
--      that are ALREADY is_active = false AND have a blank name. We
--      don't touch active rows (defensive: if a real active group
--      somehow has a blank name, fail loudly via the CHECK below
--      instead of silently deleting it). The FK from memberships /
--      sessions / messages / reviews / rsvps / reports to playgroups
--      is ON DELETE CASCADE, so any child rows go with it — but for
--      an abandoned draft there shouldn't be any.
--
--   2. Adds a CHECK constraint so the DB rejects blank names going
--      forward, regardless of which code path is doing the write.
--      HostContext.savePlaygroup / updatePlaygroup also got a client-
--      side guard in the same commit, but defense in depth: the CHECK
--      is the authoritative enforcement.
--
-- If step 1 reports more rows than expected when you run this on
-- prod, STOP and investigate before proceeding to step 2 — the CHECK
-- will fail to apply if any active row has a blank name.

-- Step 1: Preview what will be deleted. Run this by itself first on
-- prod to confirm the scope, then run the DELETE.
--   SELECT id, creator_id, created_at, is_active, name
--     FROM playgroups
--    WHERE is_active = false
--      AND (name IS NULL OR length(trim(name)) = 0);

-- Step 1 (actual): delete abandoned draft rows.
DELETE FROM playgroups
 WHERE is_active = false
   AND (name IS NULL OR length(trim(name)) = 0);

-- Step 2: add the CHECK constraint. Because NOT VALID is omitted, this
-- will fail if any row still has a blank name — which is the desired
-- outcome (we'd rather fail loudly than silently whitelist bad data).
ALTER TABLE playgroups
  ADD CONSTRAINT playgroups_name_not_blank
  CHECK (length(trim(name)) > 0);

-- After applying: try to insert a `name = ''` row as a sanity check —
-- it should be rejected with `new row for relation "playgroups"
-- violates check constraint "playgroups_name_not_blank"`.

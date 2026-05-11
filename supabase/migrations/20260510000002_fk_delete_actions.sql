-- Fix two FK delete actions so deleting a profile doesn't trip up on
-- unrelated rows. Discovered during the 2026-05-10 test-data cleanup —
-- the bulk DELETE failed with:
--   "update or delete on table profiles violates foreign key constraint
--    sessions_created_by_fkey on table sessions"
-- because both `sessions.created_by` and `playgroups.flagged_by`
-- defaulted to NO ACTION when those columns were added (013_content_
-- moderation.sql and 001_sessions.sql respectively).
--
-- Intended semantics:
--   sessions.created_by   — creator deleted ⇒ their sessions follow.
--                           CASCADE matches every other ownership FK
--                           (memberships.user_id, playgroups.creator_id,
--                           rsvps.user_id, messages.sender_id).
--   playgroups.flagged_by — admin moderation field; deleting a flagger
--                           shouldn't delete the playgroup itself. SET
--                           NULL preserves the playgroup with a NULL
--                           moderation pointer (the moderation history
--                           record lives in admin_audit_log anyway).
--
-- Postgres requires drop-then-create to change an FK action.

BEGIN;

-- sessions.created_by ⇒ CASCADE
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_created_by_fkey;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- playgroups.flagged_by ⇒ SET NULL
ALTER TABLE public.playgroups
  DROP CONSTRAINT IF EXISTS playgroups_flagged_by_fkey;

ALTER TABLE public.playgroups
  ADD CONSTRAINT playgroups_flagged_by_fkey
  FOREIGN KEY (flagged_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

COMMIT;

-- ── verification ────────────────────────────────────────────────────
-- Re-run the FK audit (or just these two rows):
--   SELECT tc.table_name, kcu.column_name, rc.delete_rule
--   FROM   information_schema.table_constraints tc
--   JOIN   information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
--   JOIN   information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
--   WHERE  tc.table_name IN ('sessions','playgroups')
--   AND    kcu.column_name IN ('created_by','flagged_by');
-- Expected:
--   sessions   | created_by | CASCADE
--   playgroups | flagged_by | SET NULL
--
-- ── rollback ────────────────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE public.sessions   DROP CONSTRAINT sessions_created_by_fkey;
-- ALTER TABLE public.sessions   ADD  CONSTRAINT sessions_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES public.profiles(id);
-- ALTER TABLE public.playgroups DROP CONSTRAINT playgroups_flagged_by_fkey;
-- ALTER TABLE public.playgroups ADD  CONSTRAINT playgroups_flagged_by_fkey
--   FOREIGN KEY (flagged_by) REFERENCES public.profiles(id);
-- COMMIT;

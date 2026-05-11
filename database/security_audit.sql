-- Kiddaboo RLS audit — paste each block into Supabase Studio → SQL Editor.
-- Save the output as a screenshot or text dump for the launch plan.

-- ───────────────────────────────────────────────────────────────────
-- 1. Tables with RLS disabled — should be EMPTY for any user-data table
-- ───────────────────────────────────────────────────────────────────
SELECT schemaname, tablename
FROM   pg_tables
WHERE  schemaname = 'public'
AND    NOT EXISTS (
  SELECT 1 FROM pg_class c
  JOIN   pg_namespace n ON n.oid = c.relnamespace
  WHERE  n.nspname = pg_tables.schemaname
  AND    c.relname = pg_tables.tablename
  AND    c.relrowsecurity = true
)
ORDER BY tablename;

-- ───────────────────────────────────────────────────────────────────
-- 2. Tables with RLS enabled but ZERO policies — default-deny in
--    Supabase, but worth flagging so they're not silently inaccessible
-- ───────────────────────────────────────────────────────────────────
SELECT t.tablename
FROM   pg_tables t
JOIN   pg_class c        ON c.relname = t.tablename
JOIN   pg_namespace n    ON n.oid     = c.relnamespace AND n.nspname = t.schemaname
LEFT   JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE  t.schemaname    = 'public'
AND    c.relrowsecurity = true
GROUP  BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER  BY t.tablename;

-- ───────────────────────────────────────────────────────────────────
-- 3. Per-table policy coverage — every table × every command
--    Look for tables MISSING a SELECT, INSERT, UPDATE, or DELETE policy
--    (the RLS UPDATE bug from 2 weeks ago was a missing UPDATE policy)
-- ───────────────────────────────────────────────────────────────────
WITH cmds AS (
  SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS cmd
),
public_tables AS (
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
)
SELECT t.tablename,
       c.cmd,
       COALESCE(string_agg(p.policyname, ', '), '⚠️ NONE') AS policies
FROM   public_tables t
CROSS  JOIN cmds c
LEFT   JOIN pg_policies p
       ON p.tablename = t.tablename
       AND p.schemaname = 'public'
       AND (p.cmd = c.cmd OR p.cmd = 'ALL')
GROUP  BY t.tablename, c.cmd
ORDER  BY t.tablename, c.cmd;

-- ───────────────────────────────────────────────────────────────────
-- 4. All policies as a flat list — for spot-checking what each does
-- ───────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
ORDER  BY tablename, cmd, policyname;

-- Per-tick log for scheduled edge functions.
--
-- send-session-reminders is invoked by pg_cron every ~10 min. If the
-- cron job stalls (e.g. function crash, schedule deleted, vault
-- secret rotated and not updated) we currently have no way to notice
-- short of a user complaint about missing reminders. The function
-- logs in the dashboard are also flushed after a couple of days.
--
-- This table writes one row per invocation with start/end timestamps
-- and a counter snapshot, so a one-line query
--   select * from cron_run_log
--   where function_name = 'send-session-reminders'
--   order by started_at desc limit 5;
-- tells you whether the cron is alive and what it's been doing.
--
-- Designed to be reused by future scheduled functions — the
-- function_name column lets multiple crons share the table.

create table if not exists public.cron_run_log (
  id bigserial primary key,
  function_name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  candidates integer,
  premium integer,
  sent integer,
  skipped integer,
  failed integer,
  error text
);

create index if not exists cron_run_log_function_started_idx
  on public.cron_run_log (function_name, started_at desc);

-- service-role only
alter table public.cron_run_log enable row level security;

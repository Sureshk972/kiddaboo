-- Dedupe table for session reminder pushes.
--
-- send-session-reminders runs on a cron tick (~every 10 min) and
-- looks for sessions starting in the 24h or 2h windows. Without a
-- dedupe row a single user could receive the same reminder N times
-- as the cron crosses the window. The unique index makes the insert
-- the dedupe primitive — if it succeeds, this is the first time we've
-- queued the reminder; if it 23505s, skip.

create table if not exists public.session_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('24h', '2h')),
  sent_at timestamptz not null default now()
);

create unique index if not exists session_reminders_sent_unique
  on public.session_reminders_sent (session_id, user_id, kind);

create index if not exists session_reminders_sent_session_idx
  on public.session_reminders_sent (session_id);

-- Service role only; the client never reads or writes this table.
alter table public.session_reminders_sent enable row level security;

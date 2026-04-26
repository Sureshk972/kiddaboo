-- Post-session review prompt dedupe + notification key.
--
-- send-review-prompts runs on a cron tick and looks for sessions that
-- ended in a small window 4-12h ago. For each 'going' RSVP that hasn't
-- already reviewed and hasn't been prompted, it fires a push asking
-- the parent to leave a review. The unique index makes the insert the
-- dedupe primitive — same pattern as session_reminders_sent.
--
-- 'reviews' is added to the notification_prefs key allowlist so the
-- NotificationSettings toggle can persist.

create table if not exists public.review_prompts_sent (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);

create unique index if not exists review_prompts_sent_unique
  on public.review_prompts_sent (session_id, user_id);

create index if not exists review_prompts_sent_session_idx
  on public.review_prompts_sent (session_id);

alter table public.review_prompts_sent enable row level security;

-- Service role only — the client never reads or writes this table.

-- Extend the notification_prefs key allowlist.
create or replace function public.is_valid_notification_prefs(p jsonb)
returns boolean
language sql
immutable
as $$
  select
    p is null
    or (
      jsonb_typeof(p) = 'object'
      and not exists (
        select 1
        from jsonb_each(p) as e
        where e.key not in (
            'messages',
            'join_requests',
            'membership_updates',
            'sessions',
            'rsvps',
            'session_reminders',
            'verifications',
            'reviews'
          )
           or jsonb_typeof(e.value) <> 'boolean'
      )
    );
$$;

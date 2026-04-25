-- Dedupe table for membership-transition pushes.
--
-- send-push detects "join request approved/declined" by comparing
-- old_record.role to record.role. If the webhook is misconfigured
-- without "Send old record" enabled, old_record is undefined and
-- the push silently never fires. Conversely, if we fall back to
-- firing on record.role alone, an admin tool that touches a row
-- without changing role would re-fire the push.
--
-- Solution: claim a (membership_id, kind) row before sending. The
-- unique index turns "did we already notify this transition?" into
-- a single atomic insert that is correct under concurrent edits.

create table if not exists public.membership_notifications_sent (
  id bigserial primary key,
  membership_id uuid not null,
  kind text not null check (kind in ('approved', 'declined')),
  sent_at timestamptz not null default now(),
  unique (membership_id, kind)
);

create index if not exists membership_notifications_sent_membership_idx
  on public.membership_notifications_sent (membership_id);

-- Service-role only; no RLS policies needed. RLS is enabled so that
-- if anon/auth keys ever try to query it, they get nothing.
alter table public.membership_notifications_sent enable row level security;

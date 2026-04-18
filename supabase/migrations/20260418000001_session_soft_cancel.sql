-- Soft-cancel for sessions.
--
-- Hosts previously hard-deleted sessions via the X on the Next Session
-- card. That cascaded the RSVPs and left us with no audit trail, no
-- reason, and no way to tell the RSVP'd parents why the session went
-- away. We now mark sessions as cancelled in place, preserve RSVPs,
-- and post a system message in the group chat so parents are notified.

alter table public.sessions
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

create index if not exists sessions_active_idx
  on public.sessions (playgroup_id, scheduled_at)
  where cancelled_at is null;

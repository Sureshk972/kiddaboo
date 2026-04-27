-- Per-session chat threads.
--
-- Hosts may run multiple sessions in the same playgroup with totally
-- different attendees. The existing playgroup-wide chat (messages
-- with session_id IS NULL) stays — useful for general announcements
-- — but most session-specific coordination should be visible only to
-- attendees of that session.
--
-- Visibility rules for session-scoped messages (session_id IS NOT NULL):
--   * Read: playgroup creator, or any user with an rsvps row for the
--     session (going OR not_going). Past attendees who later un-RSVP
--     keep read access to history; that's less surprising than having
--     a thread vanish on them.
--   * Write: playgroup creator, or any user with rsvps.status='going'.
--
-- Playgroup-wide messages (session_id IS NULL) keep the original
-- creator/member rule.

alter table public.messages
  add column if not exists session_id uuid
  references public.sessions(id) on delete cascade;

create index if not exists messages_session_idx
  on public.messages (session_id, created_at)
  where session_id is not null;

-- Replace the SELECT policy with one that branches on session_id.
drop policy if exists "Members can read messages" on public.messages;

create policy "Members can read messages"
  on public.messages
  for select
  to authenticated
  using (
    case
      when session_id is null then
        auth.uid() in (
          select user_id from public.memberships
          where memberships.playgroup_id = messages.playgroup_id
            and role in ('creator', 'member')
        )
      else
        auth.uid() in (
          select creator_id from public.playgroups
          where playgroups.id = messages.playgroup_id
        )
        or exists (
          select 1 from public.rsvps
          where rsvps.session_id = messages.session_id
            and rsvps.user_id = auth.uid()
        )
    end
  );

-- Replace the INSERT policy with the same branching rule, plus the
-- "going" requirement for parents on session-scoped messages.
drop policy if exists "Members can send messages" on public.messages;

create policy "Members can send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    case
      when session_id is null then
        auth.uid() in (
          select user_id from public.memberships
          where memberships.playgroup_id = messages.playgroup_id
            and role in ('creator', 'member')
        )
      else
        auth.uid() in (
          select creator_id from public.playgroups
          where playgroups.id = messages.playgroup_id
        )
        or exists (
          select 1 from public.rsvps
          where rsvps.session_id = messages.session_id
            and rsvps.user_id = auth.uid()
            and rsvps.status = 'going'
        )
    end
  );

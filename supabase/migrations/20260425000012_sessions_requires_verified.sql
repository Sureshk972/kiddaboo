-- Verified-only sessions.
--
-- Hosts who have built up a verified reputation sometimes want to
-- restrict a session to other verified parents — e.g. a small in-home
-- gathering where they want a stronger trust signal than the default
-- open RSVP. This adds an opt-in flag on sessions and a trigger that
-- blocks non-verified parents from RSVPing 'going'.
--
-- The flag is enforced server-side (trigger on rsvps) so a hand-rolled
-- API call can't bypass it. The frontend mirrors the check to disable
-- the button and explain why.

alter table public.sessions
  add column if not exists requires_verified boolean not null default false;

create or replace function public.enforce_session_requires_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  needs_verified boolean;
  is_user_verified boolean;
begin
  -- Only block 'going' RSVPs. 'not_going' is fine — letting people
  -- decline doesn't grant access.
  if new.status is distinct from 'going' then
    return new;
  end if;

  select s.requires_verified
    into needs_verified
    from public.sessions s
    where s.id = new.session_id;

  if not coalesce(needs_verified, false) then
    return new;
  end if;

  select coalesce(p.is_verified, false)
    into is_user_verified
    from public.profiles p
    where p.id = new.user_id;

  if not coalesce(is_user_verified, false) then
    raise exception 'session_requires_verified'
      using errcode = '42501',
            hint = 'This session is open to verified parents only.';
  end if;

  return new;
end;
$$;

drop trigger if exists rsvps_enforce_requires_verified on public.rsvps;
create trigger rsvps_enforce_requires_verified
  before insert or update of status on public.rsvps
  for each row execute function public.enforce_session_requires_verified();

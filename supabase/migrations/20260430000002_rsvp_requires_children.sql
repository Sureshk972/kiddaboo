-- Block parents from RSVPing 'going' to a session if they have zero
-- children on their profile. The session is for kids — there has to be
-- at least one to bring. Mirrors the requires_verified pattern: server
-- enforces via trigger, frontend mirrors the gate to disable the
-- button with a helpful link to /edit-profile#children.
--
-- 'not_going' is unrestricted; declining doesn't grant access.

create or replace function public.enforce_rsvp_requires_children()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  child_count integer;
begin
  if new.status is distinct from 'going' then
    return new;
  end if;

  select count(*)
    into child_count
    from public.children
    where user_id = new.user_id;

  if coalesce(child_count, 0) = 0 then
    raise exception 'rsvp_requires_children'
      using errcode = '42501',
            hint = 'Add a child to your profile before RSVPing.';
  end if;

  return new;
end;
$$;

drop trigger if exists rsvps_enforce_requires_children on public.rsvps;
create trigger rsvps_enforce_requires_children
  before insert or update of status on public.rsvps
  for each row execute function public.enforce_rsvp_requires_children();

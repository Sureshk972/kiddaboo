-- Lock is_verified to admin-only writes.
--
-- profiles.is_verified is the trust-tier flag — it gates the
-- "Verified" badge on PlaygroupCard / PlaygroupDetail and (with PR-N)
-- the "Verified hosts only" Browse filter. Without this guard, any
-- user can self-update their profile and flip themselves to verified,
-- defeating the whole point of the badge.
--
-- Mirrors the prevent_role_escalation trigger from migration 011.

create or replace function public.prevent_is_verified_escalation()
returns trigger as $$
begin
  if new.is_verified is distinct from old.is_verified
     and not public.is_admin() then
    raise exception 'Only admins can change verification status';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists check_is_verified_escalation on public.profiles;

create trigger check_is_verified_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_is_verified_escalation();

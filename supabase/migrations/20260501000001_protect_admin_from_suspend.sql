-- Block writes that would suspend an admin account.
--
-- The Admin.suspendUser flow does direct DB writes (not an edge
-- function), so the only true server-side backstop is a trigger.
-- UsersTab and the JS handler in Admin.jsx already gate suspend on
-- profile.role === 'admin'; this is the third layer.

create or replace function public.protect_admin_from_suspend()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_suspended is true
     and coalesce(old.is_suspended, false) is false
     and old.role = 'admin' then
    raise exception 'admin_protected_from_suspend'
      using errcode = '42501',
            hint = 'Admin accounts cannot be suspended.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_from_suspend on public.profiles;
create trigger profiles_protect_admin_from_suspend
  before update of is_suspended on public.profiles
  for each row execute function public.protect_admin_from_suspend();

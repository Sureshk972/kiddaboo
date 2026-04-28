-- Atomic replace for the user's children list.
--
-- Background: the AddChildren onboarding step previously did
-- `delete().eq("user_id", uid)` followed by `insert(rows)` from the
-- client. If the insert failed (network blip, validation) the user's
-- prior children were already wiped and the only error message was a
-- generic "Could not save." That's a data-loss bug.
--
-- Fix: a single transactional RPC that deletes and re-inserts inside
-- one statement. If the insert raises, the transaction rolls back and
-- the existing rows are preserved.

create or replace function public.replace_children(p_children jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Validate shape before mutating: every element must have a non-empty name.
  if exists (
    select 1
    from jsonb_array_elements(p_children) c
    where coalesce(trim(c->>'name'), '') = ''
  ) then
    raise exception 'invalid_child_name';
  end if;

  delete from public.children where user_id = v_user;

  insert into public.children (user_id, name, age_range, personality_tags)
  select
    v_user,
    trim(c->>'name'),
    nullif(c->>'age_range', ''),
    coalesce(c->'personality_tags', '[]'::jsonb)
  from jsonb_array_elements(p_children) c;
end;
$$;

revoke all on function public.replace_children(jsonb) from public;
grant execute on function public.replace_children(jsonb) to authenticated;

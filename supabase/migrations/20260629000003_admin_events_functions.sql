-- Daily pageview counts split by role.
create or replace function public.admin_events_by_day(p_from timestamptz, p_to timestamptz)
returns table (bucket date, user_role text, count bigint)
language sql security invoker stable as $$
  select
    date_trunc('day', created_at)::date as bucket,
    coalesce(user_role, 'unknown') as user_role,
    count(*)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
    and event_type = 'pageview'
  group by 1, 2
  order by 1, 2;
$$;

-- Top pages by pageview count in a date range.
create or replace function public.admin_top_pages(p_from timestamptz, p_to timestamptz)
returns table (path text, count bigint)
language sql security invoker stable as $$
  select path, count(*)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
    and event_type = 'pageview'
  group by path
  order by 2 desc
  limit 10;
$$;

-- Top click events (data-track values) in a date range.
create or replace function public.admin_top_clicks(p_from timestamptz, p_to timestamptz)
returns table (event_name text, count bigint)
language sql security invoker stable as $$
  select event_name, count(*)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
    and event_type = 'click'
  group by event_name
  order by 2 desc
  limit 10;
$$;

-- Distinct sessions per day.
create or replace function public.admin_active_sessions(p_from timestamptz, p_to timestamptz)
returns table (bucket date, count bigint)
language sql security invoker stable as $$
  select
    date_trunc('day', created_at)::date as bucket,
    count(distinct session_id)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
  group by 1
  order by 1;
$$;

-- Signup -> first booking -> first payment funnel. Counts distinct users
-- who hit each step in the period.
create or replace function public.admin_funnel_signup_book_pay(p_from timestamptz, p_to timestamptz)
returns table (step text, count bigint)
language sql security invoker stable as $$
  with signups as (
    select id from public.profiles
    where created_at >= p_from and created_at < p_to and public.is_admin()
  ),
  booked as (
    select distinct parent_id as id from public.bookings
    where requested_at >= p_from and requested_at < p_to and public.is_admin()
  ),
  paid as (
    select distinct b.parent_id as id from public.bookings b
    where b.requested_at >= p_from and b.requested_at < p_to
      and b.status in ('confirmed','completed') and public.is_admin()
  )
  select 'signups' as step, count(*)::bigint from signups
  union all
  select 'booked', count(*)::bigint from booked
  union all
  select 'paid', count(*)::bigint from paid;
$$;

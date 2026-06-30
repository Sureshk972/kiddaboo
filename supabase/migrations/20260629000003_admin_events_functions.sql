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

-- Signup -> Booking -> Payment funnel. Cohort semantics: of users who
-- signed up in [p_from, p_to), how many ever booked (at any point) and
-- how many ever paid. The booking/payment lookups are intentionally
-- unbounded in time so we don't undercount slow converters.
create or replace function public.admin_funnel_signup_book_pay(p_from timestamptz, p_to timestamptz)
returns table (step text, count bigint)
language sql security invoker stable as $$
  with cohort as (
    select id from public.profiles
    where created_at >= p_from and created_at < p_to
  ),
  booked as (
    select distinct c.id
    from cohort c
    join public.bookings b on b.parent_id = c.id
  ),
  paid as (
    select distinct c.id
    from cohort c
    join public.bookings b on b.parent_id = c.id
    where b.status in ('confirmed','completed')
  )
  select step, count from (
    select 'signups' as step, (select count(*) from cohort)::bigint as count
    union all
    select 'booked', (select count(*) from booked)::bigint
    union all
    select 'paid', (select count(*) from paid)::bigint
  ) f
  where public.is_admin();
$$;

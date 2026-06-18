-- Analytics views and RPCs for the admin module. Every callable
-- begins with an is_admin() guard; non-admins get an empty result
-- rather than an error.

-- Per-booking derived row. processing_fee_cents estimates Stripe's
-- 2.9% + $0.30 on (rate + platform_fee), which is what the connected
-- account is debited for under on_behalf_of charges. Estimate only —
-- exact amounts live in Stripe.
create or replace view public.admin_kpis_v as
select
  b.id,
  b.requested_at,
  b.status,
  b.rate_cents,
  b.platform_fee_cents,
  (round((b.rate_cents + b.platform_fee_cents) * 0.029) + 30)::integer as processing_fee_cents,
  b.parent_id,
  b.nanny_id
from public.bookings b;

create or replace function public.admin_kpis(p_from timestamptz, p_to timestamptz)
returns table (
  gmv_cents bigint,
  platform_fee_cents bigint,
  processing_fee_cents bigint,
  net_revenue_cents bigint,
  booking_count bigint
)
language sql
security invoker
stable
as $$
  select
    coalesce(sum(rate_cents + platform_fee_cents), 0)::bigint,
    coalesce(sum(platform_fee_cents), 0)::bigint,
    coalesce(sum(processing_fee_cents), 0)::bigint,
    coalesce(sum(platform_fee_cents), 0)::bigint,
    count(*)::bigint
  from public.admin_kpis_v
  where public.is_admin()
    and status in ('confirmed', 'completed')
    and requested_at >= p_from
    and requested_at < p_to;
$$;

create or replace function public.admin_signups_timeseries(
  p_from timestamptz,
  p_to timestamptz
)
returns table (bucket date, account_type text, count bigint)
language sql
security invoker
stable
as $$
  select
    date_trunc('day', created_at)::date as bucket,
    account_type,
    count(*)::bigint
  from public.profiles
  where public.is_admin()
    and created_at >= p_from
    and created_at < p_to
  group by 1, 2
  order by 1, 2;
$$;

create or replace function public.admin_bookings_timeseries(
  p_from timestamptz,
  p_to timestamptz
)
returns table (bucket date, status text, count bigint, gmv_cents bigint)
language sql
security invoker
stable
as $$
  select
    date_trunc('day', requested_at)::date as bucket,
    status::text,
    count(*)::bigint,
    coalesce(sum(rate_cents + platform_fee_cents), 0)::bigint
  from public.bookings
  where public.is_admin()
    and requested_at >= p_from
    and requested_at < p_to
  group by 1, 2
  order by 1, 2;
$$;

create or replace function public.admin_host_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns table (signups bigint, verified bigint, booked bigint)
language sql
security invoker
stable
as $$
  with hosts as (
    select id, is_verified
    from public.profiles
    where account_type = 'nanny'
      and created_at >= p_from
      and created_at < p_to
  ),
  booked_hosts as (
    select distinct b.nanny_id as id
    from public.bookings b
    join hosts h on h.id = b.nanny_id
    where b.requested_at < p_to
  )
  select
    (select count(*)::bigint from hosts where public.is_admin()) as signups,
    (select count(*)::bigint from hosts where public.is_admin() and is_verified) as verified,
    (select count(*)::bigint from booked_hosts where public.is_admin()) as booked;
$$;

grant execute on function public.admin_kpis(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_signups_timeseries(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_bookings_timeseries(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_host_funnel(timestamptz, timestamptz) to authenticated;
grant select on public.admin_kpis_v to authenticated;

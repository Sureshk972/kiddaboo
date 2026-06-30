-- First-party usage analytics. See
-- docs/superpowers/specs/2026-06-29-click-through-analytics-design.md.

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  text not null,
  event_type  text not null check (event_type in ('pageview','click','custom')),
  event_name  text not null,
  path        text not null,
  referrer    text,
  properties  jsonb not null default '{}'::jsonb,
  user_role   text check (user_role in ('parent','nanny','admin') or user_role is null),
  user_agent  text
);

create index events_created_at_idx on public.events (created_at desc);
create index events_user_id_idx    on public.events (user_id);
create index events_event_name_idx on public.events (event_name);
create index events_path_idx       on public.events (path);

alter table public.events enable row level security;

create policy events_self_insert on public.events
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy events_admin_select on public.events
  for select to authenticated
  using (public.is_admin());

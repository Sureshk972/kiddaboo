-- Parent feedback about Kiddaboo itself (not about a specific nanny).
-- All visible rows are shown publicly on the marketing surface; admins
-- can hide any row.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  is_hidden boolean not null default false,
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id)
);

create index feedback_created_idx on public.feedback(created_at desc) where is_hidden = false;
create index feedback_admin_idx on public.feedback(created_at desc);

alter table public.feedback enable row level security;

-- Anyone (including anonymous visitors) can read visible feedback.
create policy "public reads visible feedback"
  on public.feedback for select
  to anon, authenticated
  using (is_hidden = false);

-- Admins can read every row (hidden or not) so they can moderate.
create policy "admin reads all feedback"
  on public.feedback for select
  to authenticated
  using (public.is_admin());

-- Authenticated users can submit their own feedback.
create policy "user inserts own feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admins toggle is_hidden.
create policy "admin moderates feedback"
  on public.feedback for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- View that joins the commenter's first name and last initial so the
-- frontend doesn't need a profile join + RLS hop on every read.
create or replace view public.feedback_public as
select
  f.id,
  f.rating,
  f.comment,
  f.created_at,
  trim(coalesce(p.first_name, '') || ' ' ||
       coalesce(substring(p.last_name from 1 for 1), '')) ||
       case when p.last_name is not null and length(p.last_name) > 0 then '.' else '' end
       as display_name
from public.feedback f
left join public.profiles p on p.id = f.user_id
where f.is_hidden = false;

grant select on public.feedback_public to anon, authenticated;

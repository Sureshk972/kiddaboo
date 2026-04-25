-- Host verification request flow.
--
-- PR-N gave admins the power to flip is_verified, but discovery of
-- "who should be verified" relied on admins poking around. This
-- table is the queue: hosts submit a request, admins approve or
-- reject in the new Verifications tab. On approval, the admin click
-- also sets profiles.is_verified=true via the existing trigger
-- (which permits admin writes).

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users (id),
  notes text
);

-- One open request per user. Re-requesting after a decision is fine
-- — those rows have status != 'pending' and are excluded from the
-- partial unique index.
create unique index if not exists verification_requests_one_pending_per_user_idx
  on public.verification_requests (user_id)
  where status = 'pending';

-- Admin queue ordering — newest pending first.
create index if not exists verification_requests_status_submitted_idx
  on public.verification_requests (status, submitted_at desc);

alter table public.verification_requests enable row level security;

-- Users can read their own requests (drives the MyProfile status pill).
create policy "Users can read own verification requests"
  on public.verification_requests for select
  using (auth.uid() = user_id);

-- Users can insert a request for themselves. The check constraint
-- + partial unique index together ensure they can't sneak in
-- 'approved' status or stack multiple pending rows.
create policy "Users can submit own verification request"
  on public.verification_requests for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Admins can read all and update any.
create policy "Admins can read all verification requests"
  on public.verification_requests for select
  using (public.is_admin());

create policy "Admins can update verification requests"
  on public.verification_requests for update
  using (public.is_admin());

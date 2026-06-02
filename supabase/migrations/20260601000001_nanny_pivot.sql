-- 20260601000001_nanny_pivot.sql
-- Pivots Kiddaboo from playgroup/host model to 1:1 Nanny booking marketplace.
-- Pre-launch: no data migration, all old tables dropped.

begin;

-- 1. Drop old tables in dependency order
drop table if exists session_reminders_sent cascade;
drop table if exists join_request_usage cascade;
drop table if exists rsvps cascade;
drop table if exists messages cascade;
drop table if exists memberships cascade;
drop table if exists reviews cascade;
drop table if exists sessions cascade;
drop table if exists playgroups cascade;
drop table if exists subscriptions cascade;
drop table if exists children cascade;
drop table if exists reports cascade;
drop table if exists blocks cascade;

-- 2. Update profiles.account_type enum
alter table profiles drop constraint if exists profiles_account_type_check;
update profiles set account_type = 'parent' where account_type = 'organizer';
alter table profiles
  add constraint profiles_account_type_check
  check (account_type in ('parent', 'nanny'));

-- 3. Add nanny-specific columns to profiles
alter table profiles
  add column if not exists verified_at timestamptz,
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists bio text,
  add column if not exists service_area_lat double precision,
  add column if not exists service_area_lng double precision,
  add column if not exists service_area_radius_km integer;

-- 4. nanny_availability_blocks
create table nanny_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  nanny_id uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  timezone text not null,
  rate_cents integer not null check (rate_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_blocks_nanny on nanny_availability_blocks(nanny_id) where active;

-- 5. nanny_slots (materialized)
create type nanny_slot_status as enum ('open', 'requested', 'booked', 'past');

create table nanny_slots (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references nanny_availability_blocks(id) on delete cascade,
  nanny_id uuid not null references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  rate_cents integer not null,
  status nanny_slot_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (block_id, starts_at)
);
create index idx_slots_open_window on nanny_slots(starts_at, ends_at) where status = 'open';
create index idx_slots_nanny on nanny_slots(nanny_id, starts_at);

-- 6. bookings
create type booking_status as enum (
  'pending', 'confirmed', 'declined', 'expired',
  'cancelled_refunded', 'cancelled_no_refund',
  'completed', 'pending_payment_retry'
);
create type cancelled_by_t as enum ('parent', 'nanny');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references nanny_slots(id) on delete restrict,
  parent_id uuid not null references profiles(id) on delete restrict,
  nanny_id uuid not null references profiles(id) on delete restrict,
  note_from_parent text,
  status booking_status not null default 'pending',
  stripe_payment_intent_id text unique,
  rate_cents integer not null,
  platform_fee_cents integer not null,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  acceptance_expires_at timestamptz not null,
  cancelled_at timestamptz,
  cancelled_by cancelled_by_t,
  completed_at timestamptz
);
create index idx_bookings_parent on bookings(parent_id, status);
create index idx_bookings_nanny on bookings(nanny_id, status);
create index idx_bookings_pending_expiry on bookings(acceptance_expires_at) where status = 'pending';

-- 7. ratings
create type rating_direction as enum ('parent_to_nanny', 'nanny_to_parent');

create table ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  rater_id uuid not null references profiles(id) on delete cascade,
  ratee_id uuid not null references profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  text text,
  direction rating_direction not null,
  created_at timestamptz not null default now(),
  unique (booking_id, direction)
);
create index idx_ratings_ratee on ratings(ratee_id, direction);

-- 8. RLS
alter table nanny_availability_blocks enable row level security;
alter table nanny_slots enable row level security;
alter table bookings enable row level security;
alter table ratings enable row level security;

-- Blocks: nanny owns their blocks; everyone reads active blocks of nannies
create policy blocks_owner_all on nanny_availability_blocks
  for all using (nanny_id = auth.uid()) with check (nanny_id = auth.uid());
create policy blocks_public_read on nanny_availability_blocks
  for select using (active);

-- Slots: read open slots (everyone), nanny reads all their own slots
create policy slots_public_open_read on nanny_slots
  for select using (status = 'open');
create policy slots_nanny_own_read on nanny_slots
  for select using (nanny_id = auth.uid());

-- Bookings: parent reads/inserts their own; nanny reads their own; updates restricted to service role
create policy bookings_parent_select on bookings
  for select using (parent_id = auth.uid());
create policy bookings_nanny_select on bookings
  for select using (nanny_id = auth.uid());
create policy bookings_parent_insert on bookings
  for insert with check (parent_id = auth.uid());

-- Ratings:
--   parent_to_nanny: public read, parent inserts their own
--   nanny_to_parent: only other nannies (and admins) read, nanny inserts their own
create policy ratings_public_p2n_select on ratings
  for select using (direction = 'parent_to_nanny');
create policy ratings_nanny_n2p_select on ratings
  for select using (
    direction = 'nanny_to_parent' and
    exists (select 1 from profiles p where p.id = auth.uid() and p.account_type = 'nanny')
  );
create policy ratings_parent_insert on ratings
  for insert with check (
    direction = 'parent_to_nanny' and rater_id = auth.uid()
  );
create policy ratings_nanny_insert on ratings
  for insert with check (
    direction = 'nanny_to_parent' and rater_id = auth.uid()
  );

commit;

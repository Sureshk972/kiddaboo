-- Hide profiles.phone_verified_at from other users.
--
-- Today PlaygroupDetail joins profiles for every member and selects
-- phone_verified_at to render a "Verified" badge. That timestamp is
-- meaningful — it tells anyone in the group when each user verified
-- their phone, which is more than they need to know. The boolean
-- "is this user phone-verified?" is enough for any UI we render.
--
-- Fix: expose a generated boolean column is_phone_verified, and
-- revoke column-level SELECT on phone_verified_at from anon and
-- authenticated. service_role retains access (used by verify-otp
-- and submit-join-request edge functions).

alter table public.profiles
  add column if not exists is_phone_verified boolean
  generated always as (phone_verified_at is not null) stored;

revoke select (phone_verified_at) on public.profiles from anon, authenticated;

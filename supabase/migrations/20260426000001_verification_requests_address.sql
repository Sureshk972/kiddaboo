-- Require host to attest a physical address with each verification
-- request. Without it the review is just a paper exercise — admins
-- need a concrete claim they can sanity-check.
--
-- Existing rows (already approved/rejected) keep null. New inserts
-- must supply a non-empty address; the RLS check policy enforces it
-- so the constraint can't be bypassed via a forged client.

alter table public.verification_requests
  add column if not exists address text;

-- Replace the insert policy to require a non-empty address.
drop policy if exists "Users can submit own verification request"
  on public.verification_requests;

create policy "Users can submit own verification request"
  on public.verification_requests for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and address is not null
    and length(trim(address)) > 0
  );

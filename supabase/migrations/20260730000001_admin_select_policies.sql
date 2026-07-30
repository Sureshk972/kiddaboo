-- Admin SELECT policies for tables created in the nanny pivot that
-- were missing admin access (same pattern as bookings_admin_select).

create policy ratings_admin_select on public.ratings
  for select to authenticated
  using (public.is_admin());

create policy nanny_slots_admin_select on public.nanny_slots
  for select to authenticated
  using (public.is_admin());

create policy blocks_admin_select on public.nanny_availability_blocks
  for select to authenticated
  using (public.is_admin());

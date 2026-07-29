-- Allow admins to read all bookings in the admin panel.
-- Mirrors the pattern used for events_admin_select.
create policy bookings_admin_select on public.bookings
  for select to authenticated
  using (public.is_admin());

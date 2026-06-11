-- Allow parents to read nanny_slots they have a booking for.
-- Without this, the slot row becomes unreadable as soon as it transitions
-- from 'open' to 'requested'/'booked', leaving Upcoming/Requests with a
-- null slot join and no date to render.
create policy slots_parent_booked_read on nanny_slots
  for select using (
    exists (
      select 1 from bookings b
      where b.slot_id = nanny_slots.id
        and b.parent_id = auth.uid()
    )
  );

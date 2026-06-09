-- Allow nanny availability blocks to be either weekly (day_of_week) or a
-- specific calendar date. Exactly one of the two must be set.

alter table nanny_availability_blocks
  alter column day_of_week drop not null;

alter table nanny_availability_blocks
  add column if not exists specific_date date;

alter table nanny_availability_blocks
  drop constraint if exists nanny_availability_blocks_day_of_week_check;

alter table nanny_availability_blocks
  add constraint blocks_day_or_date_chk check (
    (day_of_week is not null and specific_date is null
      and day_of_week between 0 and 6)
    or
    (day_of_week is null and specific_date is not null)
  );

create index if not exists idx_blocks_specific_date
  on nanny_availability_blocks(specific_date)
  where active and specific_date is not null;

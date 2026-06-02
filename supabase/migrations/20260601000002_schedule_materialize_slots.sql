-- Schedule materialize-nanny-slots to run daily at 07:00 UTC.
--
-- This function extends the bookable slot horizon to 8 weeks ahead for
-- every active nanny_availability_blocks row, and marks past open slots
-- as 'past'. Running daily at 07:00 UTC keeps the window fresh without
-- hammering the database.
--
-- Uses pg_cron + pg_net (both already enabled on this Supabase project)
-- to POST to the edge function, matching the net.http_post pattern used
-- elsewhere in this project (see database/migrations/004_push_webhooks.sql).

select cron.schedule(
  'materialize-nanny-slots-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://pdgtryghvibhmmroqvdk.supabase.co/functions/v1/materialize-nanny-slots',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);

-- Schedule expire-pending-requests to run hourly at HH:07 UTC.
--
-- This function expires pending booking requests that have passed their
-- acceptance window (cancels the Stripe auth and reopens the slot), and
-- also sweeps stuck pending_payment_retry bookings older than 12 hours.
--
-- Uses pg_cron + pg_net (both already enabled on this Supabase project)
-- to POST to the edge function, matching the net.http_post pattern used
-- elsewhere in this project (see 20260601000002_schedule_materialize_slots.sql).

select cron.schedule(
  'expire-pending-bookings-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://pdgtryghvibhmmroqvdk.supabase.co/functions/v1/expire-pending-requests',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);

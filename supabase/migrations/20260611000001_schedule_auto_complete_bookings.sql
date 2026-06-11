-- Schedule auto-complete-bookings to run hourly at HH:17 UTC.
--
-- Sweeps confirmed bookings whose slot ended >24h ago and flips them to
-- "completed". Lets parents rate without waiting on the nanny to tap
-- "Mark complete", and keeps the UI status in sync with reality.

select cron.schedule(
  'auto-complete-bookings-hourly',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://pdgtryghvibhmmroqvdk.supabase.co/functions/v1/auto-complete-bookings',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);

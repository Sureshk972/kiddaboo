# send-session-reminders

Premium feature. Sends a push notification 24h and 2h before any
session a user has RSVP'd "going" to. Free users are filtered out.

## One-time setup

1. **Deploy this function and the updated send-push:**
   ```
   supabase functions deploy send-session-reminders --project-ref pdgtryghvibhmmroqvdk
   supabase functions deploy send-push --project-ref pdgtryghvibhmmroqvdk
   ```

2. **Enable extensions in Supabase Dashboard → Database → Extensions:**
   - `pg_cron`
   - `pg_net`

3. **Store the service role key in Vault** (Dashboard → Project Settings → Vault):
   - Name: `service_role_key`
   - Value: your project's service role key (Settings → API)

4. **Schedule the cron job** (SQL Editor):
   ```sql
   select cron.schedule(
     'session-reminders',
     '*/10 * * * *',
     $$
     select net.http_post(
       url := 'https://pdgtryghvibhmmroqvdk.supabase.co/functions/v1/send-session-reminders',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```

## Verifying

Manually invoke once:
```
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  https://pdgtryghvibhmmroqvdk.supabase.co/functions/v1/send-session-reminders
```

The response includes `candidates / premium / sent / skipped / failed` counts.

## Disable

```sql
select cron.unschedule('session-reminders');
```

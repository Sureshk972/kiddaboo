-- ================================================
-- 004: Push Notification Webhooks
-- Postgres triggers that call the send-push Edge Function
-- via pg_net extension on relevant table events
-- ================================================

-- Step 1: Enable pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Generic trigger function that POSTs to the Edge Function
CREATE OR REPLACE FUNCTION notify_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key TEXT := current_setting('app.settings.service_role_key', true);
  payload JSONB;
BEGIN
  -- Skip if service key not configured yet
  IF service_key IS NULL OR service_key = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  PERFORM net.http_post(
    url := 'https://pdgtryghvibhmmroqvdk.supabase.co/functions/v1/send-push',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 3: Create triggers

-- New join request → notify host
DROP TRIGGER IF EXISTS push_on_join_request ON memberships;
CREATE TRIGGER push_on_join_request
  AFTER INSERT ON memberships
  FOR EACH ROW
  WHEN (NEW.role = 'pending')
  EXECUTE FUNCTION notify_push();

-- Membership status change (approved/declined) → notify requester
DROP TRIGGER IF EXISTS push_on_membership_update ON memberships;
CREATE TRIGGER push_on_membership_update
  AFTER UPDATE ON memberships
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION notify_push();

-- New chat message → notify group members
DROP TRIGGER IF EXISTS push_on_new_message ON messages;
CREATE TRIGGER push_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_push();

-- New session scheduled → notify group members
DROP TRIGGER IF EXISTS push_on_new_session ON sessions;
CREATE TRIGGER push_on_new_session
  AFTER INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_push();

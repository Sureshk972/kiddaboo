-- Lock down the shape of profiles.notification_prefs.
--
-- The column is a freeform JSONB, fed by NotificationSettings via
-- supabase-js .update(). Without server-side validation, a buggy
-- client (or a determined user hitting the REST API directly) can
-- write arbitrary JSON into the column — non-boolean values, unknown
-- keys, deeply nested objects — which then degrades how send-push
-- and send-session-reminders interpret it. We currently rely on
-- `prefs?.[kind] !== false` to default-on, which silently accepts
-- garbage instead of catching it.
--
-- Fix: an IMMUTABLE validation function + CHECK constraint that
-- requires the column to be either NULL or a flat object whose keys
-- are drawn from the known notification kinds and whose values are
-- all booleans.

-- 1. Sanitize existing rows so the constraint can attach. Strip any
--    keys we don't recognise and any values that aren't booleans.
update public.profiles
set notification_prefs = coalesce(
  (
    select jsonb_object_agg(key, value)
    from jsonb_each(notification_prefs)
    where key in (
        'messages',
        'join_requests',
        'membership_updates',
        'sessions',
        'rsvps',
        'session_reminders'
      )
      and jsonb_typeof(value) = 'boolean'
  ),
  '{}'::jsonb
)
where notification_prefs is not null;

-- 2. Validation function. IMMUTABLE so it can be used in a CHECK.
create or replace function public.is_valid_notification_prefs(p jsonb)
returns boolean
language sql
immutable
as $$
  select
    p is null
    or (
      jsonb_typeof(p) = 'object'
      and not exists (
        select 1
        from jsonb_each(p) as e
        where e.key not in (
            'messages',
            'join_requests',
            'membership_updates',
            'sessions',
            'rsvps',
            'session_reminders'
          )
           or jsonb_typeof(e.value) <> 'boolean'
      )
    );
$$;

-- 3. Attach the CHECK constraint.
alter table public.profiles
  drop constraint if exists profiles_notification_prefs_valid;

alter table public.profiles
  add constraint profiles_notification_prefs_valid
  check (public.is_valid_notification_prefs(notification_prefs));

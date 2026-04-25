-- Allow 'verifications' as a valid key in profiles.notification_prefs.
--
-- PR-I locked the column shape via is_valid_notification_prefs() with
-- a fixed key list. PR-P adds a new notification kind for host
-- verification approve/reject pushes, so the function needs the
-- enumerated list extended or NotificationSettings can't save the
-- toggle.

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
            'session_reminders',
            'verifications'
          )
           or jsonb_typeof(e.value) <> 'boolean'
      )
    );
$$;

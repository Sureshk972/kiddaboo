-- Store the user's IANA timezone so the reminder edge function can
-- format session times correctly. Without this, send-session-reminders
-- runs in the Deno edge runtime's TZ (UTC) and renders 5pm-local
-- as "10:00 PM" to a Pacific-coast user.
--
-- Populated client-side via Intl.DateTimeFormat().resolvedOptions().timeZone
-- on first authenticated load. Hosts and parents both get this column
-- since both might receive scheduled push notifications in the future.

alter table public.profiles
  add column if not exists timezone text;

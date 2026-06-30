-- Flip the analytics_opt_out default from false to true, so users
-- start opted out of first-party analytics and have to explicitly
-- enable tracking. Privacy-by-default stance.
alter table public.profiles
  alter column analytics_opt_out set default true;

-- Backfill every existing row to true. The column was added with
-- default false, so all current values were assigned without consent;
-- treating them as opted-out is the privacy-respecting choice.
update public.profiles
   set analytics_opt_out = true
 where analytics_opt_out = false;

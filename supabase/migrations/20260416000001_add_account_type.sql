-- 20260416000001_add_account_type.sql
-- Adds profiles.account_type so we can distinguish Parent vs Organizer
-- users without the expensive memberships.role='creator' lookup every
-- AuthContext fetch does today.

ALTER TABLE profiles
  ADD COLUMN account_type TEXT
  CHECK (account_type IN ('parent', 'organizer'))
  NOT NULL DEFAULT 'parent';

-- Backfill: anyone who has ever been a group creator is an organizer.
-- Everyone else stays 'parent' (the default).
UPDATE profiles p
SET account_type = 'organizer'
WHERE EXISTS (
  SELECT 1
  FROM memberships m
  WHERE m.user_id = p.id
    AND m.role = 'creator'
);

-- Drop the default so new signups MUST pick a role explicitly via the
-- ChooseRole path picker. Any insert that omits account_type will now
-- error, which is what we want.
ALTER TABLE profiles ALTER COLUMN account_type DROP DEFAULT;

-- Index — we'll filter by account_type in admin views and usage stats.
CREATE INDEX IF NOT EXISTS profiles_account_type_idx
  ON profiles (account_type);

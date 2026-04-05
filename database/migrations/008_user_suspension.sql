-- Add is_suspended flag to profiles for admin user management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

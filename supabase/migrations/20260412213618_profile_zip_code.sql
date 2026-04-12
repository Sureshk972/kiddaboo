-- Add zip_code to profiles so parents can share their general area
-- without revealing a full address. Useful for proximity matching.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

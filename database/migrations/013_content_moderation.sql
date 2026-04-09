-- Migration 013: Content moderation columns for playgroups
-- Allows admins to flag playgroups for review

ALTER TABLE playgroups ADD COLUMN is_flagged BOOLEAN DEFAULT false;
ALTER TABLE playgroups ADD COLUMN flag_reason TEXT;
ALTER TABLE playgroups ADD COLUMN flagged_at TIMESTAMPTZ;
ALTER TABLE playgroups ADD COLUMN flagged_by UUID REFERENCES profiles(id);

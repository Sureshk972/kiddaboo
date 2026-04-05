-- Reviews & Trust Score Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- REVIEWS — member ratings after sessions
-- ============================================
CREATE TABLE reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playgroup_id        UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    session_id          UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    reviewer_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating_environment  SMALLINT NOT NULL CHECK (rating_environment BETWEEN 1 AND 5),
    rating_organization SMALLINT NOT NULL CHECK (rating_organization BETWEEN 1 AND 5),
    rating_compatibility SMALLINT NOT NULL CHECK (rating_compatibility BETWEEN 1 AND 5),
    rating_reliability  SMALLINT NOT NULL CHECK (rating_reliability BETWEEN 1 AND 5),
    comment             TEXT CHECK (char_length(comment) <= 500),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, reviewer_id)
);

CREATE INDEX idx_reviews_playgroup ON reviews(playgroup_id);
CREATE INDEX idx_reviews_session ON reviews(session_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);

-- ============================================
-- Add trust_score + review_count to playgroups
-- ============================================
ALTER TABLE playgroups
    ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- ============================================
-- Trigger: auto-update trust_score on reviews change
-- ============================================
CREATE OR REPLACE FUNCTION update_playgroup_trust_score()
RETURNS TRIGGER AS $$
DECLARE
    target_playgroup_id UUID;
    avg_score NUMERIC;
    total_count INTEGER;
BEGIN
    -- Determine which playgroup to update
    IF TG_OP = 'DELETE' THEN
        target_playgroup_id := OLD.playgroup_id;
    ELSE
        target_playgroup_id := NEW.playgroup_id;
    END IF;

    -- Calculate average of all 4 category averages
    SELECT
        COALESCE(
            ROUND(AVG(
                (rating_environment + rating_organization + rating_compatibility + rating_reliability)::NUMERIC / 4
            ), 2),
            0
        ),
        COUNT(*)
    INTO avg_score, total_count
    FROM reviews
    WHERE playgroup_id = target_playgroup_id;

    -- Update the playgroup
    UPDATE playgroups
    SET trust_score = avg_score,
        review_count = total_count,
        updated_at = NOW()
    WHERE id = target_playgroup_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_trust_score
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_playgroup_trust_score();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews
CREATE POLICY "Anyone can read reviews" ON reviews
    FOR SELECT USING (true);

-- Members can create reviews (not the creator/host)
CREATE POLICY "Members can create reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
            AND memberships.playgroup_id = reviews.playgroup_id
            AND memberships.role = 'member'
        )
    );

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- ============================================
-- Enable realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

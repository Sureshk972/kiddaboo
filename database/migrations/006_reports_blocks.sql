-- ================================================
-- 006: Reports & Blocks
-- Users can report inappropriate behavior and block other users
-- ================================================

-- REPORTS
CREATE TABLE reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_type      VARCHAR(50) NOT NULL CHECK (report_type IN ('inappropriate', 'spam', 'harassment', 'safety_concern', 'fake_profile', 'other')),
    context          VARCHAR(50) CHECK (context IN ('profile', 'message', 'review', 'playgroup')),
    related_id       UUID,
    description      TEXT,
    status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- BLOCKS
CREATE TABLE blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_user_id)
);

-- Indexes
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_user_id);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Reports: users can create, view their own
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Blocks: users can manage their own
CREATE POLICY "Users can create blocks" ON blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can view own blocks" ON blocks
    FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON blocks
    FOR DELETE USING (auth.uid() = blocker_id);

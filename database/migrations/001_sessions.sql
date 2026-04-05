-- Session Scheduling Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- ============================================
-- SESSIONS — scheduled play dates
-- ============================================
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    title           VARCHAR(200),
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    location_name   VARCHAR(200),
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_playgroup ON sessions(playgroup_id);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view sessions for groups they belong to
CREATE POLICY "Members can view sessions" ON sessions FOR SELECT USING (
    playgroup_id IN (
        SELECT playgroup_id FROM memberships
        WHERE user_id = auth.uid() AND role IN ('creator', 'member')
    )
);

-- Only the playgroup creator can create sessions
CREATE POLICY "Creators can create sessions" ON sessions FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT creator_id FROM playgroups WHERE id = playgroup_id)
);

-- Only the playgroup creator can update sessions
CREATE POLICY "Creators can update sessions" ON sessions FOR UPDATE USING (
    auth.uid() IN (SELECT creator_id FROM playgroups WHERE id = playgroup_id)
);

-- Only the playgroup creator can delete sessions
CREATE POLICY "Creators can delete sessions" ON sessions FOR DELETE USING (
    auth.uid() IN (SELECT creator_id FROM playgroups WHERE id = playgroup_id)
);

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

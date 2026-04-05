-- ================================================
-- 005: RSVPs / Session Attendance
-- Members can RSVP to upcoming sessions
-- ================================================

-- Table
CREATE TABLE rsvps (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('going', 'not_going')),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- Indexes
CREATE INDEX idx_rsvps_session ON rsvps(session_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);

-- RLS
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Members can view RSVPs for sessions in their playgroups
CREATE POLICY "Members can view rsvps" ON rsvps FOR SELECT USING (
    session_id IN (
        SELECT s.id FROM sessions s
        JOIN memberships m ON m.playgroup_id = s.playgroup_id
        WHERE m.user_id = auth.uid() AND m.role IN ('creator', 'member')
    )
);

-- Members can create RSVPs for themselves
CREATE POLICY "Members can create rsvps" ON rsvps FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND session_id IN (
        SELECT s.id FROM sessions s
        JOIN memberships m ON m.playgroup_id = s.playgroup_id
        WHERE m.user_id = auth.uid() AND m.role IN ('creator', 'member')
    )
);

-- Users can update their own RSVPs
CREATE POLICY "Users can update own rsvps" ON rsvps FOR UPDATE USING (
    auth.uid() = user_id
);

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete own rsvps" ON rsvps FOR DELETE USING (
    auth.uid() = user_id
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;

-- Push notification trigger (reuses notify_push from 004)
DROP TRIGGER IF EXISTS push_on_rsvp ON rsvps;
CREATE TRIGGER push_on_rsvp
  AFTER INSERT ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION notify_push();

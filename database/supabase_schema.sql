-- Kiddaboo Database Schema for Supabase
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- This uses Supabase Auth's built-in auth.users table for authentication

-- ============================================
-- PROFILES — extends Supabase auth.users
-- ============================================
CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone           VARCHAR(20),
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    bio             TEXT,
    photo_url       TEXT,
    philosophy_tags JSONB DEFAULT '[]',
    trust_score     DECIMAL(3,2) DEFAULT 0.00,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CHILDREN — kids belonging to a user
-- ============================================
CREATE TABLE children (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    age_range       VARCHAR(10),
    personality_tags JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYGROUPS — groups hosted by a mother
-- ============================================
CREATE TABLE playgroups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    location_name   VARCHAR(200),
    age_range       VARCHAR(20),
    frequency       VARCHAR(50),
    vibe_tags       JSONB DEFAULT '[]',
    max_families    INTEGER DEFAULT 8,
    access_type     VARCHAR(20) DEFAULT 'request' CHECK (access_type IN ('open', 'request', 'invite')),
    screening_questions JSONB DEFAULT '[]',
    environment     JSONB DEFAULT '{}',
    photos          JSONB DEFAULT '[]',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERSHIPS — who belongs to which group
-- ============================================
CREATE TABLE memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    role            VARCHAR(20) DEFAULT 'pending' CHECK (role IN ('creator', 'member', 'pending', 'waitlisted', 'declined')),
    intro_message   TEXT,
    screening_answers JSONB DEFAULT '{}',
    joined_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, playgroup_id)
);

-- ============================================
-- REVIEWS — ratings for playgroups
-- ============================================
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    rating_environment   SMALLINT CHECK (rating_environment BETWEEN 1 AND 5),
    rating_organization  SMALLINT CHECK (rating_organization BETWEEN 1 AND 5),
    rating_compatibility SMALLINT CHECK (rating_compatibility BETWEEN 1 AND 5),
    rating_reliability   SMALLINT CHECK (rating_reliability BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reviewer_id, playgroup_id)
);

-- ============================================
-- MESSAGES — in-group messaging
-- ============================================
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_children_user ON children(user_id);
CREATE INDEX idx_playgroups_creator ON playgroups(creator_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_playgroup ON memberships(playgroup_id);
CREATE INDEX idx_reviews_playgroup ON reviews(playgroup_id);
CREATE INDEX idx_messages_playgroup ON messages(playgroup_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE playgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- PROFILES: anyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- CHILDREN: owner can CRUD, others can read
CREATE POLICY "Children are viewable by everyone" ON children FOR SELECT USING (true);
CREATE POLICY "Users can manage own children" ON children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own children" ON children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own children" ON children FOR DELETE USING (auth.uid() = user_id);

-- PLAYGROUPS: anyone can read, creator can manage
CREATE POLICY "Playgroups are viewable by everyone" ON playgroups FOR SELECT USING (true);
CREATE POLICY "Users can create playgroups" ON playgroups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own playgroups" ON playgroups FOR UPDATE USING (auth.uid() = creator_id);

-- MEMBERSHIPS: members & creator can read, anyone can request to join
CREATE POLICY "Memberships are viewable by everyone" ON memberships FOR SELECT USING (true);
CREATE POLICY "Users can request to join" ON memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creators can manage memberships" ON memberships FOR UPDATE USING (
    auth.uid() IN (SELECT creator_id FROM playgroups WHERE id = playgroup_id)
);

-- REVIEWS: anyone can read, reviewer can create
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- MESSAGES: group members can read and send
CREATE POLICY "Members can read messages" ON messages FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM memberships WHERE playgroup_id = messages.playgroup_id AND role IN ('creator', 'member'))
);
CREATE POLICY "Members can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM memberships WHERE playgroup_id = messages.playgroup_id AND role IN ('creator', 'member'))
);

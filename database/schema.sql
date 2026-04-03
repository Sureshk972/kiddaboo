-- Kiddaboo Database Schema
-- PostgreSQL via Supabase
-- Created: 2026-04-02

-- ============================================
-- USERS — mothers/parents on the platform
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    bio             TEXT,
    photo_url       TEXT,
    philosophy_tags JSONB DEFAULT '[]',
    trust_score     DECIMAL(3,2) DEFAULT 0.00,
    is_verified     BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR(100),
    is_premium      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHILDREN — kids belonging to a user
-- ============================================
CREATE TABLE children (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    location_name   VARCHAR(200),
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    full_address    TEXT,                    -- hidden until approved
    vibe_tags       JSONB DEFAULT '[]',
    max_families    INTEGER DEFAULT 8,
    access_type     VARCHAR(20) DEFAULT 'request' CHECK (access_type IN ('open', 'request', 'invite')),
    screening_questions JSONB DEFAULT '[]',  -- custom questions for applicants
    environment_checklist JSONB DEFAULT '{}', -- indoor/outdoor, pets, etc.
    photos          JSONB DEFAULT '[]',
    is_active       BOOLEAN DEFAULT TRUE,
    is_featured     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERSHIPS — who belongs to which group
-- ============================================
CREATE TABLE memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    role            VARCHAR(20) DEFAULT 'pending' CHECK (role IN ('creator', 'member', 'pending', 'waitlisted', 'declined')),
    intro_message   TEXT,
    screening_answers JSONB DEFAULT '{}',
    joined_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, playgroup_id)
);

-- ============================================
-- SESSIONS — scheduled meetups within a group
-- ============================================
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    title           VARCHAR(200),
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    location_name   VARCHAR(200),
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEWS — ratings for playgroups
-- ============================================
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
-- VOUCHES — trust/reputation between mothers
-- ============================================
CREATE TABLE vouches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vouchee_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(voucher_id, vouchee_id)
);

-- ============================================
-- MESSAGES — in-group messaging
-- ============================================
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playgroup_id    UUID NOT NULL REFERENCES playgroups(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_children_user ON children(user_id);
CREATE INDEX idx_playgroups_creator ON playgroups(creator_id);
CREATE INDEX idx_playgroups_location ON playgroups(latitude, longitude);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_playgroup ON memberships(playgroup_id);
CREATE INDEX idx_sessions_playgroup ON sessions(playgroup_id);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_reviews_playgroup ON reviews(playgroup_id);
CREATE INDEX idx_vouches_vouchee ON vouches(vouchee_id);
CREATE INDEX idx_messages_playgroup ON messages(playgroup_id, created_at);

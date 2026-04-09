import { vi } from "vitest";

// Mock user
export const mockUser = {
  id: "test-user-id-123",
  email: "test@example.com",
};

// Mock profile
export const mockProfile = {
  id: "test-user-id-123",
  first_name: "Jane",
  last_name: "Doe",
  bio: "Test bio",
  photo_url: null,
  philosophy_tags: ["montessori-aligned"],
  trust_score: 5,
  is_verified: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  notification_prefs: {},
  role: "user",
};

// Mock admin profile
export const mockAdminProfile = {
  ...mockProfile,
  id: "admin-user-id-456",
  first_name: "Admin",
  last_name: "User",
  role: "admin",
};

// Mock playgroup
export const mockPlaygroup = {
  id: "pg-1",
  creator_id: "test-user-id-123",
  name: "Test Playgroup",
  description: "A test playgroup",
  location_name: "Chicago, IL",
  latitude: 41.8781,
  longitude: -87.6298,
  age_range: "2-4",
  frequency: "weekly",
  vibe_tags: ["structured"],
  max_families: 8,
  access_type: "request",
  photos: [],
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  profiles: { id: "test-user-id-123", first_name: "Jane", last_name: "Doe" },
  memberships: [{ id: "m-1", role: "creator" }],
};

// Mock membership
export const mockMembership = {
  id: "mem-1",
  user_id: "test-user-id-123",
  playgroup_id: "pg-1",
  role: "member",
  created_at: "2026-01-01T00:00:00Z",
};

// Mock supabase query builder
export function createMockQueryBuilder(data = [], error = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };
  // Make it thenable
  builder[Symbol.for("thenableResult")] = { data, error };
  return builder;
}

// Mock supabase client
export function createMockSupabase(overrides = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: mockUser, access_token: "test-token" } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

// Auth context value factory
export function createAuthValue(overrides = {}) {
  return {
    user: mockUser,
    profile: mockProfile,
    loading: false,
    isAdmin: false,
    signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signIn: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({}),
    updateProfile: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    fetchProfile: vi.fn(),
    ...overrides,
  };
}

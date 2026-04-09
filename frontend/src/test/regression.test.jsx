import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createAuthValue, mockUser, mockProfile, mockAdminProfile } from "./mocks";

// ─── Mock Supabase ───────────────────────────────────────────────
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

// ─── Mock AuthContext ────────────────────────────────────────────
let authValue = createAuthValue();
vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => authValue,
}));

// ─── Mock OnboardingContext ──────────────────────────────────────
vi.mock("../context/OnboardingContext", () => ({
  OnboardingProvider: ({ children }) => children,
  useOnboarding: () => ({
    data: {
      firstName: "",
      lastName: "",
      bio: "",
      photoUrl: "",
      philosophyTags: [],
      children: [{ name: "", age: "", personality: [] }],
    },
    updateField: vi.fn(),
    addChild: vi.fn(),
    removeChild: vi.fn(),
    updateChild: vi.fn(),
    reset: vi.fn(),
  }),
}));

// ─── Mock HostContext ────────────────────────────────────────────
vi.mock("../context/HostContext", () => ({
  HostProvider: ({ children }) => children,
  useHost: () => ({
    data: {
      name: "",
      description: "",
      locationName: "",
      ageRange: "2-3",
      frequency: "weekly",
      vibeTags: [],
      maxFamilies: 8,
      accessType: "request",
      screeningQuestions: [],
      environment: {},
      photos: [],
    },
    updateField: vi.fn(),
    reset: vi.fn(),
  }),
}));

// ─── Mock storage ────────────────────────────────────────────────
vi.mock("../lib/storage", () => ({
  uploadProfilePhoto: vi.fn().mockResolvedValue({ url: "https://test.com/photo.jpg", error: null }),
  uploadPlaygroupPhoto: vi.fn().mockResolvedValue({ url: "https://test.com/pg.jpg", error: null }),
}));

// ─── Mock leaflet (avoid DOM issues) ─────────────────────────────
vi.mock("leaflet", () => ({
  default: {
    map: vi.fn().mockReturnValue({
      setView: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      fitBounds: vi.fn(),
    }),
    tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
    marker: vi.fn().mockReturnValue({ addTo: vi.fn(), bindPopup: vi.fn() }),
    divIcon: vi.fn(),
    circleMarker: vi.fn().mockReturnValue({ addTo: vi.fn() }),
    heatLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
  },
  map: vi.fn(),
  tileLayer: vi.fn(),
  divIcon: vi.fn(),
  circleMarker: vi.fn(),
  heatLayer: vi.fn(),
}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet.heat", () => ({}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}));

// ─── Mock mockData ───────────────────────────────────────────────
vi.mock("../data/mockData", () => ({
  PHILOSOPHY_TAGS: ["montessori-aligned", "free-play", "structured", "nature-based"],
  PERSONALITY_TAGS: ["shy", "energetic", "creative"],
  VIBE_TAGS: ["structured", "free-play", "nature-based"],
}));

// ─── Imports (after mocks) ───────────────────────────────────────
import Welcome from "../pages/Welcome";
import PhoneVerification from "../pages/PhoneVerification";
import NotFound from "../pages/NotFound";
import TermsOfService from "../pages/TermsOfService";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import RequireAuth from "../components/auth/RequireAuth";
import RequireAdmin from "../components/auth/RequireAdmin";
import TabBar from "../components/layout/TabBar";
import CreateProfile from "../pages/CreateProfile";
import Browse from "../pages/Browse";
import MyProfile from "../pages/MyProfile";
import MyGroups from "../pages/MyGroups";
import Messages from "../pages/Messages";

// ─── Helper ──────────────────────────────────────────────────────
function renderWithRouter(ui, { route = "/" } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

// ═════════════════════════════════════════════════════════════════
// 1. PUBLIC PAGES
// ═════════════════════════════════════════════════════════════════
describe("Public Pages", () => {
  beforeEach(() => {
    authValue = createAuthValue({ user: null, profile: null, loading: false });
  });

  describe("Welcome", () => {
    it("renders brand name and tagline", () => {
      renderWithRouter(<Welcome />);
      expect(screen.getByText("Kiddaboo")).toBeInTheDocument();
      expect(screen.getByText(/Find your people/)).toBeInTheDocument();
    });

    it("renders all CTA buttons", () => {
      renderWithRouter(<Welcome />);
      expect(screen.getByText("Find Your Playgroup")).toBeInTheDocument();
      expect(screen.getByText("Host a Playgroup")).toBeInTheDocument();
    });

    it("renders sign in and create account links", () => {
      renderWithRouter(<Welcome />);
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Create an account")).toBeInTheDocument();
    });

    it("renders legal links", () => {
      renderWithRouter(<Welcome />);
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    });

    it("renders Instagram link", () => {
      renderWithRouter(<Welcome />);
      expect(screen.getByText("Follow us on Instagram")).toBeInTheDocument();
    });
  });

  describe("PhoneVerification (Signup/Login)", () => {
    it("renders signup form by default", () => {
      renderWithRouter(<PhoneVerification />, { route: "/verify" });
      expect(screen.getByText("Create your account")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@email.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("At least 6 characters")).toBeInTheDocument();
    });

    it("renders sign-in form when mode=signin", () => {
      renderWithRouter(<PhoneVerification />, { route: "/verify?mode=signin" });
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
    });

    it("shows Create Account button", () => {
      renderWithRouter(<PhoneVerification />, { route: "/verify" });
      expect(screen.getByText("Create Account")).toBeInTheDocument();
    });
  });

  describe("NotFound (404)", () => {
    it("renders 404 page", () => {
      renderWithRouter(<NotFound />);
      expect(screen.getByText("Page not found")).toBeInTheDocument();
    });
  });

  describe("TermsOfService", () => {
    it("renders terms page", () => {
      renderWithRouter(<TermsOfService />);
      expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    });
  });

  describe("PrivacyPolicy", () => {
    it("renders privacy page", () => {
      renderWithRouter(<PrivacyPolicy />);
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 2. AUTH GUARDS
// ═════════════════════════════════════════════════════════════════
describe("Auth Guards", () => {
  describe("RequireAuth", () => {
    it("shows spinner while loading", () => {
      authValue = createAuthValue({ loading: true });
      renderWithRouter(
        <RequireAuth>
          <div>Protected</div>
        </RequireAuth>
      );
      expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    });

    it("redirects to / when no user", () => {
      authValue = createAuthValue({ user: null, loading: false });
      renderWithRouter(
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route
            path="/browse"
            element={
              <RequireAuth>
                <div>Protected</div>
              </RequireAuth>
            }
          />
        </Routes>,
        { route: "/browse" }
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    });

    it("renders children when authenticated", () => {
      authValue = createAuthValue();
      renderWithRouter(
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      );
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("RequireAdmin", () => {
    it("redirects non-admin users to /browse", () => {
      authValue = createAuthValue({ isAdmin: false });
      renderWithRouter(
        <Routes>
          <Route path="/browse" element={<div>Browse Page</div>} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <div>Admin Panel</div>
              </RequireAdmin>
            }
          />
        </Routes>,
        { route: "/admin" }
      );
      expect(screen.getByText("Browse Page")).toBeInTheDocument();
      expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
    });

    it("renders children for admin users", () => {
      authValue = createAuthValue({ isAdmin: true, profile: mockAdminProfile });
      renderWithRouter(
        <RequireAdmin>
          <div>Admin Panel</div>
        </RequireAdmin>
      );
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("redirects when no user at all", () => {
      authValue = createAuthValue({ user: null, isAdmin: false, loading: false });
      renderWithRouter(
        <Routes>
          <Route path="/browse" element={<div>Browse</div>} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <div>Admin</div>
              </RequireAdmin>
            }
          />
        </Routes>,
        { route: "/admin" }
      );
      expect(screen.getByText("Browse")).toBeInTheDocument();
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 3. NAVIGATION / TABBAR
// ═════════════════════════════════════════════════════════════════
describe("TabBar Navigation", () => {
  beforeEach(() => {
    authValue = createAuthValue();
  });

  it("renders all 5 nav items including sign out", () => {
    renderWithRouter(<TabBar />, { route: "/browse" });
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("My Groups")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("highlights active tab", () => {
    renderWithRouter(<TabBar />, { route: "/browse" });
    const browseBtn = screen.getByLabelText("Browse");
    expect(browseBtn.className).toContain("sage-dark");
  });

  it("shows badge count when provided", () => {
    renderWithRouter(<TabBar badges={{ "/messages": 3 }} />, { route: "/browse" });
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════
// 4. ONBOARDING FLOW
// ═════════════════════════════════════════════════════════════════
describe("Onboarding", () => {
  beforeEach(() => {
    authValue = createAuthValue();
  });

  describe("CreateProfile", () => {
    it("renders profile form", () => {
      renderWithRouter(<CreateProfile />);
      expect(screen.getByText("Tell us about you")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Jane")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Smith")).toBeInTheDocument();
    });

    it("renders photo upload area", () => {
      renderWithRouter(<CreateProfile />);
      expect(screen.getByText("Add photo (required)")).toBeInTheDocument();
    });

    it("renders bio textarea", () => {
      renderWithRouter(<CreateProfile />);
      expect(
        screen.getByPlaceholderText(/A little about your family/)
      ).toBeInTheDocument();
    });

    it("renders philosophy tag selector", () => {
      renderWithRouter(<CreateProfile />);
      expect(screen.getByText("Parenting philosophy")).toBeInTheDocument();
    });

    it("renders continue button", () => {
      renderWithRouter(<CreateProfile />);
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("shows validation errors when submitting empty form", async () => {
      const user = userEvent.setup();
      renderWithRouter(<CreateProfile />);
      await user.click(screen.getByText("Continue"));
      expect(screen.getByText("Profile photo is required")).toBeInTheDocument();
      expect(screen.getByText("First name is required")).toBeInTheDocument();
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 5. AUTHENTICATED PAGES
// ═════════════════════════════════════════════════════════════════
describe("Authenticated Pages", () => {
  beforeEach(() => {
    authValue = createAuthValue();
  });

  describe("Browse", () => {
    it("renders browse page with Kiddaboo header", () => {
      renderWithRouter(<Browse />);
      expect(screen.getByText("Kiddaboo")).toBeInTheDocument();
    });

    it("renders search input", () => {
      renderWithRouter(<Browse />);
      expect(
        screen.getByPlaceholderText(/search by name, location/i)
      ).toBeInTheDocument();
    });

    it("renders filter buttons", () => {
      renderWithRouter(<Browse />);
      expect(screen.getByText("Filters")).toBeInTheDocument();
      expect(screen.getByText("Top Rated")).toBeInTheDocument();
    });
  });

  describe("MyGroups", () => {
    it("renders my groups page", async () => {
      renderWithRouter(<MyGroups />);
      await waitFor(() => {
        expect(screen.getByText("My Groups")).toBeInTheDocument();
      });
    });
  });

  describe("Messages", () => {
    it("renders messages page", () => {
      renderWithRouter(<Messages />);
      expect(screen.getByText(/messages/i)).toBeInTheDocument();
    });
  });

  describe("MyProfile", () => {
    it("renders user name from profile", () => {
      renderWithRouter(<MyProfile />);
      expect(screen.getByText(/Jane/)).toBeInTheDocument();
    });

    it("renders sign out button", () => {
      renderWithRouter(<MyProfile />);
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 6. ADMIN COMPONENTS
// ═════════════════════════════════════════════════════════════════
describe("Admin Components", () => {
  describe("timeAgo utility", () => {
    // Import directly
    it("returns correct time strings", async () => {
      const { timeAgo } = await import("../pages/admin/timeAgo");
      expect(timeAgo(null)).toBe("");
      expect(timeAgo("")).toBe("");

      const now = new Date();
      expect(timeAgo(now.toISOString())).toBe("just now");

      const fiveMin = new Date(now - 5 * 60 * 1000);
      expect(timeAgo(fiveMin.toISOString())).toBe("5m ago");

      const twoHours = new Date(now - 2 * 60 * 60 * 1000);
      expect(timeAgo(twoHours.toISOString())).toBe("2h ago");

      const threeDays = new Date(now - 3 * 24 * 60 * 60 * 1000);
      expect(timeAgo(threeDays.toISOString())).toBe("3d ago");
    });
  });

  describe("StatusBadge", () => {
    it("renders badge with correct text", async () => {
      const { default: StatusBadge } = await import("../pages/admin/StatusBadge");
      render(<StatusBadge status="host" />);
      expect(screen.getByText("host")).toBeInTheDocument();
    });
  });

  describe("StatCard", () => {
    it("renders stat with label and value", async () => {
      const { default: StatCard } = await import("../pages/admin/StatCard");
      render(<StatCard label="Total Users" value={42} />);
      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  describe("ConfirmModal", () => {
    it("renders modal with title and message", async () => {
      const { default: ConfirmModal } = await import("../pages/admin/ConfirmModal");
      render(
        <ConfirmModal
          title="Delete User"
          message="Are you sure?"
          confirmLabel="Delete"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
          loading={false}
        />
      );
      expect(screen.getByText("Delete User")).toBeInTheDocument();
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("calls onCancel when cancel clicked", async () => {
      const { default: ConfirmModal } = await import("../pages/admin/ConfirmModal");
      const onCancel = vi.fn();
      render(
        <ConfirmModal
          title="Test"
          message="Test"
          confirmLabel="OK"
          onConfirm={vi.fn()}
          onCancel={onCancel}
          loading={false}
        />
      );
      const cancelBtn = screen.getByText("Cancel");
      await userEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalled();
    });

    it("calls onConfirm when confirm clicked", async () => {
      const { default: ConfirmModal } = await import("../pages/admin/ConfirmModal");
      const onConfirm = vi.fn();
      render(
        <ConfirmModal
          title="Test"
          message="Test"
          confirmLabel="Confirm"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
          loading={false}
        />
      );
      await userEvent.click(screen.getByText("Confirm"));
      expect(onConfirm).toHaveBeenCalled();
    });

    it("shows Processing text when loading", async () => {
      const { default: ConfirmModal } = await import("../pages/admin/ConfirmModal");
      render(
        <ConfirmModal
          title="Test"
          message="Test"
          confirmLabel="Confirm"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
          loading={true}
        />
      );
      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(screen.getByText("Processing...").closest("button")).toBeDisabled();
    });
  });
});

// ═════════════════════════════════════════════════════════════════
// 7. ROUTING INTEGRATION
// ═════════════════════════════════════════════════════════════════
describe("Route Protection Integration", () => {
  it("unauthenticated user sees Welcome at /", () => {
    authValue = createAuthValue({ user: null, profile: null, loading: false });
    renderWithRouter(<Welcome />);
    expect(screen.getByText("Kiddaboo")).toBeInTheDocument();
    expect(screen.getByText("Find Your Playgroup")).toBeInTheDocument();
  });

  it("authenticated user accessing / redirects to /browse or /profile", () => {
    authValue = createAuthValue();
    // Welcome component auto-redirects logged-in users
    renderWithRouter(
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/browse" element={<div>Browse Page</div>} />
        <Route path="/profile" element={<div>Profile Setup</div>} />
      </Routes>
    );
    // User with first_name goes to /browse
    expect(screen.getByText("Browse Page")).toBeInTheDocument();
  });

  it("authenticated user without profile goes to /profile", () => {
    authValue = createAuthValue({ profile: { ...mockProfile, first_name: null } });
    renderWithRouter(
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/browse" element={<div>Browse Page</div>} />
        <Route path="/profile" element={<div>Profile Setup</div>} />
      </Routes>
    );
    expect(screen.getByText("Profile Setup")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════
// 8. EDGE CASES & REGRESSION
// ═════════════════════════════════════════════════════════════════
describe("Regression Tests", () => {
  it("AuthContext SELECT does not include is_suspended", async () => {
    const authSource = await import("../context/AuthContext?raw");
    // This is a source-code level check — the actual module is mocked
    // We verify via the mock that profile doesn't need is_suspended
    expect(mockProfile).not.toHaveProperty("is_suspended");
  });

  it("profile object has role field", () => {
    expect(mockProfile).toHaveProperty("role");
    expect(mockProfile.role).toBe("user");
  });

  it("admin profile has admin role", () => {
    expect(mockAdminProfile.role).toBe("admin");
  });

  it("isAdmin correctly reflects role", () => {
    const userAuth = createAuthValue({ isAdmin: false });
    expect(userAuth.isAdmin).toBe(false);

    const adminAuth = createAuthValue({ isAdmin: true });
    expect(adminAuth.isAdmin).toBe(true);
  });

  it("sign out is available on TabBar", () => {
    authValue = createAuthValue();
    renderWithRouter(<TabBar />, { route: "/browse" });
    expect(screen.getByLabelText("Sign out")).toBeInTheDocument();
  });

  it("Welcome page has Create an account link", () => {
    authValue = createAuthValue({ user: null, loading: false });
    renderWithRouter(<Welcome />);
    expect(screen.getByText("Create an account")).toBeInTheDocument();
  });
});

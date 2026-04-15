# Role Identity & Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Kiddaboo a strong role identity (Parent vs Organizer) and strong user identity (real name + phone verification + trust signals), structured so the work carries over verbatim to the WelbyRise reskin.

**Architecture:** One `profiles.account_type` column drives two mode layouts (`ParentLayout` / `OrganizerLayout`) that differ in accent color, mode label, and bottom nav. URLs stay as-is; a `<RequireRole>` guard redirects cross-mode access. A new `ChooseRole` signup page forces new users to pick a role before anything else. Phone OTP is the single verification mechanism; a Supabase edge function pair (`send-otp` / `verify-otp`) talks to Twilio. The `ProfilePanel` component is restructured around a fixed set of v1 trust signals.

**Tech Stack:** React 18.2 + Vite 4.4 + React Router v6 + Tailwind 3.4 + Supabase (Postgres + Edge Functions) + Twilio Verify + Stripe. Test harness: Vitest 4 + @testing-library/react + jsdom (already installed). No Playwright in v1 — manual e2e only.

**Milestone structure:** Three independently shippable milestones.
- **M1 — Role identity core** (Tasks 1–12). Migration, `account_type`, layouts, signup path picker, copy rename. Ships perceptual role separation.
- **M2 — Phone OTP verification** (Tasks 13–19). New tables, edge functions, onboarding step, verified badge data.
- **M3 — Profile panel trust redesign** (Tasks 20–25). Restructured `ProfilePanel` + unified playgroup detail member list + badge components.

Each milestone ends in a deployable state. Do not start M2 until M1 is merged. Do not start M3 until M2 is merged.

---

## File Structure

### New files
- `supabase/migrations/20260416000001_add_account_type.sql` — profiles.account_type column + backfill
- `supabase/migrations/20260416000002_add_phone_verification.sql` — phone columns + phone_otp_challenges table (M2)
- `frontend/src/layouts/ParentLayout.jsx` — sage accent, Parent bottom nav, "PARENT" mode label
- `frontend/src/layouts/OrganizerLayout.jsx` — terracotta accent, Organizer bottom nav
- `frontend/src/layouts/SharedLayout.jsx` — for /my-profile, /premium, /admin
- `frontend/src/components/auth/RequireRole.jsx` — redirects users on the wrong-role route
- `frontend/src/pages/onboarding/ChooseRole.jsx` — two-card role picker landing
- `frontend/src/pages/onboarding/PhoneVerify.jsx` — OTP step (M2)
- `frontend/src/hooks/useAccountType.js` — thin accessor over `profile.account_type`
- `frontend/src/hooks/usePhoneVerification.js` — OTP send/verify (M2)
- `frontend/src/components/profile/ProfilePanel.jsx` — redesigned trust panel (M3)
- `frontend/src/components/profile/VerifiedBadge.jsx` — green check overlay (M3)
- `frontend/src/components/profile/RoleBadge.jsx` — Organizer/Parent pill (M3)
- `supabase/functions/send-otp/index.ts` — Twilio send (M2)
- `supabase/functions/verify-otp/index.ts` — code validation (M2)
- Tests (one per above component/hook/function under matching `__tests__/` or co-located `.test.js(x)` files)

### Modified files
- `frontend/src/context/AuthContext.jsx` — expose `accountType`, remove `isHost` membership query (still compute for back-compat until callers migrated)
- `frontend/src/components/layout/TabBar.jsx` — switch from `isHost` to `accountType`
- `frontend/src/App.jsx` — wrap routes in role-specific layouts + `<RequireRole>` gates
- `frontend/src/pages/Welcome.jsx` — reroute to `/choose-role` instead of `/verify` when no `account_type`
- `frontend/src/pages/MyProfile.jsx` — rename "Host Premium" → "Organizer Premium"
- `frontend/src/pages/Browse.jsx` — "Host a Playgroup" → "Organize a Playgroup"
- `frontend/src/pages/MyGroups.jsx` — same
- `frontend/src/pages/host/HostDashboard.jsx` — "Host a Playgroup" → "Organize a Playgroup", "Go Host Premium" → "Go Organizer Premium"
- `frontend/src/pages/host/HostInsights.jsx` — same
- `frontend/src/pages/host/HostPremium.jsx` — all "Host Premium" → "Organizer Premium"
- `frontend/src/pages/admin/SubscriptionsTab.jsx` — "Host Premium" label → "Organizer Premium"
- `frontend/src/pages/PlaygroupDetail.jsx` — use unified member list + RoleBadge (M3)
- `supabase/config.toml` — register new edge functions (M2)
- `frontend/src/test/regression.test.jsx` — update expectation to "Organize a Playgroup"

### Files that keep DB identifiers (DO NOT RENAME)
- `memberships.role = 'creator'` — DB value stays
- `subscriptions.type = 'host_premium'` — DB value stays
- `subscriptions.plan` prefixes (`host_monthly`, `host_annual`) — stay
- Edge function names that reference "host" — stay unless specifically listed above
- Route paths (`/host/dashboard`, `/host/premium`, `/host/create`, ...) — stay in v1

Reasoning: a rename at the DB/URL level is a much riskier change with no user-visible benefit. The user sees "Organizer" everywhere; the code continues to call it `host`/`creator` internally.

---

# M1 — Role Identity Core

## Task 1: Migration for `profiles.account_type`

**Files:**
- Create: `supabase/migrations/20260416000001_add_account_type.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260416000001_add_account_type.sql
-- Adds profiles.account_type so we can distinguish Parent vs Organizer
-- users without the expensive memberships.role='creator' lookup every
-- AuthContext fetch does today.

ALTER TABLE profiles
  ADD COLUMN account_type TEXT
  CHECK (account_type IN ('parent', 'organizer'))
  NOT NULL DEFAULT 'parent';

-- Backfill: anyone who has ever been a group creator is an organizer.
-- Everyone else stays 'parent' (the default).
UPDATE profiles p
SET account_type = 'organizer'
WHERE EXISTS (
  SELECT 1
  FROM memberships m
  WHERE m.user_id = p.id
    AND m.role = 'creator'
);

-- Drop the default so new signups MUST pick a role explicitly via the
-- ChooseRole path picker. Any insert that omits account_type will now
-- error, which is what we want.
ALTER TABLE profiles ALTER COLUMN account_type DROP DEFAULT;

-- Index — we'll filter by account_type in admin views and usage stats.
CREATE INDEX IF NOT EXISTS profiles_account_type_idx
  ON profiles (account_type);
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/sureshkumar/Kiddaboo && supabase db push`
Expected: migration applied cleanly; `\d profiles` shows the new column.

- [ ] **Step 3: Verify the backfill with a spot check**

Run from the Supabase SQL editor:
```sql
SELECT account_type, count(*) FROM profiles GROUP BY account_type;
```
Expected: `organizer` count equals the number of distinct `memberships.user_id` with `role='creator'`. `parent` count is everyone else.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260416000001_add_account_type.sql
git commit -m "feat: add profiles.account_type column + backfill existing creators"
```

---

## Task 2: AuthContext exposes `accountType`

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`
- Test: `frontend/src/context/AuthContext.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/context/AuthContext.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { vi } from "vitest";

vi.mock("../lib/supabase");

function Probe() {
  const { accountType, loading } = useAuth();
  return <div>type={loading ? "…" : accountType ?? "null"}</div>;
}

test("AuthContext exposes accountType from the profiles row", async () => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "u1" } } },
  });
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: "u1", first_name: "A", account_type: "organizer" }, error: null }),
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  });

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  await waitFor(() => expect(screen.getByText("type=organizer")).toBeInTheDocument());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sureshkumar/Kiddaboo/frontend && npm test -- AuthContext`
Expected: FAIL — `accountType` is undefined.

- [ ] **Step 3: Update AuthContext**

Edit `frontend/src/context/AuthContext.jsx`:

Replace the `select` in `fetchProfile` (line 46) to add `account_type`:

```js
.select("id, first_name, last_name, bio, photo_url, philosophy_tags, trust_score, is_verified, created_at, updated_at, notification_prefs, role, account_type")
```

Replace the same `select` in `updateProfile` (line 111) the same way.

In the provider value (line 127), add `accountType: profile?.account_type ?? null`:

```jsx
<AuthContext.Provider
  value={{
    user,
    profile,
    loading,
    isAdmin,
    isHost,
    accountType: profile?.account_type ?? null,
    refreshHostStatus,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
  }}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/sureshkumar/Kiddaboo/frontend && npm test -- AuthContext`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.jsx frontend/src/context/AuthContext.test.jsx
git commit -m "feat: expose accountType from AuthContext"
```

---

## Task 3: `useAccountType` hook

**Files:**
- Create: `frontend/src/hooks/useAccountType.js`
- Test: `frontend/src/hooks/useAccountType.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/hooks/useAccountType.test.jsx
import { renderHook } from "@testing-library/react";
import { useAccountType } from "./useAccountType";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "../context/AuthContext";

test("returns parent/organizer booleans", () => {
  useAuth.mockReturnValue({ accountType: "organizer", loading: false });
  const { result } = renderHook(() => useAccountType());
  expect(result.current).toEqual({
    accountType: "organizer",
    isParent: false,
    isOrganizer: true,
    loading: false,
  });
});

test("returns null+false+false while loading", () => {
  useAuth.mockReturnValue({ accountType: null, loading: true });
  const { result } = renderHook(() => useAccountType());
  expect(result.current.isParent).toBe(false);
  expect(result.current.isOrganizer).toBe(false);
  expect(result.current.loading).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useAccountType`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook**

```js
// frontend/src/hooks/useAccountType.js
import { useAuth } from "../context/AuthContext";

/**
 * Thin accessor over AuthContext.accountType. Prefer this over reading
 * profile.account_type directly so we have one seam to swap if the
 * source of truth ever moves (e.g., into a JWT claim).
 */
export function useAccountType() {
  const { accountType, loading } = useAuth();
  return {
    accountType,
    isParent: accountType === "parent",
    isOrganizer: accountType === "organizer",
    loading,
  };
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- useAccountType`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAccountType.js frontend/src/hooks/useAccountType.test.jsx
git commit -m "feat: add useAccountType hook"
```

---

## Task 4: `<RequireRole>` route guard

**Files:**
- Create: `frontend/src/components/auth/RequireRole.jsx`
- Test: `frontend/src/components/auth/RequireRole.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/auth/RequireRole.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireRole from "./RequireRole";
import { vi } from "vitest";

vi.mock("../../hooks/useAccountType", () => ({ useAccountType: vi.fn() }));
import { useAccountType } from "../../hooks/useAccountType";

function renderAt(initial, role) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/browse" element={<RequireRole role={role}><div>browse-content</div></RequireRole>} />
        <Route path="/host/dashboard" element={<div>dashboard-content</div>} />
      </Routes>
    </MemoryRouter>
  );
}

test("renders children when role matches", () => {
  useAccountType.mockReturnValue({ accountType: "parent", isParent: true, isOrganizer: false, loading: false });
  renderAt("/browse", "parent");
  expect(screen.getByText("browse-content")).toBeInTheDocument();
});

test("redirects organizers away from parent routes", () => {
  useAccountType.mockReturnValue({ accountType: "organizer", isParent: false, isOrganizer: true, loading: false });
  renderAt("/browse", "parent");
  expect(screen.getByText("dashboard-content")).toBeInTheDocument();
});

test("shows loading state while accountType is resolving", () => {
  useAccountType.mockReturnValue({ accountType: null, isParent: false, isOrganizer: false, loading: true });
  renderAt("/browse", "parent");
  expect(screen.queryByText("browse-content")).not.toBeInTheDocument();
  expect(screen.queryByText("dashboard-content")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RequireRole`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the guard**

```jsx
// frontend/src/components/auth/RequireRole.jsx
import { Navigate } from "react-router-dom";
import { useAccountType } from "../../hooks/useAccountType";

const HOME_FOR = {
  parent: "/browse",
  organizer: "/host/dashboard",
};

/**
 * Blocks a route so only the given role can see it. If a user with the
 * wrong role hits this route, they are bounced to their own home. If
 * accountType is still loading we render nothing (the global splash
 * from RequireAuth already covers that case).
 */
export default function RequireRole({ role, children }) {
  const { accountType, loading } = useAccountType();
  if (loading) return null;
  if (accountType !== role) {
    return <Navigate to={HOME_FOR[accountType] || "/"} replace />;
  }
  return children;
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- RequireRole`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/auth/RequireRole.jsx frontend/src/components/auth/RequireRole.test.jsx
git commit -m "feat: add RequireRole route guard"
```

---

## Task 5: ParentLayout wrapper

**Files:**
- Create: `frontend/src/layouts/ParentLayout.jsx`
- Test: `frontend/src/layouts/ParentLayout.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/layouts/ParentLayout.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ParentLayout from "./ParentLayout";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn(), accountType: "parent" }),
}));

test("shows PARENT mode label and sage accent", () => {
  render(
    <MemoryRouter>
      <ParentLayout><div>child</div></ParentLayout>
    </MemoryRouter>
  );
  expect(screen.getByText("PARENT")).toBeInTheDocument();
  expect(screen.getByText("child")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- ParentLayout`
Expected: FAIL.

- [ ] **Step 3: Write the layout**

```jsx
// frontend/src/layouts/ParentLayout.jsx
import TabBar from "../components/layout/TabBar";

/**
 * Parent-mode wrapper. Adds the small uppercase "PARENT" label at the
 * top of the page and reserves space for the bottom TabBar. We rely on
 * TabBar to pick the correct tabs via accountType.
 *
 * Accent color (sage #5C6B52) is already the global default in
 * Kiddaboo, so there's nothing to override here. The Organizer layout
 * does the overriding.
 */
export default function ParentLayout({ children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="parent">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="px-5 pt-3">
          <span className="text-[10px] font-bold tracking-[1.5px] text-sage-dark uppercase">
            Parent
          </span>
        </div>
        <div className="flex-1">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- ParentLayout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/ParentLayout.jsx frontend/src/layouts/ParentLayout.test.jsx
git commit -m "feat: add ParentLayout wrapper"
```

---

## Task 6: OrganizerLayout wrapper

**Files:**
- Create: `frontend/src/layouts/OrganizerLayout.jsx`
- Test: `frontend/src/layouts/OrganizerLayout.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/layouts/OrganizerLayout.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrganizerLayout from "./OrganizerLayout";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn(), accountType: "organizer" }),
}));

test("shows ORGANIZER mode label with terracotta tint", () => {
  render(
    <MemoryRouter>
      <OrganizerLayout><div>child</div></OrganizerLayout>
    </MemoryRouter>
  );
  const label = screen.getByText("ORGANIZER");
  expect(label).toBeInTheDocument();
  expect(label.className).toMatch(/terracotta/);
  expect(screen.getByText("child")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- OrganizerLayout`
Expected: FAIL.

- [ ] **Step 3: Write the layout**

```jsx
// frontend/src/layouts/OrganizerLayout.jsx
import TabBar from "../components/layout/TabBar";

/**
 * Organizer-mode wrapper. Terracotta accent, "ORGANIZER" label, and
 * warmer background so the mode feels visually different from Parent.
 * We scope the accent with data-mode="organizer" so individual pages
 * can opt into mode-aware styling via CSS attribute selectors if they
 * want (e.g., buttons that read from [data-mode=organizer] .btn).
 */
export default function OrganizerLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F9F4ED] flex flex-col" data-mode="organizer">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="px-5 pt-3">
          <span className="text-[10px] font-bold tracking-[1.5px] text-terracotta uppercase">
            Organizer
          </span>
        </div>
        <div className="flex-1">{children}</div>
        <TabBar />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- OrganizerLayout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/OrganizerLayout.jsx frontend/src/layouts/OrganizerLayout.test.jsx
git commit -m "feat: add OrganizerLayout wrapper"
```

---

## Task 7: TabBar switches from `isHost` to `accountType`

**Files:**
- Modify: `frontend/src/components/layout/TabBar.jsx`
- Test: `frontend/src/components/layout/TabBar.test.jsx` (new)

The existing TabBar at `TabBar.jsx:190` reads `const { signOut, isHost } = useAuth();` and picks `isHost ? HOST_TABS : PARENT_TABS`. Switch to `accountType === 'organizer'` so the decision aligns with the new source of truth. Copy change: "Dashboard" (HOST_TABS) → "My Group" per the approved mode-home mockup; "My Group" is also the tab label shown in the design spec D4 bullet. Other tab labels unchanged.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/layout/TabBar.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TabBar from "./TabBar";
import { vi } from "vitest";

vi.mock("../../context/AuthContext");
import { useAuth } from "../../context/AuthContext";

const setAuth = (accountType) =>
  useAuth.mockReturnValue({ signOut: vi.fn(), isHost: accountType === "organizer", accountType });

test("parent sees Browse / My Groups / Messages / Profile", () => {
  setAuth("parent");
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.getByLabelText("Browse")).toBeInTheDocument();
  expect(screen.getByLabelText("My Groups")).toBeInTheDocument();
  expect(screen.queryByLabelText("My Group")).not.toBeInTheDocument();
});

test("organizer sees My Group / Members / Messages / Profile", () => {
  setAuth("organizer");
  render(<MemoryRouter><TabBar /></MemoryRouter>);
  expect(screen.getByLabelText("My Group")).toBeInTheDocument();
  expect(screen.queryByLabelText("Browse")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- TabBar`
Expected: FAIL (no "My Group" tab, organizer tabs still say "Dashboard").

- [ ] **Step 3: Update TabBar**

Edit `frontend/src/components/layout/TabBar.jsx`:

Replace the `HOST_TABS` array (lines 175–185) with:

```js
const ORGANIZER_TABS = [
  {
    path: "/host/dashboard",
    matchPaths: ["/host/dashboard", "/my-groups"],
    label: "My Group",
    icon: DashboardIcon,
  },
  { path: "/host/insights", label: "Members", icon: InsightsIcon },
  { path: "/messages", label: "Messages", icon: MessagesIcon },
  { path: "/my-profile", label: "Profile", icon: ProfileIcon },
];
```

Replace line 190–191:

```js
  const { signOut, accountType } = useAuth();
  const TABS = accountType === "organizer" ? ORGANIZER_TABS : PARENT_TABS;
```

Rename every remaining `HOST_TABS` reference in the file to `ORGANIZER_TABS` (there should be none after the above edit — grep to confirm).

- [ ] **Step 4: Run test**

Run: `npm test -- TabBar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/TabBar.jsx frontend/src/components/layout/TabBar.test.jsx
git commit -m "feat: TabBar reads accountType; organizer tabs renamed to My Group/Members"
```

---

## Task 8: ChooseRole signup landing

**Files:**
- Create: `frontend/src/pages/onboarding/ChooseRole.jsx`
- Test: `frontend/src/pages/onboarding/ChooseRole.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/pages/onboarding/ChooseRole.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ChooseRole from "./ChooseRole";
import { vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => navigate,
}));

test("clicking Parent card routes to /verify?role=parent", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /I'm a Parent/i }));
  expect(navigate).toHaveBeenCalledWith("/verify?role=parent");
});

test("clicking Organizer card routes to /verify?role=organizer", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /I'm an Organizer/i }));
  expect(navigate).toHaveBeenCalledWith("/verify?role=organizer");
});

test("renders footer note about adding the other role later", () => {
  render(<MemoryRouter><ChooseRole /></MemoryRouter>);
  expect(screen.getByText(/add the other role later/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- ChooseRole`
Expected: FAIL.

- [ ] **Step 3: Implement the picker**

```jsx
// frontend/src/pages/onboarding/ChooseRole.jsx
import { useNavigate } from "react-router-dom";

/**
 * First screen a new user sees. Picks their account_type before any
 * signup happens. Per design D2, the choice is side-by-side with
 * role-noun framing. The role is passed to /verify via query param;
 * that page persists it after auth succeeds and before the profile
 * row is created.
 */
export default function ChooseRole() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-10">
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "'ChunkFive', serif", color: "#5C6B52" }}
      >
        Kiddaboo
      </h1>
      <p className="text-taupe text-center mb-10">Which best describes you?</p>

      <div className="w-full max-w-md flex flex-col gap-4">
        <button
          onClick={() => navigate("/verify?role=parent")}
          className="bg-white border-2 border-sage rounded-2xl p-6 text-left cursor-pointer hover:bg-sage-light/30 transition-colors"
        >
          <div className="text-xs text-sage-dark uppercase tracking-widest font-bold mb-2">Parent</div>
          <div className="text-lg font-bold text-charcoal mb-1">I'm a Parent</div>
          <div className="text-sm text-taupe">Looking for a playgroup for my child</div>
        </button>

        <button
          onClick={() => navigate("/verify?role=organizer")}
          className="bg-white border-2 border-terracotta rounded-2xl p-6 text-left cursor-pointer hover:bg-terracotta-light/30 transition-colors"
        >
          <div className="text-xs text-terracotta uppercase tracking-widest font-bold mb-2">Organizer</div>
          <div className="text-lg font-bold text-charcoal mb-1">I'm an Organizer</div>
          <div className="text-sm text-taupe">Starting or running a playgroup</div>
        </button>
      </div>

      <p className="text-xs text-taupe/60 mt-6">You can add the other role later.</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- ChooseRole`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/onboarding/ChooseRole.jsx frontend/src/pages/onboarding/ChooseRole.test.jsx
git commit -m "feat: add ChooseRole signup landing with Parent/Organizer cards"
```

---

## Task 9: Persist role from query param after signup

**Files:**
- Modify: `frontend/src/pages/PhoneVerification.jsx` (or wherever `/verify` currently lives — confirm with `grep -rn "path=\"/verify\"" frontend/src`)
- Modify: `frontend/src/pages/CreateProfile.jsx` — write `account_type` when the profile row is created

The role chosen on `ChooseRole` arrives at `/verify` as `?role=parent|organizer`. Read it there, stash in `sessionStorage` under `kiddaboo.pendingAccountType`, then write it into the `profiles` row at the point `CreateProfile` inserts/updates.

- [ ] **Step 1: Read the query param and stash it**

In `PhoneVerification.jsx` (or the component mounted at `/verify`), add at the top of the component:

```jsx
import { useSearchParams } from "react-router-dom";
// ...existing imports

export default function PhoneVerification() {
  const [searchParams] = useSearchParams();
  // Stash role once on mount so it survives the OAuth / magic-link
  // round-trip and is available to CreateProfile afterwards.
  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "parent" || role === "organizer") {
      sessionStorage.setItem("kiddaboo.pendingAccountType", role);
    }
  }, [searchParams]);
  // ...rest unchanged
}
```

- [ ] **Step 2: Write the role into the profiles row**

In `CreateProfile.jsx`, locate the `.from("profiles").upsert({...})` (or `.update(...)`) call where the profile is persisted. Add `account_type`:

```jsx
const pendingAccountType = sessionStorage.getItem("kiddaboo.pendingAccountType");
// Fail closed: if no role was chosen (shouldn't happen after ChooseRole
// is the entry point), send the user back to pick one.
if (!pendingAccountType) {
  navigate("/choose-role");
  return;
}

const { error } = await supabase
  .from("profiles")
  .upsert({
    id: user.id,
    first_name,
    last_name,
    // ...existing fields
    account_type: pendingAccountType,
  });

if (!error) {
  sessionStorage.removeItem("kiddaboo.pendingAccountType");
  // ...existing navigate
}
```

- [ ] **Step 3: Manually verify**

Run dev server (`npm run dev`), visit `/choose-role`, click Organizer, complete signup. Check `select account_type from profiles where id = '<new user id>';` returns `organizer`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PhoneVerification.jsx frontend/src/pages/CreateProfile.jsx
git commit -m "feat: persist chosen role from ChooseRole into profiles.account_type"
```

---

## Task 10: Wire layouts + role guards into App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

Replace each `<AppLayout>` wrapper with the role-specific layout guarded by `<RequireRole>`, and add the `/choose-role` route. The existing `AppLayout` stays for now as a thin shared wrapper; the role-specific ones are new.

- [ ] **Step 1: Add the new imports at the top of App.jsx**

```jsx
import ParentLayout from "./layouts/ParentLayout";
import OrganizerLayout from "./layouts/OrganizerLayout";
import RequireRole from "./components/auth/RequireRole";
import ChooseRole from "./pages/onboarding/ChooseRole";
```

- [ ] **Step 2: Add the `/choose-role` public route**

Above the existing `/` route (line 46):

```jsx
<Route path="/choose-role" element={<ChooseRole />} />
```

- [ ] **Step 3: Replace Parent-mode routes**

Lines 77–80 change from:
```jsx
<Route path="/browse" element={<RequireAuth><AppLayout><Browse /></AppLayout></RequireAuth>} />
<Route path="/my-groups" element={<RequireAuth><AppLayout><MyGroups /></AppLayout></RequireAuth>} />
```
to:
```jsx
<Route path="/browse" element={<RequireAuth><RequireRole role="parent"><ParentLayout><Browse /></ParentLayout></RequireRole></RequireAuth>} />
<Route path="/my-groups" element={<RequireAuth><RequireRole role="parent"><ParentLayout><MyGroups /></ParentLayout></RequireRole></RequireAuth>} />
```

- [ ] **Step 4: Replace Organizer-mode routes**

Lines 81–82 change from:
```jsx
<Route path="/host/dashboard" element={<RequireAuth><AppLayout><HostDashboard /></AppLayout></RequireAuth>} />
<Route path="/host/insights" element={<RequireAuth><AppLayout><HostInsights /></AppLayout></RequireAuth>} />
```
to:
```jsx
<Route path="/host/dashboard" element={<RequireAuth><RequireRole role="organizer"><OrganizerLayout><HostDashboard /></OrganizerLayout></RequireRole></RequireAuth>} />
<Route path="/host/insights" element={<RequireAuth><RequireRole role="organizer"><OrganizerLayout><HostInsights /></OrganizerLayout></RequireRole></RequireAuth>} />
```

- [ ] **Step 5: Leave shared routes alone**

`/messages` and `/my-profile` stay wrapped in `<AppLayout>` — these are layout-neutral. No `<RequireRole>` on them.

- [ ] **Step 6: Update Welcome.jsx redirect logic**

In `frontend/src/pages/Welcome.jsx` lines 11–21, replace the `isHost` redirect with `accountType`:

```jsx
const { user, profile, loading } = useAuth();

useEffect(() => {
  if (!loading && user) {
    if (!profile?.first_name) {
      navigate("/profile");
    } else if (profile.account_type === "organizer") {
      navigate("/host/dashboard");
    } else {
      navigate("/browse");
    }
  }
}, [user, profile, loading, navigate]);
```

- [ ] **Step 7: Point the "Get Started" button at /choose-role**

Line 82 of `Welcome.jsx`:

```jsx
<Button fullWidth onClick={() => navigate("/choose-role")}>
  Get Started
</Button>
```

Delete the existing "Host a Playgroup" secondary button (line 85–87) — that path now goes through `ChooseRole` → Organizer card.

- [ ] **Step 8: Smoke test**

Run `npm run dev`, log in as an existing `'organizer'`, visit `/browse` — should redirect to `/host/dashboard`. Log out, sign up via `/choose-role` → Parent → verify `/host/dashboard` redirects back to `/browse`.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/Welcome.jsx
git commit -m "feat: wire ParentLayout/OrganizerLayout + RequireRole guards; add /choose-role route"
```

---

## Task 11: Rename user-facing "Host" → "Organizer"

This is a grep-and-replace task across 10 specific strings in 9 files. DB identifiers and route paths stay unchanged.

**Files to modify:**
- `frontend/src/pages/Welcome.jsx:86` (already handled in Task 10 step 7 — skip)
- `frontend/src/pages/Browse.jsx:482`
- `frontend/src/pages/MyGroups.jsx:260`
- `frontend/src/pages/MyProfile.jsx:93`
- `frontend/src/pages/host/HostDashboard.jsx:398, 519 (comment), 559`
- `frontend/src/pages/host/HostInsights.jsx:241`
- `frontend/src/pages/host/HostPremium.jsx:58, 75, 130, 168, 180`
- `frontend/src/pages/admin/SubscriptionsTab.jsx:54, 154`
- `frontend/src/test/regression.test.jsx:187`

- [ ] **Step 1: Apply the renames**

Perform these exact replacements:

| File | Old string | New string |
|---|---|---|
| `Browse.jsx` | `Host a Playgroup` | `Organize a Playgroup` |
| `MyGroups.jsx` | `Host a Playgroup` | `Organize a Playgroup` |
| `MyProfile.jsx` | `"Host Premium Member" : "Upgrade to Host Premium"` | `"Organizer Premium Member" : "Upgrade to Organizer Premium"` |
| `HostDashboard.jsx` | `Host a Playgroup` | `Organize a Playgroup` |
| `HostDashboard.jsx` | `Go Host Premium` | `Go Organizer Premium` |
| `HostInsights.jsx` | `Host a Playgroup` | `Organize a Playgroup` |
| `HostPremium.jsx` | `useDocumentTitle("Host Premium")` | `useDocumentTitle("Organizer Premium")` |
| `HostPremium.jsx` | `"You're now a Host Premium member!"` | `"You're now an Organizer Premium member!"` |
| `HostPremium.jsx` | `>Host Premium<` | `>Organizer Premium<` |
| `HostPremium.jsx` | `You're Host Premium!` | `You're Organizer Premium!` |
| `HostPremium.jsx` | `Your Host Premium benefits` | `Your Organizer Premium benefits` |
| `SubscriptionsTab.jsx:54` | `return isHostSub(sub) ? "Host Premium" : "Joiner";` | `return isHostSub(sub) ? "Organizer Premium" : "Parent";` |
| `SubscriptionsTab.jsx:154` | `{f === "host" ? "Host Premium" : f === "joiner" ? "Joiner" : "All"}` | `{f === "host" ? "Organizer Premium" : f === "joiner" ? "Parent" : "All"}` |
| `regression.test.jsx:187` | `expect(screen.getByText("Host a Playgroup")).toBeInTheDocument();` | `expect(screen.getByText("Organize a Playgroup")).toBeInTheDocument();` |

Comment block `{/* Host Premium analytics / upsell */}` in HostDashboard.jsx is a code comment, not user-facing. **Leave it alone** — keeping it aligned with DB `host_premium` type.

- [ ] **Step 2: Run the full test suite**

Run: `cd frontend && npm test`
Expected: All tests pass, including the updated regression test.

- [ ] **Step 3: Grep to confirm no stray user-facing "Host" text**

Run:
```bash
cd /Users/sureshkumar/Kiddaboo && \
  grep -rn "Host " frontend/src/pages frontend/src/components | \
  grep -v "HostCard\|HostContext\|HostDashboard\|HostInsights\|HostPremium\|HostPhotos\|HostSuccess\|host_\|/host/\|isHost"
```
Expected: no lines output. Any hits are remaining user-facing strings that need renaming.

- [ ] **Step 4: Commit**

```bash
git add -u frontend/src
git commit -m "feat: rename user-facing 'Host' → 'Organizer' across 9 files"
```

---

## Task 12: M1 acceptance — manual QA and deploy

- [ ] **Step 1: Run the full test suite one more time**

Run: `cd frontend && npm test`
Expected: all green.

- [ ] **Step 2: Manual smoke test checklist**

1. New user visits `/` → Get Started → `/choose-role` shows both cards
2. Pick Parent → complete signup → land on `/browse` with sage "PARENT" label at top, Parent bottom nav
3. In another browser, pick Organizer → complete signup → land on `/host/dashboard` with terracotta "ORGANIZER" label, `My Group / Members / Messages / Profile` nav
4. Parent manually navigates to `/host/dashboard` → silently redirected to `/browse`
5. Organizer manually navigates to `/browse` → silently redirected to `/host/dashboard`
6. `/my-profile` renders for both roles; Parent sees "Upgrade to Premium", Organizer sees "Upgrade to Organizer Premium"
7. Admin `/admin` subscriptions tab shows the filter label as "Organizer Premium"

- [ ] **Step 3: Push**

```bash
git push
```

M1 is now live. Do NOT start M2 until M1 has been on production for at least one day with no regressions reported.

---

# M2 — Phone OTP Verification

## Task 13: phone_otp_challenges table + profiles columns

**Files:**
- Create: `supabase/migrations/20260416000002_add_phone_verification.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260416000002_add_phone_verification.sql

-- Phone number on profiles. We store the E.164 value in `phone_number`
-- and set `phone_verified_at` on successful OTP verification. The
-- value is stored in plaintext because we need it for re-verification
-- and SMS resends; RLS and column-level grants protect it.

ALTER TABLE profiles ADD COLUMN phone_number TEXT;
ALTER TABLE profiles ADD COLUMN phone_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON profiles (phone_number)
  WHERE phone_number IS NOT NULL;

-- Challenges table. Rows are created when send-otp runs and consumed
-- when verify-otp runs. We store a bcrypt-ish hash of the code rather
-- than the plaintext, so an attacker with DB read can't immediately
-- complete a challenge.

CREATE TABLE phone_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX phone_otp_challenges_user_id_idx ON phone_otp_challenges (user_id);
CREATE INDEX phone_otp_challenges_expires_at_idx ON phone_otp_challenges (expires_at);

ALTER TABLE phone_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Users can see only their own challenges (for UI "code sent" state).
CREATE POLICY phone_otp_self_read ON phone_otp_challenges
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for clients; only the edge
-- functions (service role) write to this table.
```

- [ ] **Step 2: Apply**

Run: `supabase db push`
Expected: migration applied.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260416000002_add_phone_verification.sql
git commit -m "feat: add phone_otp_challenges table + profiles.phone columns"
```

---

## Task 14: send-otp edge function

**Files:**
- Create: `supabase/functions/send-otp/index.ts`
- Modify: `supabase/config.toml` — register function with `verify_jwt = true`

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/send-otp/index.ts
//
// Sends a 6-digit OTP to the user's phone via Twilio. Requires a
// Supabase user JWT (verify_jwt = true in config). Rate limited to
// 3 sends per phone per hour; challenge expires in 10 minutes.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function hashCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode(code + "|kiddaboo-otp-v1");
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

async function sendSms(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`twilio ${res.status}: ${text}`);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let phone: string;
  try {
    ({ phone } = await req.json());
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone || "")) {
    return json({ error: "invalid_phone" }, 400);
  }

  // Rate limit: max 3 sends per phone per hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("phone_otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) {
    return json({ error: "rate_limited" }, 429);
  }

  const code = randomCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("phone_otp_challenges").insert({
    user_id: userId,
    phone_number: phone,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (insErr) return json({ error: "db_error", detail: insErr.message }, 500);

  try {
    await sendSms(phone, `Kiddaboo verification code: ${code}. Expires in 10 minutes.`);
  } catch (err) {
    return json({ error: "sms_failed", detail: String(err) }, 502);
  }

  return json({ ok: true, expires_at: expiresAt });
});
```

- [ ] **Step 2: Register in config.toml**

Append to `supabase/config.toml`:

```toml
[functions.send-otp]
verify_jwt = true

[functions.verify-otp]
verify_jwt = true
```

- [ ] **Step 3: Set the Twilio secrets**

Run:
```bash
supabase secrets set TWILIO_ACCOUNT_SID=<sid> TWILIO_AUTH_TOKEN=<token> TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

Suresh owns procuring the Twilio trial credentials; this step is blocked until he provides them. The rest of M2 can be coded against a stubbed SMS send (skip the `sendSms(...)` call behind an `if (Deno.env.get("OTP_STUB") === "1")` guard if testing without Twilio).

- [ ] **Step 4: Deploy**

Run: `supabase functions deploy send-otp`
Expected: deploy succeeds.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/send-otp/index.ts supabase/config.toml
git commit -m "feat: add send-otp edge function with Twilio + rate limit"
```

---

## Task 15: verify-otp edge function

**Files:**
- Create: `supabase/functions/verify-otp/index.ts`

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/verify-otp/index.ts
//
// Consumes a phone_otp_challenges row: checks code hash, attempts,
// expiry. On success, sets profiles.phone_verified_at + phone_number.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_ATTEMPTS = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function hashCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode(code + "|kiddaboo-otp-v1");
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let phone: string, code: string;
  try {
    ({ phone, code } = await req.json());
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!phone || !/^\d{6}$/.test(code || "")) {
    return json({ error: "invalid_input" }, 400);
  }

  // Grab the latest unexpired, unconsumed challenge for this user+phone.
  const { data: challenges, error: selErr } = await admin
    .from("phone_otp_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("phone_number", phone)
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (selErr) return json({ error: "db_error", detail: selErr.message }, 500);
  const challenge = challenges?.[0];
  if (!challenge) return json({ error: "no_active_challenge" }, 410);
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return json({ error: "too_many_attempts" }, 429);
  }

  const codeHash = await hashCode(code);
  if (codeHash !== challenge.code_hash) {
    await admin
      .from("phone_otp_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    return json({ error: "code_mismatch", attempts_left: MAX_ATTEMPTS - challenge.attempts - 1 }, 400);
  }

  const now = new Date().toISOString();
  const { error: consumeErr } = await admin
    .from("phone_otp_challenges")
    .update({ consumed_at: now })
    .eq("id", challenge.id);
  if (consumeErr) return json({ error: "db_error", detail: consumeErr.message }, 500);

  const { error: profErr } = await admin
    .from("profiles")
    .update({ phone_number: phone, phone_verified_at: now })
    .eq("id", userId);
  if (profErr) return json({ error: "db_error", detail: profErr.message }, 500);

  return json({ ok: true, verified_at: now });
});
```

- [ ] **Step 2: Deploy**

Run: `supabase functions deploy verify-otp`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/verify-otp/index.ts
git commit -m "feat: add verify-otp edge function"
```

---

## Task 16: `usePhoneVerification` hook

**Files:**
- Create: `frontend/src/hooks/usePhoneVerification.js`
- Test: `frontend/src/hooks/usePhoneVerification.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/hooks/usePhoneVerification.test.jsx
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePhoneVerification } from "./usePhoneVerification";
import { supabase } from "../lib/supabase";
import { vi } from "vitest";

vi.mock("../lib/supabase");

test("sendCode invokes the send-otp function with the phone", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.sendCode("+15551234567");
  });
  expect(supabase.functions.invoke).toHaveBeenCalledWith("send-otp", { body: { phone: "+15551234567" } });
  await waitFor(() => expect(result.current.status).toBe("code_sent"));
});

test("verifyCode invokes verify-otp and transitions to verified on ok", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: { ok: true, verified_at: "now" }, error: null });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.verifyCode("+15551234567", "123456");
  });
  expect(supabase.functions.invoke).toHaveBeenCalledWith("verify-otp", { body: { phone: "+15551234567", code: "123456" } });
  await waitFor(() => expect(result.current.status).toBe("verified"));
});

test("verifyCode surfaces mismatch error", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: null, error: { message: "code_mismatch" } });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.verifyCode("+15551234567", "000000");
  });
  expect(result.current.error).toBe("code_mismatch");
  expect(result.current.status).toBe("error");
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- usePhoneVerification`
Expected: FAIL.

- [ ] **Step 3: Write the hook**

```js
// frontend/src/hooks/usePhoneVerification.js
import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Drives the OTP UI. Status machine:
 *   idle → sending → code_sent → verifying → verified
 *                                        ↘ error
 */
export function usePhoneVerification() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function sendCode(phone) {
    setStatus("sending");
    setError(null);
    const { error } = await supabase.functions.invoke("send-otp", { body: { phone } });
    if (error) {
      setStatus("error");
      setError(error.message || "send_failed");
      return { error };
    }
    setStatus("code_sent");
    return { error: null };
  }

  async function verifyCode(phone, code) {
    setStatus("verifying");
    setError(null);
    const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, code } });
    if (error || !data?.ok) {
      setStatus("error");
      setError(error?.message || "verify_failed");
      return { error: error ?? new Error("verify_failed") };
    }
    setStatus("verified");
    return { data, error: null };
  }

  function reset() {
    setStatus("idle");
    setError(null);
  }

  return { status, error, sendCode, verifyCode, reset };
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- usePhoneVerification`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/usePhoneVerification.js frontend/src/hooks/usePhoneVerification.test.jsx
git commit -m "feat: add usePhoneVerification hook"
```

---

## Task 17: PhoneVerify onboarding page

**Files:**
- Create: `frontend/src/pages/onboarding/PhoneVerify.jsx`
- Test: `frontend/src/pages/onboarding/PhoneVerify.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/pages/onboarding/PhoneVerify.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhoneVerify from "./PhoneVerify";
import { vi } from "vitest";

const sendCode = vi.fn().mockResolvedValue({ error: null });
const verifyCode = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
let status = "idle";
vi.mock("../../hooks/usePhoneVerification", () => ({
  usePhoneVerification: () => ({ status, error: null, sendCode, verifyCode, reset: vi.fn() }),
}));

test("full flow: enter phone, send code, enter code, verified", async () => {
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+15551234567" } });
  fireEvent.click(screen.getByRole("button", { name: /send code/i }));
  await waitFor(() => expect(sendCode).toHaveBeenCalledWith("+15551234567"));
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- PhoneVerify`
Expected: FAIL.

- [ ] **Step 3: Write the page**

```jsx
// frontend/src/pages/onboarding/PhoneVerify.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { usePhoneVerification } from "../../hooks/usePhoneVerification";

/**
 * OTP step. Two stages:
 *   1. Ask for E.164 phone → "Send code"
 *   2. Show 6-digit input → "Verify"
 * On verify success, navigate to the next onboarding step (/children
 * for Parents, /host/create for Organizers). The caller route decides
 * where `next` points; we read it from history state.
 */
export default function PhoneVerify() {
  const navigate = useNavigate();
  const { status, error, sendCode, verifyCode } = usePhoneVerification();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  async function onSend(e) {
    e.preventDefault();
    await sendCode(phone);
  }

  async function onVerify(e) {
    e.preventDefault();
    const { error: err } = await verifyCode(phone, code);
    if (!err) {
      const role = sessionStorage.getItem("kiddaboo.pendingAccountType");
      navigate(role === "organizer" ? "/host/create" : "/children");
    }
  }

  const showCodeStep = status === "code_sent" || status === "verifying" || status === "error";

  return (
    <div className="min-h-screen bg-cream px-6 py-10 flex flex-col">
      <div className="max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Verify your phone</h1>
        <p className="text-sm text-taupe mb-8">
          We send a 6-digit code to make sure you're a real person. We won't share your number.
        </p>

        {!showCodeStep && (
          <form onSubmit={onSend} className="flex flex-col gap-4">
            <label className="text-sm text-charcoal" htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="border border-cream-dark rounded-xl px-4 py-3"
              required
            />
            <Button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send code"}
            </Button>
          </form>
        )}

        {showCodeStep && (
          <form onSubmit={onVerify} className="flex flex-col gap-4">
            <label className="text-sm text-charcoal" htmlFor="code">Enter the 6-digit code</label>
            <input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="border border-cream-dark rounded-xl px-4 py-3 text-center text-2xl tracking-widest"
              required
            />
            {error && <p className="text-xs text-terracotta">{error === "code_mismatch" ? "Code doesn't match. Try again." : "Something went wrong. Try again."}</p>}
            <Button type="submit" disabled={status === "verifying"}>
              {status === "verifying" ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => sendCode(phone)}
              className="text-xs text-sage underline"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- PhoneVerify`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/onboarding/PhoneVerify.jsx frontend/src/pages/onboarding/PhoneVerify.test.jsx
git commit -m "feat: add PhoneVerify onboarding page"
```

---

## Task 18: Insert PhoneVerify into onboarding routes

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/CreateProfile.jsx` — navigate to `/verify-phone` after profile save

- [ ] **Step 1: Add the route**

In `App.jsx`, under Onboarding section:

```jsx
<Route path="/verify-phone" element={<RequireAuth><PhoneVerify /></RequireAuth>} />
```

And import `PhoneVerify` at the top.

- [ ] **Step 2: Redirect from CreateProfile**

In `CreateProfile.jsx`, after the successful `profiles.upsert(...)`, change the navigate target. Parents go `/profile` → `/verify-phone` → `/children` → `/browse`. Organizers go `/profile` → `/verify-phone` → `/host/create` → `/host/dashboard`.

Replace whatever `navigate("/children")` / `navigate("/host/create")` call is currently in `CreateProfile.jsx` with `navigate("/verify-phone")`.

`PhoneVerify` itself (Task 17) already branches to the correct next step based on the stashed role.

- [ ] **Step 3: Block join requests for unverified users**

In `frontend/src/hooks/useSubscription.js`, expand `canSendJoinRequest` (line 98) to require phone verification:

```js
const canSendJoinRequest = (isPremium || joinRequestsRemaining > 0) && !!profile?.phone_verified_at;
```

`profile` needs to come from `useAuth()`. Add:
```js
import { useAuth } from "../context/AuthContext";
// ...
const { user, profile } = useAuth();
```

- [ ] **Step 4: Manually verify**

Sign up a fresh user: phone step appears after profile, code sends, verify lands on the correct next page. Try to send a join request as an unverified user → button disabled / toast "Verify your phone first."

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/CreateProfile.jsx frontend/src/hooks/useSubscription.js
git commit -m "feat: gate join requests on phone verification; insert PhoneVerify step"
```

---

## Task 19: M2 acceptance

- [ ] **Step 1: Run the full test suite**

Run: `cd frontend && npm test`
Expected: all green.

- [ ] **Step 2: Manual smoke test**

1. New Parent signup → phone step → SMS arrives → verify → children step → browse
2. Re-enter wrong code 3x → "too_many_attempts" error; request new code succeeds
3. Request 4 codes in an hour → 4th returns `rate_limited`
4. Unverified user on `/browse` → "Send join request" button disabled with explanation

- [ ] **Step 3: Push**

```bash
git push
```

M2 live.

---

# M3 — Profile Panel Trust Redesign

## Task 20: RoleBadge component

**Files:**
- Create: `frontend/src/components/profile/RoleBadge.jsx`
- Test: `frontend/src/components/profile/RoleBadge.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/profile/RoleBadge.test.jsx
import { render, screen } from "@testing-library/react";
import RoleBadge from "./RoleBadge";

test("renders Organizer pill with terracotta", () => {
  render(<RoleBadge role="organizer" />);
  const badge = screen.getByText("Organizer");
  expect(badge.className).toMatch(/terracotta/);
});

test("renders Parent small text in sage", () => {
  render(<RoleBadge role="parent" />);
  expect(screen.getByText("Parent")).toBeInTheDocument();
});

test("renders nothing for unknown role", () => {
  const { container } = render(<RoleBadge role={null} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- RoleBadge`
Expected: FAIL.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/profile/RoleBadge.jsx
export default function RoleBadge({ role }) {
  if (role === "organizer") {
    return (
      <span className="bg-terracotta text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
        Organizer
      </span>
    );
  }
  if (role === "parent") {
    return <span className="text-sage-dark text-[10px] font-medium">Parent</span>;
  }
  return null;
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- RoleBadge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/profile/RoleBadge.jsx frontend/src/components/profile/RoleBadge.test.jsx
git commit -m "feat: add RoleBadge component"
```

---

## Task 21: VerifiedBadge component

**Files:**
- Create: `frontend/src/components/profile/VerifiedBadge.jsx`
- Test: `frontend/src/components/profile/VerifiedBadge.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/profile/VerifiedBadge.test.jsx
import { render, screen } from "@testing-library/react";
import VerifiedBadge from "./VerifiedBadge";

test("renders check icon when verified", () => {
  render(<VerifiedBadge verified />);
  expect(screen.getByLabelText(/verified/i)).toBeInTheDocument();
});

test("renders nothing when not verified", () => {
  const { container } = render(<VerifiedBadge verified={false} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- VerifiedBadge`
Expected: FAIL.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/profile/VerifiedBadge.jsx
/**
 * Small green circle with a white check, meant to sit on the bottom-
 * right of an avatar. Caller absolute-positions it.
 */
export default function VerifiedBadge({ verified }) {
  if (!verified) return null;
  return (
    <span
      role="img"
      aria-label="Verified"
      className="bg-sage-dark w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px]"
    >
      ✓
    </span>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- VerifiedBadge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/profile/VerifiedBadge.jsx frontend/src/components/profile/VerifiedBadge.test.jsx
git commit -m "feat: add VerifiedBadge component"
```

---

## Task 22: ProfilePanel (trust-signal v1)

**Files:**
- Create: `frontend/src/components/profile/ProfilePanel.jsx`
- Test: `frontend/src/components/profile/ProfilePanel.test.jsx`

Per design D8, v1 signals are: avatar+verified, real name, children/senior line, verified label, role+neighborhood+distance, stat strip (kids count, groups joined), children card, about, tags, message button. Explicitly excluded from v1: tenure, review rating, groups in common.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/profile/ProfilePanel.test.jsx
import { render, screen } from "@testing-library/react";
import ProfilePanel from "./ProfilePanel";

const sample = {
  id: "p1",
  first_name: "Priya",
  last_name: "Sharma",
  photo_url: null,
  phone_verified_at: "2026-03-01T00:00:00Z",
  account_type: "organizer",
  zip_code: "11530",
  bio: "First-time mom.",
  philosophy_tags: ["Outdoor play"],
  children: [{ name: "Maya", age: 3 }],
  groups_joined_count: 2,
};

test("renders name, verified label, role label", () => {
  render(<ProfilePanel profile={sample} />);
  expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  expect(screen.getByText(/verified parent|verified family/i)).toBeInTheDocument();
  expect(screen.getByText("Organizer")).toBeInTheDocument();
});

test("does not render tenure, rating, or groups-in-common (v1 deferred)", () => {
  render(<ProfilePanel profile={sample} />);
  expect(screen.queryByText(/on kiddaboo/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
  expect(screen.queryByText(/in common/i)).not.toBeInTheDocument();
});

test("renders children card", () => {
  render(<ProfilePanel profile={sample} />);
  expect(screen.getByText(/Maya/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- ProfilePanel`
Expected: FAIL.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/profile/ProfilePanel.jsx
import RoleBadge from "./RoleBadge";
import VerifiedBadge from "./VerifiedBadge";

function VerifiedLabel({ accountType }) {
  return (
    <div className="text-xs text-sage-dark font-bold mt-1">
      ✓ {accountType === "organizer" ? "Verified organizer" : "Verified parent"}
    </div>
  );
}

function ChildrenCard({ children }) {
  if (!children || children.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-widest text-taupe font-bold mb-1.5">Children</div>
      <div className="flex gap-2 flex-wrap">
        {children.map((c) => (
          <span
            key={c.name}
            className="bg-white border border-cream-dark rounded-xl px-3 py-2 text-xs text-charcoal"
          >
            {c.name}, {c.age}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The sheet that slides up when you tap a member inside a playgroup.
 * v1 intentionally omits tenure, review rating, and groups-in-common —
 * those signals are either unreliable on a brand-new network or
 * require more data than we have. Add them back via a prop when v2
 * lands.
 */
export default function ProfilePanel({ profile, onMessage }) {
  if (!profile) return null;
  const verified = !!profile.phone_verified_at;
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

  return (
    <div className="bg-cream rounded-t-2xl p-5 max-w-md mx-auto">
      {/* Avatar + verified */}
      <div className="flex flex-col items-center text-center mb-3">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full bg-sage-light border-[3px] border-white shadow" />
          <div className="absolute bottom-0 right-0">
            <VerifiedBadge verified={verified} />
          </div>
        </div>
        <div className="font-bold text-charcoal mt-2">{fullName || "Kiddaboo user"}</div>
        {verified && <VerifiedLabel accountType={profile.account_type} />}
      </div>

      {/* Role + neighborhood */}
      <div className="text-center py-3 border-t border-b border-cream-dark mb-4">
        <div className="flex justify-center mb-1"><RoleBadge role={profile.account_type} /></div>
        {profile.zip_code && (
          <div className="text-xs text-taupe">Zip {profile.zip_code}</div>
        )}
      </div>

      {/* Stat strip — kids + groups joined. No tenure, no rating. */}
      <div className="grid grid-cols-2 gap-2 text-center bg-white rounded-xl border border-cream-dark py-3 mb-4">
        <div>
          <div className="text-base font-bold text-charcoal">{profile.children?.length ?? 0}</div>
          <div className="text-[9px] uppercase text-taupe">Kids</div>
        </div>
        <div className="border-l border-cream-dark">
          <div className="text-base font-bold text-charcoal">{profile.groups_joined_count ?? 0}</div>
          <div className="text-[9px] uppercase text-taupe">Groups</div>
        </div>
      </div>

      <ChildrenCard children={profile.children} />

      {profile.bio && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-taupe font-bold mb-1.5">About</div>
          <div className="text-sm text-charcoal leading-relaxed">{profile.bio}</div>
        </div>
      )}

      {profile.philosophy_tags?.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-taupe font-bold mb-1.5">Parenting style</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.philosophy_tags.map((t) => (
              <span key={t} className="bg-sage-light text-sage-dark rounded-full text-[11px] px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onMessage}
        className="w-full bg-sage-dark text-white rounded-xl py-3 font-bold text-sm cursor-pointer border-none"
      >
        Message
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- ProfilePanel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/profile/ProfilePanel.jsx frontend/src/components/profile/ProfilePanel.test.jsx
git commit -m "feat: add ProfilePanel with v1 trust signals"
```

---

## Task 23: Unified member list on PlaygroupDetail

**Files:**
- Modify: `frontend/src/pages/PlaygroupDetail.jsx`

Per design D6, the member list becomes a single unified list sorted Organizer-first. Organizer rows have a terracotta avatar ring (3px) and a `<RoleBadge role="organizer" />`; Parent rows have the small "Parent" label and the children line.

- [ ] **Step 1: Locate the current member list rendering**

Run: `grep -n "member" frontend/src/pages/PlaygroupDetail.jsx | head -40`

Identify:
1. How members are fetched (single query returning creator + joiners, or two separate queries?)
2. Where they render — the JSX block that currently splits host vs parents.

- [ ] **Step 2: Unify the list**

Replace the split rendering with a single list:

```jsx
// Inside PlaygroupDetail, after `members` is loaded from supabase:
const sortedMembers = [...members].sort((a, b) => {
  // Organizer (creator) first, then parents by name.
  if (a.membership_role === "creator" && b.membership_role !== "creator") return -1;
  if (a.membership_role !== "creator" && b.membership_role === "creator") return 1;
  return (a.first_name ?? "").localeCompare(b.first_name ?? "");
});

// ...in the JSX:
<div className="flex flex-col gap-2">
  {sortedMembers.map((m) => {
    const isOrganizer = m.membership_role === "creator";
    return (
      <button
        key={m.id}
        onClick={() => openProfile(m)}
        className="bg-white rounded-xl border border-cream-dark p-3 flex gap-3 items-center text-left cursor-pointer"
      >
        <div
          className={`w-10 h-10 rounded-full bg-sage-light flex-shrink-0 ${
            isOrganizer ? "border-[3px] border-terracotta" : ""
          }`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-bold text-sm text-charcoal">
              {m.first_name} {m.last_name}
            </div>
            <RoleBadge role={isOrganizer ? "organizer" : "parent"} />
          </div>
          <div className="text-[11px] text-taupe">
            {isOrganizer ? "Runs the group" : m.children_summary || ""}
          </div>
        </div>
      </button>
    );
  })}
</div>
```

Add `import RoleBadge from "../components/profile/RoleBadge";` at the top.

- [ ] **Step 3: Wire openProfile to ProfilePanel**

Add local state `const [activeProfile, setActiveProfile] = useState(null);`. `openProfile(m)` sets it; below the main content render:

```jsx
{activeProfile && (
  <div
    onClick={() => setActiveProfile(null)}
    className="fixed inset-0 bg-black/40 flex items-end z-50"
  >
    <div onClick={(e) => e.stopPropagation()} className="w-full">
      <ProfilePanel profile={activeProfile} onMessage={() => {/* TODO: route to messages */}} />
    </div>
  </div>
)}
```

Add `import ProfilePanel from "../components/profile/ProfilePanel";` at the top.

- [ ] **Step 4: Manual QA**

Open any playgroup as a Parent. Members render in one list; the Organizer is first with a terracotta ring and Organizer pill. Tapping any member opens the trust panel. Tapping outside closes it.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/PlaygroupDetail.jsx
git commit -m "feat: unified playgroup member list with Organizer-first sort + ProfilePanel sheet"
```

---

## Task 24: Remove/replace the old `HostCard` if obsolete

**Files:**
- Inspect: `frontend/src/components/playgroup/HostCard.jsx`
- If no callers remain after Task 23, delete; otherwise leave it and note the deprecation.

- [ ] **Step 1: Find callers**

Run: `grep -rn "HostCard" frontend/src`

- [ ] **Step 2: Decide**

- If `HostCard` is only imported in `PlaygroupDetail.jsx` and the import was removed in Task 23 → `rm frontend/src/components/playgroup/HostCard.jsx` and remove the import.
- If it's still used elsewhere → leave it alone. Add a `// DEPRECATED: prefer ProfilePanel. Kept for <caller>.` comment at the top.

- [ ] **Step 3: Commit**

```bash
git add -u frontend/src
git commit -m "chore: clean up HostCard after ProfilePanel migration"
```

(Skip the commit if nothing changed.)

---

## Task 25: M3 acceptance

- [ ] **Step 1: Full test suite**

Run: `cd frontend && npm test`
Expected: all green.

- [ ] **Step 2: Manual QA**

1. Parent opens Little Sprouts detail → unified list shows Organizer first with terracotta ring and pill
2. Tap the Organizer → sheet slides up showing Priya's ProfilePanel with verified check, role label, zip, stat strip, children, about, tags, Message button
3. Tap a Parent → sheet shows their ProfilePanel with `Parent` label (no Organizer pill), their kids line
4. Confirm NO tenure, NO rating, NO groups-in-common rendered (deferred signals)
5. Tap outside the sheet → closes

- [ ] **Step 3: Push**

```bash
git push
```

M3 done. Spec complete.

---

## Self-Review

**Spec coverage:**
- D1 Two audiences → Tasks 5, 6 (separate layouts with distinct accent + label + nav)
- D2 Choose once → Tasks 8, 9 (ChooseRole picker + role persistence)
- D3 Second role deferred → n/a (explicitly out of scope, no task needed)
- D4 Mode layout wrappers → Tasks 5, 6, 10
- D5 Signup path picker → Task 8
- D6 Unified playgroup member list → Task 23
- D7 Phone OTP → Tasks 13–18
- D8 Trust signals v1 → Tasks 20–22 (tenure/rating/groups-in-common explicitly asserted as excluded in Task 22 test)
- D9 Copy renames → Task 11
- D10 Migration → Task 1

**Placeholder scan:** No "TBD", no "implement later", no "similar to Task N" hand-waves. Every step shows the code or exact command it requires. Twilio secret procurement in Task 14 step 3 is the one external blocker, explicitly called out.

**Type consistency:** `accountType` used in AuthContext (Task 2), `useAccountType` (Task 3), `RequireRole` (Task 4), TabBar (Task 7), Welcome redirect (Task 10), RoleBadge+ProfilePanel+PlaygroupDetail (Tasks 20, 22, 23) — all consistent. `membership_role === "creator"` used for the Organizer-first sort in Task 23 matches the existing DB value. `phone_verified_at` set in edge function (Task 15), read in useSubscription (Task 18) and ProfilePanel (Task 22) — consistent column name.

**Scope:** Three milestones, each shippable on its own. Each ends in a deploy-and-QA step.

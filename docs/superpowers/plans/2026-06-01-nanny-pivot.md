# Nanny Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot Kiddaboo from playgroup discovery + Host role to a 1:1 Nanny booking marketplace with Stripe Connect payments. Pre-launch wipe — no migration.

**Architecture:** Single-repo monolith pivot. Drop playgroup/host code and parent-subscription code. Add Nanny availability (weekly recurring blocks → materialized slots), parent request flow with free-form note, Stripe Connect Express + manual-capture PaymentIntents, hourly cron to expire pending requests, public parent→nanny ratings + private nanny→parent ratings.

**Tech Stack:** React 18 + Vite, React Router v6, Supabase (Postgres + Auth + Edge Functions + Realtime), Stripe Connect (Express accounts, manual-capture PaymentIntents), Vitest, Leaflet (map view).

**Reference spec:** `docs/superpowers/specs/2026-06-01-nanny-pivot-design.md`

---

## Phase Overview

| Phase | Title | Outcome |
|---|---|---|
| 0 | Branch + env prep | Working branch + Stripe Connect test keys configured |
| 1 | Schema migration | New tables live in Supabase, old tables dropped |
| 2 | Rip old code | Playgroup/host/subscription code deleted, app compiles to empty shell |
| 3 | Auth + roles rename | `'organizer'` → `'nanny'` across code, role picker updated |
| 4 | Nanny availability | Recurring block editor + materialize-slots cron |
| 5 | Parent discovery | List/map browse, filters, Nanny profile |
| 6 | Booking request | Note + Stripe auth + pending state UI |
| 7 | Stripe Connect onboarding | Nanny onboards to Express, completes payouts |
| 8 | Booking lifecycle webhook | Accept/decline → capture/cancel via webhook |
| 9 | Cancellation + refunds | Policy enforcement + Stripe refund flow |
| 10 | Ratings (both directions) | Public parent→nanny + private nanny→parent |
| 11 | Expire-pending cron | Auto-expire requests + release auth |
| 12 | QA pass + regression | All flows tested end-to-end, commit |

---

## Phase 0 — Branch & environment prep

### Task 0.1: Create feature branch

**Files:** none

- [ ] **Step 1: Branch from main**

```bash
cd /Users/sureshkumar/Kiddaboo
git checkout main
git pull --ff-only
git checkout -b nanny-pivot
```

- [ ] **Step 2: Confirm clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`

### Task 0.2: Configure Stripe Connect test keys

**Files:**
- Modify: `supabase/functions/.env` (local), Supabase dashboard secrets (deployed)

- [ ] **Step 1: Add Connect-related secrets in Supabase dashboard**

In Supabase project `pdgtryghvibhmmroqvdk`, Edge Functions → Secrets:
- `STRIPE_SECRET_KEY` — confirm present (existing)
- `STRIPE_CONNECT_CLIENT_ID` — new, from Stripe dashboard → Connect → Settings
- `STRIPE_WEBHOOK_BOOKINGS_SECRET` — new, will be filled after deploying the webhook function
- `PLATFORM_FEE_BPS` — new, e.g., `1500` for 15% (basis points)

- [ ] **Step 2: Mirror locally**

Edit `supabase/functions/.env` to add the same keys (test-mode values).

- [ ] **Step 3: Commit env doc**

Add `docs/STRIPE_CONNECT_SETUP.md` describing required env vars (no secret values).

```bash
git add docs/STRIPE_CONNECT_SETUP.md
git commit -m "docs: stripe connect env vars for nanny pivot"
```

---

## Phase 1 — Schema migration

One irreversible migration. Drops old tables, creates new. No backfill (pre-launch).

### Task 1.1: Author the migration

**Files:**
- Create: `supabase/migrations/20260601000001_nanny_pivot.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260601000001_nanny_pivot.sql
-- Pivots Kiddaboo from playgroup/host model to 1:1 Nanny booking marketplace.
-- Pre-launch: no data migration, all old tables dropped.

begin;

-- 1. Drop old tables in dependency order
drop table if exists session_reminders_sent cascade;
drop table if exists join_request_usage cascade;
drop table if exists rsvps cascade;
drop table if exists messages cascade;
drop table if exists memberships cascade;
drop table if exists reviews cascade;
drop table if exists sessions cascade;
drop table if exists playgroups cascade;
drop table if exists subscriptions cascade;
drop table if exists children cascade;
drop table if exists reports cascade;
drop table if exists blocks cascade;

-- 2. Update profiles.account_type enum
alter table profiles drop constraint if exists profiles_account_type_check;
update profiles set account_type = 'parent' where account_type = 'organizer';
alter table profiles
  add constraint profiles_account_type_check
  check (account_type in ('parent', 'nanny'));

-- 3. Add nanny-specific columns to profiles
alter table profiles
  add column if not exists verified_at timestamptz,
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists bio text,
  add column if not exists service_area_lat double precision,
  add column if not exists service_area_lng double precision,
  add column if not exists service_area_radius_km integer;

-- 4. nanny_availability_blocks
create table nanny_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  nanny_id uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  timezone text not null,
  rate_cents integer not null check (rate_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_blocks_nanny on nanny_availability_blocks(nanny_id) where active;

-- 5. nanny_slots (materialized)
create type nanny_slot_status as enum ('open', 'requested', 'booked', 'past');

create table nanny_slots (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references nanny_availability_blocks(id) on delete cascade,
  nanny_id uuid not null references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  rate_cents integer not null,
  status nanny_slot_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (block_id, starts_at)
);
create index idx_slots_open_window on nanny_slots(starts_at, ends_at) where status = 'open';
create index idx_slots_nanny on nanny_slots(nanny_id, starts_at);

-- 6. bookings
create type booking_status as enum (
  'pending', 'confirmed', 'declined', 'expired',
  'cancelled_refunded', 'cancelled_no_refund',
  'completed', 'pending_payment_retry'
);
create type cancelled_by_t as enum ('parent', 'nanny');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references nanny_slots(id) on delete restrict,
  parent_id uuid not null references profiles(id) on delete restrict,
  nanny_id uuid not null references profiles(id) on delete restrict,
  note_from_parent text,
  status booking_status not null default 'pending',
  stripe_payment_intent_id text unique,
  rate_cents integer not null,
  platform_fee_cents integer not null,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  acceptance_expires_at timestamptz not null,
  cancelled_at timestamptz,
  cancelled_by cancelled_by_t,
  completed_at timestamptz
);
create index idx_bookings_parent on bookings(parent_id, status);
create index idx_bookings_nanny on bookings(nanny_id, status);
create index idx_bookings_pending_expiry on bookings(acceptance_expires_at) where status = 'pending';

-- 7. ratings
create type rating_direction as enum ('parent_to_nanny', 'nanny_to_parent');

create table ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  rater_id uuid not null references profiles(id) on delete cascade,
  ratee_id uuid not null references profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  text text,
  direction rating_direction not null,
  created_at timestamptz not null default now(),
  unique (booking_id, direction)
);
create index idx_ratings_ratee on ratings(ratee_id, direction);

-- 8. RLS
alter table nanny_availability_blocks enable row level security;
alter table nanny_slots enable row level security;
alter table bookings enable row level security;
alter table ratings enable row level security;

-- Blocks: nanny owns their blocks; everyone reads active blocks of nannies (for slot generation visibility)
create policy blocks_owner_all on nanny_availability_blocks
  for all using (nanny_id = auth.uid()) with check (nanny_id = auth.uid());
create policy blocks_public_read on nanny_availability_blocks
  for select using (active);

-- Slots: read open slots (everyone), nanny reads all their own slots, system (service role) manages
create policy slots_public_open_read on nanny_slots
  for select using (status = 'open');
create policy slots_nanny_own_read on nanny_slots
  for select using (nanny_id = auth.uid());

-- Bookings: parent reads/inserts their own; nanny reads their own; updates restricted (webhook-driven via service role)
create policy bookings_parent_select on bookings
  for select using (parent_id = auth.uid());
create policy bookings_nanny_select on bookings
  for select using (nanny_id = auth.uid());
create policy bookings_parent_insert on bookings
  for insert with check (parent_id = auth.uid());
-- No client-side UPDATE policy — all state transitions go through edge functions

-- Ratings:
--   parent_to_nanny: public read, parent inserts their own
--   nanny_to_parent: only other nannies (and admins) read, nanny inserts their own
create policy ratings_public_p2n_select on ratings
  for select using (direction = 'parent_to_nanny');
create policy ratings_nanny_n2p_select on ratings
  for select using (
    direction = 'nanny_to_parent' and
    exists (select 1 from profiles p where p.id = auth.uid() and p.account_type = 'nanny')
  );
create policy ratings_parent_insert on ratings
  for insert with check (
    direction = 'parent_to_nanny' and rater_id = auth.uid()
  );
create policy ratings_nanny_insert on ratings
  for insert with check (
    direction = 'nanny_to_parent' and rater_id = auth.uid()
  );

commit;
```

- [ ] **Step 2: Apply locally**

```bash
cd /Users/sureshkumar/Kiddaboo
supabase db reset  # WARNING: drops local db, reapplies all migrations including this one
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 3: Smoke-test schema**

```bash
supabase db diff --schema public
```

Expected: no drift between migration and local state.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601000001_nanny_pivot.sql
git commit -m "feat(schema): nanny pivot migration — drop playgroup tables, add nanny+booking+rating schema"
```

### Task 1.2: Update TypeScript/JS types if generated

**Files:**
- Modify: `frontend/src/lib/database.types.ts` (if exists — check first)

- [ ] **Step 1: Regenerate types if a generated types file exists**

```bash
ls frontend/src/lib/database.types.ts 2>/dev/null && \
  supabase gen types typescript --project-id pdgtryghvibhmmroqvdk > frontend/src/lib/database.types.ts
```

If no types file exists, skip.

- [ ] **Step 2: Commit (if file changed)**

```bash
git add frontend/src/lib/database.types.ts
git commit -m "chore: regenerate supabase types after nanny pivot migration"
```

---

## Phase 2 — Rip old code

App will not compile at the end of this phase. That's expected — Phase 3 onward rebuilds.

### Task 2.1: Delete playgroup component directory

**Files:**
- Delete: `frontend/src/components/playgroup/` (entire directory)

- [ ] **Step 1: Delete directory**

```bash
git rm -r frontend/src/components/playgroup
```

- [ ] **Step 2: Commit**

```bash
git commit -m "rip: delete playgroup components"
```

### Task 2.2: Delete browse component directory

**Files:**
- Delete: `frontend/src/components/browse/` (PlaygroupCard, PlaygroupCardMini, FilterSheet, MapView — MapView will be re-created in Phase 5 repurposed)

- [ ] **Step 1: Delete directory**

```bash
git rm -r frontend/src/components/browse
git commit -m "rip: delete playgroup browse components"
```

### Task 2.3: Delete host module + organizer layout + HostContext

**Files:**
- Delete: `frontend/src/components/host/`
- Delete: `frontend/src/layouts/OrganizerLayout.jsx`
- Delete: `frontend/src/context/HostContext.jsx`
- Delete: `frontend/src/pages/host/` (CreatePlaygroup, EditPlaygroup, ScreeningQuestions, EnvironmentSetup, HostPhotos, HostSuccess, HostDashboard, HostInsights)

- [ ] **Step 1: Delete all**

```bash
git rm -r frontend/src/components/host
git rm frontend/src/layouts/OrganizerLayout.jsx
git rm frontend/src/context/HostContext.jsx
git rm -r frontend/src/pages/host
git commit -m "rip: delete host/organizer module"
```

### Task 2.4: Delete playgroup-specific pages

**Files:**
- Delete: `frontend/src/pages/PlaygroupDetail.jsx`, `Browse.jsx`, `MyGroups.jsx`

- [ ] **Step 1: Delete**

```bash
git rm frontend/src/pages/PlaygroupDetail.jsx frontend/src/pages/Browse.jsx frontend/src/pages/MyGroups.jsx
git commit -m "rip: delete playgroup pages"
```

### Task 2.5: Delete obsolete chat pages (no in-app chat in Nanny model)

**Files:**
- Delete: `frontend/src/pages/GroupChat.jsx`, `SessionChat.jsx`, `Messages.jsx`

- [ ] **Step 1: Delete**

```bash
git rm frontend/src/pages/GroupChat.jsx frontend/src/pages/SessionChat.jsx frontend/src/pages/Messages.jsx
git commit -m "rip: delete chat pages (nanny model is phone-based)"
```

### Task 2.6: Delete obsolete hooks

**Files:**
- Delete: `frontend/src/hooks/useSessions.js`, `useSessionMessages.js`, `useGroupMessages.js`, `useRsvps.js`, `useReviews.js`, `useBlocks.js`, `useSubscription.js`, `useConversations.js`, `useChildCount.js`

- [ ] **Step 1: Delete**

```bash
cd frontend/src/hooks
git rm useSessions.js useSessionMessages.js useGroupMessages.js useRsvps.js useReviews.js useBlocks.js useSubscription.js useConversations.js useChildCount.js
cd -
git commit -m "rip: delete playgroup/subscription hooks"
```

### Task 2.7: Delete Premium page + subscription edge functions

**Files:**
- Delete: `frontend/src/pages/Premium.jsx`
- Delete: `supabase/functions/create-checkout/`
- Delete: `supabase/functions/stripe-webhook/` (will be replaced in Phase 8 with stripe-webhook-bookings)

- [ ] **Step 1: Delete**

```bash
git rm frontend/src/pages/Premium.jsx
git rm -r supabase/functions/create-checkout supabase/functions/stripe-webhook
git commit -m "rip: delete parent subscription (premium) flow"
```

### Task 2.8: Delete playgroup-related edge functions

**Files:**
- Delete: `supabase/functions/submit-join-request/`, `send-session-reminders/`, `send-review-prompts/`

- [ ] **Step 1: Delete**

```bash
git rm -r supabase/functions/submit-join-request supabase/functions/send-session-reminders supabase/functions/send-review-prompts
git commit -m "rip: delete playgroup edge functions"
```

### Task 2.9: Delete onboarding pages tied to playgroup model

**Files:**
- Delete: `frontend/src/pages/AddChildren.jsx`, `BrowseSuccess.jsx` (no stored child profile; success screen tied to playgroup flow)

- [ ] **Step 1: Delete**

```bash
git rm frontend/src/pages/AddChildren.jsx frontend/src/pages/BrowseSuccess.jsx
git commit -m "rip: delete child profile + browse success onboarding"
```

### Task 2.10: Remove obsolete imports + route entries in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Open App.jsx, remove all imports of deleted modules**

Remove imports for: `Browse`, `MyGroups`, `PlaygroupDetail`, `HostDashboard`, `HostInsights`, `CreatePlaygroup`, `EditPlaygroup`, `ScreeningQuestions`, `EnvironmentSetup`, `HostPhotos`, `HostSuccess`, `AddChildren`, `BrowseSuccess`, `GroupChat`, `SessionChat`, `Messages`, `Premium`, `OrganizerLayout`, `HostContext` / `HostProvider`.

- [ ] **Step 2: Remove the corresponding `<Route>` entries**

Delete all routes from the table in section 10 of the survey that match deleted pages. The router should still compile but most routes are gone — we'll add the new ones in later phases.

- [ ] **Step 3: Remove `HostProvider` wrapper**

In `frontend/src/main.jsx` (or wherever providers are composed) remove `<HostProvider>` wrapping.

- [ ] **Step 4: Verify build fails cleanly with only missing-import errors**

Run: `cd frontend && npm run build`
Expected: build fails with import-not-found errors only for things we haven't yet rebuilt. No unrelated errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx
git commit -m "rip: remove routes + provider wiring for deleted modules"
```

### Task 2.11: Delete obsolete tests

**Files:**
- Delete: any test file under `frontend/src/` that references deleted modules

- [ ] **Step 1: Find and remove**

```bash
grep -rl "Playgroup\|HostContext\|useSessions\|OrganizerLayout\|Premium" frontend/src --include="*.test.*" | xargs git rm
git commit -m "rip: delete tests for removed modules"
```

---

## Phase 3 — Auth + role rename

App must compile by end of phase. Empty shell with role-aware routing.

### Task 3.1: Update AuthContext to expose nanny role

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/hooks/useAccountType.js` (if separate file) or wherever accessor lives

- [ ] **Step 1: Replace `'organizer'` with `'nanny'` in AuthContext**

Find every reference to `'organizer'` in `frontend/src/context/AuthContext.jsx` and replace with `'nanny'`. Replace `isOrganizer` with `isNanny`.

- [ ] **Step 2: Update useAccountType accessor**

```js
// frontend/src/hooks/useAccountType.js
import { useAuth } from "../context/AuthContext";

export function useAccountType() {
  const { accountType, loading } = useAuth();
  return {
    accountType,
    isParent: accountType === "parent",
    isNanny: accountType === "nanny",
    loading,
  };
}
```

- [ ] **Step 3: Update AuthContext test**

Open `frontend/src/context/AuthContext.test.jsx` and replace `'organizer'` mocks with `'nanny'`. Replace `isOrganizer` assertions with `isNanny`.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- AuthContext`
Expected: all AuthContext tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.jsx frontend/src/hooks/useAccountType.js frontend/src/context/AuthContext.test.jsx
git commit -m "feat(auth): rename organizer role to nanny"
```

### Task 3.2: Update RequireRole

**Files:**
- Modify: `frontend/src/components/auth/RequireRole.jsx`
- Modify: `frontend/src/components/auth/RequireRole.test.jsx`

- [ ] **Step 1: Update HOME_FOR map**

```jsx
const HOME_FOR = {
  parent: "/",
  nanny: "/nanny/dashboard",
};
```

Replace `'organizer'` → `'nanny'` everywhere. Replace `'/browse'` (parent home) → `'/'` (parent discovery now lives at root). Replace `'/host/dashboard'` → `'/nanny/dashboard'`.

- [ ] **Step 2: Update test**

Open `RequireRole.test.jsx`, replace `'organizer'` → `'nanny'` and update redirect path assertions.

- [ ] **Step 3: Run test**

Run: `cd frontend && npm test -- RequireRole`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/auth/RequireRole.jsx frontend/src/components/auth/RequireRole.test.jsx
git commit -m "feat(auth): RequireRole supports nanny role with /nanny/dashboard home"
```

### Task 3.3: Update ChooseRole page

**Files:**
- Modify: `frontend/src/pages/ChooseRole.jsx`

- [ ] **Step 1: Update role picker copy + value**

Replace the "Host" option with "Nanny" — both label and the value passed to update profile (`'nanny'` instead of `'organizer'`). Update parent option subtitle to reflect new model (e.g., "Find and book a Nanny" instead of "Find playgroups").

```jsx
const ROLES = [
  {
    value: "parent",
    title: "I'm a Parent",
    subtitle: "Find and book a trusted Nanny",
  },
  {
    value: "nanny",
    title: "I'm a Nanny",
    subtitle: "Offer your availability, accept bookings",
  },
];
```

- [ ] **Step 2: Write a test for ChooseRole behavior**

```jsx
// frontend/src/pages/ChooseRole.test.jsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test/testUtils";
import ChooseRole from "./ChooseRole";

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { account_type: "nanny" }, error: null }) }) }) }) }),
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  },
}));

describe("ChooseRole", () => {
  it("offers Parent and Nanny options (not Host)", () => {
    renderWithProviders(<ChooseRole />);
    expect(screen.getByText(/I'm a Parent/i)).toBeInTheDocument();
    expect(screen.getByText(/I'm a Nanny/i)).toBeInTheDocument();
    expect(screen.queryByText(/Host/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test**

Run: `cd frontend && npm test -- ChooseRole`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ChooseRole.jsx frontend/src/pages/ChooseRole.test.jsx
git commit -m "feat(onboarding): role picker offers Parent and Nanny"
```

### Task 3.4: Replace TabBar/AppLayout for new role homes

**Files:**
- Modify: `frontend/src/components/layout/TabBar.jsx`
- Modify: `frontend/src/components/layout/TabBar.test.jsx`
- Modify: `frontend/src/layouts/AppLayout.jsx` or `ParentLayout.jsx`
- Create: `frontend/src/layouts/NannyLayout.jsx`

- [ ] **Step 1: TabBar — parent tabs**

Parent tabs: Discover (`/`), Requests (`/requests`), Upcoming (`/upcoming`), Profile (`/my-profile`).

- [ ] **Step 2: TabBar — nanny tabs**

Nanny tabs: Inbox (`/nanny/dashboard`), Availability (`/nanny/availability`), Earnings (`/nanny/earnings`), Profile (`/my-profile`).

- [ ] **Step 3: Drive role-based tab list from `useAccountType()`**

```jsx
// inside TabBar.jsx
const { isNanny } = useAccountType();
const tabs = isNanny ? NANNY_TABS : PARENT_TABS;
```

- [ ] **Step 4: Create NannyLayout (clone ParentLayout, swap label + tab set)**

If `ParentLayout` exists, copy it as `NannyLayout.jsx` and remove the "ORGANIZER" badge; otherwise use shared AppLayout that picks tabs from accountType.

- [ ] **Step 5: Update TabBar test**

Replace organizer-tab assertions with nanny-tab assertions.

- [ ] **Step 6: Run tests + build**

Run: `cd frontend && npm test -- TabBar && npm run build`
Expected: TabBar test passes. Build fails only on missing routes/pages we haven't built yet.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/TabBar.jsx frontend/src/components/layout/TabBar.test.jsx frontend/src/layouts/
git commit -m "feat(layout): tab bar + layouts for parent/nanny roles"
```

### Task 3.5: Add placeholder routes so app boots

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: stub pages — `frontend/src/pages/Discover.jsx`, `Requests.jsx`, `Upcoming.jsx`, `History.jsx`, `nanny/NannyDashboard.jsx`, `nanny/NannyAvailability.jsx`, `nanny/NannyEarnings.jsx`, `nanny/NannyPublicProfile.jsx`, `Book.jsx`

- [ ] **Step 1: Create each stub**

Each stub is a placeholder component returning a labeled `<h1>`. Example:

```jsx
// frontend/src/pages/Discover.jsx
export default function Discover() {
  return <main><h1>Discover</h1></main>;
}
```

Repeat for each path above with the corresponding label.

- [ ] **Step 2: Wire routes in App.jsx**

```jsx
// Parent-guarded
<Route element={<RequireRole role="parent" />}>
  <Route element={<AppLayout />}>
    <Route index element={<Discover />} />
    <Route path="requests" element={<Requests />} />
    <Route path="upcoming" element={<Upcoming />} />
    <Route path="history" element={<History />} />
  </Route>
  <Route path="book/:slotId" element={<Book />} />
  <Route path="nanny/:id" element={<NannyPublicProfile />} />
</Route>

// Nanny-guarded
<Route element={<RequireRole role="nanny" />}>
  <Route element={<NannyLayout />}>
    <Route path="nanny/dashboard" element={<NannyDashboard />} />
    <Route path="nanny/availability" element={<NannyAvailability />} />
    <Route path="nanny/earnings" element={<NannyEarnings />} />
  </Route>
</Route>

// Shared
<Route element={<RequireAuth />}>
  <Route path="my-profile" element={<MyProfile />} />
  <Route path="edit-profile" element={<EditProfile />} />
</Route>
```

- [ ] **Step 3: Confirm build passes + app boots**

Run: `cd frontend && npm run build && npm run dev`
Expected: clean build, dev server starts, navigating routes shows the stub headings.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages
git commit -m "feat(routes): stub all new nanny+parent routes — app boots end-to-end"
```

---

## Phase 4 — Nanny availability

### Task 4.1: useNannyBlocks hook

**Files:**
- Create: `frontend/src/hooks/useNannyBlocks.js`
- Create: `frontend/src/hooks/useNannyBlocks.test.js`

- [ ] **Step 1: Write failing test**

```js
// useNannyBlocks.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNannyBlocks } from "./useNannyBlocks";

const mockData = [
  { id: "b1", day_of_week: 2, start_time: "09:00", end_time: "13:00", rate_cents: 8000, active: true },
];

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
    })),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "n1" } }),
}));

describe("useNannyBlocks", () => {
  it("returns the nanny's active blocks", async () => {
    const { result } = renderHook(() => useNannyBlocks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.blocks[0].day_of_week).toBe(2);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `cd frontend && npm test -- useNannyBlocks`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```js
// frontend/src/hooks/useNannyBlocks.js
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyBlocks() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("nanny_availability_blocks")
      .select("*")
      .eq("nanny_id", user.id)
      .order("day_of_week", { ascending: true });
    if (!error) setBlocks(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (block) => {
    const payload = { ...block, nanny_id: user.id, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from("nanny_availability_blocks")
      .upsert(payload)
      .select()
      .single();
    if (!error) await refresh();
    return { data, error };
  }, [user, refresh]);

  const remove = useCallback(async (id) => {
    const { error } = await supabase
      .from("nanny_availability_blocks")
      .update({ active: false })
      .eq("id", id);
    if (!error) await refresh();
    return { error };
  }, [refresh]);

  return { blocks, loading, refresh, upsert, remove };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `cd frontend && npm test -- useNannyBlocks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useNannyBlocks.js frontend/src/hooks/useNannyBlocks.test.js
git commit -m "feat(nanny): useNannyBlocks hook for availability CRUD"
```

### Task 4.2: AvailabilityEditor component

**Files:**
- Create: `frontend/src/components/nanny/AvailabilityEditor.jsx`
- Create: `frontend/src/components/nanny/AvailabilityEditor.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// AvailabilityEditor.test.jsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../test/testUtils";
import AvailabilityEditor from "./AvailabilityEditor";

vi.mock("../../hooks/useNannyBlocks", () => ({
  useNannyBlocks: () => ({
    blocks: [{ id: "b1", day_of_week: 2, start_time: "09:00", end_time: "13:00", rate_cents: 8000, active: true }],
    loading: false,
    upsert: vi.fn(async () => ({ data: {}, error: null })),
    remove: vi.fn(async () => ({ error: null })),
  }),
}));

describe("AvailabilityEditor", () => {
  it("renders existing blocks grouped by day", () => {
    renderWithProviders(<AvailabilityEditor />);
    expect(screen.getByText(/Tuesday/i)).toBeInTheDocument();
    expect(screen.getByText(/9:00 AM–1:00 PM/)).toBeInTheDocument();
    expect(screen.getByText(/\$80/)).toBeInTheDocument();
  });

  it("opens add-block form when Add is clicked", () => {
    renderWithProviders(<AvailabilityEditor />);
    fireEvent.click(screen.getByRole("button", { name: /add block/i }));
    expect(screen.getByLabelText(/day of week/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `cd frontend && npm test -- AvailabilityEditor`
Expected: FAIL.

- [ ] **Step 3: Implement**

```jsx
// AvailabilityEditor.jsx
import { useState } from "react";
import { useNannyBlocks } from "../../hooks/useNannyBlocks";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2,"0")} ${period}`;
}

export default function AvailabilityEditor() {
  const { blocks, loading, upsert, remove } = useNannyBlocks();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day_of_week: 1, start_time: "09:00", end_time: "13:00", rate_cents: 8000, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

  const grouped = DAYS.map((name, dow) => ({ dow, name, blocks: blocks.filter(b => b.day_of_week === dow) }));

  const submit = async (e) => {
    e.preventDefault();
    const { error } = await upsert(form);
    if (!error) setShowForm(false);
  };

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h1>Availability</h1>
      {grouped.map(({ dow, name, blocks }) => (
        <div key={dow}>
          <h2>{name}</h2>
          {blocks.length === 0 && <p>No blocks</p>}
          {blocks.map(b => (
            <div key={b.id}>
              <span>{fmtTime(b.start_time)}–{fmtTime(b.end_time)}</span>
              <span> · ${(b.rate_cents/100).toFixed(0)}</span>
              <button onClick={() => remove(b.id)}>Remove</button>
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => setShowForm(true)}>Add block</button>
      {showForm && (
        <form onSubmit={submit}>
          <label>Day of week<select value={form.day_of_week} onChange={e => setForm({...form, day_of_week: Number(e.target.value)})}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select></label>
          <label>Start<input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})}/></label>
          <label>End<input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})}/></label>
          <label>Rate ($)<input type="number" min={1} value={form.rate_cents/100} onChange={e => setForm({...form, rate_cents: Math.round(e.target.value*100)})}/></label>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test, confirm pass**

Run: `cd frontend && npm test -- AvailabilityEditor`
Expected: PASS.

- [ ] **Step 5: Wire into NannyAvailability page**

Replace stub `NannyAvailability.jsx` body:

```jsx
import AvailabilityEditor from "../../components/nanny/AvailabilityEditor";
export default function NannyAvailability() {
  return <AvailabilityEditor />;
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/nanny/AvailabilityEditor.jsx frontend/src/components/nanny/AvailabilityEditor.test.jsx frontend/src/pages/nanny/NannyAvailability.jsx
git commit -m "feat(nanny): weekly recurring availability editor"
```

### Task 4.3: materialize-nanny-slots edge function

**Files:**
- Create: `supabase/functions/materialize-nanny-slots/index.ts`
- Create: `supabase/functions/materialize-nanny-slots/deno.json` (if needed by your supabase setup)

- [ ] **Step 1: Implement function**

```ts
// supabase/functions/materialize-nanny-slots/index.ts
// Rolls the slot horizon forward by 8 weeks for every active block.
// Idempotent: uses unique (block_id, starts_at) to skip dupes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HORIZON_DAYS = 56; // 8 weeks

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: blocks, error: blocksErr } = await supabase
    .from("nanny_availability_blocks")
    .select("id, nanny_id, day_of_week, start_time, end_time, timezone, rate_cents")
    .eq("active", true);

  if (blocksErr) return new Response(blocksErr.message, { status: 500 });

  const today = new Date();
  today.setUTCHours(0,0,0,0);

  const slots: Array<Record<string, unknown>> = [];

  for (const b of blocks ?? []) {
    for (let d = 0; d <= HORIZON_DAYS; d++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + d);
      if (date.getUTCDay() !== b.day_of_week) continue;

      // Build local datetime in block's timezone, then convert to UTC.
      const [sh, sm] = b.start_time.split(":").map(Number);
      const [eh, em] = b.end_time.split(":").map(Number);

      const startLocal = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm));
      const endLocal = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em));

      // Adjust for the block's timezone offset on that date.
      const offsetMs = tzOffsetMs(b.timezone, startLocal);
      const startsAt = new Date(startLocal.getTime() - offsetMs);
      const endsAt = new Date(endLocal.getTime() - offsetMs);

      if (startsAt < new Date()) continue; // skip past

      slots.push({
        block_id: b.id,
        nanny_id: b.nanny_id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        rate_cents: b.rate_cents,
        status: "open",
      });
    }
  }

  if (slots.length === 0) return new Response("no new slots", { status: 200 });

  const { error: insertErr } = await supabase
    .from("nanny_slots")
    .upsert(slots, { onConflict: "block_id,starts_at", ignoreDuplicates: true });

  if (insertErr) return new Response(insertErr.message, { status: 500 });

  // Mark past open slots
  await supabase.from("nanny_slots")
    .update({ status: "past" })
    .lt("ends_at", new Date().toISOString())
    .eq("status", "open");

  return new Response(`materialized ${slots.length} candidate slots`, { status: 200 });
});

function tzOffsetMs(tz: string, atUtc: Date): number {
  // Compute the IANA timezone offset for a given UTC instant.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(atUtc).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - atUtc.getTime();
}
```

- [ ] **Step 2: Deploy locally and test invoke**

```bash
supabase functions deploy materialize-nanny-slots
supabase functions invoke materialize-nanny-slots
```

Expected: response `materialized N candidate slots`. Verify in DB:

```sql
select count(*), status from nanny_slots group by status;
```

- [ ] **Step 3: Schedule via pg_cron**

Create migration `supabase/migrations/20260601000002_schedule_materialize_slots.sql`:

```sql
select cron.schedule(
  'materialize-nanny-slots-daily',
  '0 7 * * *',  -- 07:00 UTC daily
  $$select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/materialize-nanny-slots',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  )$$
);
```

(Adapt to whatever cron mechanism this project uses — see existing `20260425000001_session_reminders.sql` for the established pattern.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/materialize-nanny-slots supabase/migrations/20260601000002_schedule_materialize_slots.sql
git commit -m "feat(nanny): edge function to materialize 8-week slot horizon + daily cron"
```

### Task 4.4: Nanny dashboard inbox (read-only for now)

**Files:**
- Create: `frontend/src/hooks/useNannyInbox.js`
- Modify: `frontend/src/pages/nanny/NannyDashboard.jsx`

- [ ] **Step 1: Hook**

```js
// useNannyInbox.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyInbox() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, slot:nanny_slots(starts_at, ends_at)")
        .eq("nanny_id", user.id)
        .in("status", ["pending", "confirmed"]);
      if (cancelled) return;
      if (!error) {
        setPending((data || []).filter(b => b.status === "pending"));
        setUpcoming((data || []).filter(b => b.status === "confirmed"));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { pending, upcoming, loading };
}
```

- [ ] **Step 2: Wire into NannyDashboard**

```jsx
import { useNannyInbox } from "../../hooks/useNannyInbox";

export default function NannyDashboard() {
  const { pending, upcoming, loading } = useNannyInbox();
  if (loading) return <p>Loading…</p>;
  return (
    <main>
      <section>
        <h2>Pending requests ({pending.length})</h2>
        {pending.length === 0 && <p>None right now.</p>}
        {pending.map(b => (
          <article key={b.id}>
            <div>{new Date(b.slot.starts_at).toLocaleString()} – {new Date(b.slot.ends_at).toLocaleString()}</div>
            <div>${(b.rate_cents/100).toFixed(0)}</div>
            <p>{b.note_from_parent}</p>
            {/* Accept/Decline wired in Phase 8 */}
          </article>
        ))}
      </section>
      <section>
        <h2>Upcoming ({upcoming.length})</h2>
        {upcoming.map(b => (
          <article key={b.id}>
            <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
            <div>Confirmed</div>
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useNannyInbox.js frontend/src/pages/nanny/NannyDashboard.jsx
git commit -m "feat(nanny): dashboard reads pending requests + upcoming bookings"
```

---

## Phase 5 — Parent discovery

### Task 5.1: useOpenSlots hook (filtered slot search)

**Files:**
- Create: `frontend/src/hooks/useOpenSlots.js`
- Create: `frontend/src/hooks/useOpenSlots.test.js`

- [ ] **Step 1: Failing test**

```js
// useOpenSlots.test.js
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOpenSlots } from "./useOpenSlots";

const mockSlots = [
  { id: "s1", nanny_id: "n1", starts_at: "2026-06-10T13:00:00Z", ends_at: "2026-06-10T17:00:00Z", rate_cents: 8000, nanny: { id: "n1", full_name: "Ana", avatar_url: null, service_area_lat: 40, service_area_lng: -74 } },
];

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn(() => Promise.resolve({ data: mockSlots, error: null })),
    })),
  },
}));

describe("useOpenSlots", () => {
  it("loads open slots in a time window", async () => {
    const { result } = renderHook(() => useOpenSlots({
      from: new Date("2026-06-10T00:00:00Z"),
      to: new Date("2026-06-11T00:00:00Z"),
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.slots).toHaveLength(1);
    expect(result.current.slots[0].nanny.full_name).toBe("Ana");
  });
});
```

- [ ] **Step 2: Confirm fail**

Run: `cd frontend && npm test -- useOpenSlots`

- [ ] **Step 3: Implement**

```js
// frontend/src/hooks/useOpenSlots.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useOpenSlots({ from, to, maxRateCents = null }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("nanny_slots")
        .select("*, nanny:profiles!nanny_slots_nanny_id_fkey(id, full_name, avatar_url, bio, service_area_lat, service_area_lng)")
        .eq("status", "open")
        .gte("starts_at", from.toISOString())
        .lte("ends_at", to.toISOString())
        .order("starts_at", { ascending: true });
      if (maxRateCents != null) q = q.lte("rate_cents", maxRateCents);
      const { data, error } = await q;
      if (cancelled) return;
      if (!error) setSlots(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from?.toISOString(), to?.toISOString(), maxRateCents]);

  return { slots, loading };
}
```

- [ ] **Step 4: Confirm pass**

Run: `cd frontend && npm test -- useOpenSlots`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useOpenSlots.js frontend/src/hooks/useOpenSlots.test.js
git commit -m "feat(parent): useOpenSlots hook with time window + rate filter"
```

### Task 5.2: Filter sheet

**Files:**
- Create: `frontend/src/components/discovery/FilterSheet.jsx`

- [ ] **Step 1: Implement**

```jsx
// FilterSheet.jsx
import { useState } from "react";

export default function FilterSheet({ initial, onApply }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [maxRate, setMaxRate] = useState(initial.maxRateCents ? initial.maxRateCents/100 : "");

  return (
    <form onSubmit={e => { e.preventDefault(); onApply({ from: new Date(from), to: new Date(to), maxRateCents: maxRate ? Math.round(maxRate*100) : null }); }}>
      <label>From<input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} required /></label>
      <label>To<input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} required /></label>
      <label>Max rate ($)<input type="number" value={maxRate} onChange={e => setMaxRate(e.target.value)} /></label>
      <button type="submit">Apply</button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/discovery/FilterSheet.jsx
git commit -m "feat(discovery): filter sheet (date window + max rate)"
```

### Task 5.3: NannyCard

**Files:**
- Create: `frontend/src/components/discovery/NannyCard.jsx`

- [ ] **Step 1: Implement**

```jsx
// NannyCard.jsx
import { Link } from "react-router-dom";

export default function NannyCard({ slot }) {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  return (
    <Link to={`/book/${slot.id}`}>
      <article>
        {slot.nanny.avatar_url && <img src={slot.nanny.avatar_url} alt="" />}
        <h3>{slot.nanny.full_name}</h3>
        <p>{slot.nanny.bio}</p>
        <div>{start.toLocaleString()} – {end.toLocaleTimeString()}</div>
        <div>${(slot.rate_cents/100).toFixed(0)}</div>
      </article>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/discovery/NannyCard.jsx
git commit -m "feat(discovery): NannyCard for browse feed"
```

### Task 5.4: MapView repurposed for nannies

**Files:**
- Create: `frontend/src/components/discovery/MapView.jsx`

- [ ] **Step 1: Implement**

```jsx
// MapView.jsx — repurposed Leaflet view, pins by Nanny service area
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";

export default function MapView({ slots }) {
  const center = slots.length
    ? [slots[0].nanny.service_area_lat ?? 0, slots[0].nanny.service_area_lng ?? 0]
    : [40.7, -74];
  return (
    <MapContainer center={center} zoom={11} style={{ height: "60vh" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {slots.filter(s => s.nanny.service_area_lat && s.nanny.service_area_lng).map(s => (
        <Marker key={s.id} position={[s.nanny.service_area_lat, s.nanny.service_area_lng]}>
          <Popup>
            <Link to={`/book/${s.id}`}>{s.nanny.full_name} — ${(s.rate_cents/100).toFixed(0)}</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/discovery/MapView.jsx
git commit -m "feat(discovery): map view of open Nanny slots"
```

### Task 5.5: Wire Discover page

**Files:**
- Modify: `frontend/src/pages/Discover.jsx`

- [ ] **Step 1: Implement**

```jsx
import { useState } from "react";
import { useOpenSlots } from "../hooks/useOpenSlots";
import FilterSheet from "../components/discovery/FilterSheet";
import NannyCard from "../components/discovery/NannyCard";
import MapView from "../components/discovery/MapView";

export default function Discover() {
  const tomorrow = new Date(Date.now() + 86400_000);
  const dayAfter = new Date(Date.now() + 2*86400_000);
  const [filters, setFilters] = useState({
    from: tomorrow,
    to: dayAfter,
    maxRateCents: null,
  });
  const [view, setView] = useState("list");
  const { slots, loading } = useOpenSlots(filters);

  return (
    <main>
      <FilterSheet
        initial={{
          from: filters.from.toISOString().slice(0,16),
          to: filters.to.toISOString().slice(0,16),
          maxRateCents: filters.maxRateCents,
        }}
        onApply={setFilters}
      />
      <div>
        <button onClick={() => setView("list")} aria-pressed={view==="list"}>List</button>
        <button onClick={() => setView("map")} aria-pressed={view==="map"}>Map</button>
      </div>
      {loading ? <p>Loading…</p> : view === "list" ? (
        <ul>{slots.map(s => <li key={s.id}><NannyCard slot={s} /></li>)}</ul>
      ) : (
        <MapView slots={slots} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Discover.jsx
git commit -m "feat(parent): discover page with list/map toggle + filters"
```

### Task 5.6: Public Nanny profile page

**Files:**
- Modify: `frontend/src/pages/nanny/NannyPublicProfile.jsx`
- Create: `frontend/src/hooks/useNannyProfile.js`

- [ ] **Step 1: Hook**

```js
// useNannyProfile.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useNannyProfile(id) {
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, bio, verified_at").eq("id", id).single(),
        supabase.from("ratings").select("score, text, created_at").eq("ratee_id", id).eq("direction", "parent_to_nanny").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setProfile(p);
      setRatings(r || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;
  return { profile, ratings, avg, loading };
}
```

- [ ] **Step 2: Page**

```jsx
import { useParams } from "react-router-dom";
import { useNannyProfile } from "../../hooks/useNannyProfile";

export default function NannyPublicProfile() {
  const { id } = useParams();
  const { profile, ratings, avg, loading } = useNannyProfile(id);
  if (loading) return <p>Loading…</p>;
  if (!profile) return <p>Not found.</p>;
  return (
    <main>
      {profile.avatar_url && <img src={profile.avatar_url} alt="" />}
      <h1>{profile.full_name}</h1>
      {profile.verified_at && <span>Verified</span>}
      {avg != null && <div>★ {avg.toFixed(1)} ({ratings.length})</div>}
      <p>{profile.bio}</p>
      <section>
        <h2>Reviews</h2>
        {ratings.length === 0 ? <p>No reviews yet.</p> : ratings.map((r, i) => (
          <article key={i}>
            <div>★ {r.score}</div>
            {r.text && <p>{r.text}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useNannyProfile.js frontend/src/pages/nanny/NannyPublicProfile.jsx
git commit -m "feat(parent): public nanny profile with rating summary + reviews"
```

---

## Phase 6 — Booking request

### Task 6.1: create-booking-request edge function

**Files:**
- Create: `supabase/functions/create-booking-request/index.ts`

This function: validates parent + slot, creates PaymentIntent with manual capture, writes pending booking, transitions slot to `'requested'`. All in one atomic-ish flow.

- [ ] **Step 1: Implement**

```ts
// supabase/functions/create-booking-request/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const PLATFORM_FEE_BPS = parseInt(Deno.env.get("PLATFORM_FEE_BPS") ?? "1500"); // 15%

const ACCEPTANCE_WINDOW_HOURS = 24;

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return new Response("unauthenticated", { status: 401 });

  const { slot_id, note, payment_method_id } = await req.json();
  if (!slot_id || !payment_method_id) return new Response("missing fields", { status: 400 });

  // Get slot + nanny connect account
  const { data: slot, error: slotErr } = await supabase
    .from("nanny_slots")
    .select("id, nanny_id, starts_at, ends_at, rate_cents, status")
    .eq("id", slot_id)
    .single();
  if (slotErr || !slot) return new Response("slot not found", { status: 404 });
  if (slot.status !== "open") return new Response("slot not available", { status: 409 });
  if (new Date(slot.starts_at) <= new Date()) return new Response("slot in past", { status: 409 });

  const { data: nanny } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", slot.nanny_id)
    .single();
  if (!nanny?.stripe_connect_account_id || !nanny.stripe_connect_charges_enabled) {
    return new Response("nanny payouts not set up", { status: 409 });
  }

  // Customer
  const { data: parent } = await supabase
    .from("profiles")
    .select("id, full_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = parent?.stripe_customer_id;
  if (!customerId) {
    const c = await stripe.customers.create({ metadata: { supabase_user_id: user.id } });
    customerId = c.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }
  await stripe.paymentMethods.attach(payment_method_id, { customer: customerId }).catch(() => {});

  const fee = Math.round(slot.rate_cents * PLATFORM_FEE_BPS / 10000);
  const acceptanceExpires = new Date(Math.min(
    Date.now() + ACCEPTANCE_WINDOW_HOURS * 3600_000,
    new Date(slot.starts_at).getTime()
  ));

  // Create PaymentIntent — auth only (manual capture), with on_behalf_of + transfer_data
  const pi = await stripe.paymentIntents.create({
    amount: slot.rate_cents + fee,
    currency: "usd",
    customer: customerId,
    payment_method: payment_method_id,
    capture_method: "manual",
    confirm: true,
    off_session: false,
    application_fee_amount: fee,
    transfer_data: { destination: nanny.stripe_connect_account_id },
    metadata: { slot_id, parent_id: user.id, nanny_id: slot.nanny_id },
  });

  if (pi.status !== "requires_capture") {
    return new Response(`payment auth failed: ${pi.status}`, { status: 402 });
  }

  // Insert booking + flip slot
  const { data: booking, error: bookingErr } = await supabase.from("bookings").insert({
    slot_id,
    parent_id: user.id,
    nanny_id: slot.nanny_id,
    note_from_parent: note ?? null,
    status: "pending",
    stripe_payment_intent_id: pi.id,
    rate_cents: slot.rate_cents,
    platform_fee_cents: fee,
    acceptance_expires_at: acceptanceExpires.toISOString(),
  }).select().single();
  if (bookingErr) {
    await stripe.paymentIntents.cancel(pi.id).catch(() => {});
    return new Response(bookingErr.message, { status: 500 });
  }

  await supabase.from("nanny_slots").update({ status: "requested" }).eq("id", slot_id);

  return Response.json({ booking_id: booking.id });
});
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy create-booking-request
```

- [ ] **Step 3: Smoke test via curl with test Stripe card token**

Skip if no test fixtures yet; revisit in Phase 12.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create-booking-request
git commit -m "feat(booking): edge function — create pending booking with Stripe auth"
```

### Task 6.2: stripe-customer-id column on profiles

**Files:**
- Create: `supabase/migrations/20260601000003_profile_stripe_customer.sql`

- [ ] **Step 1: Migration**

```sql
alter table profiles add column if not exists stripe_customer_id text;
```

- [ ] **Step 2: Apply + commit**

```bash
supabase db reset  # or supabase migration up
git add supabase/migrations/20260601000003_profile_stripe_customer.sql
git commit -m "feat(schema): profiles.stripe_customer_id for parent billing"
```

### Task 6.3: Book page

**Files:**
- Modify: `frontend/src/pages/Book.jsx`
- Install: `@stripe/react-stripe-js`, `@stripe/stripe-js` if not present

- [ ] **Step 1: Add deps if missing**

```bash
cd frontend
npm ls @stripe/react-stripe-js || npm install @stripe/react-stripe-js @stripe/stripe-js
cd -
```

- [ ] **Step 2: Implement Book page**

```jsx
// Book.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function BookForm({ slot }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
    });
    if (pmErr) { setError(pmErr.message); setSubmitting(false); return; }
    const { data, error: invokeErr } = await supabase.functions.invoke("create-booking-request", {
      body: { slot_id: slot.id, note, payment_method_id: paymentMethod.id },
    });
    if (invokeErr) { setError(invokeErr.message); setSubmitting(false); return; }
    navigate("/requests");
  };

  return (
    <form onSubmit={submit}>
      <h2>Note to {slot.nanny.full_name}</h2>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g., Watching my 3-year-old Maya, peanut allergy, drop-off at your place" rows={5} />
      <CardElement />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? "Submitting…" : `Request — $${((slot.rate_cents + Math.round(slot.rate_cents*0.15))/100).toFixed(2)}`}</button>
    </form>
  );
}

export default function Book() {
  const { slotId } = useParams();
  const [slot, setSlot] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("nanny_slots")
        .select("*, nanny:profiles!nanny_slots_nanny_id_fkey(id, full_name, bio, avatar_url)")
        .eq("id", slotId).single();
      setSlot(data);
    })();
  }, [slotId]);
  if (!slot) return <p>Loading…</p>;
  return (
    <Elements stripe={stripePromise}>
      <main>
        <header>
          <h1>Book {slot.nanny.full_name}</h1>
          <div>{new Date(slot.starts_at).toLocaleString()} – {new Date(slot.ends_at).toLocaleTimeString()}</div>
        </header>
        <BookForm slot={slot} />
      </main>
    </Elements>
  );
}
```

- [ ] **Step 3: Add env var**

In `frontend/.env.local` and `frontend/.env`: `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Book.jsx frontend/.env frontend/.env.local frontend/package.json frontend/package-lock.json
git commit -m "feat(booking): /book/:slotId page with Stripe Elements + note field"
```

### Task 6.4: Parent Requests + Upcoming pages

**Files:**
- Create: `frontend/src/hooks/useParentBookings.js`
- Modify: `frontend/src/pages/Requests.jsx`, `Upcoming.jsx`, `History.jsx`

- [ ] **Step 1: Hook**

```js
// useParentBookings.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useParentBookings(statuses) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, slot:nanny_slots(starts_at, ends_at), nanny:profiles!bookings_nanny_id_fkey(id, full_name, avatar_url)")
        .eq("parent_id", user.id)
        .in("status", statuses)
        .order("requested_at", { ascending: false });
      if (cancelled) return;
      setBookings(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, statuses.join(",")]);

  return { bookings, loading };
}
```

- [ ] **Step 2: Requests page**

```jsx
// Requests.jsx
import { useParentBookings } from "../hooks/useParentBookings";

export default function Requests() {
  const { bookings, loading } = useParentBookings(["pending", "pending_payment_retry"]);
  if (loading) return <p>Loading…</p>;
  if (bookings.length === 0) return <p>No pending requests.</p>;
  return (
    <ul>{bookings.map(b => (
      <li key={b.id}>
        <article>
          <h3>{b.nanny.full_name}</h3>
          <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
          <div>Expires {new Date(b.acceptance_expires_at).toLocaleString()}</div>
          <div>${(b.rate_cents/100).toFixed(0)}</div>
          {b.status === "pending_payment_retry" && <strong>Update payment method to keep this request alive.</strong>}
        </article>
      </li>
    ))}</ul>
  );
}
```

- [ ] **Step 3: Upcoming page (with phone reveal)**

```jsx
// Upcoming.jsx
import { useEffect, useState } from "react";
import { useParentBookings } from "../hooks/useParentBookings";
import { supabase } from "../lib/supabase";

export default function Upcoming() {
  const { bookings, loading } = useParentBookings(["confirmed"]);
  const [phones, setPhones] = useState({});

  useEffect(() => {
    (async () => {
      const ids = bookings.map(b => b.nanny.id);
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("id, phone").in("id", ids);
      setPhones(Object.fromEntries((data || []).map(p => [p.id, p.phone])));
    })();
  }, [bookings.length]);

  if (loading) return <p>Loading…</p>;
  if (bookings.length === 0) return <p>No upcoming bookings.</p>;
  return (
    <ul>{bookings.map(b => (
      <li key={b.id}>
        <article>
          <h3>{b.nanny.full_name}</h3>
          <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
          {phones[b.nanny.id] && (
            <>
              <a href={`tel:${phones[b.nanny.id]}`}>Call</a>{" · "}
              <a href={`sms:${phones[b.nanny.id]}`}>Text</a>
            </>
          )}
          <CancelButton booking={b} />
        </article>
      </li>
    ))}</ul>
  );
}

function CancelButton({ booking }) {
  const [confirming, setConfirming] = useState(false);
  const hoursUntil = (new Date(booking.slot.starts_at) - new Date()) / 3600_000;
  const inside24 = hoursUntil < 24;

  const cancel = async () => {
    const { error } = await supabase.functions.invoke("cancel-booking", { body: { booking_id: booking.id } });
    if (error) alert(error.message);
    else window.location.reload();
  };

  if (!confirming) return <button onClick={() => setConfirming(true)}>Cancel</button>;
  return (
    <div role="alertdialog">
      {inside24
        ? <p>Within 24h of the session — <strong>no refund</strong> will be issued.</p>
        : <p>More than 24h away — you'll get a full refund.</p>}
      <button onClick={cancel}>Confirm cancel</button>
      <button onClick={() => setConfirming(false)}>Keep booking</button>
    </div>
  );
}
```

- [ ] **Step 4: History page**

```jsx
// History.jsx
import { useParentBookings } from "../hooks/useParentBookings";

export default function History() {
  const { bookings, loading } = useParentBookings(["completed","declined","expired","cancelled_refunded","cancelled_no_refund"]);
  if (loading) return <p>Loading…</p>;
  return (
    <ul>{bookings.map(b => (
      <li key={b.id}>
        <article>
          <h3>{b.nanny.full_name}</h3>
          <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
          <div>{b.status.replace(/_/g, " ")}</div>
          {b.status === "completed" && <RatingPrompt booking={b} />}
        </article>
      </li>
    ))}</ul>
  );
}

// Placeholder — full rating UI in Phase 10
function RatingPrompt({ booking }) {
  return <button>Rate Nanny</button>;
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useParentBookings.js frontend/src/pages/Requests.jsx frontend/src/pages/Upcoming.jsx frontend/src/pages/History.jsx
git commit -m "feat(parent): requests, upcoming (phone reveal + cancel), and history pages"
```

---

## Phase 7 — Stripe Connect onboarding

### Task 7.1: connect-onboarding-link edge function

**Files:**
- Create: `supabase/functions/stripe-connect-link/index.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthenticated", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, account_type, email")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "nanny") return new Response("not a nanny", { status: 403 });

  let accountId = profile.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: profile.email ?? user.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { supabase_user_id: user.id },
    });
    accountId = account.id;
    await supabase.from("profiles").update({ stripe_connect_account_id: accountId }).eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${Deno.env.get("APP_URL")}/nanny/earnings?connect=refresh`,
    return_url: `${Deno.env.get("APP_URL")}/nanny/earnings?connect=return`,
    type: "account_onboarding",
  });

  return Response.json({ url: link.url });
});
```

- [ ] **Step 2: Deploy + commit**

```bash
supabase functions deploy stripe-connect-link
git add supabase/functions/stripe-connect-link
git commit -m "feat(payouts): stripe connect express onboarding link"
```

### Task 7.2: Nanny earnings page

**Files:**
- Modify: `frontend/src/pages/nanny/NannyEarnings.jsx`

- [ ] **Step 1: Implement**

```jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function NannyEarnings() {
  const { profile } = useAuth();
  const [completedTotal, setCompletedTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("rate_cents, platform_fee_cents")
        .eq("nanny_id", profile?.id)
        .eq("status", "completed");
      const total = (data || []).reduce((s, b) => s + b.rate_cents - b.platform_fee_cents, 0);
      setCompletedTotal(total);
    })();
  }, [profile?.id]);

  const onboard = async () => {
    const { data } = await supabase.functions.invoke("stripe-connect-link");
    if (data?.url) window.location.href = data.url;
  };

  const needsOnboarding = !profile?.stripe_connect_charges_enabled;

  return (
    <main>
      <h1>Earnings</h1>
      {needsOnboarding ? (
        <section>
          <p>Set up payouts to start accepting bookings.</p>
          <button onClick={onboard}>Connect with Stripe</button>
        </section>
      ) : (
        <section>
          <h2>Total earned: ${(completedTotal/100).toFixed(2)}</h2>
          <p>Payouts are managed by Stripe and sent to your linked bank account.</p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Make sure AuthContext exposes profile.stripe_connect_charges_enabled**

In `AuthContext.jsx`, the profile select must include `stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled`. If not, add them.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/nanny/NannyEarnings.jsx frontend/src/context/AuthContext.jsx
git commit -m "feat(nanny): earnings page + stripe connect onboarding entry point"
```

### Task 7.3: account.updated webhook handler

**Files:**
- Create: `supabase/functions/stripe-account-webhook/index.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_ACCOUNT_SECRET")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, secret);
  } catch (err) {
    return new Response(`bad signature: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "account.updated") {
    const a = event.data.object as Stripe.Account;
    await supabase.from("profiles")
      .update({
        stripe_connect_charges_enabled: a.charges_enabled,
        stripe_connect_payouts_enabled: a.payouts_enabled,
      })
      .eq("stripe_connect_account_id", a.id);
  }

  return new Response("ok");
});
```

- [ ] **Step 2: Deploy, register in Stripe dashboard as separate endpoint for `account.updated`**

```bash
supabase functions deploy stripe-account-webhook
```

In Stripe Dashboard → Developers → Webhooks: add endpoint pointing to the deployed function URL, listening only on `account.updated`. Copy signing secret → `STRIPE_WEBHOOK_ACCOUNT_SECRET` in Supabase secrets.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/stripe-account-webhook
git commit -m "feat(payouts): account.updated webhook syncs connect status to profiles"
```

---

## Phase 8 — Booking lifecycle (accept/decline + webhook)

### Task 8.1: respond-to-booking edge function

**Files:**
- Create: `supabase/functions/respond-to-booking/index.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthenticated", { status: 401 });

  const { booking_id, decision } = await req.json();
  if (!["accept", "decline"].includes(decision)) return new Response("bad decision", { status: 400 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();
  if (!booking) return new Response("not found", { status: 404 });
  if (booking.nanny_id !== user.id) return new Response("not your booking", { status: 403 });
  if (booking.status !== "pending") return new Response("not pending", { status: 409 });
  if (new Date(booking.acceptance_expires_at) <= new Date()) return new Response("expired", { status: 409 });

  if (decision === "accept") {
    try {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id!);
      await supabase.from("bookings")
        .update({ status: "confirmed", responded_at: new Date().toISOString() })
        .eq("id", booking_id);
      await supabase.from("nanny_slots").update({ status: "booked" }).eq("id", booking.slot_id);
    } catch (err: any) {
      await supabase.from("bookings")
        .update({ status: "pending_payment_retry" })
        .eq("id", booking_id);
      return new Response(`capture failed: ${err.message}`, { status: 402 });
    }
  } else {
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id!).catch(() => {});
    await supabase.from("bookings")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", booking_id);
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", booking.slot_id);
  }

  return Response.json({ ok: true });
});
```

- [ ] **Step 2: Deploy + commit**

```bash
supabase functions deploy respond-to-booking
git add supabase/functions/respond-to-booking
git commit -m "feat(booking): nanny accept/decline endpoint with stripe capture/cancel"
```

### Task 8.2: Wire Accept/Decline into NannyDashboard

**Files:**
- Modify: `frontend/src/pages/nanny/NannyDashboard.jsx`

- [ ] **Step 1: Add buttons**

```jsx
// Inside the pending request <article>:
<button onClick={async () => {
  await supabase.functions.invoke("respond-to-booking", { body: { booking_id: b.id, decision: "accept" }});
  window.location.reload();
}}>Accept</button>
<button onClick={async () => {
  await supabase.functions.invoke("respond-to-booking", { body: { booking_id: b.id, decision: "decline" }});
  window.location.reload();
}}>Decline</button>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/nanny/NannyDashboard.jsx
git commit -m "feat(nanny): dashboard accept/decline pending requests"
```

### Task 8.3: stripe-webhook-bookings function (charge / transfer events)

**Files:**
- Create: `supabase/functions/stripe-webhook-bookings/index.ts`

This is the *reconciliation* webhook — it doesn't drive primary state transitions (those are done by respond-to-booking + cancel-booking) but it reconciles payment failures, refunds, and transfer status.

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_BOOKINGS_SECRET")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, secret);
  } catch (err) {
    return new Response(`bad signature: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  switch (event.type) {
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase.from("bookings")
        .update({ status: "pending_payment_retry" })
        .eq("stripe_payment_intent_id", pi.id)
        .eq("status", "pending");
      break;
    }
    case "charge.refunded": {
      // No-op: refund is initiated by cancel-booking which sets booking status directly.
      break;
    }
    default: break;
  }

  return new Response("ok");
});
```

- [ ] **Step 2: Deploy + register in Stripe dashboard for events: `payment_intent.*`, `charge.refunded`**

```bash
supabase functions deploy stripe-webhook-bookings
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/stripe-webhook-bookings
git commit -m "feat(booking): stripe webhook reconciles payment failures + refunds"
```

---

## Phase 9 — Cancellation + refunds

### Task 9.1: cancel-booking edge function

**Files:**
- Create: `supabase/functions/cancel-booking/index.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthenticated", { status: 401 });

  const { booking_id } = await req.json();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, slot:nanny_slots(starts_at)")
    .eq("id", booking_id).single();
  if (!booking) return new Response("not found", { status: 404 });

  const isParent = booking.parent_id === user.id;
  const isNanny = booking.nanny_id === user.id;
  if (!isParent && !isNanny) return new Response("forbidden", { status: 403 });

  if (!["pending", "confirmed", "pending_payment_retry"].includes(booking.status)) {
    return new Response("cannot cancel in current state", { status: 409 });
  }

  const hoursUntilStart = (new Date(booking.slot.starts_at).getTime() - Date.now()) / 3600_000;
  const refundEligible = hoursUntilStart > 24;

  const newStatus = booking.status === "pending"
    ? (refundEligible ? "cancelled_refunded" : "cancelled_no_refund") // auth held — refund == cancel auth
    : (refundEligible ? "cancelled_refunded" : "cancelled_no_refund");

  if (booking.status === "pending" || booking.status === "pending_payment_retry") {
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id!).catch(() => {});
  } else if (booking.status === "confirmed") {
    if (refundEligible) {
      await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id!,
        reverse_transfer: true,
        refund_application_fee: true,
      });
    }
    // For nanny-side cancel inside 24h: still refund parent fully (nanny breaking commitment).
    if (!refundEligible && isNanny) {
      await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id!,
        reverse_transfer: true,
        refund_application_fee: true,
      });
    }
  }

  await supabase.from("bookings").update({
    status: (isNanny && !refundEligible) ? "cancelled_refunded" : newStatus,
    cancelled_at: new Date().toISOString(),
    cancelled_by: isParent ? "parent" : "nanny",
  }).eq("id", booking_id);

  // Reopen the slot if still in the future
  if (new Date(booking.slot.starts_at) > new Date()) {
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", booking.slot_id);
  }

  return Response.json({ ok: true });
});
```

Policy notes baked into the code:
- Parent cancels >24h before → full refund.
- Parent cancels <24h before → no refund.
- Nanny cancels at any time → parent gets full refund (nanny broke the commitment).
- Pending bookings: cancelling either side releases the auth, no charge.

- [ ] **Step 2: Deploy + commit**

```bash
supabase functions deploy cancel-booking
git add supabase/functions/cancel-booking
git commit -m "feat(booking): cancel-booking with 24h refund policy + slot reopen"
```

### Task 9.2: Add Cancel button to NannyDashboard for confirmed bookings

**Files:**
- Modify: `frontend/src/pages/nanny/NannyDashboard.jsx`

- [ ] **Step 1: Add to confirmed section**

```jsx
// For each upcoming booking:
<button onClick={async () => {
  if (!confirm("Cancel this booking? Parent will receive a full refund.")) return;
  await supabase.functions.invoke("cancel-booking", { body: { booking_id: b.id }});
  window.location.reload();
}}>Cancel</button>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/nanny/NannyDashboard.jsx
git commit -m "feat(nanny): cancel confirmed booking from dashboard"
```

---

## Phase 10 — Ratings

### Task 10.1: complete-booking edge function

Triggered manually by either side after the session ends, or auto by a cron (Phase 11 already handles expiry; auto-complete can be inferred from ends_at < now + grace).

**Files:**
- Create: `supabase/functions/complete-booking/index.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthenticated", { status: 401 });

  const { booking_id } = await req.json();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, slot:nanny_slots(ends_at)")
    .eq("id", booking_id).single();
  if (!booking) return new Response("not found", { status: 404 });
  if (![booking.nanny_id, booking.parent_id].includes(user.id))
    return new Response("forbidden", { status: 403 });
  if (booking.status !== "confirmed") return new Response("not confirmed", { status: 409 });
  if (new Date(booking.slot.ends_at) > new Date()) return new Response("not yet ended", { status: 409 });

  await supabase.from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", booking_id);
  return Response.json({ ok: true });
});
```

- [ ] **Step 2: Deploy + commit**

```bash
supabase functions deploy complete-booking
git add supabase/functions/complete-booking
git commit -m "feat(booking): mark a confirmed booking complete after end time"
```

### Task 10.2: Rating components + insert

**Files:**
- Create: `frontend/src/components/booking/RatingSheet.jsx`
- Modify: `frontend/src/pages/History.jsx` (parent → nanny)
- Modify: `frontend/src/pages/nanny/NannyDashboard.jsx` (nanny → parent, separate section for past bookings)

- [ ] **Step 1: RatingSheet**

```jsx
// RatingSheet.jsx
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RatingSheet({ booking, direction, rateeId, onDone }) {
  const [score, setScore] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("ratings").insert({
      booking_id: booking.id,
      rater_id: user.id,
      ratee_id: rateeId,
      score,
      text: text || null,
      direction,
    });
    setSubmitting(false);
    if (!error) onDone?.();
  };

  return (
    <form onSubmit={submit}>
      <label>Rating
        <select value={score} onChange={e => setScore(Number(e.target.value))}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </label>
      <label>Comment (optional)<textarea value={text} onChange={e => setText(e.target.value)} /></label>
      <button type="submit" disabled={submitting}>Submit</button>
    </form>
  );
}
```

- [ ] **Step 2: Wire into History (parent → nanny, public)**

In `History.jsx`, replace `RatingPrompt` placeholder with conditional render of RatingSheet, checking whether parent has already rated this booking (query `ratings` with `direction='parent_to_nanny'` + `booking_id`).

```jsx
import RatingSheet from "../components/booking/RatingSheet";
import { useEffect, useState } from "react";

function RatingPrompt({ booking }) {
  const [alreadyRated, setAlreadyRated] = useState(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ratings")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("direction", "parent_to_nanny");
      setAlreadyRated((data || []).length > 0);
    })();
  }, [booking.id]);

  if (alreadyRated === null) return null;
  if (alreadyRated) return <span>Rated ✓</span>;
  if (!opened) return <button onClick={() => setOpened(true)}>Rate Nanny</button>;
  return <RatingSheet booking={booking} direction="parent_to_nanny" rateeId={booking.nanny_id} onDone={() => setAlreadyRated(true)} />;
}
```

- [ ] **Step 3: Similar rating UI on NannyDashboard past-bookings section**

Add a "Past sessions" section in `NannyDashboard.jsx` querying `bookings.status = 'completed'` for the nanny, mirror the same RatingPrompt pattern with `direction="nanny_to_parent"` and `rateeId={b.parent_id}`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/booking/RatingSheet.jsx frontend/src/pages/History.jsx frontend/src/pages/nanny/NannyDashboard.jsx
git commit -m "feat(ratings): parent→nanny (public) + nanny→parent (private) rating UI"
```

---

## Phase 11 — Expire-pending cron

### Task 11.1: expire-pending-requests edge function

**Files:**
- Create: `supabase/functions/expire-pending-requests/index.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: expired } = await supabase
    .from("bookings")
    .select("id, stripe_payment_intent_id, slot_id")
    .eq("status", "pending")
    .lt("acceptance_expires_at", new Date().toISOString());

  for (const b of expired ?? []) {
    if (b.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(b.stripe_payment_intent_id).catch(() => {});
    }
    await supabase.from("bookings").update({ status: "expired" }).eq("id", b.id);
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", b.slot_id);
  }

  return new Response(`expired ${expired?.length ?? 0}`);
});
```

- [ ] **Step 2: Schedule hourly via pg_cron**

Migration `supabase/migrations/20260601000004_schedule_expire_pending.sql`:

```sql
select cron.schedule(
  'expire-pending-bookings-hourly',
  '7 * * * *',
  $$select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/expire-pending-requests',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  )$$
);
```

- [ ] **Step 3: Deploy + commit**

```bash
supabase functions deploy expire-pending-requests
git add supabase/functions/expire-pending-requests supabase/migrations/20260601000004_schedule_expire_pending.sql
git commit -m "feat(booking): hourly cron expires pending requests + releases stripe auth"
```

### Task 11.2: pending_payment_retry sweeper

**Files:**
- Modify: `supabase/functions/expire-pending-requests/index.ts`

- [ ] **Step 1: Extend handler**

Add after the `pending` loop:

```ts
// Expire pending_payment_retry after 12h
const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
const { data: retry } = await supabase
  .from("bookings")
  .select("id, slot_id")
  .eq("status", "pending_payment_retry")
  .lt("requested_at", cutoff);

for (const b of retry ?? []) {
  await supabase.from("bookings").update({ status: "expired" }).eq("id", b.id);
  await supabase.from("nanny_slots").update({ status: "open" }).eq("id", b.slot_id);
}
```

- [ ] **Step 2: Redeploy + commit**

```bash
supabase functions deploy expire-pending-requests
git add supabase/functions/expire-pending-requests
git commit -m "feat(booking): sweep stuck pending_payment_retry bookings after 12h"
```

---

## Phase 12 — QA pass + regression

### Task 12.1: End-to-end smoke run

**Files:** none (manual + script-driven)

- [ ] **Step 1: Run unit tests**

```bash
cd frontend && npm test
```

Expected: all green.

- [ ] **Step 2: Lint + build**

```bash
cd frontend && npm run lint && npm run build
```

- [ ] **Step 3: Start dev server**

```bash
bash /Users/sureshkumar/12Sigma/start-kiddaboo.sh
```

- [ ] **Step 4: Manual flow A — Nanny onboarding**

  1. Sign up as Nanny via `/choose-role`
  2. Add a weekly availability block (e.g., Tue 9am–1pm at $80)
  3. Visit `/nanny/earnings`, click "Connect with Stripe", complete Express onboarding (test mode)
  4. Verify `profile.stripe_connect_charges_enabled` toggled to true via dashboard

- [ ] **Step 5: Manual flow B — Parent booking**

  1. Sign up as Parent (separate browser/incognito)
  2. Set Discover filters to include the Nanny's block window
  3. Confirm the slot appears in list + map
  4. Tap the slot → `/book/:slotId`
  5. Fill note, enter test card `4242 4242 4242 4242`, submit
  6. Confirm landed on `/requests` with pending entry

- [ ] **Step 6: Manual flow C — Acceptance + phone reveal**

  1. As Nanny, refresh `/nanny/dashboard`, see pending request with parent's note
  2. Tap Accept
  3. Confirm Stripe charge captured in dashboard
  4. As Parent, refresh `/upcoming`, see phone reveal with tap-to-call

- [ ] **Step 7: Manual flow D — Cancellation refund**

  1. As Parent, cancel upcoming (>24h away) → confirm refund modal shows full refund
  2. Confirm cancel → Stripe shows refund issued
  3. Slot is back to `open` in `nanny_slots`

- [ ] **Step 8: Manual flow E — Ratings**

  1. With a completed booking (manipulate timestamps if needed, or wait), as Parent visit `/history` → submit 5★ rating with text
  2. As Nanny, submit private rating of parent
  3. Visit `/nanny/:id` as another parent — confirm public rating shows; private rating not visible

- [ ] **Step 9: Commit any small fixes; tag for review**

```bash
git status  # should be clean
git log --oneline main..HEAD | head -50
```

### Task 12.2: Documentation refresh

**Files:**
- Modify: `USER_GUIDE.md` (if applicable), `REGRESSION_TESTS.md`

- [ ] **Step 1: Update USER_GUIDE.md and REGRESSION_TESTS.md to reflect the new flows**

(Or replace if too playgroup-centric — your call when reviewing the existing content.)

- [ ] **Step 2: Commit**

```bash
git add USER_GUIDE.md REGRESSION_TESTS.md
git commit -m "docs: refresh user guide + regression tests for nanny pivot"
```

### Task 12.3: PR

- [ ] **Step 1: Push and open a PR**

```bash
git push -u origin nanny-pivot
gh pr create --title "Nanny pivot: 1:1 booking marketplace" --body "$(cat <<'EOF'
## Summary
- Replaces playgroup discovery + Host role with 1:1 Nanny booking marketplace
- New schema: nanny_availability_blocks, nanny_slots, bookings, ratings
- Stripe Connect Express + manual-capture PaymentIntents
- Spec: docs/superpowers/specs/2026-06-01-nanny-pivot-design.md
- Plan: docs/superpowers/plans/2026-06-01-nanny-pivot.md

## Test plan
- [ ] Nanny onboarding + Stripe Connect
- [ ] Parent discovers + books via list/map
- [ ] Accept → capture → phone reveal
- [ ] Decline → auth released
- [ ] Cancel >24h → refund
- [ ] Cancel <24h → no refund
- [ ] Ratings (public parent→nanny, private nanny→parent)
- [ ] Cron: materialize slots, expire pending

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Confirm PR URL returned**

---

## Self-Review Notes

- Spec section 2 says "no subscription on either side." Plan rips all subscription code in Task 2.7. ✓
- Spec section 5.1 timeline (auth → capture → refund) maps to Tasks 6.1, 8.1, 9.1. ✓
- Spec section 6.2 schema fully implemented in Task 1.1 migration. ✓
- Spec section 7 routes all wired in Task 3.5. ✓
- Spec section 8.3 rip list aligned with Phase 2 tasks. ✓
- Spec section 8.4 backend changes — `materialize-nanny-slots` (Task 4.3), `stripe-webhook-bookings` (Task 8.3), `expire-pending-requests` (Task 11.1) all present. ✓
- Spec section 9 out-of-scope items not implemented (no chat, no child profile, no recurring bookings). ✓

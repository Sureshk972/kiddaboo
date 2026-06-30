# Click-Through Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship first-party analytics that captures pageviews, clicks, and named events to Supabase and surfaces them as five new chart cards in the admin module, with an opt-out toggle for users.

**Architecture:** Client buffers events in memory and bulk-inserts to `public.events` every 5s and on page unload. Capture is wired via a `TrackingProvider` that auto-emits pageviews on route changes and intercepts clicks on elements tagged `data-track="..."`. Admin views are SQL functions (mirroring `admin_kpis`) read by a `useAdminEvents` hook (mirroring `useAdminTimeseries`) and rendered with recharts.

**Tech Stack:** Vite + React 18, Supabase (Postgres + RLS), vitest + @testing-library/react, recharts.

**Spec:** [`docs/superpowers/specs/2026-06-29-click-through-analytics-design.md`](../specs/2026-06-29-click-through-analytics-design.md)

---

## File map

**Create:**
- `supabase/migrations/20260629000001_events_table.sql` — events table + RLS + indexes
- `supabase/migrations/20260629000002_profiles_analytics_opt_out.sql` — opt-out column
- `supabase/migrations/20260629000003_admin_events_functions.sql` — SQL functions for the 5 admin charts
- `frontend/src/lib/tracking.js` — buffer + flush + sessionId helpers
- `frontend/src/lib/tracking.test.js` — unit tests for tracking.js
- `frontend/src/context/TrackingContext.jsx` — provider, pageview effect, click delegation, opt-out gate
- `frontend/src/context/TrackingContext.test.jsx` — provider tests
- `frontend/src/hooks/useAdminEvents.js` — RPC hook

**Modify:**
- `frontend/src/App.jsx` — mount `<TrackingProvider>`
- `frontend/src/pages/MyProfile.jsx` — add Privacy / opt-out row
- `frontend/src/pages/PrivacyPolicy.jsx` — add clarifying line about first-party analytics
- `frontend/src/pages/admin/AdminReports.jsx` — add five chart cards
- `frontend/src/pages/Book.jsx` — add `data-track="parent_book_confirm"` to confirm button
- `frontend/src/pages/Requests.jsx` — add `data-track="parent_request_*"` to action buttons
- `frontend/src/pages/nanny/NannyDashboard.jsx` — add `data-track="nanny_*"` to Accept/Decline buttons
- `frontend/src/pages/admin/AdminVerifications.jsx` — add `data-track="admin_verification_*"` to action buttons
- `frontend/src/pages/onboarding/StripeConnect.jsx` (or equivalent) — `data-track="nanny_payouts_setup_start"` on Connect button

---

## Task 1 — Migration: events table + RLS + indexes

**Files:**
- Create: `supabase/migrations/20260629000001_events_table.sql`

- [ ] **Step 1: Write the migration**

```sql
-- First-party usage analytics. See
-- docs/superpowers/specs/2026-06-29-click-through-analytics-design.md.

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  text not null,
  event_type  text not null check (event_type in ('pageview','click','custom')),
  event_name  text not null,
  path        text not null,
  referrer    text,
  properties  jsonb not null default '{}'::jsonb,
  user_role   text check (user_role in ('parent','nanny','admin') or user_role is null),
  user_agent  text
);

create index events_created_at_idx on public.events (created_at desc);
create index events_user_id_idx    on public.events (user_id);
create index events_event_name_idx on public.events (event_name);
create index events_path_idx       on public.events (path);

alter table public.events enable row level security;

create policy events_self_insert on public.events
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy events_admin_select on public.events
  for select to authenticated
  using (public.is_admin());
```

- [ ] **Step 2: Apply locally**

Run: `npx supabase db push` (or `supabase migration up` if using local setup)
Expected: migration applies cleanly; `\d public.events` shows the table.

- [ ] **Step 3: Verify RLS**

Run in Supabase SQL editor as non-admin:
```sql
select * from public.events;  -- expected: 0 rows (or RLS-denied if no events)
insert into public.events (user_id, session_id, event_type, event_name, path) values (auth.uid(), 'test', 'pageview', '/foo', '/foo');  -- expected: success
insert into public.events (user_id, session_id, event_type, event_name, path) values ('00000000-0000-0000-0000-000000000000', 'test', 'pageview', '/foo', '/foo');  -- expected: RLS error
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260629000001_events_table.sql
git commit -m "Add events table with RLS for first-party analytics"
```

---

## Task 2 — Migration: analytics_opt_out on profiles

**Files:**
- Create: `supabase/migrations/20260629000002_profiles_analytics_opt_out.sql`

- [ ] **Step 1: Write the migration**

```sql
alter table public.profiles
  add column analytics_opt_out boolean not null default false;
```

- [ ] **Step 2: Apply and verify**

Run: `npx supabase db push`
Run in SQL editor: `select column_name, data_type, column_default from information_schema.columns where table_name='profiles' and column_name='analytics_opt_out';`
Expected: one row, boolean, default `false`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629000002_profiles_analytics_opt_out.sql
git commit -m "Add analytics_opt_out flag to profiles"
```

---

## Task 3 — tracking.js: sessionId + buffer (TDD)

**Files:**
- Create: `frontend/src/lib/tracking.js`
- Create: `frontend/src/lib/tracking.test.js`

- [ ] **Step 1: Write the failing test**

`frontend/src/lib/tracking.test.js`:
```js
import { describe, test, expect, beforeEach, vi } from "vitest";
import { getSessionId, pushEvent, drainBuffer, resetForTest } from "./tracking";

describe("tracking.js", () => {
  beforeEach(() => {
    resetForTest();
    sessionStorage.clear();
  });

  test("getSessionId is stable within a session and is a UUID-ish string", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("pushEvent adds to the buffer and drainBuffer empties it", () => {
    pushEvent({ event_type: "pageview", event_name: "/x", path: "/x" });
    pushEvent({ event_type: "click", event_name: "foo", path: "/x" });
    const drained = drainBuffer();
    expect(drained).toHaveLength(2);
    expect(drainBuffer()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/tracking.test.js`
Expected: FAIL — module `./tracking` does not exist.

- [ ] **Step 3: Implement minimal code**

`frontend/src/lib/tracking.js`:
```js
const STORAGE_KEY = "kiddaboo.tracking.sessionId";
let buffer = [];

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId() {
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function pushEvent(event) {
  buffer.push(event);
}

export function drainBuffer() {
  const out = buffer;
  buffer = [];
  return out;
}

// Test-only: clear in-memory buffer between tests.
export function resetForTest() {
  buffer = [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/tracking.test.js`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tracking.js frontend/src/lib/tracking.test.js
git commit -m "Add tracking.js with session id + buffer primitives"
```

---

## Task 4 — tracking.js: flush function (TDD)

**Files:**
- Modify: `frontend/src/lib/tracking.js`
- Modify: `frontend/src/lib/tracking.test.js`

- [ ] **Step 1: Add the failing test**

Append to `tracking.test.js`:
```js
import { flush } from "./tracking";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

test("flush sends buffered events to supabase and clears the buffer", async () => {
  pushEvent({ event_type: "pageview", event_name: "/a", path: "/a" });
  pushEvent({ event_type: "click", event_name: "b", path: "/a" });
  await flush();
  expect(supabase.from).toHaveBeenCalledWith("events");
  const insertMock = supabase.from.mock.results[0].value.insert;
  expect(insertMock).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ event_type: "pageview", event_name: "/a" }),
      expect.objectContaining({ event_type: "click", event_name: "b" }),
    ])
  );
  expect(drainBuffer()).toHaveLength(0);
});

test("flush is a no-op when buffer is empty", async () => {
  await flush();
  expect(supabase.from).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend && npx vitest run src/lib/tracking.test.js`
Expected: FAIL — `flush` not exported.

- [ ] **Step 3: Add the implementation**

In `tracking.js`, add:
```js
import { supabase } from "./supabase";

export async function flush() {
  if (buffer.length === 0) return;
  const batch = drainBuffer();
  const { error } = await supabase.from("events").insert(batch);
  if (error) {
    console.warn("[tracking] flush failed:", error);
  }
}
```

(Move the `import` to the top of the file; keep all existing exports.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd frontend && npx vitest run src/lib/tracking.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tracking.js frontend/src/lib/tracking.test.js
git commit -m "Add flush() to bulk-insert tracking events to Supabase"
```

---

## Task 5 — tracking.js: initTracking with auto-flush triggers

**Files:**
- Modify: `frontend/src/lib/tracking.js`
- Modify: `frontend/src/lib/tracking.test.js`

- [ ] **Step 1: Add the failing test**

```js
import { initTracking } from "./tracking";

test("initTracking flushes every 5 seconds", async () => {
  vi.useFakeTimers();
  const teardown = initTracking();
  pushEvent({ event_type: "pageview", event_name: "/x", path: "/x" });
  await vi.advanceTimersByTimeAsync(5000);
  expect(supabase.from).toHaveBeenCalledWith("events");
  teardown();
  vi.useRealTimers();
});

test("initTracking flushes when buffer hits 50 entries", async () => {
  const teardown = initTracking();
  for (let i = 0; i < 50; i++) {
    pushEvent({ event_type: "click", event_name: `b${i}`, path: "/x" });
  }
  await Promise.resolve();
  await Promise.resolve();
  expect(supabase.from).toHaveBeenCalled();
  teardown();
});
```

- [ ] **Step 2: Run to verify fails**

Expected: FAIL — `initTracking` not exported.

- [ ] **Step 3: Implement**

In `tracking.js`:
```js
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 50;

export function initTracking() {
  const interval = setInterval(flush, FLUSH_INTERVAL_MS);
  const onUnload = () => { flush(); };
  window.addEventListener("pagehide", onUnload);
  window.addEventListener("beforeunload", onUnload);
  return function teardown() {
    clearInterval(interval);
    window.removeEventListener("pagehide", onUnload);
    window.removeEventListener("beforeunload", onUnload);
  };
}
```

Update `pushEvent` to auto-flush at threshold:
```js
export function pushEvent(event) {
  buffer.push(event);
  if (buffer.length >= FLUSH_THRESHOLD) {
    flush();
  }
}
```

- [ ] **Step 4: Run to verify passes**

Run: `cd frontend && npx vitest run src/lib/tracking.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tracking.js frontend/src/lib/tracking.test.js
git commit -m "Auto-flush tracking buffer every 5s and on unload"
```

---

## Task 6 — TrackingContext: provider emits pageview on route change (TDD)

**Files:**
- Create: `frontend/src/context/TrackingContext.jsx`
- Create: `frontend/src/context/TrackingContext.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
import { render, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { TrackingProvider } from "./TrackingContext";
import * as tracking from "../lib/tracking";

vi.mock("../lib/tracking", () => ({
  initTracking: vi.fn(() => () => {}),
  pushEvent: vi.fn(),
  getSessionId: vi.fn(() => "sess-1"),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, profile: { account_type: "parent", analytics_opt_out: false } }),
}));

function Navigator() {
  const nav = useNavigate();
  return <button onClick={() => nav("/discover")}>go</button>;
}

beforeEach(() => {
  tracking.pushEvent.mockClear();
});

test("emits a pageview on initial mount", () => {
  render(
    <MemoryRouter initialEntries={["/welcome"]}>
      <TrackingProvider>
        <Routes>
          <Route path="/welcome" element={<div>w</div>} />
        </Routes>
      </TrackingProvider>
    </MemoryRouter>
  );
  expect(tracking.pushEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      event_type: "pageview",
      event_name: "/welcome",
      user_id: "u1",
      user_role: "parent",
      session_id: "sess-1",
    })
  );
});
```

- [ ] **Step 2: Run to verify fails**

Expected: FAIL — `TrackingProvider` not defined.

- [ ] **Step 3: Implement**

`frontend/src/context/TrackingContext.jsx`:
```jsx
import { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { initTracking, pushEvent, getSessionId } from "../lib/tracking";

const TrackingCtx = createContext(null);

export function useTracking() {
  return useContext(TrackingCtx);
}

export function TrackingProvider({ children }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const prevPath = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const teardown = initTracking();
    return teardown;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (profile?.analytics_opt_out) return;
    pushEvent({
      event_type: "pageview",
      event_name: location.pathname,
      path: location.pathname,
      referrer: prevPath.current,
      user_id: user.id,
      user_role: profile?.account_type ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
      properties: {},
    });
    prevPath.current = location.pathname;
  }, [location.pathname, user?.id, profile?.analytics_opt_out, profile?.account_type]);

  const value = {
    track(name, properties = {}) {
      if (!user?.id) return;
      if (profile?.analytics_opt_out) return;
      pushEvent({
        event_type: "custom",
        event_name: name,
        path: location.pathname,
        user_id: user.id,
        user_role: profile?.account_type ?? null,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
        properties,
      });
    },
  };

  return <TrackingCtx.Provider value={value}>{children}</TrackingCtx.Provider>;
}
```

- [ ] **Step 4: Run to verify passes**

Run: `cd frontend && npx vitest run src/context/TrackingContext.test.jsx`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/TrackingContext.jsx frontend/src/context/TrackingContext.test.jsx
git commit -m "Add TrackingProvider with pageview-on-route-change capture"
```

---

## Task 7 — TrackingContext: data-track click delegation

**Files:**
- Modify: `frontend/src/context/TrackingContext.jsx`
- Modify: `frontend/src/context/TrackingContext.test.jsx`

- [ ] **Step 1: Add the failing test**

```jsx
import { fireEvent } from "@testing-library/react";

test("captures clicks on data-track elements", () => {
  const { getByText } = render(
    <MemoryRouter initialEntries={["/x"]}>
      <TrackingProvider>
        <button data-track="parent_book_confirm">Confirm</button>
      </TrackingProvider>
    </MemoryRouter>
  );
  tracking.pushEvent.mockClear();
  fireEvent.click(getByText("Confirm"));
  expect(tracking.pushEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      event_type: "click",
      event_name: "parent_book_confirm",
      user_id: "u1",
    })
  );
});

test("ignores clicks on elements without data-track", () => {
  const { getByText } = render(
    <MemoryRouter initialEntries={["/x"]}>
      <TrackingProvider>
        <button>Plain</button>
      </TrackingProvider>
    </MemoryRouter>
  );
  tracking.pushEvent.mockClear();
  fireEvent.click(getByText("Plain"));
  // pushEvent only called once at most for initial pageview, no click event
  const clickCalls = tracking.pushEvent.mock.calls.filter(
    ([e]) => e.event_type === "click"
  );
  expect(clickCalls).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify fails**

Expected: FAIL — click delegation not implemented.

- [ ] **Step 3: Implement**

Add inside `TrackingProvider`, after the pageview effect:
```jsx
useEffect(() => {
  if (!user?.id) return;
  if (profile?.analytics_opt_out) return;
  const onClick = (e) => {
    const el = e.target.closest("[data-track]");
    if (!el) return;
    pushEvent({
      event_type: "click",
      event_name: el.dataset.track,
      path: location.pathname,
      user_id: user.id,
      user_role: profile?.account_type ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
      properties: {},
    });
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}, [user?.id, profile?.analytics_opt_out, profile?.account_type, location.pathname]);
```

- [ ] **Step 4: Run to verify passes**

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/TrackingContext.jsx frontend/src/context/TrackingContext.test.jsx
git commit -m "Capture clicks on data-track elements via delegation"
```

---

## Task 8 — TrackingContext: respect opt-out

**Files:**
- Modify: `frontend/src/context/TrackingContext.test.jsx`

- [ ] **Step 1: Add the failing test**

```jsx
test("emits nothing when profile.analytics_opt_out is true", () => {
  vi.doMock("./AuthContext", () => ({
    useAuth: () => ({ user: { id: "u1" }, profile: { account_type: "parent", analytics_opt_out: true } }),
  }));
  // Re-import to pick up the new mock
  return import("./TrackingContext").then(({ TrackingProvider: P }) => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/x"]}>
        <P>
          <button data-track="parent_book_confirm">Confirm</button>
        </P>
      </MemoryRouter>
    );
    tracking.pushEvent.mockClear();
    fireEvent.click(getByText("Confirm"));
    expect(tracking.pushEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify passes**

The opt-out gate is already in the implementation from Tasks 6 + 7 (`if (profile?.analytics_opt_out) return;` in both effects). Test should PASS as soon as it runs against the existing code.

Run: `cd frontend && npx vitest run src/context/TrackingContext.test.jsx`
Expected: PASS, 4 tests.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/TrackingContext.test.jsx
git commit -m "Test: TrackingProvider honors analytics_opt_out"
```

---

## Task 9 — Wire TrackingProvider into App

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add the import and provider**

Open `frontend/src/App.jsx`. Add at line 9 (after the other context imports):
```jsx
import { TrackingProvider } from "./context/TrackingContext";
```

Find line 93 (`<InboxAttentionProvider>`). Wrap the children:
```jsx
<InboxAttentionProvider>
  <TrackingProvider>
    {/* existing children */}
  </TrackingProvider>
</InboxAttentionProvider>
```

And add the matching closing tag at line 260, before `</InboxAttentionProvider>`.

- [ ] **Step 2: Smoke-test in the browser**

Run: `cd frontend && npm run dev` (if not already running)
Open the app, sign in, navigate between two pages.
Open Supabase SQL editor: `select event_type, event_name, path, created_at from public.events order by created_at desc limit 10;`
Expected: pageview rows for the routes you visited, within ~5 seconds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "Mount TrackingProvider at the top of App"
```

---

## Task 10 — Add data-track tags to five high-value buttons

**Files:**
- Modify: `frontend/src/pages/Book.jsx`
- Modify: `frontend/src/pages/Requests.jsx`
- Modify: `frontend/src/pages/nanny/NannyDashboard.jsx`
- Modify: `frontend/src/pages/admin/AdminVerifications.jsx`

- [ ] **Step 1: Tag the Book confirm button**

In `Book.jsx`, find the primary confirm button (the one that triggers booking creation) and add `data-track="parent_book_confirm"`.

- [ ] **Step 2: Tag Accept/Decline on the nanny dashboard**

In `NannyDashboard.jsx`, find the Accept and Decline buttons inside `PendingCard`. Add `data-track="nanny_accept"` and `data-track="nanny_decline"`.

- [ ] **Step 3: Tag admin verification approve/reject**

In `AdminVerifications.jsx`, add `data-track="admin_verification_approve"` and `data-track="admin_verification_reject"` to the action buttons.

- [ ] **Step 4: Tag Cancel on parent requests**

In `Requests.jsx`, add `data-track="parent_request_cancel"` to the cancel button.

- [ ] **Step 5: Smoke-test**

Click each tagged button (or mock the click) and verify rows land in `public.events` with `event_type='click'` and the right `event_name`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Book.jsx frontend/src/pages/Requests.jsx frontend/src/pages/nanny/NannyDashboard.jsx frontend/src/pages/admin/AdminVerifications.jsx
git commit -m "Tag five high-value buttons with data-track for analytics"
```

---

## Task 11 — Opt-out toggle in MyProfile

**Files:**
- Modify: `frontend/src/pages/MyProfile.jsx`

- [ ] **Step 1: Add a Privacy row with toggle**

In `MyProfile.jsx`, find the existing menu rows (Edit Profile, Notifications, How you get paid, etc.). Add a new row after the existing settings rows:

```jsx
<button
  type="button"
  onClick={async () => {
    const next = !profile?.analytics_opt_out;
    const { error } = await supabase
      .from("profiles")
      .update({ analytics_opt_out: next })
      .eq("id", user.id);
    if (!error) {
      // Trigger a profile reload — pattern depends on how AuthContext exposes refresh
      await refreshProfile?.();
    }
  }}
  className="w-full flex items-center justify-between bg-white border border-cream-dark p-5"
>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-md bg-sage-light flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L3 5v5c0 4.5 3 8 7 8s7-3.5 7-8V5l-7-3z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
    <div className="text-left">
      <div className="text-sm font-bold text-charcoal">Don't track my activity</div>
      <div className="text-xs text-taupe">
        Skip first-party usage analytics on your account
      </div>
    </div>
  </div>
  <div
    className={`w-10 h-6 rounded-full p-0.5 transition-colors ${profile?.analytics_opt_out ? "bg-sage" : "bg-cream-dark"}`}
  >
    <div
      className={`w-5 h-5 rounded-full bg-white transition-transform ${profile?.analytics_opt_out ? "translate-x-4" : ""}`}
    />
  </div>
</button>
```

- [ ] **Step 2: Confirm the AuthContext exposes a profile refresh**

If `useAuth()` doesn't expose `refreshProfile`, add it. Open `AuthContext.jsx`, find where `profile` is fetched, and expose a `refreshProfile` function in the context value that re-runs the fetch. Update existing consumers as needed (search for `useAuth()` — most won't need this).

- [ ] **Step 3: Smoke-test**

Toggle the row, reload the page, confirm the toggle persists. Navigate to a new page and verify NO new rows land in `public.events` for that user.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/MyProfile.jsx frontend/src/context/AuthContext.jsx
git commit -m "Add 'don't track my activity' toggle in MyProfile"
```

---

## Task 12 — Privacy policy text update

**Files:**
- Modify: `frontend/src/pages/PrivacyPolicy.jsx`

- [ ] **Step 1: Update the relevant paragraph**

Find the existing line: *"Kiddaboo uses browser local storage for authentication tokens and session data. We do not use third-party tracking cookies or analytics services."*

Replace with:
> "Kiddaboo uses browser local storage for authentication tokens and session data. We do not use third-party tracking cookies or analytics services. We do collect first-party usage analytics — pageviews, clicks, and named events — on our own Supabase infrastructure to improve the product. No PII is captured in event properties and your IP address is not stored. You can opt out from My Profile → Don't track my activity."

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PrivacyPolicy.jsx
git commit -m "Disclose first-party analytics in privacy policy"
```

---

## Task 13 — SQL functions: admin_events_by_day + top_pages + top_clicks

**Files:**
- Create: `supabase/migrations/20260629000003_admin_events_functions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Daily pageview counts split by role.
create or replace function public.admin_events_by_day(p_from timestamptz, p_to timestamptz)
returns table (bucket date, user_role text, count bigint)
language sql security invoker stable as $$
  select
    date_trunc('day', created_at)::date as bucket,
    coalesce(user_role, 'unknown') as user_role,
    count(*)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
    and event_type = 'pageview'
  group by 1, 2
  order by 1, 2;
$$;

-- Top pages by pageview count in a date range.
create or replace function public.admin_top_pages(p_from timestamptz, p_to timestamptz)
returns table (path text, count bigint)
language sql security invoker stable as $$
  select path, count(*)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
    and event_type = 'pageview'
  group by path
  order by 2 desc
  limit 10;
$$;

-- Top click events (data-track values) in a date range.
create or replace function public.admin_top_clicks(p_from timestamptz, p_to timestamptz)
returns table (event_name text, count bigint)
language sql security invoker stable as $$
  select event_name, count(*)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
    and event_type = 'click'
  group by event_name
  order by 2 desc
  limit 10;
$$;

-- Distinct sessions per day.
create or replace function public.admin_active_sessions(p_from timestamptz, p_to timestamptz)
returns table (bucket date, count bigint)
language sql security invoker stable as $$
  select
    date_trunc('day', created_at)::date as bucket,
    count(distinct session_id)::bigint
  from public.events
  where public.is_admin()
    and created_at >= p_from and created_at < p_to
  group by 1
  order by 1;
$$;

-- Signup -> first booking -> first payment funnel. Counts distinct users
-- who hit each step in the period.
create or replace function public.admin_funnel_signup_book_pay(p_from timestamptz, p_to timestamptz)
returns table (step text, count bigint)
language sql security invoker stable as $$
  with signups as (
    select id from public.profiles
    where created_at >= p_from and created_at < p_to and public.is_admin()
  ),
  booked as (
    select distinct parent_id as id from public.bookings
    where requested_at >= p_from and requested_at < p_to and public.is_admin()
  ),
  paid as (
    select distinct b.parent_id as id from public.bookings b
    where b.requested_at >= p_from and b.requested_at < p_to
      and b.status in ('confirmed','completed') and public.is_admin()
  )
  select 'signups' as step, count(*)::bigint from signups
  union all
  select 'booked', count(*)::bigint from booked
  union all
  select 'paid', count(*)::bigint from paid;
$$;
```

- [ ] **Step 2: Apply and smoke-test**

Run: `npx supabase db push`
Run as admin user in SQL editor:
```sql
select * from public.admin_events_by_day(now() - interval '7 days', now());
select * from public.admin_top_pages(now() - interval '7 days', now());
```
Expected: empty rows initially (or sparse data once Tasks 6-9 are deployed), no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260629000003_admin_events_functions.sql
git commit -m "Add SQL functions for admin events charts"
```

---

## Task 14 — useAdminEvents hook

**Files:**
- Create: `frontend/src/hooks/useAdminEvents.js`

- [ ] **Step 1: Implement**

```js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminEvents(fnName, fromIso, toIso) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc(fnName, { p_from: fromIso, p_to: toIso })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error(error);
        setRows(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fnName, fromIso, toIso]);

  return { rows, loading };
}
```

(This is identical in shape to `useAdminTimeseries`. Kept separate for clarity; consider merging later.)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useAdminEvents.js
git commit -m "Add useAdminEvents hook for events RPC calls"
```

---

## Task 15 — AdminReports: five chart cards

**Files:**
- Modify: `frontend/src/pages/admin/AdminReports.jsx`

- [ ] **Step 1: Import the new hook**

Add at the top:
```jsx
import { useAdminEvents } from "../../hooks/useAdminEvents";
import { BarChart, Bar } from "recharts";
```

- [ ] **Step 2: Add the five charts**

Inside the AdminReports component, after the existing charts:
```jsx
const pageviews = useAdminEvents("admin_events_by_day", range.fromIso, range.toIso);
const topPages = useAdminEvents("admin_top_pages", range.fromIso, range.toIso);
const topClicks = useAdminEvents("admin_top_clicks", range.fromIso, range.toIso);
const sessions = useAdminEvents("admin_active_sessions", range.fromIso, range.toIso);
const funnel = useAdminEvents("admin_funnel_signup_book_pay", range.fromIso, range.toIso);

const pageviewsPivot = useMemo(
  () => pivotByBucket(pageviews.rows, "user_role"),
  [pageviews.rows]
);
```

And render:
```jsx
<ChartCard title="Pageviews per day (by role)">
  <LineChart data={pageviewsPivot.data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="bucket" />
    <YAxis />
    <Tooltip />
    <Legend />
    {pageviewsPivot.splits.map((role, i) => (
      <Line key={role} type="monotone" dataKey={role} stroke={COLORS[i % COLORS.length]} />
    ))}
  </LineChart>
</ChartCard>

<ChartCard title="Top pages">
  <BarChart data={topPages.rows} layout="vertical">
    <XAxis type="number" />
    <YAxis dataKey="path" type="category" width={180} />
    <Tooltip />
    <Bar dataKey="count" fill={COLORS[0]} />
  </BarChart>
</ChartCard>

<ChartCard title="Top click events">
  <BarChart data={topClicks.rows} layout="vertical">
    <XAxis type="number" />
    <YAxis dataKey="event_name" type="category" width={180} />
    <Tooltip />
    <Bar dataKey="count" fill={COLORS[1]} />
  </BarChart>
</ChartCard>

<ChartCard title="Active sessions per day">
  <LineChart data={sessions.rows}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="bucket" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="count" stroke={COLORS[2]} />
  </LineChart>
</ChartCard>

<ChartCard title="Signup → Booking → Payment">
  <BarChart data={funnel.rows}>
    <XAxis dataKey="step" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="count" fill={COLORS[3]} />
  </BarChart>
</ChartCard>
```

- [ ] **Step 3: Smoke-test**

Sign in as admin, navigate to AdminReports, change the date range, verify all five charts render without errors. Click a tracked button on another page, return to AdminReports, confirm the click event appears in "Top click events".

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminReports.jsx
git commit -m "Add five analytics chart cards to AdminReports"
```

---

## Task 16 — End-to-end verification

- [ ] **Step 1: Sign in as a parent, navigate**

Walk through: Welcome → Discover → Book → confirm. Click around. Wait 10s.

- [ ] **Step 2: Sign in as a nanny in another tab, navigate**

Walk through: Inbox → Availability → Earnings → Profile.

- [ ] **Step 3: Confirm rows in events table**

Run: `select event_type, count(*) from public.events where created_at > now() - interval '1 hour' group by 1;`
Expected: counts > 0 for `pageview` and `click`.

- [ ] **Step 4: Confirm admin charts populate**

Sign in as admin → AdminReports → 7d range → all five new charts should show data.

- [ ] **Step 5: Confirm opt-out works**

Toggle "Don't track my activity" → reload → walk through some pages → confirm `select count(*) from public.events where user_id = '<your id>' and created_at > now() - interval '5 minutes';` returns 0.

- [ ] **Step 6: Commit the spec status update**

Edit the spec file (`docs/superpowers/specs/2026-06-29-click-through-analytics-design.md`) — change `**Status:** Approved (shape), pending implementation plan` to `**Status:** Shipped`.

```bash
git add docs/superpowers/specs/2026-06-29-click-through-analytics-design.md
git commit -m "Mark click-through analytics spec as shipped"
```

---

## Self-review notes

- **Spec coverage:** every requirement in the spec maps to a task — events table (T1), opt-out column (T2), tracking lib (T3-5), provider (T6-8), App wiring (T9), data-track tags (T10), opt-out UI (T11), privacy policy (T12), SQL functions (T13), admin hook (T14), admin charts (T15), verification (T16).
- **Placeholders:** none. The opt-out UI in Task 11 references `refreshProfile` whose existence is contingent on AuthContext exposing it — Task 11 Step 2 explicitly handles that.
- **Type / name consistency:** `event_name`, `event_type`, `path`, `session_id` consistent throughout. SQL function names match the strings passed to `useAdminEvents`: `admin_events_by_day`, `admin_top_pages`, `admin_top_clicks`, `admin_active_sessions`, `admin_funnel_signup_book_pay`.
- **One known soft spot:** Task 10 assumes specific file paths for tagged buttons. If a button has moved or been renamed since this plan was written, locate the equivalent button in the same page or skip that tag and call it out at handoff.

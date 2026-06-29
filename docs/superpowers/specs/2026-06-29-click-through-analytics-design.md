# First-Party Click-Through Analytics — Design

**Date:** 2026-06-29
**Status:** Approved (shape), pending implementation plan
**Author:** Claude (Opus 4.7), with Suresh

## Problem

Suresh has no visibility into how parents and nannies move through Kiddaboo. He can see counts (signups, bookings, payments via `AdminReports`), but not the *path*: what pages users visit, what they click, where they drop off in a flow. Standard third-party tools (PostHog, Mixpanel, GA4) are off the table — the published Privacy Policy commits to "We do not use third-party tracking cookies or analytics services."

## Goals

- Capture pageviews, clicks, and arbitrary named events from both parent and nanny apps
- Store them first-party in Supabase (consistent with privacy policy)
- Surface insight in the existing admin module via new chart cards in `AdminReports`
- Provide an opt-out for users who don't want their activity tracked
- v1 answers: which pages get traffic, which buttons get used, where users drop off in signup→booking→payment

## Non-goals

- Session replay (PostHog territory; significantly more storage/complexity)
- Real-time dashboards (next-day freshness via existing recharts is fine)
- Cross-device user stitching (one user = one user_id across devices already, via Supabase auth)
- Anonymous tracking before login (only logged-in events for v1 — keeps RLS simple, avoids consent banner)
- Heatmaps / element-position tracking
- Marketing attribution (UTM tracking, channel mix)

## Architecture

Client batches events in memory and bulk-inserts to Supabase directly via RLS. No edge function. Matches the project's existing pattern (`AdminReports`, all queries go client→Supabase via `useAdminTimeseries`).

```
┌──────────────┐    insert([batch])    ┌──────────────────┐
│ React app    │ ───────────────────▶  │ public.events    │
│ TrackingCtx  │   every 5s + unload   │ (RLS: own writes)│
└──────┬───────┘                       └────────┬─────────┘
       │                                        │
       │ trackEvent(name, props)                │ SELECT (admin only)
       ▼                                        ▼
   [in-mem buffer]                       AdminReports charts
```

## Schema

New table `public.events`:

```sql
CREATE TABLE public.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id   text NOT NULL,            -- client-generated, stable per tab
  event_type   text NOT NULL,            -- 'pageview' | 'click' | 'custom'
  event_name   text NOT NULL,            -- path for pageview, data-track value for click, free-form for custom
  path         text NOT NULL,            -- always populated (window.location.pathname)
  referrer     text,                     -- for pageviews only
  properties   jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_role    text,                     -- 'parent' | 'nanny' | 'admin' (denormalized from profiles)
  user_agent   text
);

CREATE INDEX events_created_at_idx ON public.events (created_at DESC);
CREATE INDEX events_user_id_idx    ON public.events (user_id);
CREATE INDEX events_event_name_idx ON public.events (event_name);
CREATE INDEX events_path_idx       ON public.events (path);
```

**RLS:**

- `events_self_insert`: `auth.uid() = user_id` (users can insert their own events)
- `events_admin_select`: select limited to admins via the same gate `AdminReports` uses
- No update / delete from clients

**Constraint on volume:** events table will grow fast. Add a monthly archive job in Phase 2 if needed; not required for v1.

## Client capture

New file: `frontend/src/lib/tracking.js`

- `initTracking()` — generates a `sessionId` (UUID, stored in `sessionStorage`), sets up the buffer + flush interval, registers `pagehide` / `beforeunload` listeners
- `trackEvent(name, properties)` — pushes onto buffer
- `flush()` — `supabase.from('events').insert(buffer.splice(0))`
- Flush triggers: every 5s, on `pagehide`, on `beforeunload`, when buffer exceeds 50 entries

New file: `frontend/src/context/TrackingContext.jsx`

- `<TrackingProvider>` mounted in `App.jsx` inside `AuthProvider` so we have `user.id` + role
- Effect on `useLocation()` change → `trackEvent` with `event_type: 'pageview', event_name: pathname, path, referrer: prev_pathname`
- Global click delegation: `document.addEventListener('click', e => { const el = e.target.closest('[data-track]'); if (el) trackEvent({ event_type: 'click', event_name: el.dataset.track, path: location.pathname }); })`
- Skips entirely if `profile.analytics_opt_out === true`

**Manual instrumentation:** anywhere we want a named event (e.g. `booking_completed`, `verification_submitted`), call `trackEvent('booking_completed', { amount_cents, nanny_id })` directly. The delegation only handles UI clicks tagged with `data-track`.

## Admin views

Extend `AdminReports.jsx` with new chart cards. All driven by a new hook `useAdminEvents(range, slice)` that mirrors the shape of `useAdminTimeseries`.

1. **Pageviews over time** — line chart, role split (parent/nanny), grouped by day
2. **Top pages this period** — bar chart, `event_name` for `event_type='pageview'`, top 10
3. **Top click events** — bar chart, `event_name` for `event_type='click'`, top 10
4. **Active sessions per day** — line chart, distinct `session_id` per day
5. **Signup → Booking → Payment funnel** — three bars showing % conversion at each step (derived from existing tables joined to events, NOT pure event-table query)

## Privacy posture

- Add `analytics_opt_out boolean NOT NULL DEFAULT false` to `profiles`
- New row in MyProfile under "Privacy" → "Don't track my activity" toggle
- No PII ever in `properties` (enforced by code review; no input values, no message content)
- No IP address stored
- Privacy Policy update: add one line clarifying first-party usage analytics. New text:
  > "We do not use third-party tracking cookies or analytics services. We do collect first-party usage analytics (pageviews, clicks, and named events) on our own Supabase infrastructure to improve the product. You can opt out from My Profile → Privacy."

## Scope (v1)

**In:**
- Events table + RLS + indexes (1 migration)
- `tracking.js` lib (buffer/flush)
- `TrackingProvider` wired in `App.jsx`
- Pageview capture (automatic via `useLocation`)
- Click capture via `data-track` delegation
- Five admin charts above
- Opt-out toggle + `profiles.analytics_opt_out` column
- Privacy policy text update

**Out (Phase 2):**
- Adding `data-track` attributes throughout the app — v1 ships with delegation in place, but only a handful of high-value buttons (Book, Pay, Accept, Decline, Verify) get `data-track` tags. The rest accumulates over time.
- Archival / retention policy
- Heatmaps, session replay, anonymous tracking

## Risks

- **Volume:** Even modest usage produces thousands of events/day. Indexes are sized for it, but watch the table monthly. Add archival when it crosses ~1M rows.
- **RLS write performance:** Per-insert RLS check has latency. Batching mitigates this; with 5s flushes, each session produces ~12 inserts/minute of activity, not 120.
- **Service worker + offline:** events emitted while offline will be lost (buffer is in-memory, not persistent). Acceptable for v1; consider IndexedDB-backed buffer later if mobile usage is heavy offline.
- **Beacon vs insert on unload:** `beforeunload` doesn't reliably wait for async work. Mitigation: also flush on `pagehide` (more reliable on mobile Safari). Some last-moment events will still be lost. Acceptable.
- **Funnel chart correctness:** the signup→booking→payment funnel needs to query existing tables (`profiles.created_at`, `bookings.created_at`, `bookings.charged_at`) joined to events for path context. Spec the query carefully in the plan.

## Verification

- Manual: open the app, navigate, observe rows landing in `events` via Supabase SQL editor
- Visual: admin reports show the five new charts populated
- Opt-out: toggle on MyProfile → reload → confirm no rows land for that user
- RLS: anonymous client cannot select from `events`; non-admin user cannot select rows other than their own (admin can select all via existing admin gate)

## Open questions to resolve in the implementation plan

- Exact admin gate predicate (mirror what `AdminReports` uses — likely a `profiles.is_admin` flag or a role claim)
- Whether the funnel chart should be its own card or embedded under "Active sessions"
- Whether to capture form submissions (`<form>` events) in v1 or defer
- Final list of high-value `data-track` attributes to ship in v1

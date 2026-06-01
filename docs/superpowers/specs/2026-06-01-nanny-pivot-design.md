# Nanny Pivot — Design Spec

**Date:** 2026-06-01
**Status:** Draft, pending review
**Author:** Suresh (with Claude)

## 1. Summary

Kiddaboo pivots from a playgroup discovery and hosting app to a 1:1 nanny booking marketplace. The existing **Host** role is removed entirely and replaced by a new **Nanny** role. Playgroups, host-organized sessions, parent subscriptions, and all related code are deleted (no migration — pre-launch, no real users).

A parent finds a Nanny with open availability, requests a specific time block with a free-form note, the Nanny accepts, payment captures, and the two coordinate logistics by phone. After the session, both rate each other.

## 2. Roles

Two roles only, stored on `profiles.account_type`:

- `'parent'` — books Nanny sessions
- `'nanny'` — posts availability, accepts/declines requests

Neither side has a subscription. Kiddaboo earns from a platform fee on each completed booking.

Nanny verification at signup is the same minimal bar as today's Host: ID upload + profile fields. Listing availability is gated on `verified_at IS NOT NULL`.

## 3. Nanny flow

### 3.1 Availability

Nannies set **weekly recurring availability blocks** (e.g., "Tuesday 9am–1pm"). Each block has:

- Day of week (0–6)
- Start time + end time (local, with timezone)
- Flat rate for the whole block

A scheduled function materializes upcoming bookable slots from the recurrence, rolling **8 weeks** out.

A Nanny session is the **whole block**. No sub-window booking, no fixed slot length, no concurrent bookings.

### 3.2 Inbox

The Nanny dashboard shows:

- Pending requests (with parent's free-form note, expiry countdown)
- Accept / Decline buttons
- Upcoming confirmed bookings with parent contact info
- Past bookings awaiting rating

### 3.3 Post-session

Nanny marks the booking complete (or auto-completes after end time + grace period). Nanny rates parent 1–5 with optional text. **Rating is private** — used as a trust signal for future Nannies considering a request from that parent. Not shown to the parent.

## 4. Parent flow

### 4.1 Onboarding

Email/phone + name. No child profile stored. No subscription gate. Verified-email required before requesting.

### 4.2 Discovery

Single screen with a **list / map toggle**. Filters:

- Date + time window (when parent needs care)
- Distance from parent's location
- Optional: price ceiling

Only Nannies with a materialized open slot intersecting the requested window are returned. Profile card shows photo, bio, rate, average public rating, verification badge.

### 4.3 Request

Tap a Nanny → see public profile → tap a specific open block → **free-form note field**. The note is how parents communicate child details (name, age, allergies, anything else) — no stored child profile.

Submitting:
1. Creates Stripe `PaymentIntent` (`capture_method: 'manual'`) for `rate + platform fee`
2. On successful auth, creates `bookings` row with `status: 'pending'`
3. Notifies Nanny

### 4.4 Waiting

Pending request visible in **My Requests** tab with countdown. Expires the earlier of: 24h after request, or block start time.

### 4.5 On acceptance

Phone reveal screen with Nanny's number and tap-to-call / tap-to-SMS shortcuts. Booking moves to **Upcoming**. Pickup, drop-off, and any other logistics happen off-app.

### 4.6 Cancellation

Cancel button in Upcoming.

- **>24h before block start** → full refund
- **<24h before block start** → confirmation modal warning no refund, then proceed

Either side can cancel under the same policy. Cancellation by either side flips the slot back to `'open'` if still in the future.

### 4.7 Post-session

Rate prompt (1–5 + optional text). **Public**, displayed on the Nanny's profile and folded into their average rating.

## 5. Payment flow

Stripe Connect Express accounts for Nannies (same wiring as current Host payouts).

### 5.1 Timeline

| Event | Action |
|---|---|
| Parent requests slot | `PaymentIntent` created with `capture_method: 'manual'`. Card auth'd for `rate + platform fee`. Booking → `pending`. |
| Nanny accepts within window | `paymentIntent.capture`. Booking → `confirmed`. Phone numbers exchanged. |
| Nanny declines OR request expires | `paymentIntent.cancel`. Auth released. Booking → `declined` or `expired`. |
| Cancel >24h before start | `refund.create` on captured PI. Booking → `cancelled_refunded`. Slot reopens. |
| Cancel <24h before start | No refund. Booking → `cancelled_no_refund`. Funds settle to Kiddaboo + Nanny per fee split. |
| Session ends, no cancel | Stripe Connect transfer to Nanny (platform fee retained). Booking → `completed`. Both prompted to rate. |

### 5.2 Platform fee

Single percentage, configurable via env var. Exact value not part of this spec.

### 5.3 Failure modes

- **Card auth fails at request** — request blocked client-side, parent sees error, no booking row written.
- **Capture fails at acceptance** (e.g., card expired between request and accept) — Nanny told "couldn't confirm". Booking → `pending_payment_retry`. Parent prompted to update card within 12h or the booking flips to `expired`.
- **Stripe webhook is the source of truth** for status transitions. UI reads from `bookings.status`. Optimistic UI updates are reconciled against the webhook event.

## 6. Data model

### 6.1 Modified tables

**`profiles`**
- `account_type` enum: `'parent' | 'nanny'` (was `'parent' | 'host'`)
- `verified_at timestamptz null` (nanny-only meaningful)
- `stripe_connect_account_id text null` (nanny-only) — already exists, repurposed from host

### 6.2 New tables

**`nanny_availability_blocks`**
| Column | Type |
|---|---|
| `id` | uuid pk |
| `nanny_id` | uuid → `profiles` |
| `day_of_week` | smallint (0–6) |
| `start_time` | time (local) |
| `end_time` | time (local) |
| `timezone` | text (IANA) |
| `rate_cents` | integer |
| `active` | boolean |
| `created_at`, `updated_at` | timestamptz |

**`nanny_slots`** — materialized from blocks
| Column | Type |
|---|---|
| `id` | uuid pk |
| `block_id` | uuid → `nanny_availability_blocks` |
| `nanny_id` | uuid → `profiles` |
| `starts_at` | timestamptz (UTC) |
| `ends_at` | timestamptz (UTC) |
| `rate_cents` | integer (snapshotted at materialization) |
| `status` | enum: `'open' \| 'requested' \| 'booked' \| 'past'` |

**`bookings`**
| Column | Type |
|---|---|
| `id` | uuid pk |
| `slot_id` | uuid → `nanny_slots` |
| `parent_id` | uuid → `profiles` |
| `nanny_id` | uuid → `profiles` |
| `note_from_parent` | text |
| `status` | enum: `'pending' \| 'confirmed' \| 'declined' \| 'expired' \| 'cancelled_refunded' \| 'cancelled_no_refund' \| 'completed' \| 'pending_payment_retry'` |
| `stripe_payment_intent_id` | text |
| `rate_cents` | integer |
| `platform_fee_cents` | integer |
| `requested_at` | timestamptz |
| `responded_at` | timestamptz null |
| `acceptance_expires_at` | timestamptz |
| `cancelled_at` | timestamptz null |
| `cancelled_by` | enum: `'parent' \| 'nanny'` null |
| `completed_at` | timestamptz null |

**`ratings`**
| Column | Type |
|---|---|
| `id` | uuid pk |
| `booking_id` | uuid → `bookings` |
| `rater_id` | uuid → `profiles` |
| `ratee_id` | uuid → `profiles` |
| `score` | smallint (1–5) |
| `text` | text null |
| `direction` | enum: `'parent_to_nanny' \| 'nanny_to_parent'` |
| `created_at` | timestamptz |

RLS: `parent_to_nanny` ratings publicly readable. `nanny_to_parent` ratings readable only by other nannies considering a request from that parent (and admins). Neither side can see their own incoming `nanny_to_parent` rating.

### 6.3 Dropped tables / columns (clean wipe)

- `playgroups`, `playgroup_sessions`, `playgroup_members`, `join_requests`, `playgroup_messages` and any related tables
- Parent subscription tables (current Stripe subscription state on parents)
- Any host-named tables/columns — dropped, not renamed

No backfill. No migration of existing rows.

## 7. Routes

| Route | Role | Purpose |
|---|---|---|
| `/` | parent | Discovery (list/map toggle) |
| `/nanny/:id` | public | Nanny profile |
| `/book/:slotId` | parent | Request flow (note + Stripe auth) |
| `/requests` | parent | Pending requests |
| `/upcoming` | parent | Confirmed bookings + phone reveal |
| `/history` | parent | Past bookings, rate prompts |
| `/nanny/dashboard` | nanny | Inbox + upcoming |
| `/nanny/availability` | nanny | Recurring block editor |
| `/nanny/earnings` | nanny | Stripe payout summary |
| `/profile` | shared | Profile + verification card |

`RequireRole` updated for `'nanny'`. Parent-only and nanny-only routes guarded.

## 8. Code structure changes

### 8.1 Rename

- `components/host/` → `components/nanny/`
- `HostContext` → folded into `AuthContext` (role is just `account_type`, no separate context needed)
- `layouts/OrganizerLayout.jsx` → `layouts/NannyLayout.jsx`
- `hooks/useSessions.js` → split into `hooks/useNannyBlocks.js` + `hooks/useBookings.js`

### 8.2 New

- `components/booking/` — request sheet, Stripe auth, phone reveal, rating sheet
- `components/discovery/` — `NannyCard`, filter sheet, list/map toggle (`MapView` repurposed)
- `components/nanny/AvailabilityEditor.jsx` — recurring weekly block UI

### 8.3 Delete

- `components/playgroup/*` — all of it
- `components/browse/PlaygroupCard.jsx`, `FilterSheet.jsx` (replaced by `discovery/`)
- `components/host/InviteFamiliesSheet.jsx`, `ScheduleSessionSheet.jsx`
- `hooks/useSessionMessages.js` (no in-app chat)
- Any subscription-paywall components on the parent side
- All playgroup-related routes, pages, contexts

### 8.4 Backend / Supabase

**New edge functions:**

- `materialize-nanny-slots` — cron (daily), rolls slot horizon 8 weeks out
- `stripe-webhook-bookings` — handles `payment_intent.*`, `charge.refunded`, `transfer.*` events; authoritative source for booking status
- `expire-pending-requests` — cron (hourly), flips expired pending requests to `expired` and cancels the PI

**Drop:** all playgroup-related edge functions and RLS policies.

**Migration:** drop old tables, create new tables, no backfill. Single irreversible migration since we're pre-launch.

## 9. Out of scope (deferred)

- In-app chat (phone-based coordination only)
- Stored child profiles (handled per-request via the note field)
- Recurring/standing bookings (each request is one-off)
- Background checks beyond ID upload (revisit before public launch)
- Multi-child or sibling-discount pricing
- Nanny availability beyond weekly recurrence (no one-off overrides, no calendar-paint UI)
- Public Nanny→Parent ratings
- Parent verification beyond email/phone confirmation
- Promotions, referrals, discounts
- Internationalization

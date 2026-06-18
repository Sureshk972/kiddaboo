# Admin Module — Design

**Date:** 2026-06-17
**Status:** Approved for planning
**Owner:** Suresh (solo admin for the foreseeable future)

## Why

Kiddaboo is live and taking real payments. Today the only way to inspect platform
state — verifications, users, bookings, payments, growth — is SQL against the
Supabase database. That is fine for one or two questions; it is not fine for the
"open one page and see what happened yesterday" loop, and it does not scale to
ops work like reviewing a host verification or suspending an account.

The backend already supports an admin: `profiles.role = 'admin'`, an `is_admin()`
SQL function, and RLS policies that key off it. What's missing is the UI.

## Scope

A new `/admin` section inside the existing React app that covers, at minimum-
viable depth, all five operational surfaces:

1. **Verifications** — review and approve/reject host verification requests.
2. **Users** — search, inspect, suspend/unsuspend parents and nannies.
3. **Bookings** — inspect any booking, follow the Stripe payment intent out.
4. **Payments** — KPI tiles plus recent payment intents.
5. **Reports** — time-series charts for signups, bookings, GMV, host funnel.

Plus a **Dashboard** at `/admin` that composes the most-useful pieces of #4 and
#5 so the morning glance is a single page.

### Out of scope (explicit YAGNI)

- Role-based access control or multiple admin roles
- Admin audit log
- Admin-initiated refunds (do these in the Stripe Dashboard)
- Bulk actions, CSV exports
- Email notifications to admins
- Materialized views or query caching
- Mobile-optimized admin layout

## Users

One user: Suresh. Solo admin. No granular permissions; no plan for additional
admin users in this iteration. Design choices flow from this — no RBAC, no audit
log, no per-admin preferences.

## Architecture

### Route shell

A new `AdminLayout` wraps every `/admin/*` route:

- Left sidebar nav: Dashboard, Verifications, Users, Bookings, Payments, Reports.
- Top bar with current admin email and a sign-out control.
- Container widens past the mobile `max-w-md` (target `max-w-7xl`) — *only* on
  admin routes. The parent/nanny app stays mobile-shaped.

### Auth gate

A new `AdminRoute` wrapper component. After auth resolves, it reads
`profile.role` and bounces anyone other than `admin` to `/`. This is a UX gate
only — security is enforced by RLS on the database, which uses the same
`is_admin()` predicate.

### Routes

| Path | Purpose |
| --- | --- |
| `/admin` | Dashboard (KPIs + mini-reports + pending-verification badge) |
| `/admin/verifications` | Verification queue (list + detail drawer) |
| `/admin/users` | Users list |
| `/admin/users/:id` | User detail (profile, bookings, suspend toggle) |
| `/admin/bookings` | Bookings list |
| `/admin/bookings/:id` | Booking detail (read-only) |
| `/admin/payments` | KPI tiles + payment intents list |
| `/admin/reports` | Time-series charts |

### Shared primitives

Three components built once and reused across every module:

- `DataTable` — sortable, filterable, paginated. The workhorse.
- `StatCard` — KPI tile with label, value, optional delta vs. prior period.
- `Drawer` — right-side detail panel that overlays the list view.

## Modules at MVP depth

### 1. Verifications

- DataTable of `verification_requests`, default filter `status = 'pending'`,
  sorted oldest-first.
- Tabs at top: Pending / Approved / Rejected / All.
- Row click opens a Drawer with submitted info, document previews, and
  **Approve** / **Reject** buttons.
- Approve flips `verification_requests.status` and bumps
  `profiles.verification_status`.
- Reject takes a one-line reason and stores it on the request row.

### 2. Users

- DataTable of `profiles`. Columns: name, role, email, joined, status, booking
  count.
- Filters: role (parent/nanny/admin), status (active/suspended), free-text
  search on name + email.
- Row click → detail page (`/admin/users/:id`) with:
  - Profile summary
  - Child list (parents) or slot list (nannies)
  - Recent bookings table
  - Suspend / Unsuspend toggle

### 3. Bookings

- DataTable of `bookings`. Columns: requested_at, parent, nanny, status, rate,
  fee, Stripe PI (link out to Stripe Dashboard).
- Filters: status, date range, parent, nanny.
- Row click → detail page (`/admin/bookings/:id`) with full record, slot info,
  payment info, status timestamps. Read-only.

### 4. Payments

- Top: four StatCards — GMV (last 30d), platform fees collected (30d), Stripe
  processing fees (30d), net platform revenue (30d).
- Below: DataTable of recent payment intents (rows pulled from `bookings`).
  Columns: date, parent, nanny, charged, fee, status, PI link.
- Date range selector at the top controls both the cards and the table.

### 5. Reports

- Date range selector (default 30d, presets: 7d / 30d / 90d / YTD / all).
- Recharts charts:
  - Signups over time, split parent vs. nanny.
  - Bookings over time, split by status (confirmed / completed / cancelled).
  - GMV + platform fees over time.
  - Host funnel (horizontal): signups → verified → first booking.
- Every chart has a "view as table" toggle for grabbing numbers.

### Dashboard (`/admin`)

Composes the highest-signal pieces:

- Four KPI tiles (same as Payments).
- Two charts (GMV trend, signups trend).
- A "Pending verifications: N" badge linking to the queue.

## Data layer

Reads are split by shape:

- **List queries** (Verifications, Users, Bookings, Payments table) — direct
  Supabase reads from the React client using `range()` for pagination and
  `eq` / `ilike` / `gte` for filtering. No new abstraction.
- **Aggregations** (KPI tiles, chart time series, funnel counts) — Postgres
  views plus a small set of RPC functions, called from the client via
  `supabase.rpc(...)`. This keeps the math in SQL and keeps the client code
  thin.

### Views and RPCs to add

| Name | Shape | Purpose |
| --- | --- | --- |
| `admin_kpis_v` | view | Per-booking row with derived columns (charged, fee, processing fee estimate, net). |
| `admin_kpis(from, to)` | RPC | Aggregates `admin_kpis_v` into the four headline numbers. |
| `admin_signups_timeseries(from, to, bucket)` | RPC | Daily/weekly buckets of new profiles, split by role. |
| `admin_bookings_timeseries(from, to, bucket)` | RPC | Daily/weekly buckets of bookings, split by status. |
| `admin_host_funnel(from, to)` | RPC | Three counts: signups, verified hosts, hosts with at least one booking. |

Every view and RPC begins with an `is_admin()` check; non-admins get an empty
result rather than an error.

### Access control

RLS already enforces admin-only access on the underlying tables via
`is_admin()`. The new views and RPCs add the same predicate so nothing leaks
through aggregation.

### Caching

None for MVP. Admin pages get a fresh read each time. If a query gets slow we
will materialize it later.

### Stripe data

No direct Stripe API calls from the client. Everything we display is already
mirrored in `bookings` (rate, platform fee, PI id, status). The PI id is
rendered as a deep link into the Stripe Dashboard for cases where the admin
needs to act (refund, dispute).

## Implementation phasing

| Phase | Scope | Rough effort |
| --- | --- | --- |
| A | Shell + auth: `AdminRoute`, `AdminLayout`, placeholder `/admin`, non-admins bounced. | ½ day |
| B | Shared primitives: `DataTable`, `StatCard`, `Drawer`. | ½ day |
| C | Verifications module (forces a write action — exercises the pattern). | ½ day |
| D | Users + Bookings modules (no new patterns). | 1 day |
| E | Data layer migration: the views and RPCs above. | ½ day |
| F | Payments + Reports + Dashboard (consumes the RPCs). | 1 day |

Total target: ~4 days of focused work. Every phase boundary is shippable —
nothing leaves the app in a half-built state.

## Open questions

None at this time. All scoping decisions resolved during brainstorming
(solo admin, in-app desktop-optimized route, MVP cut covering all five).

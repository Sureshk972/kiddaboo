# Kiddaboo Regression Tests — Nanny Pivot

Last updated: 2026-06-01

Run all tests in a mobile viewport (375–448px wide) unless noted. Use Stripe test card `4242 4242 4242 4242`, expiry any future date, CVC any 3 digits.

---

## Test 1 — Nanny signup + role selection

**Setup:** New email address not previously used.

**Steps:**
1. Open the app and tap **Sign Up**.
2. Enter name, email, and password. Verify email via the link sent.
3. On the role selection screen, tap **I'm a Nanny**, then **Continue**.

**Expected:**
- User lands on `/nanny/dashboard`.
- Tab bar shows: Inbox, Availability, Earnings, Profile.
- Dashboard displays "No pending requests" (empty state).

**DB check:**
```sql
select account_type from profiles where email = '<test email>';
-- expected: 'nanny'
```

---

## Test 2 — Nanny adds a weekly availability block

**Setup:** Logged in as a verified Nanny (set `verified_at` directly in DB if needed for test environment).

**Steps:**
1. Tap the **Availability** tab → lands on `/nanny/availability`.
2. Tap **Add block**.
3. Set Day = Wednesday, Start = 9:00 AM, End = 1:00 PM, Rate = $80.
4. Tap **Save**.

**Expected:**
- Wednesday block appears in the availability list showing "9:00 AM–1:00 PM · $80".
- No error toast.

**DB check:**
```sql
select day_of_week, start_time, end_time, rate_cents, active
from nanny_availability_blocks
where nanny_id = '<nanny user id>';
-- expected: row with day_of_week=3, start_time='09:00', end_time='13:00', rate_cents=8000, active=true
```

---

## Test 3 — Nanny initiates Stripe Connect onboarding

**Setup:** Logged in as a Nanny with no connected Stripe account.

**Steps:**
1. Tap the **Earnings** tab → lands on `/nanny/earnings`.
2. Tap **Connect with Stripe**.

**Expected:**
- Browser redirects to a Stripe-hosted Express onboarding URL (stripe.com domain).
- The URL contains the Nanny's Connect account ID or an onboarding link parameter.

**DB check (pre-completion):**
```sql
select stripe_connect_account_id from profiles where id = '<nanny user id>';
-- expected: non-null value (account created even before onboarding is finished)
```

---

## Test 4 — Nanny dashboard shows "ready to accept" after Connect onboarding

**Setup:** Complete Stripe Express onboarding in test mode (use Stripe test SSN `000-00-0000` and test bank `000123456789`).

**Steps:**
1. Return to the app after completing Stripe onboarding.
2. Tap the **Earnings** tab.

**Expected:**
- Earnings tab shows "Ready to accept bookings" (or equivalent confirmed-state copy).
- No "Connect with Stripe" button visible.

**DB check:**
```sql
select stripe_connect_charges_enabled, stripe_connect_payouts_enabled
from profiles where id = '<nanny user id>';
-- expected: both true (populated by Stripe webhook)
```

---

## Test 5 — Parent signup + role selection → lands on Discover

**Setup:** New email address not previously used.

**Steps:**
1. Open the app and tap **Sign Up**.
2. Enter name, email, and password. Verify email.
3. On the role selection screen, tap **I'm a Parent**, then **Continue**.

**Expected:**
- User lands on `/` (Discover screen).
- Tab bar shows: Discover, Requests, Upcoming, Profile.
- Filter sheet is visible with a default date window.

**DB check:**
```sql
select account_type from profiles where email = '<test email>';
-- expected: 'parent'
```

---

## Test 6 — Parent filters by date window → sees only matching open slots

**Setup:** At least one Nanny has a materialized open slot on a known date. Run `materialize-nanny-slots` if needed.

**Steps:**
1. Log in as a Parent and go to `/`.
2. In the filter sheet, set From = the known slot date at its start time, To = same date at its end time.
3. Tap **Apply**.

**Expected:**
- The feed shows the Nanny card for the matching slot.
- Slots outside the window are not shown.

**DB check:**
```sql
select id, starts_at, ends_at, status from nanny_slots
where status = 'open'
  and starts_at >= '<from>'
  and ends_at <= '<to>';
-- results should match what the UI renders
```

---

## Test 7 — Parent toggles list ↔ map view

**Setup:** Parent is on Discover with at least one result showing.

**Steps:**
1. Results visible in list view.
2. Tap the **Map** button.
3. Tap the **List** button.

**Expected:**
- Map view renders Leaflet map with pin(s) for each result that has a service area location.
- Tapping List returns to card list.
- The number of results is the same in both views.

---

## Test 8 — Parent taps a slot → /book/:slotId loads correctly

**Setup:** Parent is on Discover with at least one open slot visible.

**Steps:**
1. Tap a Nanny card.
2. On the Nanny profile, tap an open slot.

**Expected:**
- URL is `/book/<slotId>`.
- Page shows the Nanny's name, photo, and slot time.
- Note field is present and editable.
- Stripe Elements card input is present.

---

## Test 9 — Parent submits request → pending entry in /requests

**Setup:** Open slot exists. Parent is on `/book/:slotId`.

**Steps:**
1. Enter a note: "My daughter Emma, 4 years old, no allergies."
2. Enter test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. Tap **Send Request**.

**Expected:**
- Redirected to `/requests`.
- New entry visible with status **Pending** and a countdown timer.
- No charge has been captured yet (only an authorization hold).

**DB check:**
```sql
select status, stripe_payment_intent_id from bookings
where parent_id = '<parent user id>'
order by requested_at desc limit 1;
-- expected: status='pending', stripe_payment_intent_id non-null
```

**Stripe check:** In Stripe Dashboard → Payments, find the PaymentIntent. Status should be `requires_capture`.

---

## Test 10 — Nanny accepts request → booking confirmed, parent sees phone reveal

**Setup:** Booking is in `pending` state from Test 9. Logged in as the Nanny on a separate session.

**Steps (Nanny):**
1. Go to `/nanny/dashboard`.
2. Locate the pending request. Verify the parent's note is visible.
3. Tap **Accept**.

**Expected (Nanny):**
- Entry moves from Pending to **Upcoming** section.
- Parent contact info visible in the booking.

**Expected (Parent):**
- In `/upcoming`, booking status shows **Confirmed**.
- Nanny's phone number is visible with tap-to-call and tap-to-SMS links.

**DB check:**
```sql
select status, responded_at from bookings where id = '<booking id>';
-- expected: status='confirmed', responded_at non-null
```

**Stripe check:** PaymentIntent status should be `succeeded` (captured).

---

## Test 11 — Parent cancels confirmed booking more than 24h before start → full refund

**Setup:** Confirmed booking with slot start time > 24h from now.

**Steps:**
1. Log in as Parent, go to `/upcoming`.
2. Open the booking and tap **Cancel**.
3. Confirm the cancellation.

**Expected:**
- Booking removed from Upcoming.
- Success message indicates a full refund was issued.
- Slot is visible again as open in Discover.

**DB check:**
```sql
select status, cancelled_by, cancelled_at from bookings where id = '<booking id>';
-- expected: status='cancelled_refunded', cancelled_by='parent'

select status from nanny_slots where id = '<slot id>';
-- expected: 'open'
```

**Stripe check:** A Refund object should exist on the PaymentIntent with `status=succeeded`.

---

## Test 12 — Parent cancels confirmed booking less than 24h before start → no refund

**Setup:** Confirmed booking with slot start time < 24h from now (manually adjust `starts_at` in DB if needed for testing).

**Steps:**
1. Log in as Parent, go to `/upcoming`.
2. Open the booking and tap **Cancel**.

**Expected:**
- A warning modal appears: "Less than 24 hours before your booking — no refund will be issued."
- Tap **Cancel anyway** to proceed.
- Booking removed from Upcoming.

**DB check:**
```sql
select status, cancelled_by from bookings where id = '<booking id>';
-- expected: status='cancelled_no_refund', cancelled_by='parent'
```

**Stripe check:** No Refund object on the PaymentIntent.

---

## Test 13 — Nanny cancels confirmed booking → parent gets full refund

**Setup:** Confirmed booking with any slot time.

**Steps:**
1. Log in as Nanny, go to `/nanny/dashboard` → Upcoming.
2. Open the booking and tap **Cancel**.
3. Confirm.

**Expected:**
- Booking disappears from Nanny Upcoming.
- Parent's `/upcoming` removes the booking.
- Refund issued regardless of how close the slot is.

**DB check:**
```sql
select status, cancelled_by from bookings where id = '<booking id>';
-- expected: status='cancelled_refunded', cancelled_by='nanny'
```

**Stripe check:** Refund with `status=succeeded` on the PaymentIntent.

---

## Test 14 — Nanny marks booking complete

**Setup:** Confirmed booking whose slot end time has passed (adjust `ends_at` in DB if needed).

**Steps:**
1. Log in as Nanny, go to `/nanny/dashboard` → Upcoming.
2. Open the booking and tap **Mark Complete**.

**Expected:**
- Booking moves out of Upcoming.
- Rating prompt appears.

**DB check:**
```sql
select status, completed_at from bookings where id = '<booking id>';
-- expected: status='completed', completed_at non-null
```

**Stripe check:** A Connect transfer to the Nanny's connected account should exist (minus platform fee).

---

## Test 15 — Parent rates Nanny

**Setup:** Booking in `completed` status for the parent's account.

**Steps:**
1. Log in as Parent, go to `/history`.
2. Find the completed booking. Tap **Rate**.
3. Select 5 stars, write "Wonderful experience!", tap **Submit**.

**Expected:**
- History entry shows a checkmark or "Rated" indicator.
- Rating prompt disappears.

**DB check:**
```sql
select score, text, direction from ratings
where booking_id = '<booking id>' and direction = 'parent_to_nanny';
-- expected: score=5, text='Wonderful experience!'
```

**Verify public visibility:** Log out, open the Nanny's profile page (`/nanny/:id`) — rating should be visible.

---

## Test 16 — Nanny rates parent (private)

**Setup:** Booking in `completed` status for the Nanny's account. Parent has no other nanny-to-parent ratings.

**Steps:**
1. Log in as Nanny, open the completed booking.
2. Tap **Rate parent**, select 4 stars, tap **Submit**.

**Expected:**
- Confirmation that rating was saved.
- No rating visible anywhere on the parent's own account.

**DB check:**
```sql
select score, direction from ratings
where booking_id = '<booking id>' and direction = 'nanny_to_parent';
-- expected: score=4

-- Confirm parent cannot see it via RLS:
-- Run as the parent's auth role (or verify via app UI) — no nanny_to_parent rating should surface.
```

**Nanny-side visibility check:** Log in as a *different* Nanny. On a booking request from that same parent, confirm the private rating is visible to the other Nanny.

---

## Test 17 — Hourly cron expires overdue pending requests

**Setup:** Create a pending booking and manually set `acceptance_expires_at` to a time in the past.

```sql
update bookings
set acceptance_expires_at = now() - interval '1 minute'
where id = '<booking id>' and status = 'pending';
```

**Steps:**
1. Invoke the edge function manually: `supabase functions invoke expire-pending-requests`

**Expected:**
- Booking status flips to `expired`.
- Parent's `/requests` no longer shows the entry as pending.

**DB check:**
```sql
select status from bookings where id = '<booking id>';
-- expected: 'expired'
```

**Stripe check:** PaymentIntent status should be `canceled` (authorization released).

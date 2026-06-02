# Kiddaboo Parent Smoke Test

Happy-path smoke test for the Parent role. Run in a mobile viewport (375–448px wide) against the live or staging environment.

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.

---

## Step 1 — Sign up and choose the Parent role

1. Open the app and tap **Sign Up**.
2. Enter your name, email, and password.
3. Check your inbox and click the verification link.
4. On the role selection screen, tap **I'm a Parent**, then **Continue**.

**Expected:** You land on the Discover screen (`/`). The tab bar shows Discover, Requests, Upcoming, and Profile.

---

## Step 2 — Filter by date window and browse Nannies

1. In the filter sheet at the top of Discover, set a date window a few days out.
2. Optionally set a max rate.
3. Tap **Apply**.
4. Toggle between **List** and **Map** views.

**Expected:** Cards appear for Nannies with open slots matching your window. Both list and map render the same results. Map shows pins for Nannies who have a service area location set.

---

## Step 3 — View a Nanny profile

1. Tap a Nanny card.

**Expected:** The Nanny's public profile (`/nanny/:id`) loads, showing photo, bio, average star rating, written reviews from previous parents, and their open slots.

---

## Step 4 — Book a slot

1. Tap an open slot on the Nanny's profile.
2. On the booking screen (`/book/:slotId`), write a note with the child's name, age, and any relevant details.
3. Enter test card `4242 4242 4242 4242`, a future expiry, and any CVC.
4. Tap **Send Request**.

**Expected:** Redirected to `/requests`. The new booking appears with status **Pending** and a countdown timer showing how long the Nanny has to respond.

---

## Step 5 — Confirmed booking and phone reveal

*(Have the Nanny account accept the request, or trigger acceptance directly in the DB/Stripe Dashboard for a solo test.)*

1. After acceptance, go to `/upcoming`.

**Expected:** The booking shows status **Confirmed**. The Nanny's phone number is visible with tap-to-call and tap-to-SMS links.

---

## Step 6 — Rate after completion

*(Advance the booking to `completed` status — mark complete as the Nanny, or update via DB for testing.)*

1. Go to `/history`.
2. Find the completed booking and tap **Rate**.
3. Select a star score and optionally add a comment. Tap **Submit**.

**Expected:** The booking row shows a "Rated" indicator. The rating appears publicly on the Nanny's profile at `/nanny/:id`.

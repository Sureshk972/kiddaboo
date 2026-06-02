# Kiddaboo User Guide

Kiddaboo is a 1:1 nanny booking marketplace. Parents find Nannies with open availability, request a specific time block, and confirm with Stripe. Nannies set their own schedule, accept or decline requests, and get paid per booking. There are no subscriptions on either side — Kiddaboo earns a small platform fee on each completed session.

---

## Roles

When you sign up you choose one role: **Parent** or **Nanny**. The role determines what you see in the app.

---

## Parent Flow

### 1. Sign Up

Create an account with your email or phone number plus your name. You must verify your email before you can send a booking request. No child profiles are stored — you share child details in the note when you request.

### 2. Choose Role

After verifying your account, tap **I'm a Parent** on the role selection screen.

### 3. Discover Nannies

You land on the Discover screen (`/`). This is the main browse feed.

- **Filters** — Set a date + time window for when you need care. Optionally set a max rate. Tap **Apply**.
- **List / Map toggle** — Switch between a card list and a map view showing the same results.
- Results show only Nannies with an open slot that falls inside your window. Each card shows the Nanny's photo, bio, rate, average rating, and a verification badge if verified.

### 4. View a Nanny Profile

Tap any card to open the Nanny's public profile (`/nanny/:id`). You'll see their bio, average star rating, recent written reviews, and their open slots.

### 5. Request a Slot

Tap an open slot to open the booking screen (`/book/:slotId`).

- Read the slot details (date, time, rate).
- Write a **note** — include the child's name, age, any allergies or special needs, and anything else the Nanny should know. There is no stored child profile; this note is the channel.
- Enter your card details (Stripe Elements).
- Tap **Send Request**.

What happens next:
1. Stripe places an authorization hold on your card for the rate plus the platform fee. Your card is not charged yet.
2. A booking row is created with status **pending**.
3. The Nanny is notified.

### 6. Waiting for a Response

Your request appears in **My Requests** (`/requests`) with a countdown timer. The Nanny has until the earlier of 24 hours or the slot start time to respond. If neither happens, the request expires automatically and the authorization hold is released.

### 7. On Acceptance

When the Nanny accepts, your booking moves to **Upcoming** (`/upcoming`). The screen reveals the Nanny's phone number with tap-to-call and tap-to-SMS shortcuts. Stripe captures the payment at this point.

Pickup logistics, address, and any last-minute details are handled by phone — there is no in-app chat.

### 8. Cancel a Confirmed Booking

In **Upcoming**, tap the booking and then **Cancel**.

- **More than 24 hours before the slot starts** — you receive a full refund. The slot reopens for other parents.
- **Less than 24 hours before the slot starts** — a warning modal explains there will be no refund. If you proceed, the cancellation is processed but payment is not returned.

Nannies can also cancel. If a Nanny cancels you always receive a full refund regardless of timing.

### 9. Rate the Nanny

After the session ends, you'll see a rating prompt in **History** (`/history`). Give 1–5 stars and optionally write a short review. Your rating is **public** and appears on the Nanny's profile.

---

## Nanny Flow

### 1. Sign Up

Create an account with your email or phone number plus your name.

### 2. Choose Role

Tap **I'm a Nanny** on the role selection screen.

### 3. Complete Your Profile

Go to **Profile** (`/profile`). Add a bio, a photo, and your service area. You also need to upload an ID for verification. You cannot list availability until your account is verified (a badge appears once done).

### 4. Connect with Stripe

Before you can accept paid bookings, you need a Stripe Connect account for payouts. Go to **Earnings** (`/nanny/earnings`) and tap **Connect with Stripe**. You'll be redirected to Stripe's Express onboarding — complete the steps there, then return to the app. Your Earnings tab will show "Ready to accept bookings" once onboarding is complete.

### 5. Set Your Availability

Go to **Availability** (`/nanny/availability`). Tap **Add block** to create a weekly recurring availability window.

For each block, choose:
- Day of the week
- Start time and end time
- Your rate for the full block

A background process materializes these into bookable slots rolling 8 weeks out. Each block is a single session — parents book the whole window.

You can remove a block at any time. Removing a block stops future slots from being created but does not affect any already-confirmed bookings.

### 6. Respond to Requests

New booking requests appear in your **Inbox** (`/nanny/dashboard`) with:
- The date, start time, and end time
- The rate
- The parent's note (child details, any special needs)
- An expiry countdown

Tap **Accept** or **Decline**.

- **Accept** — Stripe captures the payment, the booking moves to Upcoming in both your dashboard and the parent's view, and the parent sees your phone number. You'll see the parent's contact info in the booking.
- **Decline** — The authorization hold on the parent's card is released. The slot reopens.

### 7. Upcoming and Confirmed Bookings

The **Upcoming** section of your dashboard shows confirmed bookings with the parent's contact info. Coordinate logistics — address, arrival time, anything else — by phone.

You can cancel a confirmed booking from your dashboard. The parent always receives a full refund when a Nanny cancels.

### 8. Mark Complete

After the session ends, tap **Mark Complete** on the booking. This triggers the Stripe Connect transfer to your account (minus the platform fee). If you forget, the booking auto-completes after the slot end time plus a short grace period.

### 9. Rate the Parent

After marking complete (or after auto-complete), you'll be prompted to rate the parent 1–5 stars with an optional note. This rating is **private** — it is only visible to other Nannies when they are considering a request from that parent. The parent never sees it.

---

## Payment

| Moment | What Happens |
|---|---|
| Parent sends request | Card authorized for rate + platform fee. No charge yet. |
| Nanny accepts | Payment captured. Nanny paid after session via Stripe Connect. |
| Nanny declines or request expires | Authorization released. No charge. |
| Cancel >24h before start | Full refund issued. Slot reopens. |
| Cancel <24h before start | No refund. Funds settle to Kiddaboo + Nanny. |

---

## Cancellation Policy Summary

- Either side can cancel at any time.
- Cancellations made more than 24 hours before the slot start time receive a full refund.
- Cancellations made less than 24 hours before the slot start time receive no refund (parent-initiated).
- Nanny-initiated cancellations always trigger a full refund to the parent, regardless of timing.

---

## Ratings

- **Parent → Nanny** ratings are public. They appear on the Nanny's profile and factor into their average star score.
- **Nanny → Parent** ratings are private. Only other Nannies can see them when deciding whether to accept a request. Parents never see their own incoming nanny rating.

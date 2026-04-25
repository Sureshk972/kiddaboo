# Kiddaboo Parent Regression Checklist

Extracted from [REGRESSION_TESTS.md](REGRESSION_TESTS.md) — parent-only flow.
Run on https://kiddaboo.com in a mobile viewport (375–448px wide) unless noted.

## High-priority spot checks (today's PRs)

These cover changes shipped 2026-04-24. Run these first.

- [ ] **#108 verify-otp** — On code-entry, type a wrong 6-digit code → see "Code doesn't match. Try again." (not "Something went wrong")
- [ ] **#103 joinStatus** — On Browse, find a playgroup you've already joined → CTA shows "Joined" (not "Join Group")
- [ ] **#103 joinStatus** — Find a group with a pending request → CTA shows "Request Pending"
- [ ] **#100 push cleanup on sign-out** — Sign in → enable push → sign out → DevTools › Application › Service Workers shows no active push subscription
- [ ] **#97 realtime conversations** — Open Messages in two browsers as different members → send msg in one → other shows new message + bumps to top without refresh
- [ ] **TabBar badges** — Have another user post in a joined group while you're on /browse → red badge appears on Messages tab
- [ ] **#101 desktop banner** — Open https://kiddaboo.com/browse on desktop (>768px) → sage hint banner "designed for mobile" above the card column
- [ ] **#102 parent/host separation** — Walk parent flow (Browse, My Groups, Profile, Detail) → confirm NO "Become a Host" / "Host a Playgroup" CTA anywhere
- [ ] **End-to-end push** — Another logged-in member posts a chat message in a joined group → you receive an OS-level notification (push perms must be granted)

---

## 1. Authentication

| ID | Test | ✓ |
|----|------|---|
| AUTH-01 | Welcome page loads — wordmark, sprout, tagline, CTAs, sign-in link, legal | ☐ |
| AUTH-02 | Sign up → redirects to `/profile` | ☐ |
| AUTH-03 | Sign in → redirects to `/browse` (or `/profile` if incomplete) | ☐ |
| AUTH-04 | Invalid credentials → error, no nav | ☐ |
| AUTH-05 | Password reset request → confirmation message | ☐ |
| AUTH-06 | Password reset completion → "Continue to Kiddaboo" appears | ☐ |
| AUTH-07 | Visit `/` while logged in (complete profile) → auto-redirect to `/browse` | ☐ |
| AUTH-08 | Visit `/` while logged in (no profile) → auto-redirect to `/profile` | ☐ |

## 2. Onboarding

| ID | Test | ✓ |
|----|------|---|
| ONB-01 | `/profile` shows photo, names, bio (200), philosophy tags (max 4) | ☐ |
| ONB-02 | Profile photo upload → preview in avatar | ☐ |
| ONB-03 | Philosophy tags max — 5th rejected / shake | ☐ |
| ONB-04 | Profile submit → `/verify-phone` | ☐ |
| PHN-01 | PhoneVerify page loads | ☐ |
| PHN-02 | Bare US number → auto +1, code-entry appears | ☐ |
| PHN-03 | Correct OTP → parent goes to `/children` | ☐ |
| PHN-04 | Wrong OTP → "Code doesn't match" error, no nav | ☐ |
| PHN-05 | Resend → new SMS, prior code invalidated | ☐ |
| PHN-06 | Unverified user attempts join → blocked with verify prompt | ☐ |
| ONB-05 | `/children` shows child form (name, age, tags) | ☐ |
| ONB-06 | Add another child → second form appears | ☐ |
| ONB-07 | Remove child → removed from list | ☐ |
| ONB-08 | Children submit → `/success` | ☐ |
| ONB-09 | BrowseSuccess — confetti, mini map, "Start Browsing" | ☐ |

## 3. Browse

| ID | Test | ✓ |
|----|------|---|
| BRW-01 | `/browse` — wordmark, search, filter/sort, cards, tab bar | ☐ |
| BRW-02 | Wordmark — ChunkFive, sage-dark | ☐ |
| BRW-03 | Search filters in real-time (300ms) | ☐ |
| BRW-04 | Search clear (X) restores results | ☐ |
| BRW-05 | Sort by Rated — chip activates, results re-sort | ☐ |
| BRW-05a | Sort by Spots | ☐ |
| BRW-06 | Sort chip press feedback (scale-95) | ☐ |
| BRW-07 | Nearest sort — location prompt → distance sort | ☐ |
| BRW-08 | Deny location → error message below sort row | ☐ |
| BRW-09 | Filters sheet — vibe, age, setting, access | ☐ |
| BRW-10 | Apply filters → badge count appears | ☐ |
| BRW-11 | Clear filters → badge disappears | ☐ |
| BRW-12 | Card display — photo/tags/name/rating/loc/host/age/spots/next/access AND correct join state | ☐ |
| BRW-13 | Card photo gradient — tags readable on dark images | ☐ |
| BRW-14 | Card tap → `/playgroup/:id` | ☐ |
| BRW-21 | Skeleton loading on hard refresh | ☐ |
| BRW-22 | Empty state (no results) — "Clear all filters" link | ☐ |
| BRW-23 | Empty state (no playgroups) — parent sees "Check back soon" copy (not host CTA) | ☐ |
| BRW-24 | Few results — confirm parent does NOT see "Become a Host" card | ☐ |
| BRW-25 | "N playgroups found" text | ☐ |
| BRW-26 | Page transition fades up | ☐ |

## 4. Playgroup Detail

| ID | Test | ✓ |
|----|------|---|
| DET-01 | Detail loads — photos, title, badge, location, tags, description | ☐ |
| DET-02 | Photo carousel — swipeable, dot nav | ☐ |
| DET-03 | No photos → branded placeholder | ☐ |
| DET-04 | Single photo → no dots | ☐ |
| DET-05 | Host card — avatar, name, badge, since, trust, bio, tags | ☐ |
| DET-06 | Host since — "MMM YYYY" not raw ISO | ☐ |
| DET-07 | Environment checklist | ☐ |
| DET-08 | Session cards — date/time, RSVP count | ☐ |
| DET-09 | Aggregate ratings (env, org, compat, reliability) | ☐ |
| DET-10 | Reviews list — name, ratings, comment, date, **avatar photo if reviewer uploaded one** | ☐ |
| DET-11 | Member avatars — initials in circles; clicking own row no-ops | ☐ |
| DET-12 | Non-member open group → sticky Join CTA | ☐ |
| DET-13 | Non-member request group → opens JoinRequestSheet | ☐ |
| DET-14 | JoinRequestSheet — intro field + screening questions | ☐ |
| DET-15 | Free user — 4th join attempt → upgrade modal | ☐ |
| DET-16 | Member view → "Group Chat" CTA → `/messages/:id` | ☐ |
| DET-17 | Eligible reviewer → "Write a Review" → form sheet (4 ratings + comment) | ☐ |
| DET-18 | Report icon → ReportSheet | ☐ |
| DET-19 | Back arrow → previous page | ☐ |
| DET-20 | Page transition fades up | ☐ |

## 5. My Groups (parent only)

| ID | Test | ✓ |
|----|------|---|
| GRP-01 | My Groups loads — joined groups list (no Hosting section for parent) | ☐ |
| GRP-04 | Joined group status badges (member/pending/waitlisted) | ☐ |
| GRP-05 | Tap joined group → playgroup detail | ☐ |
| GRP-06 | Empty state — branded illustration + browse CTA (no host CTA) | ☐ |
| GRP-07 | Page transition | ☐ |

## 6. Messages

| ID | Test | ✓ |
|----|------|---|
| MSG-01 | Conversation list — names, last message, timestamps | ☐ |
| MSG-02 | Unread badge appears on conversation | ☐ |
| MSG-03 | Conversation tap → `/messages/:playgroupId` | ☐ |
| MSG-04 | Empty state — branded chat illustration | ☐ |
| MSG-05 | Group chat — history, sender names, date separators | ☐ |
| MSG-06 | Send message → appears immediately | ☐ |
| MSG-07 | Realtime — other user's message appears without refresh | ☐ |
| MSG-08 | Load more — older messages fetched | ☐ |
| MSG-09 | Block user → their messages hidden | ☐ |
| MSG-10 | Long-press / report → ReportSheet | ☐ |
| MSG-11 | Page transition | ☐ |

## 7. Profile & Settings

| ID | Test | ✓ |
|----|------|---|
| PRF-01 | Profile loads — avatar, name, email, bio, tags, settings | ☐ |
| PRF-02 | "Upgrade to Premium" → `/premium` | ☐ |
| PRF-03 | Edit Profile pre-filled | ☐ |
| PRF-04 | Edit save persists | ☐ |
| PRF-05 | Manage Children → edit profile children section | ☐ |
| PRF-06 | Notifications → master + per-type toggles | ☐ |
| PRF-07 | Push subscribe — browser perm prompt, sub saved | ☐ |
| PRF-08 | Per-type toggles persist | ☐ |
| PRF-09 | Terms of Service loads | ☐ |
| PRF-10 | Privacy Policy loads | ☐ |
| PRF-11 | Help & Support dimmed (opacity-50, "Soon", not clickable) | ☐ |
| PRF-12 | Sign out → Welcome page; push subscription cleaned up | ☐ |
| PRF-13 | Delete account → confirm modal | ☐ |
| PRF-14 | Cancel → modal closes, account intact | ☐ |
| PRF-15 | Confirm delete → account deleted, redirect to Welcome | ☐ |
| PRF-16 | Page transition | ☐ |

## 8. Premium & Payments

| ID | Test | ✓ |
|----|------|---|
| PAY-01 | Premium page — hero, plans, comparison, CTA | ☐ |
| PAY-02 | Annual — "$79.99/yr", "2 months free", "Best Value" | ☐ |
| PAY-03 | Plan select — sage border, button updates price | ☐ |
| PAY-04 | Subscribe logged out → `/verify` | ☐ |
| PAY-05 | Subscribe logged in → Stripe Checkout (test card 4242 4242 4242 4242) | ☐ |
| PAY-06 | Stripe success callback → "Premium" message | ☐ |
| PAY-07 | Premium user visits `/premium` → "You're Premium!" card | ☐ |
| PAY-08 | Free user 4th monthly join → upgrade prompt | ☐ |
| PAY-09 | Premium badge in profile settings | ☐ |
| PAY-10 | Page transition | ☐ |

## 10. Cross-Cutting

| ID | Test | ✓ |
|----|------|---|
| XCT-01 | 375px viewport — no horizontal overflow | ☐ |
| XCT-02 | Tab bar — fixed, active in sage | ☐ |
| XCT-03 | Tab bar hidden on onboarding/detail | ☐ |
| XCT-04 | Browse sticky header on scroll | ☐ |
| XCT-05 | Back buttons present where expected | ☐ |
| XCT-06 | Page transitions ~0.3s fade-up | ☐ |
| XCT-07 | Fonts load — Fraunces, DM Sans, ChunkFive | ☐ |
| XCT-08 | Color palette consistent | ☐ |
| XCT-09 | Offline action → graceful error, no blank screen | ☐ |
| XCT-10 | Realtime — message in tab A appears in tab B | ☐ |
| XCT-11 | Deep link `/playgroup/:id` loads directly | ☐ |
| XCT-12 | `/nonexistent-page` not blank | ☐ |
| XCT-13 | Terms/Privacy fade-up + back | ☐ |

## 11. Security

| ID | Test | ✓ |
|----|------|---|
| SEC-01 | XSS in bio — `<script>` not executed | ☐ |
| SEC-02 | XSS in playgroup name — sanitized | ☐ |
| SEC-03 | XSS in chat — sanitized | ☐ |
| SEC-04 | XSS in review — sanitized | ☐ |
| SEC-05 | SQL inject in search — no error, ignored | ☐ |
| SEC-06 | Phone/email never visible to other users | ☐ |
| SEC-07 | Full address hidden before joining | ☐ |
| SEC-08 | Screening answers private to host only | ☐ |
| SEC-09 | API call without auth → 401 / RLS blocks | ☐ |
| SEC-10 | Expired JWT → 401 | ☐ |
| SEC-11 | RLS — can't update other user's profile | ☐ |
| SEC-12 | RLS — can't delete other's playgroup | ☐ |
| SEC-13 | RLS — can't read other's children | ☐ |
| SEC-14 | Photo upload rejects non-image | ☐ |
| SEC-15 | Photo upload rejects >5MB | ☐ |
| SEC-16 | Free user 4th join blocked | ☐ |
| SEC-17 | Deleted account tokens invalid | ☐ |
| SEC-18 | Block prevents messaging | ☐ |
| SEC-19 | OTP attempt counter not bypassable | ☐ |
| SEC-20 | send-otp rate limit enforced | ☐ |

## 12. Vouching & Trust

| ID | Test | ✓ |
|----|------|---|
| VCH-01 | New account — trust score 0 | ☐ |
| VCH-02 | After review — trust score increases | ☐ |
| VCH-03 | Trust score on host card | ☐ |
| VCH-04 | Trust score on request card (host view — skip for parent) | ☐ |
| VCH-05 | Can't update own trust_score via console | ☐ |
| VCH-06 | Verified badge for verified host | ☐ |
| VCH-07 | No badge for unverified | ☐ |
| VCH-08 | Aggregate ratings calc correct | ☐ |
| VCH-09 | Review only after past session | ☐ |

---

## Notes

- Run on Safari (iOS) + Chrome (Android) for mobile coverage
- For realtime/push: use two logged-in sessions
- For Stripe: test card `4242 4242 4242 4242`
- Mark FAIL inline with a note; turn each FAIL into a PR

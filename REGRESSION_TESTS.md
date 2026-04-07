# Kiddaboo Regression Test Script

Last updated: 2026-04-07

## How to Use

Each test case has:
- **ID** for tracking
- **Steps** to reproduce
- **Expected** result
- **Status** column: PASS / FAIL / SKIP

Run all tests against the live site (https://kiddaboo.com) in a mobile viewport (375px-448px wide).

---

## 1. Welcome & Authentication

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| AUTH-01 | Welcome page loads | Navigate to `/` while logged out | Shows Kiddaboo wordmark (ChunkFive, sage-dark), sprout icon, tagline, "Find Your Playgroup" + "Host a Playgroup" buttons, "Sign in" link, legal links | |
| AUTH-02 | Sign up flow | Click "Find Your Playgroup" > enter new email + password > submit | Redirects to `/profile` (Create Profile page) | |
| AUTH-03 | Sign in flow | Click "Sign in" > enter existing email + password > submit | Redirects to `/browse` (if profile complete) or `/profile` (if incomplete) | |
| AUTH-04 | Invalid credentials | Enter wrong password | Shows error message, does not navigate | |
| AUTH-05 | Password reset request | Click "Forgot password?" > enter email > submit | Shows confirmation message that reset email was sent | |
| AUTH-06 | Password reset completion | Follow email link to `/reset-password` > enter new password + confirm > submit | Password updated, "Continue to Kiddaboo" button appears | |
| AUTH-07 | Auth redirect (logged in) | Visit `/` while logged in with complete profile | Auto-redirects to `/browse` | |
| AUTH-08 | Auth redirect (incomplete profile) | Visit `/` while logged in without profile | Auto-redirects to `/profile` | |

## 2. Onboarding

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| ONB-01 | Create Profile page | After signup, land on `/profile` | Shows photo upload, first/last name, bio (200 char limit), philosophy tags (max 4) | |
| ONB-02 | Profile photo upload | Click "Add photo" > select image | Photo preview appears in avatar circle | |
| ONB-03 | Philosophy tags max | Select 4 tags, try to select a 5th | 5th tag is not selectable or shows shake animation | |
| ONB-04 | Profile submit | Fill required fields > click Continue | Navigates to `/children` | |
| ONB-05 | Add Children page | Land on `/children` | Shows child form (name, age range, personality tags) | |
| ONB-06 | Add multiple children | Add first child > click "Add another child" | Second child form appears | |
| ONB-07 | Remove child | Click remove on a child card | Child is removed from the list | |
| ONB-08 | Children submit | Fill child info > click Continue | Navigates to `/success` (BrowseSuccess) | |
| ONB-09 | BrowseSuccess page | Land on `/success` | Shows confetti animation, mini map preview, "Start Browsing" CTA | |

## 3. Browse Page

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| BRW-01 | Browse page loads | Navigate to `/browse` | Shows Kiddaboo wordmark, search bar, filter/sort chips, playgroup cards, bottom tab bar | |
| BRW-02 | Wordmark branding | Check header | "Kiddaboo" in ChunkFive font, sage-dark (#5C6B52) color | |
| BRW-03 | Search filter | Type a playgroup name in search | Results filter in real-time (300ms debounce) | |
| BRW-04 | Search clear | Click X button in search bar | Search clears, all results return | |
| BRW-05 | Sort chips | Tap "Most Reviewed" | Results re-sort, chip becomes active (sage background) | |
| BRW-06 | Sort chip feedback | Press and release a sort chip | Chip scales down briefly (active:scale-95) | |
| BRW-07 | Nearest sort | Tap "Nearest" | Browser requests location permission, results sort by distance | |
| BRW-08 | Location error | Deny location permission > tap "Nearest" | Error message appears below sort row | |
| BRW-09 | Filter sheet | Tap "Filters" | Bottom sheet opens with vibe tags, age range, setting, access type filters | |
| BRW-10 | Apply filters | Select filters > close sheet | Results filter, active filter count badge appears on Filters button | |
| BRW-11 | Clear filters | Open filters > clear all | All filters removed, badge disappears | |
| BRW-12 | Playgroup card display | View a card in list | Shows photo (or placeholder), tags on photo with gradient overlay, name, rating, location, distance (if available), host avatar/name, verified badge, age range, spots remaining, next session, access badge | |
| BRW-13 | Card photo gradient | View card with photo | Tags at bottom of photo strip are readable over dark images (gradient overlay) | |
| BRW-14 | Card tap | Tap a playgroup card | Navigates to `/playgroup/:id` | |
| BRW-15 | Map view toggle | Tap map icon (top right) | Switches to map view with Leaflet map | |
| BRW-16 | Map pins location | View map with playgroups | Pins appear at correct US locations (not Europe/other) | |
| BRW-17 | Map auto-fit | View map with multiple playgroups | Map zooms/pans to fit all pins with padding | |
| BRW-18 | Map pin popup | Tap a map pin | Popup shows mini playgroup card | |
| BRW-19 | Map to detail | Tap playgroup in map popup | Navigates to playgroup detail | |
| BRW-20 | List view toggle | Switch to map > tap list icon | Returns to list view | |
| BRW-21 | Skeleton loading | Hard refresh Browse page, observe load | Shows 3 skeleton card placeholders (pulse animation) before data loads | |
| BRW-22 | Empty state (no results) | Search for nonexistent name | Shows "No playgroups found" with "Clear all filters" link | |
| BRW-23 | Empty state (no playgroups) | Remove all playgroups from DB | Shows "No playgroups yet" with "Host a Playgroup" CTA | |
| BRW-24 | Few results prompt | Have <=3 playgroups, no active search | Shows "Know a great playgroup spot?" hosting prompt below cards | |
| BRW-25 | Result count | View results | Shows "N playgroup(s) found" text | |
| BRW-26 | Page transition | Navigate to Browse from another tab | Page fades up smoothly (page-transition animation) | |

## 4. Playgroup Detail

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| DET-01 | Detail page loads | Tap a playgroup card | Shows photo carousel, title, access badge, location, vibe tags, description | |
| DET-02 | Photo carousel (with photos) | View playgroup with photos | Shows photos, swipeable, dot navigation for multiple | |
| DET-03 | Photo placeholder | View playgroup without photos | Shows branded placeholder hero (gradient + icon + "photos coming soon") | |
| DET-04 | Single photo | View playgroup with 1 photo | Shows photo, no dot navigation | |
| DET-05 | Host card | Scroll to host section | Shows host avatar, name, verified badge, "Host since [date]" (formatted), trust score, bio, philosophy tags | |
| DET-06 | Host since format | Check host card date | Shows "Host since MMM YYYY" (e.g. "Host since Mar 2026"), not raw ISO string | |
| DET-07 | Environment checklist | Scroll to environment | Shows setting, safety features, pets info, supervision ratio | |
| DET-08 | Session cards | Scroll to schedule | Shows upcoming sessions with date/time, RSVP count | |
| DET-09 | Rating breakdown | Scroll to ratings | Shows aggregate ratings for environment, organization, compatibility, reliability | |
| DET-10 | Review cards | Scroll to reviews | Shows individual reviews with name, ratings, comment, date | |
| DET-11 | Member avatars | View member section | Shows member initials in circles | |
| DET-12 | Join CTA (non-member, open) | View open playgroup as non-member | Sticky bottom button to join immediately | |
| DET-13 | Join CTA (non-member, request) | View request-access playgroup | Sticky bottom button opens JoinRequestSheet | |
| DET-14 | Join request sheet | Tap "Request to Join" | Sheet with intro message field + screening questions (if any) | |
| DET-15 | Join limit (free user) | Send 3 join requests in a month > try 4th | Shows upgrade prompt modal | |
| DET-16 | Chat CTA (member) | View playgroup as member | Sticky bottom button "Group Chat" navigates to `/messages/:id` | |
| DET-17 | Write review | Tap "Write a Review" (if eligible) | Opens ReviewFormSheet with 4 rating categories + comment | |
| DET-18 | Report/block | Tap report icon | Opens ReportSheet with report types and block option | |
| DET-19 | Back navigation | Tap back arrow | Returns to previous page | |
| DET-20 | Page transition | Navigate to detail | Page fades up smoothly | |

## 5. My Groups

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| GRP-01 | My Groups loads | Tap "My Groups" tab | Shows hosted playgroup (if any) + joined groups list | |
| GRP-02 | Hosted group card | View as host | Shows playgroup with color strip, location, member count, pending requests badge | |
| GRP-03 | Hosted group tap | Tap hosted group | Navigates to Host Dashboard | |
| GRP-04 | Joined group status | View joined groups | Shows status badges (member/pending/waitlisted) | |
| GRP-05 | Joined group tap | Tap joined group | Navigates to playgroup detail | |
| GRP-06 | Empty state (no groups) | User with no groups | Shows branded empty state (overlapping family circles, "Your playgroup family awaits", browse CTA) | |
| GRP-07 | Page transition | Navigate to My Groups | Smooth fade-up animation | |

## 6. Messages

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| MSG-01 | Messages list loads | Tap "Messages" tab | Shows conversation list with playgroup names, last message preview, timestamps | |
| MSG-02 | Unread count | Receive new messages | Unread badge appears on conversation | |
| MSG-03 | Conversation tap | Tap a conversation | Navigates to `/messages/:playgroupId` group chat | |
| MSG-04 | Empty state | User with no conversations | Shows branded empty state (chat bubbles with typing dots + heart, "Conversations start here", browse CTA) | |
| MSG-05 | Group chat loads | Navigate to group chat | Shows message history with sender names/avatars, date separators | |
| MSG-06 | Send message | Type message > tap send | Message appears in thread immediately | |
| MSG-07 | Realtime messages | Another user sends a message | Message appears in thread without refresh | |
| MSG-08 | Load more | Scroll to top of long conversation | "Load more" button loads older messages | |
| MSG-09 | Blocked user messages | Block a user > view chat | Blocked user's messages are hidden | |
| MSG-10 | Report from chat | Long press / tap report on a message | ReportSheet opens | |
| MSG-11 | Page transition | Navigate to messages | Smooth fade-up animation | |

## 7. Profile & Settings

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| PRF-01 | Profile page loads | Tap "Profile" tab | Shows avatar, name, email, bio, philosophy tags, settings menu | |
| PRF-02 | Premium link | Tap "Upgrade to Premium" | Navigates to `/premium` | |
| PRF-03 | Edit Profile | Tap "Edit Profile" | Navigates to `/edit-profile` with current values pre-filled | |
| PRF-04 | Edit Profile save | Change bio > save | Returns to profile, changes persisted | |
| PRF-05 | Manage Children | Tap "Manage Children" | Navigates to edit profile with children section | |
| PRF-06 | Notifications | Tap "Notifications" | Navigates to notification settings with master toggle + per-type toggles | |
| PRF-07 | Push notification subscribe | Enable master push toggle | Browser requests notification permission, subscription saved | |
| PRF-08 | Per-type notification toggles | Toggle individual notification types | Preferences saved to Supabase | |
| PRF-09 | Terms of Service | Tap "Terms of Service" | Navigates to `/terms`, shows full legal document | |
| PRF-10 | Privacy Policy | Tap "Privacy Policy" | Navigates to `/privacy`, shows full legal document | |
| PRF-11 | Help & Support (dimmed) | View Help & Support row | Appears dimmed (opacity-50), shows "Soon" label, not clickable | |
| PRF-12 | Sign out | Tap "Sign out" | Signs out, redirects to Welcome page | |
| PRF-13 | Delete account modal | Tap "Delete my account" | Confirmation modal appears with warning and cancel/delete buttons | |
| PRF-14 | Delete account cancel | Click "Cancel" in modal | Modal closes, account unchanged | |
| PRF-15 | Delete account confirm | Click "Yes, delete everything" | Account deleted, redirected to Welcome | |
| PRF-16 | Page transition | Navigate to profile | Smooth fade-up animation | |

## 8. Premium & Payments

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| PAY-01 | Premium page loads | Navigate to `/premium` | Shows hero, plan selection (Monthly $7.99/mo, Annual $79.99/yr), feature comparison, subscribe CTA | |
| PAY-02 | Annual plan display | Check annual plan | Shows "$79.99/yr", "2 months free -- just $6.67/mo", "Best Value" badge | |
| PAY-03 | Plan selection | Tap Monthly/Annual | Selected plan highlights (sage border), subscribe button updates price | |
| PAY-04 | Subscribe (not logged in) | Tap subscribe while logged out | Redirects to `/verify` | |
| PAY-05 | Subscribe (logged in) | Tap subscribe while logged in | Redirects to Stripe Checkout with correct amount | |
| PAY-06 | Stripe callback success | Return from Stripe with `?success=true` | Shows success message, premium status active | |
| PAY-07 | Already premium view | Visit `/premium` as premium user | Shows "You're Premium!" card with plan type, renewal date, benefits list | |
| PAY-08 | Join limit enforcement | Free user exceeds 3 monthly joins | Upgrade prompt appears with link to Premium | |
| PAY-09 | Premium badge | Premium user views profile | Premium status shown in settings menu | |
| PAY-10 | Page transition | Navigate to premium | Smooth fade-up animation | |

## 9. Host Flow

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| HST-01 | Create playgroup step 1 | Navigate to `/host/create` | Form: name, description, vibe tags (max 4), location, age range, max families slider (2-15), frequency, access type | |
| HST-02 | Vibe tags max | Select 4 tags, try 5th | 5th not selectable / shake animation | |
| HST-03 | Max families slider | Drag slider | Value updates (2-15 range) | |
| HST-04 | Step 2: Screening | Continue to `/host/screening` | Add up to 5 screening questions with suggestions | |
| HST-05 | Step 3: Environment | Continue to `/host/environment` | Setting toggles, safety features, pets, supervision ratio | |
| HST-06 | Step 4: Photos | Continue to `/host/photos` | Upload up to 6 photos with tips | |
| HST-07 | Step 5: Success | Continue to `/host/success` | Saves to Supabase, shows preview card, membership info, next steps | |
| HST-08 | Geocoding (US zip) | Enter "60640" as location | Coordinates resolve to Chicago, IL (not Europe) | |
| HST-09 | Geocoding (US address) | Enter "123 Main St, Austin TX" | Coordinates resolve to Austin, TX area | |
| HST-10 | Host Dashboard | Navigate to dashboard | Shows stats (members, trust score, reviews), pending requests, active members, session scheduling | |
| HST-11 | Approve join request | Tap approve on pending request | User becomes member, request removed from pending | |
| HST-12 | Decline join request | Tap decline | User status becomes declined | |
| HST-13 | Waitlist request | Tap waitlist | User status becomes waitlisted | |
| HST-14 | Schedule session | Open schedule sheet > fill date/time > save | New session appears in list | |
| HST-15 | Edit playgroup | Navigate to `/host/edit/:id` | Pre-filled form with current values, save updates Supabase | |

## 10. Cross-Cutting Concerns

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| XCT-01 | Mobile viewport | View site at 375px wide | All content fits within max-w-md, no horizontal overflow | |
| XCT-02 | Bottom tab bar | Navigate between tabs | Tab bar stays fixed at bottom, active tab highlighted in sage | |
| XCT-03 | Tab bar hidden | View onboarding/detail pages | Tab bar not visible on non-app pages | |
| XCT-04 | Sticky headers | Scroll down on Browse | Header with search/filters sticks to top | |
| XCT-05 | Back button pages | Visit detail/edit/settings pages | Back button present and functional | |
| XCT-06 | Page transitions | Navigate between any pages | Smooth fade-up animation (0.3s) | |
| XCT-07 | Font loading | Hard refresh any page | Fraunces (headings), DM Sans (body), ChunkFive (wordmark) all load | |
| XCT-08 | Color consistency | Review all pages | Sage (#7A8F6D), cream (#FAF7F2), taupe, terracotta used consistently | |
| XCT-09 | Error states | Disconnect network > perform action | Graceful error handling, no blank screens | |
| XCT-10 | Supabase realtime | Open two tabs, send message in one | Message appears in other tab in real-time | |
| XCT-11 | Deep link | Visit `/playgroup/:id` directly | Page loads correctly without navigating from Browse | |
| XCT-12 | 404 handling | Visit `/nonexistent-page` | Does not show blank page | |
| XCT-13 | Legal pages transition | Navigate to Terms/Privacy | Pages have fade-up animation and back button | |

## 11. Security & Data Protection

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| SEC-01 | XSS in bio field | Edit profile, enter `<script>alert('xss')</script>` as bio > save > reload | Script tag not executed, rendered as plain text or stripped | |
| SEC-02 | XSS in playgroup name | Create playgroup with name `<img src=x onerror=alert(1)>` > view on Browse | Tag not rendered as HTML, shown as plain text or stripped | |
| SEC-03 | XSS in chat message | Send message with `<script>document.cookie</script>` > view in chat | Script not executed, shown as text | |
| SEC-04 | XSS in review comment | Submit review with HTML/script in comment field | Not rendered as HTML | |
| SEC-05 | SQL injection in search | Type `'; DROP TABLE users; --` in Browse search bar | No error, returns empty results or ignores injection | |
| SEC-06 | Phone/email not exposed | View another user's profile (host card, member list) | Phone and email never visible to other users | |
| SEC-07 | Address hidden before join | View playgroup detail as non-member | Full street address not shown (only zip/city) | |
| SEC-08 | Screening answers private | View a playgroup's pending requests as non-host | Screening answers not visible to non-hosts | |
| SEC-09 | Auth token required | Open browser console > call Supabase API without auth | Returns 401 or RLS blocks data | |
| SEC-10 | Expired token rejected | Use an expired JWT to make API call | Returns 401, not stale data | |
| SEC-11 | RLS: can't edit other's profile | Via console, attempt `supabase.from('profiles').update({bio:'hacked'}).eq('id', other_user_id)` | Update fails (RLS policy blocks) | |
| SEC-12 | RLS: can't delete other's playgroup | Via console, attempt to delete another user's playgroup | Delete fails (RLS policy blocks) | |
| SEC-13 | RLS: can't read other's children | Via console, attempt to select from children table with another user's ID | Returns empty or error | |
| SEC-14 | Photo upload: reject non-image | Upload a .pdf or .exe as profile photo | Upload rejected, error message shown | |
| SEC-15 | Photo upload: reject oversized | Upload image > 5MB | Upload rejected with size error | |
| SEC-16 | Rate limit: join requests (free) | As free user, send 3 join requests > attempt 4th | Blocked with upgrade prompt, not silently accepted | |
| SEC-17 | Deleted account tokens invalid | Delete account > attempt to use old auth token | All API calls return 401 | |
| SEC-18 | Block prevents messaging | Block a user > check group chat | Blocked user's messages hidden, cannot send to blocker | |

## 12. Vouching & Trust

| ID | Test Case | Steps | Expected | Status |
|----|-----------|-------|----------|--------|
| VCH-01 | Trust score starts at zero | Create new account > view profile | Trust score shows 0 | |
| VCH-02 | Trust score after review | Receive a positive review > check profile | Trust score increases from 0 | |
| VCH-03 | Trust score visible on host card | View playgroup detail > check host card | Trust score displayed (e.g. "Trust score 4.2") | |
| VCH-04 | Trust score visible on request card | As host, view pending join request | Requester's trust score visible on request card | |
| VCH-05 | Trust score read-only | Via console, attempt to update own trust_score | Update blocked by RLS or ignored | |
| VCH-06 | Verified badge display | View verified host's profile/card | Green verified badge with checkmark shown | |
| VCH-07 | Verified badge absent for unverified | View unverified user's profile/card | No verified badge shown | |
| VCH-08 | Review aggregate calculation | Submit multiple reviews for a host | Aggregate ratings (environment, organization, compatibility, reliability) calculated correctly | |
| VCH-09 | Review only after session | As member with no past sessions, try to write review | "Write Review" button not available or disabled | |

---

## Test Summary

| Section | Test Count |
|---------|-----------|
| Authentication | 8 |
| Onboarding | 9 |
| Browse | 26 |
| Playgroup Detail | 20 |
| My Groups | 7 |
| Messages | 11 |
| Profile & Settings | 16 |
| Premium & Payments | 10 |
| Host Flow | 15 |
| Cross-Cutting | 13 |
| Security & Data Protection | 18 |
| Vouching & Trust | 9 |
| **Total** | **162** |

---

## Notes

- Run tests on both Safari (iOS) and Chrome (Android) for mobile coverage
- Tests marked SKIP should include a reason
- For Stripe tests (PAY-05, PAY-06), use Stripe test mode card `4242 4242 4242 4242`
- For realtime tests (MSG-07, XCT-10), use two browser sessions
- Geocoding tests (HST-08, HST-09) verify the Nominatim US-restriction fix
- Security tests (SEC-11 through SEC-13) require browser console access to test RLS policies directly
- Trust/vouching tests depend on having review data in the database

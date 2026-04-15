# Role Identity & Trust — Design

**Date:** 2026-04-15
**Status:** Draft for review
**Scope:** Kiddaboo today, WelbyRise (senior-care reskin) by carry-over

## Problem

A user feedback session surfaced two linked problems:

1. **Role identity is weak.** Hosts and joiners see nearly identical UI. Testers reported (i) not knowing which role they were in, (ii) hosts seeing joiner screens and vice versa, (iii) being unable to tell on a group detail page who was the host vs. a member, and (iv) the context switch between hosting and joining feeling jarring.
2. **User identity is weak.** Testers struggled to tell who another person was from their profile. Avatars felt generic, real names were inconsistent, and there were no trust signals (no verification, no tenure, no reviews).

These are not cosmetic complaints; for a kids-and-families network, trust is the product. The same problems will apply — with higher stakes — when Kiddaboo is reskinned as WelbyRise, a senior-care companion app. Any fix we make here should be structural enough to survive the reskin.

## Goals

1. A user always knows which role they are acting as.
2. A user looking at another person in a shared space always knows that person's role.
3. A user looking at a profile trusts that the person is real and has a plausible reason to be on the network.
4. The structural work done once applies to both Kiddaboo and WelbyRise; only theme, copy, and domain fields differ between the two products.

## Non-goals

- Redesigning the Kiddaboo color palette, wordmark, or visual style. Those are deferred to the WelbyRise reskin.
- Multi-role dual-mode accounts. Users choose one role at signup; adding the other role later is out of scope for v1.
- Deep identity verification (ID upload, background checks). Phone OTP only in v1.
- Reputation systems beyond what already exists (reviews).

## Terminology

To keep the design portable between the two products we use role placeholders:

| Placeholder | Kiddaboo UI | WelbyRise UI | DB role | Subject of profile |
|---|---|---|---|---|
| **Role A** | Organizer | Host | `memberships.role = 'creator'` + `profiles.account_type = 'organizer'` | Themselves |
| **Role B** | Parent | Family member | `profiles.account_type = 'parent'` (Kiddaboo) or `'family'` (WelbyRise) | Themselves + child(ren) / senior |

Renaming "Host" to "Organizer" in Kiddaboo is intentional. "Host" reads as "hosting-a-party" for a non-tech-savvy audience; "Organizer" reads as "community organizer." For WelbyRise, "Host" is the natural term for someone who visits seniors, so that product keeps it.

## Decisions

### D1 — Two audiences, not one

Role A and Role B users see different products. They have different home screens, different navigation, different dominant actions, and a different accent color. A Role A user cannot accidentally end up on a Role B screen, and vice versa.

### D2 — Choose once, at signup

New users declare their role on the signup landing. The UI uses side-by-side cards with role-noun framing ("I'm a Parent" / "I'm an Organizer"). The choice writes a new `profiles.account_type` column. Existing users are auto-assigned on migration: anyone with a `memberships.role = 'creator'` row becomes `organizer`; everyone else becomes `parent`. On first login after the migration, existing users see a one-time "Is this you?" confirm with the option to switch.

### D3 — Adding a second role is a deliberate, out-of-scope flow

The vast majority of users are either Role A or Role B. For the few who want both, v2 introduces an explicit "Become an Organizer" path from Parent settings (and vice versa) that re-uses the same onboarding. v1 does not support dual-role accounts; a Parent who starts a group and a Host-without-a-family do not exist yet.

### D4 — Mode layout wrappers, not route splits

We do **not** split URL paths into `/parent/*` and `/organizer/*`; existing URLs like `/browse` and `/host-dashboard` stay as-is. Instead:

- Add `ParentLayout` and `OrganizerLayout` React components, each wrapping its own set of routes.
- Each layout applies an accent color (Parent = sage #5C6B52; Organizer = terracotta #B07A5B), a small uppercase mode label in the header ("PARENT" / "ORGANIZER"), and a role-specific bottom nav (Parent: Browse / My Groups / Messages / Profile; Organizer: My Group / Members / Messages / Profile).
- Route gates: a Parent hitting `/host-dashboard` is redirected to `/browse`; an Organizer hitting `/browse` is redirected to their dashboard.
- Admin and shared pages (`/my-profile`, `/premium`, `/admin`) are layout-neutral but still show the correct mode label based on `account_type`.

This choice ships faster than a full route refactor (Approach 1 from brainstorming) and still delivers the perceptual separation the feedback session called for.

### D5 — Signup path picker

The signup landing shows two equally-weighted cards:

- **I'm a Parent** — "Looking for a playgroup for my child" (sage border)
- **I'm an Organizer** — "Starting or running a playgroup" (terracotta border)

Small footer text: "You can add the other role later." Clicking a card routes to a role-specific onboarding flow (Parent: email + password + zip + add children; Organizer: email + password + zip + group basics).

### D6 — Playgroup detail: unified list, Organizer distinguished

On a playgroup detail page, the member list is a single unified list sorted Organizer-first. The Organizer's row has:

- A terracotta avatar ring (3px, `#B07A5B`)
- A pill-shaped `Organizer` badge next to the name
- A short tenure line ("Runs the group")

Parent rows share the same card style but carry a small "Parent" label and the children line ("Jack, age 3"). No more ambiguous identical cards.

### D7 — Phone OTP verification

Phone OTP is the single verification mechanism for v1.

- During onboarding, after basic profile info, we ask for a mobile number and send a 6-digit SMS code.
- On successful verify, `profiles.phone_verified_at` is set.
- A `profiles.phone_number` column is added (stored hashed for privacy, plaintext only at verification time).
- Users who do not verify can still browse but cannot send join requests or be approved as Organizers.
- The SMS is sent via Twilio (~$0.01 per message). A provider abstraction lets WelbyRise swap to a different provider if desired.

The "Verified parent" / "Verified family" badge renders anywhere the profile is shown when both `phone_verified_at` is set *and* the account has completed the role-specific attestation (has at least one child; has at least one senior).

### D8 — Trust signals in v1

A profile panel (the sheet that slides up when you tap a member in a group) renders, in order:

1. Avatar with a green verified checkmark overlay (if verified)
2. Real first + last name, required at signup
3. Small secondary line: "Parent of Maya, 3 & Arjun, 1" (or WelbyRise: "Family of Helen, 78")
4. "Verified parent" or "Verified family" label (green text)
5. Role label + neighborhood + distance ("Organizer · Garden City · 0.8 mi away")
6. Stat strip: # of kids/seniors · # of groups joined (no tenure yet)
7. Children/seniors card: name + age chips
8. About / bio free-text
9. Parenting-style tags (Kiddaboo) or care-focus tags (WelbyRise)
10. Action buttons: Message (primary), more menu

**Explicitly deferred to v2:**
- Tenure ("N months on Kiddaboo") — risks making new users look untrusted before the network has critical mass
- Review rating on the profile stat strip — needs enough reviews to be meaningful
- Groups in common — nice-to-have social proof, not critical

### D9 — Copy renames across the app

Everywhere a Kiddaboo string currently says "Host" in user-facing UI, it becomes "Organizer":

- Landing page button "Host a Playgroup" → "Organize a Playgroup"
- Settings row "Upgrade to Host Premium" → "Upgrade to Organizer Premium"
- Admin Subscriptions filter "Host Premium" → "Organizer Premium"
- Premium compare table row labels
- Toast messages, email templates, push notification copy

Database identifiers (`host_premium`, `role = 'creator'`, `joiner`) stay unchanged; this is a strictly user-facing rename.

### D10 — Existing users migration

The app has no production users yet — only a handful of tester accounts (Suresh's `rooblix2000+kN@gmail.com` aliases and any invited testers). That collapses the migration story to a one-time manual cleanup.

```sql
ALTER TABLE profiles ADD COLUMN account_type TEXT
  CHECK (account_type IN ('parent', 'organizer')) NOT NULL DEFAULT 'parent';

ALTER TABLE profiles ADD COLUMN phone_number TEXT;
ALTER TABLE profiles ADD COLUMN phone_verified_at TIMESTAMPTZ;

-- Tester cleanup: tag anyone who has ever created a playgroup as organizer.
UPDATE profiles p SET account_type = 'organizer'
  WHERE EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = p.id AND m.role = 'creator'
  );

-- Drop the default after backfill so new signups MUST pick a role explicitly.
ALTER TABLE profiles ALTER COLUMN account_type DROP DEFAULT;
```

No confirm modal, no `account_type_confirmed_at` column, no phased rollout. Any tester who ends up in the wrong mode can be fixed with a single `UPDATE` by hand. New signups after this lands are forced through the path picker and can't avoid declaring a role.

## Architecture

### Data model changes

- `profiles.account_type` — new NOT NULL TEXT column, enum `parent` | `organizer`; no default after initial backfill
- `profiles.phone_number` — TEXT, nullable, stores hashed value
- `profiles.phone_verified_at` — TIMESTAMPTZ, nullable

No changes to `memberships`, `subscriptions`, `playgroups`.

### Frontend structure

```
src/
  layouts/
    ParentLayout.jsx       # sage accent, Parent nav, "PARENT" header label
    OrganizerLayout.jsx    # terracotta accent, Organizer nav
    SharedLayout.jsx       # for /my-profile, /premium, /admin
  pages/
    onboarding/
      ChooseRole.jsx        # new landing replacement
      ParentOnboarding.jsx  # email + zip + children
      OrganizerOnboarding.jsx  # email + zip + group basics
      PhoneVerify.jsx       # OTP step, reused from both flows
    parent/                 # file organization only; URLs stay /browse etc.
      Browse.jsx            # existing, moved
      MyGroups.jsx
    organizer/              # file organization only; URLs stay /host-dashboard etc.
      HostDashboard.jsx     # existing file name kept; UI copy says "Organizer dashboard"
  components/
    ProfilePanel/
      ProfilePanel.jsx      # redesigned profile panel with trust signals
      VerifiedBadge.jsx     # new
      RoleBadge.jsx         # new
  hooks/
    useAccountType.js       # reads profiles.account_type, blocks on null
    usePhoneVerification.js # OTP send/verify
```

### Routing & access control

- `App.jsx` wraps every authenticated route in a `<ModeRouter>` that reads `account_type` and renders the correct layout.
- A `<RequireRole role="parent">` wrapper around Parent-only routes redirects Organizers away.
- Symmetric `<RequireRole role="organizer">` wrapper.
- `/onboarding/*` routes are public-after-signup and do not require a set `account_type`.

### Phone OTP service

- New Supabase edge function `send-otp` — accepts `{ phone }`, calls Twilio, writes the verification code hash + expiry to a `phone_otp_challenges` table.
- New edge function `verify-otp` — accepts `{ phone, code }`, validates against the challenge table, writes `profiles.phone_verified_at` and `phone_number` on success.
- Rate limit: max 3 send attempts per phone per hour; challenge expires in 10 minutes.

## Error handling

- **Phone OTP send failure (Twilio down):** user sees a retry button and an offer to skip for now ("verify later from settings"). Skipped users can't send join requests but can browse.
- **Phone OTP code mismatch:** up to 3 attempts; after 3, the challenge is invalidated and the user must request a new code.
- **User tries to access wrong-role route:** soft redirect (not a 403) to the correct role's home, with a toast "That page is for Organizers only."

## Testing

- **Unit:** `useAccountType` hook branching logic; `usePhoneVerification` send/verify flows; role-guard component redirect logic.
- **Integration:** onboarding path picker → Parent flow → children → phone verify → Parent home. Same for Organizer flow.
- **E2E (Playwright):** happy-path Parent signup, Organizer signup, existing-user migration confirm modal, phone OTP success and failure.
- **Manual:** visual QA of sage vs terracotta accents, mode label visibility, bottom-nav correctness, profile panel trust signals.

## Implementation decomposition

This spec is one design but three implementation plans, executed in order:

1. **Role identity core** — migration + `account_type` column + layout wrappers + signup path picker + copy renames. Ships the perceptual separation.
2. **Phone OTP verification** — new `phone_otp_challenges` table, `send-otp` + `verify-otp` edge functions, Twilio integration, onboarding phone step, verified badge rendering.
3. **Profile panel trust redesign** — restructured `ProfilePanel` with the v1 trust signals, `VerifiedBadge` and `RoleBadge` components, updated playgroup detail member list.

Plans 2 and 3 depend on plan 1 landing first. Each gets its own writing-plans output.

## WelbyRise carry-over

The structural work above (account_type, mode layouts, signup path picker, phone OTP, unified member list, trust signals) applies to WelbyRise verbatim. The reskin to WelbyRise becomes a focused pass over:

- Theme: colors, fonts, logo, wordmark
- Copy: Organizer → Host; Parent → Family member; playgroup → (TBD — companionship circle / visit / etc.); children → seniors; parenting style → care focus
- Accessibility uplift: larger base type (18px min), higher contrast for senior-adjacent users
- Trust signals: same shape, senior-care-specific fields
- Extra consideration (v2): the senior is the profile subject but not the account holder; profile panel shows senior info with the family member as account owner

None of this re-opens the structural decisions made here.

## Rollout

1. **Land the migration and `account_type` column** behind a feature flag in staging
2. **Ship layout wrappers** with a small cohort (admins only via a feature flag check)
3. **Ship onboarding path picker** for new signups only; existing users unaffected
4. **Ship phone OTP** as opt-in first, then required for join requests
5. **Flip the feature flag** for all existing users once the confirm-modal copy is ready
6. **Deprecate legacy "Host" strings** in a single cleanup PR
7. **Begin WelbyRise reskin** work on a new branch, using this design as the foundation

## Out of scope (for this spec)

- The Stripe price-cache bug ($59.99 vs $79.99) and the k6 orphan subscription are separate tech-debt items, fixed before this work lands.
- Automated test suite bootstrapping (Vitest + Playwright) is a prerequisite, tracked as its own task.
- Admin module UX audit — separate effort.
- The reskin itself (theme, copy, accessibility uplift for WelbyRise) — a separate spec once this design is implemented.

## Open questions

- What's the right copy for the "Is this you?" migration modal? Drafted but not finalized.
- Twilio vs. alternatives (Vonage, Plivo, SNS) — picking one is an implementation decision, noted here for visibility.
- Do we also need email verification in v1? Current plan: no, phone OTP is enough. Revisit if fraud becomes a problem.

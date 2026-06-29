# Top Brand Band — Design

**Date:** 2026-06-29
**Status:** Approved, ready to implement
**Author:** Claude (Opus 4.7), with Suresh

## Problem

The top of every page feels visually light. The bottom nav is a bright, saturated purple (`#8B3FE0`); the top of the page is a small `text-[10px]` `text-sage-dark` eyebrow ("PARENT" / "NANNY") floating on the lavender page background, with no brand color presence above the headline. The result is a visual imbalance — heavy bottom, weightless top.

## Goal

Add brand purple presence at the top of every page that uses `ParentLayout` or `NannyLayout`, so the top has comparable visual weight to the bottom nav.

## Non-goals

- Wordmark / icon up top — keeping identity to the bottom nav for now
- Gradient effects — solid color only, to avoid amateurish gradient renders
- Sticky behavior on scroll — first cut scrolls away with the page
- Form pages with their own sticky headers (EditProfile, CreateProfile, NotificationSettings, PhoneVerification) — those have a separate back-button + title pattern, untouched in this change
- MyProfile's own sticky `bg-cream/95 backdrop-blur` header — addressed separately if needed

## Design

A solid purple band sits at the very top of the layout, edge-to-edge, extending up through the safe-area into the status bar zone. The role eyebrow lives inside it in white.

```
┌────────────────────────────────────┐
│        [status bar — purple]       │  ← safe-area inset, purple
│  NANNY                             │  ← eyebrow, white text on purple
├────────────────────────────────────┤  ← hard edge into lavender
│                                    │
│  Availability        [+ Add block] │  ← existing page h1, no change
│  Set a specific date or…           │  ← existing description, no change
│                                    │
│  WEEKLY                            │
│  ...cards...                       │
```

## Implementation scope

Two files:

1. `frontend/src/layouts/NannyLayout.jsx`
2. `frontend/src/layouts/ParentLayout.jsx`

In each, the existing eyebrow block:

```jsx
<div className="px-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
  <span className="text-[10px] font-bold tracking-[1.5px] text-sage-dark uppercase">
    Nanny  {/* or Parent */}
  </span>
</div>
```

becomes:

```jsx
<div
  className="px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]"
  style={{ backgroundColor: '#8B3FE0' }}
>
  <span className="text-[10px] font-bold tracking-[1.5px] text-white uppercase">
    Nanny  {/* or Parent */}
  </span>
</div>
```

Color is the same `#8B3FE0` we standardized headings on earlier in this session. Bottom padding `pb-3` (12px) gives the eyebrow breathing room before the lavender area resumes.

## Risks

- **MyProfile renders its own sticky header** (`bg-cream/95 backdrop-blur-sm`) inside the layout. The new band will sit above MyProfile's sticky header — should look fine since the page header is a sticky element with its own scroll behavior, but worth verifying visually after the change.
- **Hard edge feel** between purple band and lavender content area. If it reads as a banner-vs-content separation rather than integrated chrome, we may want to soften with a thin shadow or a small rounded bottom radius. Iterate after seeing it live.

## Verification

- Dev server already running on port 5174
- Bundle-source check confirms the band class is present in the served layout files
- Visual verification requires signing in (magic-link gated) — Suresh validates on next page reload

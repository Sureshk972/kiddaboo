# Kiddaboo Warm Rebrand — Design System

**Date:** 2026-07-24
**Status:** Approved (direction validated via Welcome prototype)
**Author:** Claude

## Overview

Move Kiddaboo from its monochrome purple-on-lavender look to a warm,
editorial system influenced by Spetza: near-black **ink** text on **warm cream**,
a single **terracotta** accent used sparingly, **serif display** type for the
wordmark and page titles, uppercase micro-labels, and outline cards. This fixes
the root contrast problem (purple-on-purple) and raises the whole brand.

The Welcome page has already been restyled as a validated prototype (scoped inline
colors). This spec defines the system and the plan to roll it across the app.

## Why a token revalue (not a 900-edit sweep)

The existing Tailwind tokens are **role-coherent** despite legacy names. Usage counts:

| Token | Uses | De-facto role | New role |
|---|---|---|---|
| `cream` (`bg-cream`) | 93 | page/section background | warm cream bg |
| `charcoal` (`text-charcoal`) | 204 | primary text | warm ink |
| `taupe` (`text-taupe`) | 269 | secondary text | warm muted |
| `taupe-dark` (`text-taupe-dark`) | 124 | stronger secondary text | warm dark muted |
| `sage` (`bg-sage` 64, `text-sage` 77) | 141 | brand / accent / interactive | terracotta accent |
| `sage-dark` (`text-sage-dark` 74, `hover:bg-sage*` 9) | 83 | accent hover / darker | darker terracotta |
| `terracotta`/`gold`/`teal` | 32 | decorative accents | keep (secondary accents) |

Because each token maps cleanly to one new role, **revaluing the token values**
migrates ~900 usages at once. We then audit page-by-page for the minority of
usages that don't fit their token's dominant role (e.g. a `text-sage` used as body
copy that should be muted, not accent), and apply serif + component polish.

## New palette

Replace the values in `tailwind.config.js` (keep the token names to avoid renaming
usages):

```js
cream:      { DEFAULT: '#FAF7F1', dark: '#EFEAE0' },   // warm cream bg + surface/line
charcoal:   '#1C1814',                                  // warm ink — primary text
taupe:      { DEFAULT: '#6B635A', dark: '#4A443C' },    // warm muted — secondary text
sage:       { light: '#F0DFD3', DEFAULT: '#C2673C', dark: '#A6532E' }, // terracotta accent
terracotta: { light: '#E8C4B0', DEFAULT: '#B07A5B' },   // keep — secondary warm accent
gold:       { light: '#F5E2B6', DEFAULT: '#D9A441', dark: '#A87E2D' }, // keep
teal:       { light: '#B8DCD8', DEFAULT: '#5BA8A0', dark: '#3F8278' }, // keep
```

Also update `src/index.css` base layer:
- `html` `background-color: #ECE3FB → #FAF7F1`
- `html` `color: #6B5E54 → #4A443C` (warm muted default)
- `h1,h2,h3,h4` `color: #2F2F2F → #1C1814` (warm ink)

### Contrast (WCAG AA, ≥4.5:1 normal text)

- ink `#1C1814` on cream `#FAF7F1` ≈ 14.6:1 ✓
- muted `#6B635A` on cream ≈ 5.2:1 ✓
- accent `#C2673C` on cream ≈ 3.6:1 → **accent is for large text / UI only**, not body copy; body copy uses ink/muted. Accent on white ≈ 3.9:1 — same rule.
- cream text on accent button `#C2673C` ≈ 4.4:1; cream on ink button ≈ 14:1 ✓

**Rule:** the terracotta accent is never used for small body text — only large
display text (tagline), buttons (with cream text), links, active states, and icons.

## Typography

- Add a **display** family = OS serif (matches Spetza, no webfont):
  ```js
  fontFamily: { display: ['ui-serif', 'Georgia', 'serif'], heading: ['Inter','sans-serif'], body: ['Inter','sans-serif'] }
  ```
- Apply `font-display` to: the **wordmark** and **primary page titles** (h1-level
  hero/section titles). Keep `font-heading`/Inter for small UI headings, labels,
  and dense data.
- Uppercase micro-labels: `text-xs uppercase tracking-[0.2em]` in muted or accent,
  for category/section labels (replacing bold purple section headers).

## Component patterns (Spetza-influenced)

- **Primary button:** `bg-charcoal text-cream` (ink), hover `bg-sage` (accent).
  This changes primary buttons from filled-purple to ink — the biggest single
  component shift. `Button.jsx` `primary` variant updates once, propagates everywhere.
- **Secondary button:** `bg-cream-dark text-charcoal border border-cream-dark`,
  hover border accent.
- **Cards:** white or cream surface with a thin `border-cream-dark`; minimal fills,
  generous padding. (93/95 `bg-white` cards already have borders.)
- **Micro-labels & pills:** `bg-cream-dark text-taupe` uppercase.
- **Links:** `text-sage` (accent) with underline-offset.

## Rollout order (page-by-page, build-checked)

1. **Foundation:** tailwind tokens + index.css + `Button.jsx` variants + `ReviewsList`.
   (This alone shifts the whole app; verify nothing regresses.)
2. **Public/unauth pages:** Welcome (done), Terms, Privacy, Reviews, auth/verify.
3. **Parent flow:** Browse, NannyCard, booking, ParentInbox, messages, profile, billing.
4. **Nanny flow:** dashboard, insights, availability, nanny profile.
5. **Admin:** admin tables/pages (lowest priority; internal).
6. **Shared chrome:** headers/nav (BrandMark is dead code — delete), bottom nav,
   sheets/modals, skeletons, status pills.
7. **Emails / PWA manifest / favicon** if brand assets reference purple.

After each page: `npm run build` green, and spot-check contrast + that the accent
isn't over-used (should feel like ink+cream with terracotta highlights, not
terracotta everywhere).

## Risks & constraints

- **Live app with Stripe live payments** — this is purely presentational; do not
  touch data/logic/edge functions. If a color edit sits next to functional JSX,
  change only the className/style.
- **Batch pushes** ([[feedback_kiddaboo_batch_pushes]]) — Netlify bandwidth is
  metered; one push at the end, not per page.
- **Build-and-hold** ([[feedback_kiddaboo_build_and_hold]]) — commit locally per
  page; do NOT push or run `supabase db push` until the whole rebrand is complete
  and reviewed on the local preview.
- **Accent discipline** — the failure mode is terracotta everywhere (same mistake
  as purple everywhere). Reviewers should check each page leads with ink+cream.
- **Interior pages need auth to view** — Claude can't log in; the operator reviews
  authed pages on the local preview, or we use temporary unguarded preview routes
  for component-level checks.

## Verification

- Per-page `npm run build` green + no console errors.
- Contrast spot-checks with the WCAG helper (as used on the current site) on
  representative text on each major surface.
- Full local click-through by the operator (signed in) before any push.

## Out of scope

- Logic, data model, payments, edge functions — unchanged.
- New illustrations/photography (the removed color-block placeholders are simply gone).
- Dark mode.
- Cleaning the "Test" junk reviews (separate data task, noted).

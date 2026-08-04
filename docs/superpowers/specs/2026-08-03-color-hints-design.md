# Color Hints Design

**Date:** 2026-08-03
**Status:** Approved

## Summary

Add four new accent colors as minimal, semantic hints across Kiddaboo to show attention to detail. The audience is predominantly women with sharp eyes for polish — these touches reward close attention without changing the brand personality.

## New Colors

| Token       | Hex       | Semantic Role                              |
|-------------|-----------|---------------------------------------------|
| `steel`     | `#537BA0` | Trust & verification (badges, ratings, certs, info panel accents) |
| `gold-warm` | `#B5996D` | Structure & rhythm (section dividers, dot separators) |
| `amber`     | `#755829` | Text emphasis (dates, experience, key figures) |
| `mist`      | `#E9EFF5` | Info panel background tint (at ~30% opacity via rgba) |

## Placement Rules

### 1. Section Dividers — Warm Gold

Gradient lines separating content sections within cards. Fade from `#B5996D` to transparent at ~40%.

**Where:** NannyCard (between metadata and slots), NannyPublicProfile (between sections), booking cards in ParentInbox/NannyDashboard (between header and details).

### 2. Dot Separators — Warm Gold

Small `#B5996D` dots between inline metadata items (rating, distance, rate).

**Where:** NannyCard metadata row, NannyPublicProfile stats row, booking card date/time rows.

### 3. Trust & Verification — Steel Blue

- **Verified badge:** `bg-steel/10 text-steel` pill on provider cards and profiles.
- **Star ratings text:** `text-steel` for the numeric rating next to stars.
- **Certification/trust tags:** `bg-steel/10 text-steel` pills (first aid, background check).
- **Info panel left accent:** 2.5px `border-left: steel` with `bg-mist/30` background on schedule summaries, tips, and bio panels.

### 4. Experience & Qualification Tags — Dark Amber

- **Experience tags:** `bg-amber/12 text-amber` pills (e.g., "5yr experience").
- **Date emphasis:** `text-amber font-medium` for specific dates and times within body text.

### 5. Info Panels — Steel Blue accent + Mist tint

Thin left border in steel blue with very faint blue-grey background. Used for:
- Provider bio section on public profile
- "Today's schedule" on provider dashboard
- Tips/prompts (e.g., "Providers with photos get 3x more bookings")

Earnings/stats panels use gold left accent with faint gold tint instead.

## What Does NOT Change

- Terracotta (`#C2673C` / sage token) remains the primary action color — buttons, active tabs, links
- Cream background, charcoal text, taupe secondary text — unchanged
- Gold stars for rating display — unchanged (existing `gold` token)
- Teal for messaging badges — unchanged
- No existing element is recolored — all changes are additive

## Tailwind Config Changes

Add four new tokens to `theme.extend.colors`:

```js
steel: { light: '#E9EFF5', DEFAULT: '#537BA0' },
amber: { DEFAULT: '#755829' },
'gold-warm': { DEFAULT: '#B5996D' },
```

Note: `#E9EFF5` is aliased as `steel-light` (the mist color) rather than a separate token, keeping the palette tight.

## Files to Change

### Config
- `tailwind.config.js` — add new color tokens

### Components (additive micro-details)
- `NannyCard.jsx` — gold divider, gold dot separators, steel blue verified badge + rating, amber date emphasis
- `NannyPublicProfile.jsx` — steel blue trust tags, amber experience tags, steel blue bio panel accent, gold dividers
- `ParentInbox.jsx` — gold dividers in booking cards, amber date emphasis, gold dot separators
- `NannyDashboard.jsx` — steel blue info panels (schedule), gold info panels (earnings)
- `Upcoming.jsx` — gold dividers, amber dates
- `History.jsx` — gold dividers, amber dates
- `Book.jsx` — amber date emphasis in booking summary

### Both Sides
All changes apply equally to parent-facing and provider-facing views. The design language is consistent across roles.

## Scope

Purely visual — no database, API, or routing changes. No existing colors replaced. CSS-only additive touches.

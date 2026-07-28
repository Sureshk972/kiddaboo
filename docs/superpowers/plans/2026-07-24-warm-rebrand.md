# Kiddaboo Warm Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Kiddaboo from purple-on-lavender to a warm, Spetza-influenced system — ink on warm cream, a single terracotta accent, serif display type — across the whole app.

**Architecture:** Revalue the role-coherent Tailwind tokens (`charcoal`=text, `taupe`=secondary, `sage`=accent, `cream`=bg) so ~900 usages migrate at once. Add a serif `display` font. Update the shared `Button` and star color. Then audit page-by-page for outliers (hardcoded purple hex, accent-used-as-body-text) and apply serif to page titles. Presentational only — no logic, data, or payment changes.

**Tech Stack:** React (Vite), Tailwind CSS, Supabase (untouched). Branch `feat/warm-rebrand`.

**Spec:** `docs/superpowers/specs/2026-07-24-warm-rebrand-design.md`

---

## Constraints (apply to EVERY task)

- **Presentational only.** Change `className`, inline `style`, and font/color values. Never touch handlers, data fetching, hooks, routing, or Supabase/Stripe calls.
- **No push.** Commit locally per task. Do NOT `git push` or `supabase db push` until the whole rebrand is complete and the operator has reviewed the local preview (build-and-hold).
- **Build-check each task:** `cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3` must end `✓ built` with no errors.

## The Warm-Rebrand Audit Procedure (referenced by page tasks)

For each file in a page task, apply these rules exactly:

1. **Hardcoded purple/lavender hex** — replace any of these in inline `style` or arbitrary classes:
   - `#8B3FE0` / `#6B21D4` (purple) → `#C2673C` if it's an accent/link/active, else `#1C1814` (ink) for text, `#6B635A` (muted) for secondary text.
   - `#ECE3FB` (lavender bg) → `#FAF7F1`; `#DCC9F5` (mid lavender) → `#EFEAE0`.
   - `#2F2F2F` (old charcoal) → `#1C1814`.
2. **Accent-used-as-body-text** — a `text-sage` or `text-sage-dark` on a **non-interactive** text element (paragraph, label, caption that is NOT a link/button/active-tab/icon) → change to `text-charcoal` (emphasis) or `text-taupe` (secondary). Leave `text-sage`/`text-sage-dark` on links, active states, icons, and small accents — those are now correct terracotta.
3. **Serif title** — the page's primary heading (hero/page `<h1>` or the largest title) gets `font-display`. Do not add serif to small UI headings, labels, or dense data.
4. **Manrope/DM Sans display headers** — if a heading uses `fontFamily: "'Manrope', sans-serif"` inline for a *page title*, replace with `font-display` (serif). Leave Inter/body as-is.

After edits: build-check, then commit with `git add <files> && git commit -m "..."`.

---

## Task 1: Foundation — tokens, base CSS, display font

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Revalue color tokens + add display font in `tailwind.config.js`**

Replace the `colors` block's relevant tokens and the `fontFamily` block:

```js
      colors: {
        cream:      { DEFAULT: '#FAF7F1', dark: '#EFEAE0' },
        sage:       { light: '#F0DFD3', DEFAULT: '#C2673C', dark: '#A6532E' },
        taupe:      { DEFAULT: '#6B635A', dark: '#4A443C' },
        terracotta: { light: '#E8C4B0', DEFAULT: '#B07A5B' },
        gold:       { light: '#F5E2B6', DEFAULT: '#D9A441', dark: '#A87E2D' },
        teal:       { light: '#B8DCD8', DEFAULT: '#5BA8A0', dark: '#3F8278' },
        charcoal:   '#1C1814',
      },
      fontFamily: {
        display: ['ui-serif', 'Georgia', 'serif'],
        heading: ['"Inter"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },
```

(Note: the old config also had a `sage.light: '#DCC9F5'` and `taupe` alias to purple — the block above fully replaces them.)

- [ ] **Step 2: Update base layer in `frontend/src/index.css`**

Change the `html` and heading rules:

```css
  html {
    font-family: 'DM Sans', sans-serif;
    background-color: #FAF7F1;
    color: #4A443C;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: clip;
  }
```

```css
  h1, h2, h3, h4 {
    color: #1C1814;
  }
```

- [ ] **Step 3: Build**

Run: `cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built`, no errors.

- [ ] **Step 4: Contrast spot-check (foundation proof)**

Start the preview (`kiddaboo` launch config, port 5173/5174) and load the app. In the browser console run the WCAG helper against a body paragraph and a secondary label; both must be ≥4.5:1 on the new cream. (Ink ≈14.6, muted ≈5.2.)

- [ ] **Step 5: Commit**

```bash
cd ~/Kiddaboo && git add frontend/tailwind.config.js frontend/src/index.css && git commit -m "feat(rebrand): revalue tokens to warm palette + add serif display font"
```

---

## Task 2: Button component — primary becomes ink

**Files:**
- Modify: `frontend/src/components/ui/Button.jsx`

- [ ] **Step 1: Replace the `variants` map**

```js
const variants = {
  primary:
    "bg-charcoal text-cream hover:bg-sage shadow-sm",
  secondary:
    "bg-cream-dark text-charcoal border border-cream-dark hover:border-sage",
  ghost:
    "bg-transparent text-sage hover:text-sage-dark underline underline-offset-4",
};
```

- [ ] **Step 2: Build**

Run: `cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built`, no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Kiddaboo && git add frontend/src/components/ui/Button.jsx && git commit -m "feat(rebrand): primary button = ink, hover terracotta; secondary + ghost warm"
```

---

## Task 3: ReviewsList — warm star color

**Files:**
- Modify: `frontend/src/components/ReviewsList.jsx`

ReviewsList already uses tokens (`text-taupe`, `text-charcoal`, `border-cream-dark`) so it auto-migrates warm. Only the hardcoded green star needs updating.

- [ ] **Step 1: Update the `Stars` fill**

In the `Stars` component, change the `fill`:

```jsx
          fill={n <= rating ? "#D9A441" : "#EFEAE0"}
```

(gold for filled, warm cream-dark for empty)

- [ ] **Step 2: Build + commit**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
cd ~/Kiddaboo && git add frontend/src/components/ReviewsList.jsx && git commit -m "feat(rebrand): warm gold stars in ReviewsList"
```

---

## Task 4: Welcome — align to tokens + serif

**Files:**
- Modify: `frontend/src/pages/Welcome.jsx`

Welcome was prototyped with inline colors. Now that tokens are warm, replace the inline `C` palette object with token classes so it stays in sync with the system.

- [ ] **Step 1: Replace inline color styles with tokens**

Apply these swaps in `Welcome.jsx` (remove the `const C = {...}` object and the `style={{...}}` color props, using classes instead):
- page wrapper: `style={{ background: C.bg }}` → class `bg-cream`
- category pill: `style={{ background: C.chip, color: C.muted }}` → `bg-cream-dark text-taupe`
- wordmark h1: add `font-display`, `style={{ color: C.ink }}` → `text-charcoal`
- tagline: `style={{ color: C.accent }}` → `text-sage`
- description: `style={{ color: C.muted }}` → `text-taupe`
- primary button: replace the inline ink button with `<Button fullWidth onClick={() => navigate("/choose-role")}>Get started</Button>` (import Button) — it's ink now via Task 2
- sign-in muted text → `text-taupe`, the "Sign in" span → `text-sage`
- section label, legal links → `text-taupe`; "See all reviews →" → `text-sage`

- [ ] **Step 2: Build + visual check**

Run: `cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3` (expect `✓ built`). Load the page; it should look identical to the approved prototype but now driven by tokens.

- [ ] **Step 3: Commit**

```bash
cd ~/Kiddaboo && git add frontend/src/pages/Welcome.jsx && git commit -m "feat(rebrand): Welcome uses warm tokens + serif wordmark"
```

---

## Task 5: Public / unauth pages

**Files:**
- Modify: `frontend/src/pages/TermsOfService.jsx`, `frontend/src/pages/PrivacyPolicy.jsx`, `frontend/src/pages/Reviews.jsx`, `frontend/src/pages/ResetPassword.jsx`, `frontend/src/pages/PhoneVerification.jsx`, `frontend/src/pages/NotFound.jsx`, `frontend/src/components/LegalFooter.jsx`

- [ ] **Step 1: Audit each file** using **The Warm-Rebrand Audit Procedure** above. For each, first find offenders:

```bash
cd ~/Kiddaboo/frontend && grep -nE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/pages/TermsOfService.jsx src/pages/PrivacyPolicy.jsx src/pages/Reviews.jsx src/pages/ResetPassword.jsx src/pages/PhoneVerification.jsx src/pages/NotFound.jsx src/components/LegalFooter.jsx
```

Apply rules 1–4 to each match. Add `font-display` to each page's main title.

- [ ] **Step 2: Build**

Run: `cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — public pages"
```

---

## Task 6: Parent flow — discovery & booking

**Files:**
- Modify: `frontend/src/pages/Discover.jsx`, `frontend/src/pages/Book.jsx`, `frontend/src/pages/Requests.jsx`, `frontend/src/pages/Upcoming.jsx`, `frontend/src/pages/History.jsx`, and `frontend/src/components/discovery/*`, `frontend/src/components/booking/*`

- [ ] **Step 1: Find offenders across the batch**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/pages/Discover.jsx src/pages/Book.jsx src/pages/Requests.jsx src/pages/Upcoming.jsx src/pages/History.jsx src/components/discovery src/components/booking
```

Then, for `text-sage`/`text-sage-dark` used as **body text** (not links/active/icons) in these files:

```bash
cd ~/Kiddaboo/frontend && grep -rnE "text-sage(-dark)?\b" src/pages/Discover.jsx src/pages/Book.jsx src/pages/Requests.jsx src/pages/Upcoming.jsx src/pages/History.jsx src/components/discovery src/components/booking
```

Apply the Audit Procedure (rules 1–4) to each. Add `font-display` to each page's primary title.

- [ ] **Step 2: Build**

Run: `cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — parent discovery & booking"
```

---

## Task 7: Parent flow — inbox, messages, profile, billing

**Files:**
- Modify: `frontend/src/pages/ParentInbox.jsx`, `frontend/src/pages/MyProfile.jsx`, `frontend/src/pages/EditProfile.jsx`, `frontend/src/pages/CreateProfile.jsx`, `frontend/src/pages/BillingHistory.jsx`, `frontend/src/pages/PaymentInfo.jsx`, `frontend/src/pages/NotificationSettings.jsx`, and `frontend/src/components/inbox/*`, `frontend/src/components/messages/*`, `frontend/src/components/profile/*`

- [ ] **Step 1: Find offenders**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/pages/ParentInbox.jsx src/pages/MyProfile.jsx src/pages/EditProfile.jsx src/pages/CreateProfile.jsx src/pages/BillingHistory.jsx src/pages/PaymentInfo.jsx src/pages/NotificationSettings.jsx src/components/inbox src/components/messages src/components/profile
```

Apply the Audit Procedure. Note `src/components/messages/*` uses `text-sage-dark` for chat metadata — that is **secondary text**, so → `text-taupe`. Keep sage only where it marks an active/unread accent.

- [ ] **Step 2: Build + commit**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — parent inbox, profile, billing"
```

---

## Task 8: Nanny flow

**Files:**
- Modify: `frontend/src/pages/nanny/*` and `frontend/src/components/nanny/*`, `frontend/src/pages/PayoutInfo.jsx`

- [ ] **Step 1: Find offenders**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/pages/nanny src/components/nanny src/pages/PayoutInfo.jsx
```

Apply the Audit Procedure; `font-display` on the dashboard/insights page titles.

- [ ] **Step 2: Build + commit**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — nanny flow"
```

---

## Task 9: Onboarding + shared UI components

**Files:**
- Modify: `frontend/src/pages/onboarding/*`, `frontend/src/components/ui/*` (Input, OtpInput, TagSelector, ProgressBar, Skeleton, ReportSheet, PhotoCropModal, StarRating, PushPermissionPrompt, BookingCardSkeleton), `frontend/src/components/FeedbackSheet.jsx`, `frontend/src/components/UpdateBadge.jsx`

- [ ] **Step 1: Find offenders**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/pages/onboarding src/components/ui src/components/FeedbackSheet.jsx src/components/UpdateBadge.jsx
```

Apply the Audit Procedure. These are shared — verify `TagSelector` selected-state still reads (selected chip may use `bg-sage text-white` = terracotta fill + cream/white text; ensure ≥4.5:1, else use `text-cream`).

- [ ] **Step 2: Build + commit**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — onboarding + shared UI"
```

---

## Task 10: Layout / chrome + dead-code cleanup

**Files:**
- Modify: `frontend/src/components/layout/*`, `frontend/src/components/motion/*`, `frontend/src/components/auth/*`
- Delete: `frontend/src/components/layout/BrandMark.jsx` (dead code — imported nowhere; its 5-box purple logo is retired)

- [ ] **Step 1: Confirm BrandMark is unused, then delete**

```bash
cd ~/Kiddaboo/frontend && grep -rn "BrandMark" src --include=*.jsx | grep -v "layout/BrandMark.jsx"
```
Expected: no output (unused). Then:
```bash
cd ~/Kiddaboo && git rm frontend/src/components/layout/BrandMark.jsx
```

- [ ] **Step 2: Audit remaining layout/chrome**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/components/layout src/components/motion src/components/auth
```

Apply the Audit Procedure to headers, nav, and mode labels.

- [ ] **Step 3: Build + commit**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — layout/chrome; remove dead BrandMark"
```

---

## Task 11: Admin

**Files:**
- Modify: `frontend/src/pages/admin/*`, `frontend/src/components/admin/*`

- [ ] **Step 1: Find offenders**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|#2F2F2F|Manrope" src/pages/admin src/components/admin
```

Apply the Audit Procedure. Admin is internal/data-dense; keep serif to page titles only.

- [ ] **Step 2: Build + commit**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
cd ~/Kiddaboo && git add -A && git commit -m "feat(rebrand): warm audit — admin"
```

---

## Task 12: Final sweep, verification, operator review (push gated)

**Files:** none (verification only)

- [ ] **Step 1: Whole-app residual-purple sweep**

```bash
cd ~/Kiddaboo/frontend && grep -rnE "#8B3FE0|#6B21D4|#ECE3FB|#DCC9F5|bg-sage-light|Manrope" src
```
Expected: no matches (any remaining are intentional and must be justified in the PR notes).

- [ ] **Step 2: Full build**

```bash
cd ~/Kiddaboo/frontend && npm run build 2>&1 | tail -3
```
Expected: `✓ built`.

- [ ] **Step 3: Operator review on local preview**

The operator signs in on the local preview and clicks through parent + nanny flows, confirming: ink+cream leads every page, terracotta is a sparing accent (not everywhere), serif on titles reads well, and no contrast regressions. Fix anything flagged, re-build, commit.

- [ ] **Step 4: Merge + push (only after operator approval)**

```bash
cd ~/Kiddaboo && git checkout main && git merge --no-ff feat/warm-rebrand && git push origin main
```
Netlify redeploys (~75s). This is the single batched push.

---

## Self-Review

**Spec coverage:**
- Token revalue (cream/charcoal/taupe/sage) → Task 1 ✓
- index.css base (bg, color, headings) → Task 1 ✓
- Serif display font + application → Task 1 (font) + per-page `font-display` (Tasks 4–11) ✓
- Primary button = ink → Task 2 ✓
- ReviewsList → Task 3 ✓
- Contrast rule (accent never body text) → encoded in Audit Procedure rule 2 ✓
- Rollout order (public → parent → nanny → onboarding/ui → chrome → admin) → Tasks 5–11 ✓
- Dead BrandMark deletion → Task 10 ✓
- Batch push / build-and-hold → Constraints + Task 12 ✓
- Presentational-only guardrail → Constraints ✓
- Residual-purple sweep → Task 12 ✓

**Placeholder scan:** Page-audit tasks use a fully-specified Audit Procedure (exact hex mappings + exact commands) rather than vague "make it warm" — the discovered edits follow deterministically from the rules. No TBD/TODO.

**Consistency:** hex values are identical across spec and plan (ink `#1C1814`, cream `#FAF7F1`, muted `#6B635A`/`#4A443C`, accent `#C2673C`/`#A6532E`). Token names unchanged (`sage`/`taupe`/`charcoal`/`cream`). `font-display` name consistent throughout.

**One note for the implementer:** interior pages (Tasks 6–8, 11) can't be visually verified without login. Rely on the build + the residual-purple grep + the Audit Procedure; the operator does the final visual pass in Task 12.

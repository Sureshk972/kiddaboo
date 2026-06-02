# Kiddaboo Launch Plan — Target 2026-06-01

Owner: Suresh
Live URL: https://kiddaboo.com
Build status at plan creation: f37795e deployed; b407b6e + e6b7138 held locally

---

## Week 1 — Finish Regression (2026-05-09 → 2026-05-16)

Goal: zero unknown defects on the host + parent paths before we invite anyone.

### Regression
- [ ] Complete REGRESSION_RUN_2026-05-09.md sections 2 (Onboarding) through 12 (Vouching & Trust)
- [ ] Re-test the four held fixes (b407b6e + e6b7138 + already-deployed admin/RSVP/RLS work) once deployed
- [ ] Run the parent-only PARENT_REGRESSION.md from a freshly-created parent account
- [ ] Document any remaining FAIL / SKIP cases with reproduction steps

### Defect handling
- [ ] All P0/P1 defects fixed before end of Week 1
- [ ] One consolidated deploy at end of Week 1 — push the held queue + any new fixes in a single batch
- [ ] Re-smoke after deploy (~15 min)

---

## Week 2 — Closed Beta (2026-05-17 → 2026-05-23)

Goal: stress the system with real, varied user behaviour. Today's data set (2 parents, 1 host, 1 admin) is too thin.

### Beta cohort
- [ ] Recruit 5–10 trusted families — mix of parents and hosts
- [ ] Send each a one-page "what to try and what to look for" brief
- [ ] Set up a single feedback channel (a Slack channel, an email alias, or a Notion form — pick one, not three)

### What betas should exercise
- [ ] Full signup → phone verify → add children → browse → join request → host approve → RSVP → chat → review
- [ ] Host create flow (multiple groups), screening questions, photo upload (>3MB image), edit playgroup
- [ ] Push notifications: real device install, foreground vs background, iOS Safari + Android Chrome
- [ ] Premium upgrade (joiner + host_premium) on Stripe **test** mode, then cancel
- [ ] Admin: review reports, suspend a beta tester (with their consent), restore

### Watch list
- [ ] Supabase logs — edge function errors, slow queries, failed migrations
- [ ] Realtime subscription health — does the My Group badge / unread badge stay accurate
- [ ] Notification deliverability (push + email) — actual receipt rate, not just send rate
- [ ] Stripe webhook reliability — `current_period_end` updates after a renewal, downgrade after cancel

### Stripe transition
- [ ] Confirm webhook signature secret is environment-scoped (test secret in test, live secret in live)
- [ ] Switch to **live** Stripe keys at end of Week 2 — no live charges until launch, but the wiring should be production-grade
- [ ] Verify tax / location settings, statement descriptor, refund policy URL, support email

---

## Week 3 — Hardening (2026-05-24 → 2026-05-30)

Goal: everything that should be in place before strangers see the site.

### Legal & policy
- [ ] Privacy Policy reviewed and version-stamped (with effective date `2026-06-01`)
- [ ] Terms of Service final review
- [ ] Refund policy linked from /premium and Stripe checkout
- [ ] COPPA / child-data review — children's profiles store name + age range; confirm acceptable
- [ ] Accessibility quick pass — alt text on key images, keyboard nav on critical CTAs

### Operational SOPs
- [ ] **Verification review SOP** — who approves, target SLA, decline reason library, how to request more info
- [ ] **Reports review SOP** — triage tiers (safety > harassment > spam), action thresholds for warn/suspend/delete, escalation path
- [ ] **Admin runbook** — when and how to suspend, refund flow, restoring a wrongful suspend, deleting test/spam accounts
- [ ] **Abuse channel** — `abuse@kiddaboo.com` (or similar) live and monitored
- [ ] On-call coverage plan — even if it's just "I check Supabase logs each morning", write it down

### Observability
- [ ] **Error reporting** wired in (Sentry or equivalent — frontend + edge functions). The recent RLS UPDATE bug went undetected for two weeks; this is the single biggest insurance policy
- [ ] Supabase log alerts on edge-function 5xx and migration failures
- [ ] Stripe alerts on webhook delivery failures
- [ ] Uptime check on https://kiddaboo.com (UptimeRobot, Better Stack, etc.)

### Backup & DR
- [ ] Confirm Supabase project-level backups are on (paid tier feature)
- [ ] Verify backup restore by spinning up a Supabase preview branch from yesterday's backup, smoke-test
- [ ] Document DB rollback procedure (migration history table state, repair commands)
- [ ] Document Netlify rollback procedure (use the prior deploy ID)

### Security
- [ ] RLS audit — every public table has explicit policies for SELECT, INSERT, UPDATE, DELETE; default-deny verified
- [ ] No service-role key in any client bundle (grep `eyJ.*service_role` in `frontend/dist`)
- [ ] Edge functions: CORS allowlist explicit, not `*` for state-changing actions
- [ ] Rate limiting on signup, OTP request, join request submission (Supabase Edge has built-in throttling — confirm it's enabled)
- [ ] Manual penetration test pass: try to UPDATE another user's profile, RSVP as a different user_id, suspend the admin, etc.

### Domain & email
- [ ] Custom domain SSL renewed and auto-renew on
- [ ] Redirects: kiddaboo.app → kiddaboo.com, www.kiddaboo.com → kiddaboo.com
- [ ] Email DNS — SPF, DKIM, DMARC for the transactional sender domain
- [ ] Bounce / spam test — send a verification email to a Gmail, Outlook, ProtonMail, iCloud — confirm inbox not spam
- [ ] Unsubscribe link / preference center on transactional emails (CAN-SPAM)

### Performance
- [ ] Lighthouse run on /, /browse, /host/dashboard — aim for ≥85 mobile
- [ ] Bundle size check — main chunk under 200KB gzipped
- [ ] CDN cache headers verified on static assets
- [ ] Confirm Netlify build cache is warm (don't ship a cold-build the night before)

---

## Launch Eve — 2026-05-31

- [ ] Final deploy: clear all held fixes
- [ ] Smoke test (~15 min): signup, host create, parent join, RSVP, chat, premium upgrade (test mode → confirmed test charge)
- [ ] Confirm error-reporting captures a deliberately-thrown test error
- [ ] Confirm uptime monitor is reporting "up"
- [ ] Status page / in-app "report a bug" CTA wired in
- [ ] No risky merges into main after this point

---

## Launch Day — 2026-06-01

### Soft launch
- [ ] Post in 2–3 trusted communities (not paid acquisition)
- [ ] Personal note to beta cohort thanking them and inviting them to share
- [ ] Stay close to logs first 48 hours
- [ ] Daily check-in: signups, errors, payments, reports

### Rollback readiness
- [ ] Previous Netlify deploy ID written down — one-click revert
- [ ] DB migration revert SQL written and stored — for any migration that landed in the launch deploy
- [ ] Stripe: ability to disable signups in 1 step if a payment bug surfaces (kill-switch flag in env)

### Day-1 success criteria
- [ ] Zero P0 incidents
- [ ] Signup → first RSVP funnel works end-to-end for at least 3 distinct users
- [ ] All push / email notifications delivered within 60s of trigger
- [ ] Stripe webhook delivery 100%

---

## Risks (open)

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Tiny test cohort hides concurrency / scale bugs | Week 2 closed beta with 5–10 real families |
| 2 | No error reporting — silent failures invisible | Wire Sentry (or equiv) in Week 3 |
| 3 | Single human reviewer for verification — bottleneck if Suresh is offline | Document SOP, build a backup reviewer or auto-approve criteria |
| 4 | Stripe live transition is a config minefield | Switch keys end of Week 2, leave a full week to catch issues |
| 5 | RLS regression possible (today's UPDATE bug took 2 weeks to surface) | Add an RLS smoke-test script run before each deploy |
| 6 | Admin UI not yet hardened — `Admin.jsx` is a single 1000-line file | Out of scope for launch; track for v1.1 |

---

## Out of scope for June 1 (v1.1+)

- Multi-language / i18n
- Native iOS / Android app (PWA-only at launch)
- In-app moderation queue UI (admin uses Supabase + ad-hoc tools)
- Group video / audio chat
- Calendar integrations beyond .ics download
- Search by zip-radius (currently text search only)

---

## Quick links

- Run sheet: REGRESSION_RUN_2026-05-09.md
- Canonical regression: REGRESSION_TESTS.md
- Parent regression: PARENT_REGRESSION.md
- Supabase project ref: pdgtryghvibhmmroqvdk

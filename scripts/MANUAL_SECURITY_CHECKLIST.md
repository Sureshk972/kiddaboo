# Kiddaboo Manual Security Checklist

Tests in this list can't be reliably automated without real user accounts, real photo files, or real SMS. Run them once on https://kiddaboo.com (or a staging clone) and record PASS/FAIL in REGRESSION_RUN_2026-05-09.md.

Estimated time end-to-end: **~45 min**.

---

## SEC-01 to SEC-04 — XSS (cross-site scripting)

Paste each payload into the listed field, save, reload the page, and watch for an alert popup or rendered HTML. **Pass = payload shows as plain text. Fail = popup fires or HTML renders.**

| ID | Field | Payload |
|---|---|---|
| SEC-01 | Edit Profile → Bio | `<script>alert('xss-bio')</script>` |
| SEC-02 | Host create → Playgroup name | `<img src=x onerror=alert('xss-name')>` |
| SEC-03 | Group chat input | `<script>document.title='pwned'</script>` |
| SEC-04 | Write a Review → Comment | `<svg onload=alert('xss-rev')>` |

After saving each, also check **another browser/account** to confirm the payload doesn't fire there either.

---

## SEC-05 — SQL injection (Browse search)

In Browse → search box, type `'; DROP TABLE users; --` and press Enter.

**Pass:** results just show "0 playgroups found" or empty filter. No error banner. (Re-check Supabase logs to confirm no actual `DROP` query ran — should be impossible since Supabase prepared statements, but worth eyeballing.)
**Fail:** error banner, 500 page, anything weird.

---

## SEC-06 — Phone/email not exposed cross-user

Open another user's playgroup detail page. Open browser DevTools → Network → click the playgroup fetch request → inspect the response JSON.

**Pass:** other users' `phone_number` and `email` fields are NOT in the payload.
**Fail:** either field is present in the raw response.

---

## SEC-07 — Address hidden before join

As a non-member, view a playgroup detail page.

**Pass:** the visible address shows only city/zip (e.g. "Chicago, IL 60607"). Full street address is not shown anywhere — including the embedded map and Network tab response.
**Fail:** full street address shown anywhere visible or in the network payload.

---

## SEC-08 — Screening answers private to host

Set up: User A creates a playgroup with screening questions. User B requests to join with screening answers.

As User C (a third party who is NOT the host and NOT user B), try to view that playgroup's pending requests in any way (URL hack, DevTools query).

**Pass:** answers not reachable.
**Fail:** answers visible to anyone other than the playgroup creator.

---

## SEC-14 — Photo upload rejects non-image

Try uploading a `.pdf` or `.txt` file as your profile photo or playgroup photo.

**Pass:** upload rejected with a clear error before reaching storage.
**Fail:** file uploads or silently corrupts.

---

## SEC-15 — Photo upload size limit

Try uploading a JPG larger than 5 MB.

**Pass:** rejected with a size error.
**Fail:** uploads and consumes storage.

---

## SEC-16 — Join request rate limit (free user)

As a non-premium account: send 3 join requests in the same calendar month. Try a 4th.

**Pass:** upgrade-prompt modal appears; 4th request is NOT created (verify via Supabase Studio → `memberships` table).
**Fail:** 4th request creates a row.

---

## SEC-18 — Block prevents messaging

1. User A and User B are both in playgroup X.
2. User A blocks User B.
3. View the group chat as User A.
4. View the group chat as User B.

**Pass:** User A's view hides User B's messages; User B can still see the chat but their messages don't reach User A.
**Fail:** Either user can see messages they shouldn't.

---

## SEC-19 — OTP attempt counter not bypassable

This is testable via DevTools console:

```js
// As any authenticated user
const { data, error } = await window.supabase
  .from("phone_otp_challenges")
  .update({ attempts: 0 })
  .eq("user_id", "<your-uuid>")
  .select();
console.log({ data, error });
```

**Pass:** error returned, OR data is empty (RLS blocked it).
**Fail:** `data` shows the updated row.

Even if the row update succeeds, `verify-otp` should still enforce the attempt limit server-side via optimistic locking — but the RLS layer should block this entirely.

---

## SEC-20 — send-otp rate limit

In DevTools console (logged in):

```js
for (let i = 0; i < 10; i++) {
  fetch("/functions/v1/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": "<anon-key-from-frontend-.env>" },
    body: JSON.stringify({ phone: "4155551212" }),
  }).then(r => console.log(i, r.status));
}
```

**Pass:** first 1–3 succeed (200), the rest return 429 or similar throttle response. **Confirm in Twilio console that fewer than 10 SMS were actually sent** — that's the real test.
**Fail:** all 10 succeed and 10 SMS hit your phone.

---

## After running

For each row, mark PASS / FAIL in `REGRESSION_RUN_2026-05-09.md` section 11. Any FAIL is a launch-blocker — file an issue and fix before June 1.

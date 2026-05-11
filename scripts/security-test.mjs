#!/usr/bin/env node
// Kiddaboo security test runner — SEC-09, SEC-10, SEC-11, SEC-12, SEC-13,
// SEC-17 from REGRESSION_RUN_2026-05-09.md.
//
// USAGE:
//   1. Make sure you have two real test accounts in production.
//   2. Run from the repo root:
//
//      ATTACKER_EMAIL=parent1@example.com \
//      ATTACKER_PASSWORD=... \
//      VICTIM_USER_ID=<uuid-of-other-user> \
//      VICTIM_PLAYGROUP_ID=<uuid-of-playgroup-owned-by-other-user> \
//      node scripts/security-test.mjs
//
//   VICTIM_USER_ID can be any other user — the script never modifies
//   anything, only attempts mutations that RLS should block.
//
// What it does:
//   - Tries 6 forbidden operations as the attacker
//   - Each should fail with an RLS error or empty result
//   - Prints a summary table at the end
//
// Exit code: 0 if all checks PASS, 1 if any FAIL.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://pdgtryghvibhmmroqvdk.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ3RyeWdodmliaG1tcm9xdmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTA1MzUsImV4cCI6MjA5MDc2NjUzNX0.t8SlfkkSDDbjYIMkgnwRyelXleSP7Rn4BFNtbMgHsVo";

const need = (name) => {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(2);
  }
  return v;
};

const ATTACKER_EMAIL    = need("ATTACKER_EMAIL");
const ATTACKER_PASSWORD = need("ATTACKER_PASSWORD");
const VICTIM_USER_ID    = need("VICTIM_USER_ID");
const VICTIM_PLAYGROUP_ID = need("VICTIM_PLAYGROUP_ID");

const results = [];
const record = (id, label, passed, detail) => {
  results.push({ id, label, passed, detail });
  console.log(`  [${passed ? "PASS" : "FAIL"}] ${id} — ${label}`);
  if (!passed) console.log(`         ↳ ${detail}`);
};

// SEC-09: anon request without auth — should get empty/blocked
async function sec09_anonReadBlocked() {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await anon.from("profiles").select("id, bio").eq("id", VICTIM_USER_ID);
  // Profiles are typically readable to authenticated users only.
  // If RLS is correct, anon either gets an error or empty.
  const blocked = !!error || !data || data.length === 0;
  record("SEC-09", "anon cannot read profile", blocked, `error=${error?.message} data=${JSON.stringify(data)}`);
}

// SEC-10: tampered JWT — Supabase should reject with 401
async function sec10_tamperedJwt() {
  const bogus = SUPABASE_ANON.slice(0, -8) + "BADBADBA";
  const client = createClient(SUPABASE_URL, bogus);
  const { error } = await client.from("profiles").select("id").limit(1);
  const blocked = !!error;
  record("SEC-10", "tampered JWT rejected", blocked, `error=${error?.message || "no error returned"}`);
}

async function asAttacker() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await client.auth.signInWithPassword({
    email: ATTACKER_EMAIL,
    password: ATTACKER_PASSWORD,
  });
  if (error) {
    console.error("Could not sign in attacker:", error.message);
    process.exit(2);
  }
  return { client, attackerId: data.user.id };
}

// SEC-11: attacker can't UPDATE victim's profile
async function sec11_updateOthersProfile(client) {
  const { data, error } = await client
    .from("profiles")
    .update({ bio: "pwned by security test" })
    .eq("id", VICTIM_USER_ID)
    .select();
  const blocked = !!error || !data || data.length === 0;
  record("SEC-11", "cannot update other user's profile", blocked, `error=${error?.message} rowsAffected=${data?.length ?? 0}`);
}

// SEC-12: attacker can't DELETE victim's playgroup
async function sec12_deleteOthersPlaygroup(client) {
  const { data, error } = await client
    .from("playgroups")
    .delete()
    .eq("id", VICTIM_PLAYGROUP_ID)
    .select();
  const blocked = !!error || !data || data.length === 0;
  record("SEC-12", "cannot delete other user's playgroup", blocked, `error=${error?.message} rowsAffected=${data?.length ?? 0}`);
}

// SEC-13: attacker can't read another user's children
async function sec13_readOthersChildren(client) {
  const { data, error } = await client
    .from("children")
    .select("id, name, age_range")
    .eq("user_id", VICTIM_USER_ID);
  const blocked = !error && (!data || data.length === 0);
  // Either empty or error is acceptable; data with rows = FAIL
  const passed = blocked || !!error;
  record("SEC-13", "cannot read other user's children", passed, `error=${error?.message} rows=${data?.length ?? 0}`);
}

// SEC-17: deleted-account auth tokens — sign in, then sign out, then
// confirm the (now-stale) client still can't act. Real "deleted account"
// requires actually deleting; we approximate by signing out and reusing
// the cached session, which is the same code path.
async function sec17_signedOutTokenInvalid(client) {
  await client.auth.signOut();
  const { error } = await client.from("profiles").select("id").limit(1);
  const blocked = !!error || error?.status === 401;
  record("SEC-17", "post-signout token cannot read protected data", blocked, `error=${error?.message || "no error"}`);
}

async function main() {
  console.log("\n── Kiddaboo security tests ──\n");
  console.log("Phase 1: unauthenticated checks");
  await sec09_anonReadBlocked();
  await sec10_tamperedJwt();

  console.log("\nPhase 2: signed-in attacker");
  const { client, attackerId } = await asAttacker();
  console.log(`  signed in as ${ATTACKER_EMAIL} (uid=${attackerId})`);
  await sec11_updateOthersProfile(client);
  await sec12_deleteOthersPlaygroup(client);
  await sec13_readOthersChildren(client);

  console.log("\nPhase 3: post sign-out");
  await sec17_signedOutTokenInvalid(client);

  console.log("\n── Summary ──");
  const fails = results.filter((r) => !r.passed);
  console.log(`  ${results.length - fails.length}/${results.length} passed`);
  if (fails.length > 0) {
    console.log("\n  Failures:");
    for (const f of fails) console.log(`    ${f.id} — ${f.label} :: ${f.detail}`);
  }
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Runner crashed:", err);
  process.exit(2);
});

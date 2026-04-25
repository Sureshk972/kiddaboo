// supabase/functions/submit-join-request/index.ts
//
// Server-side enforcement of the free-tier "1 join request per
// month" cap. Previously the limit was checked client-side only,
// which a determined user could bypass by editing the bundle or
// hitting the Supabase REST API directly.
//
// This function is the only path the client uses to create
// membership rows. It:
//   1. Verifies the Supabase user JWT
//   2. Loads the user's phone-verification status
//   3. Loads the playgroup to determine accessType
//   4. Checks an active joiner subscription (premium → unlimited)
//   5. For free users, reads join_request_usage for the current
//      month and rejects if at the limit
//   6. Inserts the membership row and increments usage atomically
//      with the service role
//
// User-actionable errors are surfaced as 200 + ok:false so the
// browser doesn't drop the body (supabase-js swallows non-2xx
// response bodies).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FREE_JOIN_LIMIT = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let body: { playgroup_id?: string; intro?: string; answers?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const playgroupId = body.playgroup_id;
  if (!playgroupId || typeof playgroupId !== "string") {
    return json({ ok: false, error: "missing_playgroup_id" });
  }

  // 1. Phone-verification gate — matches the client-side
  //    canSendJoinRequest check.
  const { data: profile } = await admin
    .from("profiles")
    .select("phone_verified_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.phone_verified_at) {
    return json({ ok: false, error: "phone_not_verified" });
  }

  // 2. Load playgroup to determine accessType + that it's active.
  const { data: pg, error: pgErr } = await admin
    .from("playgroups")
    .select("id, access_type, is_active, max_families")
    .eq("id", playgroupId)
    .maybeSingle();
  if (pgErr || !pg) {
    return json({ ok: false, error: "playgroup_not_found" });
  }
  if (!pg.is_active) {
    return json({ ok: false, error: "playgroup_inactive" });
  }

  // 3. Capacity guard for open-access groups. For request/invite groups
  //    the host approves manually so the host owns capacity decisions;
  //    for open groups the insert is auto-approved, so we have to
  //    enforce max_families server-side or a popular open group can
  //    blow past its cap during a brief click-race.
  if (pg.access_type === "open" && pg.max_families) {
    const { count: memberCount } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("playgroup_id", playgroupId)
      .in("role", ["creator", "member"]);
    if (memberCount !== null && memberCount >= pg.max_families) {
      return json({ ok: false, error: "playgroup_full" });
    }
  }

  // 4. Already-a-member guard.
  const { data: existing } = await admin
    .from("memberships")
    .select("id, role")
    .eq("user_id", userId)
    .eq("playgroup_id", playgroupId)
    .maybeSingle();
  if (existing) {
    return json({ ok: false, error: "already_member", role: existing.role });
  }

  // 4. Premium check.
  const now = new Date().toISOString();
  const { data: subs } = await admin
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("type", "joiner")
    .eq("status", "active")
    .gt("current_period_end", now);
  const isPremium = (subs || []).length > 0;

  // 5. Free-tier monthly quota — atomic claim.
  //    claim_join_request_quota() runs an INSERT … ON CONFLICT …
  //    RETURNING in a single statement. Two concurrent calls cannot
  //    both succeed past the cap (closes the prior read-modify-write
  //    race). Returns the new count if the claim succeeded, NULL if
  //    the user has hit the limit.
  const month = now.slice(0, 7); // YYYY-MM
  let claimed = false;
  if (!isPremium) {
    const { data: claimResult, error: claimErr } = await admin.rpc(
      "claim_join_request_quota",
      { p_user_id: userId, p_month: month, p_limit: FREE_JOIN_LIMIT },
    );
    if (claimErr) {
      console.error("claim_join_request_quota failed:", claimErr);
      return json({ ok: false, error: "quota_check_failed" });
    }
    if (claimResult === null || claimResult === undefined) {
      return json({
        ok: false,
        error: "quota_exceeded",
        limit: FREE_JOIN_LIMIT,
      });
    }
    claimed = true;
  }

  // 6. Insert membership.
  const role = pg.access_type === "open" ? "member" : "pending";
  const insertRow: Record<string, unknown> = {
    user_id: userId,
    playgroup_id: playgroupId,
    role,
  };
  if (role === "member") {
    insertRow.joined_at = now;
  } else {
    if (typeof body.intro === "string") insertRow.intro_message = body.intro;
    if (body.answers !== undefined) insertRow.screening_answers = body.answers;
  }

  const { error: insertErr } = await admin.from("memberships").insert(insertRow);
  if (insertErr) {
    console.error("membership insert failed:", insertErr);
    // Roll back the quota claim so a transient DB error doesn't burn
    // the user's monthly request. Best-effort — if this decrement also
    // fails, we'd rather under-charge than fail the response twice.
    if (claimed) {
      await admin
        .from("join_request_usage")
        .update({ request_count: 0 })
        .eq("user_id", userId)
        .eq("month", month)
        .gt("request_count", 0)
        .lte("request_count", 1);
    }
    return json({ ok: false, error: "insert_failed", detail: insertErr.message });
  }

  return json({ ok: true, role });
});

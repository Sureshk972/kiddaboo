// supabase/functions/verify-otp/index.ts
//
// Consumes a phone_otp_challenges row: checks code hash, attempts,
// expiry. On success, sets profiles.phone_verified_at + phone_number.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_ATTEMPTS = 3;

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

async function hashCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode(code + "|kiddaboo-otp-v1");
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  let phone: string, code: string;
  try {
    ({ phone, code } = await req.json());
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!phone || !/^\d{6}$/.test(code || "")) {
    return json({ error: "invalid_input" }, 400);
  }

  // Grab the latest unexpired, unconsumed challenge for this user+phone.
  const { data: challenges, error: selErr } = await admin
    .from("phone_otp_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("phone_number", phone)
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (selErr) return json({ error: "db_error", detail: selErr.message }, 500);
  const challenge = challenges?.[0];
  if (!challenge) return json({ error: "no_active_challenge" }, 410);
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return json({ error: "too_many_attempts" }, 429);
  }

  const codeHash = await hashCode(code);
  if (codeHash !== challenge.code_hash) {
    await admin
      .from("phone_otp_challenges")
      .update({ attempts: challenge.attempts + 1 })
      .eq("id", challenge.id);
    return json({ error: "code_mismatch", attempts_left: MAX_ATTEMPTS - challenge.attempts - 1 }, 400);
  }

  const now = new Date().toISOString();
  const { error: consumeErr } = await admin
    .from("phone_otp_challenges")
    .update({ consumed_at: now })
    .eq("id", challenge.id);
  if (consumeErr) return json({ error: "db_error", detail: consumeErr.message }, 500);

  const { error: profErr } = await admin
    .from("profiles")
    .update({ phone_number: phone, phone_verified_at: now })
    .eq("id", userId);
  if (profErr) return json({ error: "db_error", detail: profErr.message }, 500);

  return json({ ok: true, verified_at: now });
});

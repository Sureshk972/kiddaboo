// supabase/functions/verify-otp/index.ts
//
// Delegates OTP validation to Twilio Verify's VerificationCheck
// endpoint. Twilio owns the code, its expiry, and its attempt counter;
// we just ask them "is this code valid for this phone?" and, on
// approval, set profiles.phone_number + phone_verified_at.
//
// The gateway-level verify_jwt is off (see config.toml) so we
// revalidate the user's token here against a service-role client.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Twilio auth via a Verify-scoped Restricted API Key — see send-otp
// for the rationale.
const TWILIO_KEY_SID = Deno.env.get("TWILIO_API_KEY_SID")!;
const TWILIO_KEY_SECRET = Deno.env.get("TWILIO_API_KEY_SECRET")!;
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!;

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

async function twilioCheckVerification(phone: string, code: string) {
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
  const params = new URLSearchParams({ To: phone, Code: code });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_KEY_SID}:${TWILIO_KEY_SECRET}`),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
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
  if (!/^\+[1-9]\d{6,14}$/.test(phone || "") || !/^\d{6}$/.test(code || "")) {
    return json({ error: "invalid_input" }, 400);
  }

  // Twilio Verify returns status:
  //   "approved" — code matched, verification consumed
  //   "pending"  — code didn't match (or already consumed)
  //   HTTP 404   — no active verification for this phone (stale/expired)
  const result = await twilioCheckVerification(phone, code);
  if (!result.ok) {
    // 404 means there's no verification record on Twilio's side — either
    // expired, already consumed, or never started. Treat as "no active
    // challenge" so the UI can prompt a resend.
    if (result.status === 404) {
      return json({ error: "no_active_challenge" }, 410);
    }
    console.error("twilio verify check failed:", result.status, result.body);
    return json({ error: "verify_failed", detail: result.body }, 502);
  }

  const status = (result.body as { status?: string })?.status;
  if (status !== "approved") {
    return json({ error: "code_mismatch" }, 400);
  }

  const now = new Date().toISOString();
  const { error: profErr } = await admin
    .from("profiles")
    .update({ phone_number: phone, phone_verified_at: now })
    .eq("id", userId);
  if (profErr) {
    // Unique violation on profiles.phone_number means the phone is
    // already linked to a different account. Surface a dedicated
    // error so the client can offer sign-in instead of the generic
    // "something went wrong". supabase-js swallows non-2xx bodies, so
    // we return 200 with ok:false to keep the code reachable on the
    // client side.
    if ((profErr as { code?: string }).code === "23505") {
      return json({ ok: false, error: "phone_in_use" });
    }
    return json({ error: "db_error", detail: profErr.message }, 500);
  }

  return json({ ok: true, verified_at: now });
});

// supabase/functions/send-otp/index.ts
//
// Sends a 6-digit OTP to the user's phone via Twilio. Requires a
// Supabase user JWT (verify_jwt = true in config). Rate limited to
// 3 sends per phone per hour; challenge expires in 10 minutes.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER")!;

// Matches the CORS pattern used by create-checkout, delete-account, and
// admin-delete-user. The browser calls this via supabase.functions.invoke,
// which triggers a preflight — without these headers the preflight fails
// and the real POST never runs.
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

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

async function sendSms(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`twilio ${res.status}: ${text}`);
  }
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

  let phone: string;
  try {
    ({ phone } = await req.json());
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone || "")) {
    return json({ error: "invalid_phone" }, 400);
  }

  // Rate limit: max 3 sends per phone per hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("phone_otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) {
    return json({ error: "rate_limited" }, 429);
  }

  const code = randomCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("phone_otp_challenges").insert({
    user_id: userId,
    phone_number: phone,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (insErr) return json({ error: "db_error", detail: insErr.message }, 500);

  if (Deno.env.get("OTP_STUB") === "1") {
    // Stub mode: skip Twilio, log the code so developers can grab it
    // from function logs. Never set OTP_STUB=1 in production.
    console.log(`[OTP_STUB] code for ${phone}: ${code}`);
  } else {
    try {
      await sendSms(phone, `Kiddaboo verification code: ${code}. Expires in 10 minutes.`);
    } catch (err) {
      return json({ error: "sms_failed", detail: String(err) }, 502);
    }
  }

  return json({ ok: true, expires_at: expiresAt });
});

// supabase/functions/send-otp/index.ts
//
// Delegates OTP delivery to Twilio Verify. Twilio generates the code,
// sends it over SMS (falling back to voice if we ask), and tracks
// expiry/attempts/rate-limiting on their side — we never see the code
// at all, which means we don't need a code_hash table or attempt
// counter. Verify also handles A2P 10DLC compliance transparently,
// which our previous Messaging-API approach did not.
//
// Requires a Supabase user JWT in the Authorization header. The
// gateway-level verify_jwt is off (see config.toml for the ES256/HS256
// explanation) so we revalidate the token here against a service-role
// admin client that reads the current JWKS.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
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

async function twilioStartVerification(phone: string) {
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const params = new URLSearchParams({ To: phone, Channel: "sms" });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
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

  let phone: string;
  try {
    ({ phone } = await req.json());
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!/^\+[1-9]\d{6,14}$/.test(phone || "")) {
    return json({ error: "invalid_phone" }, 400);
  }

  // Twilio Verify handles code generation, expiry, delivery, and the
  // associated rate limiting / fraud detection. We just kick it off.
  const result = await twilioStartVerification(phone);
  if (!result.ok) {
    console.error("twilio verify start failed:", result.status, result.body);
    // Twilio's 60212 (max send attempts reached) is our rate-limit case;
    // surface that to the UI so the copy can be accurate. Everything
    // else is a generic send failure.
    const twilioCode = (result.body as { code?: number })?.code;
    if (twilioCode === 60212) {
      return json({ error: "rate_limited" }, 429);
    }
    return json({ error: "sms_failed", detail: result.body }, 502);
  }

  return json({ ok: true });
});

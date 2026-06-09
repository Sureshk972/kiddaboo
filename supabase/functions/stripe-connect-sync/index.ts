// Pull the latest Connect account state directly from Stripe and sync
// it into profiles. Belt-and-suspenders for the account.updated webhook
// (which may lag or be misconfigured). Called when a nanny returns
// from Express onboarding, so the Earnings page shows the right state
// without waiting for an asynchronous webhook delivery.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "missing auth" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = auth.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return json({ error: "unauthenticated" }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, account_type")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "nanny") return json({ error: "not a nanny" }, 403);
  if (!profile.stripe_connect_account_id) {
    return json({ error: "no connect account on file" }, 409);
  }

  let account;
  try {
    account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
  } catch (e) {
    return json({ error: e?.message || "stripe error" }, 502);
  }

  const updates = {
    stripe_connect_charges_enabled: account.charges_enabled,
    stripe_connect_payouts_enabled: account.payouts_enabled,
  };
  await supabase.from("profiles").update(updates).eq("id", user.id);

  return json({
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    requirements_currently_due: account.requirements?.currently_due ?? [],
    requirements_disabled_reason: account.requirements?.disabled_reason ?? null,
  });
});

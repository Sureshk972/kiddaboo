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

  const { data: { user }, error: userErr } = await supabase.auth.getUser(
    auth.replace("Bearer ", "")
  );
  if (!user) return json({ error: "unauthenticated", detail: userErr?.message }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, account_type")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "nanny") return json({ error: "not a nanny" }, 403);
  if (!profile?.stripe_connect_account_id) {
    return json({ error: "no connected account" }, 409);
  }

  const link = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
  return json({ url: link.url });
});

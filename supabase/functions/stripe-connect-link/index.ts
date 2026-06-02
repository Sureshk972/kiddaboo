import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthenticated", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, account_type")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "nanny") return new Response("not a nanny", { status: 403 });

  let accountId = profile.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { supabase_user_id: user.id },
    });
    accountId = account.id;
    await supabase.from("profiles").update({ stripe_connect_account_id: accountId }).eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${Deno.env.get("APP_URL")}/nanny/earnings?connect=refresh`,
    return_url: `${Deno.env.get("APP_URL")}/nanny/earnings?connect=return`,
    type: "account_onboarding",
  });

  return Response.json({ url: link.url });
});

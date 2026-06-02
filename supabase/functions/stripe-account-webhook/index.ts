import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_ACCOUNT_SECRET")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, secret);
  } catch (err) {
    return new Response(`bad signature: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "account.updated") {
    const a = event.data.object as Stripe.Account;
    await supabase.from("profiles")
      .update({
        stripe_connect_charges_enabled: a.charges_enabled,
        stripe_connect_payouts_enabled: a.payouts_enabled,
      })
      .eq("stripe_connect_account_id", a.id);
  }

  return new Response("ok");
});

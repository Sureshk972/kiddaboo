import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_BOOKINGS_SECRET")!;
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

  switch (event.type) {
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase.from("bookings")
        .update({ status: "pending_payment_retry" })
        .eq("stripe_payment_intent_id", pi.id)
        .eq("status", "pending");
      break;
    }
    case "charge.refunded": {
      // No-op: refund is initiated by cancel-booking which sets booking status directly.
      break;
    }
    default: break;
  }

  return new Response("ok");
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Expire pending requests past their acceptance window
  const { data: expired } = await supabase
    .from("bookings")
    .select("id, stripe_payment_intent_id, slot_id")
    .eq("status", "pending")
    .lt("acceptance_expires_at", new Date().toISOString());

  for (const b of expired ?? []) {
    if (b.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(b.stripe_payment_intent_id).catch(() => {});
    }
    await supabase.from("bookings").update({ status: "expired" }).eq("id", b.id);
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", b.slot_id);
  }

  // 2. Sweep stuck pending_payment_retry bookings older than 12h
  const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data: retry } = await supabase
    .from("bookings")
    .select("id, slot_id")
    .eq("status", "pending_payment_retry")
    .lt("requested_at", cutoff);

  for (const b of retry ?? []) {
    await supabase.from("bookings").update({ status: "expired" }).eq("id", b.id);
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", b.slot_id);
  }

  return new Response(`expired ${(expired?.length ?? 0) + (retry?.length ?? 0)}`);
});

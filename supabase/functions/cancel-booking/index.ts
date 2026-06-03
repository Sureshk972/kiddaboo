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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthenticated" }, 401);

  const { booking_id } = await req.json();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, slot:nanny_slots(starts_at)")
    .eq("id", booking_id).single();
  if (!booking) return json({ error: "not found" }, 404);

  const isParent = booking.parent_id === user.id;
  const isNanny = booking.nanny_id === user.id;
  if (!isParent && !isNanny) return json({ error: "forbidden" }, 403);

  if (!["pending", "confirmed", "pending_payment_retry"].includes(booking.status)) {
    return json({ error: "cannot cancel in current state" }, 409);
  }

  const hoursUntilStart = (new Date(booking.slot.starts_at).getTime() - Date.now()) / 3600_000;
  const refundEligible = isNanny || hoursUntilStart > 24;

  if (booking.status === "pending" || booking.status === "pending_payment_retry") {
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id!).catch(() => {});
  } else if (booking.status === "confirmed" && refundEligible) {
    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id!,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  }

  const newStatus = refundEligible ? "cancelled_refunded" : "cancelled_no_refund";

  await supabase.from("bookings").update({
    status: newStatus,
    cancelled_at: new Date().toISOString(),
    cancelled_by: isParent ? "parent" : "nanny",
  }).eq("id", booking_id);

  if (new Date(booking.slot.starts_at) > new Date()) {
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", booking.slot_id);
  }

  return json({ ok: true });
});

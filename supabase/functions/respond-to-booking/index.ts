import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

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

  const { booking_id, decision } = await req.json();
  if (!["accept", "decline"].includes(decision)) return new Response("bad decision", { status: 400 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();
  if (!booking) return new Response("not found", { status: 404 });
  if (booking.nanny_id !== user.id) return new Response("not your booking", { status: 403 });
  if (booking.status !== "pending") return new Response("not pending", { status: 409 });
  if (new Date(booking.acceptance_expires_at) <= new Date()) return new Response("expired", { status: 409 });

  if (decision === "accept") {
    try {
      await stripe.paymentIntents.capture(booking.stripe_payment_intent_id!);
      await supabase.from("bookings")
        .update({ status: "confirmed", responded_at: new Date().toISOString() })
        .eq("id", booking_id);
      await supabase.from("nanny_slots").update({ status: "booked" }).eq("id", booking.slot_id);
    } catch (err) {
      await supabase.from("bookings")
        .update({ status: "pending_payment_retry" })
        .eq("id", booking_id);
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(`capture failed: ${msg}`, { status: 402 });
    }
  } else {
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id!).catch(() => {});
    await supabase.from("bookings")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", booking_id);
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", booking.slot_id);
  }

  return Response.json({ ok: true });
});

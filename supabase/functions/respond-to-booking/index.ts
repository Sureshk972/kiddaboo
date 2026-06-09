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

  const { booking_id, decision } = await req.json();
  if (!["accept", "decline"].includes(decision)) return json({ error: "bad decision" }, 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();
  if (!booking) return json({ error: "not found" }, 404);
  if (booking.nanny_id !== user.id) return json({ error: "not your booking" }, 403);
  if (booking.status !== "pending") return json({ error: "not pending" }, 409);
  if (new Date(booking.acceptance_expires_at) <= new Date()) return json({ error: "expired" }, 409);

  if (decision === "accept") {
    // Retry-safe: if a previous attempt captured on Stripe but failed to
    // persist the DB status flip, the next click would 400 with "already
    // been captured". Check the PI state first and treat "already
    // captured" as success — just sync the DB.
    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id!);
      if (pi.status === "requires_capture") {
        await stripe.paymentIntents.capture(booking.stripe_payment_intent_id!);
      } else if (pi.status !== "succeeded") {
        // Anything other than requires_capture / succeeded is a real failure
        // (canceled, processing, requires_action, requires_payment_method).
        await supabase.from("bookings")
          .update({ status: "pending_payment_retry" })
          .eq("id", booking_id);
        return json({ error: `payment in unexpected state: ${pi.status}` }, 402);
      }
      await supabase.from("bookings")
        .update({ status: "confirmed", responded_at: new Date().toISOString() })
        .eq("id", booking_id);
      await supabase.from("nanny_slots").update({ status: "booked" }).eq("id", booking.slot_id);
    } catch (err) {
      await supabase.from("bookings")
        .update({ status: "pending_payment_retry" })
        .eq("id", booking_id);
      const msg = err instanceof Error ? err.message : String(err);
      return json({ error: `capture failed: ${msg}` }, 402);
    }
  } else {
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id!).catch(() => {});
    await supabase.from("bookings")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", booking_id);
    await supabase.from("nanny_slots").update({ status: "open" }).eq("id", booking.slot_id);
  }

  return json({ ok: true });
});

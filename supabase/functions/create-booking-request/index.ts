import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const PLATFORM_FEE_BPS = parseInt(Deno.env.get("PLATFORM_FEE_BPS") ?? "1500");
const ACCEPTANCE_WINDOW_HOURS = 24;

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("missing auth", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return new Response("unauthenticated", { status: 401 });

  const { slot_id, note, payment_method_id } = await req.json();
  if (!slot_id || !payment_method_id) return new Response("missing fields", { status: 400 });

  const { data: slot, error: slotErr } = await supabase
    .from("nanny_slots")
    .select("id, nanny_id, starts_at, ends_at, rate_cents, status")
    .eq("id", slot_id)
    .single();
  if (slotErr || !slot) return new Response("slot not found", { status: 404 });
  if (slot.status !== "open") return new Response("slot not available", { status: 409 });
  if (new Date(slot.starts_at) <= new Date()) return new Response("slot in past", { status: 409 });

  const { data: nanny } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", slot.nanny_id)
    .single();
  if (!nanny?.stripe_connect_account_id || !nanny.stripe_connect_charges_enabled) {
    return new Response("nanny payouts not set up", { status: 409 });
  }

  const { data: parent } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = parent?.stripe_customer_id;
  if (!customerId) {
    const c = await stripe.customers.create({ metadata: { supabase_user_id: user.id } });
    customerId = c.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }
  await stripe.paymentMethods.attach(payment_method_id, { customer: customerId }).catch(() => {});

  const fee = Math.round(slot.rate_cents * PLATFORM_FEE_BPS / 10000);
  const acceptanceExpires = new Date(Math.min(
    Date.now() + ACCEPTANCE_WINDOW_HOURS * 3600_000,
    new Date(slot.starts_at).getTime()
  ));

  const pi = await stripe.paymentIntents.create({
    amount: slot.rate_cents + fee,
    currency: "usd",
    customer: customerId,
    payment_method: payment_method_id,
    capture_method: "manual",
    confirm: true,
    off_session: false,
    application_fee_amount: fee,
    transfer_data: { destination: nanny.stripe_connect_account_id },
    metadata: { slot_id, parent_id: user.id, nanny_id: slot.nanny_id },
  });

  if (pi.status !== "requires_capture") {
    return new Response(`payment auth failed: ${pi.status}`, { status: 402 });
  }

  const { data: booking, error: bookingErr } = await supabase.from("bookings").insert({
    slot_id,
    parent_id: user.id,
    nanny_id: slot.nanny_id,
    note_from_parent: note ?? null,
    status: "pending",
    stripe_payment_intent_id: pi.id,
    rate_cents: slot.rate_cents,
    platform_fee_cents: fee,
    acceptance_expires_at: acceptanceExpires.toISOString(),
  }).select().single();

  if (bookingErr) {
    await stripe.paymentIntents.cancel(pi.id).catch(() => {});
    return new Response(bookingErr.message, { status: 500 });
  }

  await supabase.from("nanny_slots").update({ status: "requested" }).eq("id", slot_id);

  return Response.json({ booking_id: booking.id });
});

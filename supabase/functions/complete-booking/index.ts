import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const { booking_id } = await req.json();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, slot:nanny_slots(ends_at)")
    .eq("id", booking_id).single();
  if (!booking) return new Response("not found", { status: 404 });
  if (![booking.nanny_id, booking.parent_id].includes(user.id))
    return new Response("forbidden", { status: 403 });
  if (booking.status !== "confirmed") return new Response("not confirmed", { status: 409 });
  if (new Date(booking.slot.ends_at) > new Date()) return new Response("not yet ended", { status: 409 });

  await supabase.from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", booking_id);
  return Response.json({ ok: true });
});

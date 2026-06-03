import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const { data: { user }, error: userErr } = await supabase.auth.getUser(
    auth.replace("Bearer ", "")
  );
  if (!user) return json({ error: "unauthenticated", detail: userErr?.message }, 401);

  const { booking_id } = await req.json();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, slot:nanny_slots(ends_at)")
    .eq("id", booking_id).single();
  if (!booking) return json({ error: "not found" }, 404);
  if (![booking.nanny_id, booking.parent_id].includes(user.id))
    return json({ error: "forbidden" }, 403);
  if (booking.status !== "confirmed") return json({ error: "not confirmed" }, 409);
  if (new Date(booking.slot.ends_at) > new Date()) return json({ error: "not yet ended" }, 409);

  await supabase.from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", booking_id);
  return json({ ok: true });
});

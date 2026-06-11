import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Auto-flip confirmed bookings whose slot ended >24h ago into "completed".
// Mark complete by hand on the nanny dashboard becomes optional — this
// sweep guarantees the status moves forward even if the nanny forgets,
// so the parent's rating prompt and the History view stay in sync.
const GRACE_HOURS = 24;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cutoff = new Date(Date.now() - GRACE_HOURS * 3600_000).toISOString();

  const { data: candidates, error: selErr } = await supabase
    .from("bookings")
    .select("id, slot:nanny_slots(ends_at)")
    .eq("status", "confirmed");
  if (selErr) return new Response(selErr.message, { status: 500 });

  const ids = (candidates ?? [])
    .filter((b) => b.slot?.ends_at && b.slot.ends_at < cutoff)
    .map((b) => b.id);

  if (!ids.length) return new Response("nothing to auto-complete", { status: 200 });

  const { error: updErr } = await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .in("id", ids);
  if (updErr) return new Response(updErr.message, { status: 500 });

  return new Response(`auto-completed ${ids.length} bookings`, { status: 200 });
});

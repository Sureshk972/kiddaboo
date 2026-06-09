import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HORIZON_DAYS = 56;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: blocks, error: blocksErr } = await supabase
    .from("nanny_availability_blocks")
    .select("id, nanny_id, day_of_week, specific_date, start_time, end_time, timezone, rate_cents")
    .eq("active", true);

  if (blocksErr) return new Response(blocksErr.message, { status: 500 });

  const today = new Date();
  today.setUTCHours(0,0,0,0);

  const slots: Array<Record<string, unknown>> = [];

  const pushSlot = (b: Record<string, any>, date: Date) => {
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    const startLocal = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm));
    const endLocal = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em));
    const offsetMs = tzOffsetMs(b.timezone, startLocal);
    const startsAt = new Date(startLocal.getTime() - offsetMs);
    const endsAt = new Date(endLocal.getTime() - offsetMs);
    if (startsAt < new Date()) return;
    slots.push({
      block_id: b.id,
      nanny_id: b.nanny_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      rate_cents: b.rate_cents,
      status: "open",
    });
  };

  for (const b of blocks ?? []) {
    if (b.specific_date) {
      const [y, m, d] = b.specific_date.split("-").map(Number);
      pushSlot(b, new Date(Date.UTC(y, m - 1, d)));
      continue;
    }
    for (let d = 0; d <= HORIZON_DAYS; d++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + d);
      if (date.getUTCDay() !== b.day_of_week) continue;
      pushSlot(b, date);
    }
  }

  const nowIso = new Date().toISOString();

  // Rebuild future open slots from current active blocks. This makes block
  // edits (rate, time) propagate, and removes orphans when a block is
  // soft-deleted or its start_time changes. requested/booked/past are
  // preserved so in-flight bookings aren't disturbed.
  const { error: deleteErr } = await supabase
    .from("nanny_slots")
    .delete()
    .eq("status", "open")
    .gte("starts_at", nowIso);
  if (deleteErr) return new Response(deleteErr.message, { status: 500 });

  if (slots.length > 0) {
    const { error: insertErr } = await supabase
      .from("nanny_slots")
      .upsert(slots, { onConflict: "block_id,starts_at" });
    if (insertErr) return new Response(insertErr.message, { status: 500 });
  }

  await supabase.from("nanny_slots")
    .update({ status: "past" })
    .lt("ends_at", nowIso)
    .eq("status", "open");

  return new Response(`materialized ${slots.length} candidate slots`, { status: 200 });
});

function tzOffsetMs(tz: string, atUtc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(atUtc).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - atUtc.getTime();
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HORIZON_DAYS = 56;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: blocks, error: blocksErr } = await supabase
    .from("nanny_availability_blocks")
    .select("id, nanny_id, day_of_week, start_time, end_time, timezone, rate_cents")
    .eq("active", true);

  if (blocksErr) return new Response(blocksErr.message, { status: 500 });

  const today = new Date();
  today.setUTCHours(0,0,0,0);

  const slots: Array<Record<string, unknown>> = [];

  for (const b of blocks ?? []) {
    for (let d = 0; d <= HORIZON_DAYS; d++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + d);
      if (date.getUTCDay() !== b.day_of_week) continue;

      const [sh, sm] = b.start_time.split(":").map(Number);
      const [eh, em] = b.end_time.split(":").map(Number);

      const startLocal = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm));
      const endLocal = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em));

      const offsetMs = tzOffsetMs(b.timezone, startLocal);
      const startsAt = new Date(startLocal.getTime() - offsetMs);
      const endsAt = new Date(endLocal.getTime() - offsetMs);

      if (startsAt < new Date()) continue;

      slots.push({
        block_id: b.id,
        nanny_id: b.nanny_id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        rate_cents: b.rate_cents,
        status: "open",
      });
    }
  }

  if (slots.length === 0) return new Response("no new slots", { status: 200 });

  const { error: insertErr } = await supabase
    .from("nanny_slots")
    .upsert(slots, { onConflict: "block_id,starts_at", ignoreDuplicates: true });

  if (insertErr) return new Response(insertErr.message, { status: 500 });

  await supabase.from("nanny_slots")
    .update({ status: "past" })
    .lt("ends_at", new Date().toISOString())
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

// supabase/functions/send-session-reminders/index.ts
//
// Premium feature: send a push notification 24h and 2h before a
// session that a user has RSVP'd "going" to. Designed to be invoked
// on a cron tick (~every 10 min). The dedupe table
// session_reminders_sent prevents the same reminder firing twice
// across overlapping cron windows.
//
// Free users do NOT get reminders — that's the value-add for Premium.
// We check the joiner subscription server-side here rather than
// trusting the client.
//
// Sending pushes is delegated to send-push via a synthesized
// "manual_push" webhook payload, so the VAPID/Web Push primitives
// live in one place.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// Window half-widths, in minutes. The cron tick runs every ~10 min,
// so we accept any session whose start time is within ±15 min of
// the target offset to avoid skipped windows from clock drift.
const WINDOW_HALF_MINUTES = 15;

type Reminder = {
  session_id: string;
  user_id: string;
  kind: "24h" | "2h";
  scheduled_at: string;
  playgroup_id: string;
  playgroup_name: string;
  // IANA timezone synced from the user's browser. Defaults to "UTC"
  // when missing so toLocaleString won't throw on the server side,
  // though the rendered time will be off until the client syncs.
  user_tz: string;
};

async function findDueReminders(kind: "24h" | "2h"): Promise<Reminder[]> {
  const offsetHours = kind === "24h" ? 24 : 2;
  const now = Date.now();
  const windowStart = new Date(now + (offsetHours * 60 - WINDOW_HALF_MINUTES) * 60 * 1000).toISOString();
  const windowEnd = new Date(now + (offsetHours * 60 + WINDOW_HALF_MINUTES) * 60 * 1000).toISOString();

  // Sessions starting in the window, not cancelled.
  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, playgroup_id, scheduled_at, playgroups!inner(name)")
    .is("cancelled_at", null)
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", windowEnd);
  if (error || !sessions) {
    console.error("findDueReminders sessions query failed:", error);
    return [];
  }

  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // RSVPs going for those sessions. Paginate — supabase-js caps a single
  // .select() at 1000 rows by default, and a viral session window can
  // realistically blow past that across all due sessions combined.
  const PAGE = 1000;
  const rsvps: { session_id: string; user_id: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error: rsvpErr } = await admin
      .from("rsvps")
      .select("session_id, user_id")
      .in("session_id", sessionIds)
      .eq("status", "going")
      .range(from, from + PAGE - 1);
    if (rsvpErr) {
      console.error("findDueReminders rsvps query failed:", rsvpErr);
      return [];
    }
    if (!data || data.length === 0) break;
    rsvps.push(...(data as { session_id: string; user_id: string }[]));
    if (data.length < PAGE) break;
  }

  return rsvps.map((r) => {
    const s = sessionById.get(r.session_id) as {
      id: string;
      playgroup_id: string;
      scheduled_at: string;
      playgroups: { name: string };
    };
    return {
      session_id: r.session_id as string,
      user_id: r.user_id as string,
      kind,
      scheduled_at: s.scheduled_at,
      playgroup_id: s.playgroup_id,
      playgroup_name: s.playgroups?.name || "your playgroup",
      // Real value attached in filterPremiumOnly once we look up profiles.
      user_tz: "UTC",
    };
  });
}

async function filterPremiumOnly(reminders: Reminder[]): Promise<Reminder[]> {
  if (reminders.length === 0) return [];
  const userIds = [...new Set(reminders.map((r) => r.user_id))];
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("type", "joiner")
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .in("user_id", userIds);
  const premiumIds = new Set((subs || []).map((s) => s.user_id));

  // Honor the per-user opt-out from NotificationSettings. Default
  // is on — only filter out users who explicitly set the toggle
  // to false. Also fetch each user's IANA timezone so we can format
  // session times in their local TZ instead of UTC.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, notification_prefs, timezone")
    .in("id", userIds);
  const optedOut = new Set(
    (profiles || [])
      .filter((p) => p.notification_prefs?.session_reminders === false)
      .map((p) => p.id),
  );
  const tzByUser = new Map<string, string>(
    (profiles || []).map((p) => [p.id as string, (p.timezone as string) || "UTC"]),
  );

  return reminders
    .filter((r) => premiumIds.has(r.user_id) && !optedOut.has(r.user_id))
    .map((r) => ({ ...r, user_tz: tzByUser.get(r.user_id) || "UTC" }));
}

async function alreadySent(r: Reminder): Promise<boolean> {
  // Cheap pre-check before sending. Catches the steady-state case
  // where a previous tick already marked this reminder sent.
  const { data, error } = await admin
    .from("session_reminders_sent")
    .select("id")
    .eq("session_id", r.session_id)
    .eq("user_id", r.user_id)
    .eq("kind", r.kind)
    .maybeSingle();
  if (error) {
    console.error("dedupe check failed:", error);
    return false; // fail open — better to retry than miss forever
  }
  return !!data;
}

async function markSent(r: Reminder): Promise<void> {
  // Best-effort. If two cron ticks both passed the pre-check and both
  // sent (rare), the second insert hits the unique index and 23505s —
  // expected. The push itself uses tag=`session-reminder-${id}-${kind}`
  // which the device's notification system uses to coalesce duplicates,
  // so the user sees one notification regardless.
  const { error } = await admin.from("session_reminders_sent").insert({
    session_id: r.session_id,
    user_id: r.user_id,
    kind: r.kind,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("mark-sent insert failed:", error);
  }
}

async function sendReminder(r: Reminder): Promise<boolean> {
  const start = new Date(r.scheduled_at);
  // Wrap in try/catch — an invalid TZ string from the DB would otherwise
  // throw a RangeError. Fall back to UTC formatting in that case.
  let timeStr: string;
  let dayStr: string;
  try {
    timeStr = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: r.user_tz,
    });
    dayStr = start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: r.user_tz,
    });
  } catch {
    timeStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    dayStr = start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  const title =
    r.kind === "24h"
      ? `Tomorrow: ${r.playgroup_name}`
      : `Soon: ${r.playgroup_name}`;
  const body =
    r.kind === "24h"
      ? `${dayStr} at ${timeStr}`
      : `Starting at ${timeStr}`;

  const payload = {
    type: "INSERT",
    table: "manual_push",
    record: {
      user_id: r.user_id,
      title,
      body,
      url: `/playgroup/${r.playgroup_id}`,
      tag: `session-reminder-${r.session_id}-${r.kind}`,
    },
  };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

serve(async (_req) => {
  try {
    // The 24h and 2h windows are independent queries — fetch them in
    // parallel so a slow round-trip on one doesn't push the other past
    // the cron tick budget.
    const [r24, r2] = await Promise.all([
      findDueReminders("24h"),
      findDueReminders("2h"),
    ]);
    const allReminders = [...r24, ...r2];
    const premium = await filterPremiumOnly(allReminders);

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const r of premium) {
      if (await alreadySent(r)) {
        skipped++;
        continue;
      }
      const ok = await sendReminder(r);
      if (ok) {
        await markSent(r);
        sent++;
      } else {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        candidates: allReminders.length,
        premium: premium.length,
        sent,
        skipped,
        failed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    // Top-level guard so an unexpected throw (bad TZ string, network
    // hiccup mid-loop, malformed row) doesn't 502 the cron — the next
    // tick can recover the missed window since dedupe is per-(session,user,kind).
    console.error("send-session-reminders top-level error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

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

  // RSVPs going for those sessions.
  const { data: rsvps, error: rsvpErr } = await admin
    .from("rsvps")
    .select("session_id, user_id")
    .in("session_id", sessionIds)
    .eq("status", "going");
  if (rsvpErr || !rsvps) return [];

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
  return reminders.filter((r) => premiumIds.has(r.user_id));
}

async function alreadySent(r: Reminder): Promise<boolean> {
  // Insert-as-dedupe: relies on the unique index. If the row already
  // exists we get a 23505 and skip; if it inserts, we own the send.
  const { error } = await admin.from("session_reminders_sent").insert({
    session_id: r.session_id,
    user_id: r.user_id,
    kind: r.kind,
  });
  if (!error) return false;
  if ((error as { code?: string }).code === "23505") return true;
  console.error("dedupe insert failed:", error);
  return true; // fail closed — better to skip than double-send
}

async function sendReminder(r: Reminder): Promise<boolean> {
  const start = new Date(r.scheduled_at);
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dayStr = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

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
  const allReminders = [
    ...(await findDueReminders("24h")),
    ...(await findDueReminders("2h")),
  ];
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
    if (ok) sent++;
    else failed++;
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
});

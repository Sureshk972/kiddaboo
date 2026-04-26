// supabase/functions/send-review-prompts/index.ts
//
// Cron-driven nudge: ~4-12h after a session ends, ping each "going"
// RSVP who hasn't yet reviewed the playgroup, asking them to leave
// one. The window is wide enough that a tick can miss a couple
// without losing the prompt — the (session_id, user_id) dedupe
// table guarantees at-most-once per session-user.
//
// We use scheduled_at as a proxy for "session is over" and skip
// anything started < 4h ago. That's coarser than scheduled_at +
// duration_minutes but avoids the duration column edge cases and
// errs on the side of waiting longer to ask.
//
// Sending is delegated to send-push via the manual_push synthesized
// webhook payload, same pattern as send-session-reminders.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const WINDOW_END_HOURS = 4;   // skip sessions that ended < 4h ago
const WINDOW_START_HOURS = 12; // skip sessions older than 12h

type Prompt = {
  session_id: string;
  user_id: string;
  playgroup_id: string;
  playgroup_name: string;
};

async function findCandidates(): Promise<Prompt[]> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_START_HOURS * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now - WINDOW_END_HOURS * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, playgroup_id, scheduled_at, playgroups!inner(name)")
    .is("cancelled_at", null)
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", windowEnd);
  if (error || !sessions) {
    console.error("findCandidates sessions query failed:", error);
    return [];
  }
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

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
      console.error("findCandidates rsvps query failed:", rsvpErr);
      return [];
    }
    if (!data || data.length === 0) break;
    rsvps.push(...(data as { session_id: string; user_id: string }[]));
    if (data.length < PAGE) break;
  }
  if (rsvps.length === 0) return [];

  // Drop users who already reviewed the playgroup (reviews are per-
  // playgroup, not per-session — one review covers all sessions).
  const playgroupUserPairs = new Set(
    rsvps.map((r) => {
      const s = sessionById.get(r.session_id) as { playgroup_id: string };
      return `${s.playgroup_id}|${r.user_id}`;
    }),
  );
  const playgroupIds = [...new Set(
    rsvps.map((r) => (sessionById.get(r.session_id) as { playgroup_id: string }).playgroup_id),
  )];
  const userIds = [...new Set(rsvps.map((r) => r.user_id))];

  const { data: existingReviews } = await admin
    .from("reviews")
    .select("playgroup_id, reviewer_id")
    .in("playgroup_id", playgroupIds)
    .in("reviewer_id", userIds);
  const reviewedPairs = new Set(
    (existingReviews || []).map((r) => `${r.playgroup_id}|${r.reviewer_id}`),
  );

  return rsvps
    .map((r) => {
      const s = sessionById.get(r.session_id) as {
        id: string;
        playgroup_id: string;
        playgroups: { name: string };
      };
      return {
        session_id: r.session_id,
        user_id: r.user_id,
        playgroup_id: s.playgroup_id,
        playgroup_name: s.playgroups?.name || "your playgroup",
        _key: `${s.playgroup_id}|${r.user_id}`,
      };
    })
    .filter((p) => playgroupUserPairs.has(p._key) && !reviewedPairs.has(p._key))
    .map(({ _key: _drop, ...rest }) => rest);
}

async function filterOptOuts(prompts: Prompt[]): Promise<Prompt[]> {
  if (prompts.length === 0) return [];
  const userIds = [...new Set(prompts.map((p) => p.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, notification_prefs")
    .in("id", userIds);
  const optedOut = new Set(
    (profiles || [])
      .filter((p) => p.notification_prefs?.reviews === false)
      .map((p) => p.id),
  );
  return prompts.filter((p) => !optedOut.has(p.user_id));
}

async function alreadySent(p: Prompt): Promise<boolean> {
  const { data, error } = await admin
    .from("review_prompts_sent")
    .select("id")
    .eq("session_id", p.session_id)
    .eq("user_id", p.user_id)
    .maybeSingle();
  if (error) {
    console.error("dedupe check failed:", error);
    return false;
  }
  return !!data;
}

async function markSent(p: Prompt): Promise<void> {
  const { error } = await admin.from("review_prompts_sent").insert({
    session_id: p.session_id,
    user_id: p.user_id,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("mark-sent insert failed:", error);
  }
}

async function sendPrompt(p: Prompt): Promise<boolean> {
  const payload = {
    type: "INSERT",
    table: "manual_push",
    record: {
      user_id: p.user_id,
      title: `How was ${p.playgroup_name}?`,
      body: "Tap to leave a quick review and help other families.",
      url: `/playgroup/${p.playgroup_id}`,
      tag: `review-prompt-${p.session_id}`,
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
  const { data: logRow } = await admin
    .from("cron_run_log")
    .insert({ function_name: "send-review-prompts" })
    .select("id")
    .single();
  const runId = logRow?.id as number | undefined;

  try {
    const candidates = await findCandidates();
    const eligible = await filterOptOuts(candidates);

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const p of eligible) {
      if (await alreadySent(p)) {
        skipped++;
        continue;
      }
      const ok = await sendPrompt(p);
      if (ok) {
        await markSent(p);
        sent++;
      } else {
        failed++;
      }
    }

    if (runId) {
      await admin
        .from("cron_run_log")
        .update({
          completed_at: new Date().toISOString(),
          candidates: candidates.length,
          premium: eligible.length,
          sent,
          skipped,
          failed,
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        candidates: candidates.length,
        eligible: eligible.length,
        sent,
        skipped,
        failed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-review-prompts top-level error:", err);
    if (runId) {
      await admin
        .from("cron_run_log")
        .update({
          completed_at: new Date().toISOString(),
          error: String(err).slice(0, 500),
        })
        .eq("id", runId);
    }
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

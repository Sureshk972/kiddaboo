import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Start-of-week (Sunday 00:00 in local time). Mirrors what the parent /
// nanny sees on their phone calendar so the weekly count never reads
// "off by a day".
function startOfWeek(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function useNannyStats() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    weekEarningsCents: 0,
    weekSessions: 0,
    weekHours: 0,
    weekDeltaCents: 0,
    rating: null,
    eightWeeks: [], // [{label, earningsCents, startsAt}]
    lifetimeCents: 0,
    nextSession: null, // { startsAt, rateCents } | null
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [{ data: bookings }, { data: ratings }] = await Promise.all([
        supabase
          .from("bookings")
          .select("rate_cents, status, slot:nanny_slots(starts_at, ends_at)")
          .eq("nanny_id", user.id)
          .in("status", ["confirmed", "completed", "cancelled_no_refund"]),
        supabase
          .from("ratings")
          .select("score")
          .eq("ratee_id", user.id)
          .eq("direction", "parent_to_nanny"),
      ]);
      if (cancelled) return;
      const rows = bookings || [];
      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const lastWeekStart = new Date(thisWeekStart.getTime() - WEEK_MS);

      // Build 8 week buckets, oldest first.
      const eightWeeks = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date(thisWeekStart.getTime() - i * WEEK_MS);
        eightWeeks.push({
          start,
          startsAt: start,
          label: start.toLocaleDateString([], { month: "short", day: "numeric" }),
          earningsCents: 0,
        });
      }

      let weekEarningsCents = 0;
      let weekSessions = 0;
      let weekHoursMs = 0;
      let lastWeekEarningsCents = 0;
      let lifetimeCents = 0;
      let nextSession = null;

      for (const b of rows) {
        const startsAt = b.slot?.starts_at ? new Date(b.slot.starts_at) : null;
        const endsAt = b.slot?.ends_at ? new Date(b.slot.ends_at) : null;
        const isEarning =
          b.status === "completed" ||
          (b.status === "confirmed" && endsAt && endsAt < now) ||
          b.status === "cancelled_no_refund";

        if (isEarning && startsAt) {
          lifetimeCents += b.rate_cents || 0;
          const bucketIdx = eightWeeks.findIndex(
            (w, i) =>
              startsAt >= w.start &&
              startsAt < (eightWeeks[i + 1]?.start || new Date(now.getTime() + WEEK_MS))
          );
          if (bucketIdx >= 0) {
            eightWeeks[bucketIdx].earningsCents += b.rate_cents || 0;
          }
          if (startsAt >= thisWeekStart && startsAt < new Date(thisWeekStart.getTime() + WEEK_MS)) {
            weekEarningsCents += b.rate_cents || 0;
            weekSessions += 1;
            if (endsAt) weekHoursMs += endsAt - startsAt;
          } else if (startsAt >= lastWeekStart && startsAt < thisWeekStart) {
            lastWeekEarningsCents += b.rate_cents || 0;
          }
        }

        if (
          b.status === "confirmed" &&
          startsAt &&
          startsAt > now &&
          (!nextSession || startsAt < nextSession.startsAt)
        ) {
          nextSession = { startsAt, rateCents: b.rate_cents || 0 };
        }
      }

      const ratingNs = ratings || [];
      const avgRating = ratingNs.length
        ? ratingNs.reduce((acc, r) => acc + r.score, 0) / ratingNs.length
        : null;

      setState({
        loading: false,
        weekEarningsCents,
        weekSessions,
        weekHours: weekHoursMs / 3600_000,
        weekDeltaCents: weekEarningsCents - lastWeekEarningsCents,
        rating: avgRating ? { avg: avgRating, n: ratingNs.length } : null,
        eightWeeks,
        lifetimeCents,
        nextSession,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return state;
}

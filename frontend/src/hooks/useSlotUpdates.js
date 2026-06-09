import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const WARMUP_MS = 2000;
const AUTO_DISMISS_MS = 8000;

/**
 * Subscribes to nanny_slots realtime changes and surfaces a "pendingCount"
 * for the <NewSlotsBanner /> component on Discover. Filters incoming events
 * against the parent's active window so we only nudge when what they're
 * looking at actually changed.
 *
 * Must be mounted exactly once per route (singleton per realtime channel).
 */
export function useSlotUpdates({ from, to, maxRateCents, visibleSlots }) {
  const [pendingCount, setPendingCount] = useState(0);
  const dismissTimer = useRef(null);

  // Stash filters in a ref so the subscription effect doesn't re-bind on
  // every filter change — we want one channel for the lifetime of the
  // hook, with current filters read on each event.
  const filtersRef = useRef({ from, to, maxRateCents });
  filtersRef.current = { from, to, maxRateCents };
  const visibleRef = useRef(visibleSlots || []);
  visibleRef.current = visibleSlots || [];

  useEffect(() => {
    const subscribedAt = Date.now();

    const inWindow = (row) => {
      if (!row) return false;
      const { from: f, to: t, maxRateCents: mr } = filtersRef.current;
      if (!f || !t) return false;
      const startsAt = new Date(row.starts_at).getTime();
      if (startsAt < f.getTime() || startsAt > t.getTime()) return false;
      if (mr != null && row.rate_cents > mr) return false;
      return true;
    };

    const bump = () => {
      setPendingCount((n) => (n >= 9 ? 9 : n + 1));
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        setPendingCount(0);
        dismissTimer.current = null;
      }, AUTO_DISMISS_MS);
    };

    const channel = supabase
      .channel("nanny_slots_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nanny_slots" },
        (payload) => {
          // Suppress the reconnect catch-up burst.
          if (Date.now() - subscribedAt < WARMUP_MS) return;

          const nw = payload.new || null;
          const old = payload.old || null;

          if (payload.eventType === "INSERT") {
            if (nw?.status === "open" && inWindow(nw)) bump();
            return;
          }

          if (payload.eventType === "DELETE") {
            // DELETE payloads carry only the primary key.
            if (visibleRef.current.some((s) => s.id === old?.id)) bump();
            return;
          }

          if (payload.eventType === "UPDATE") {
            const visible = visibleRef.current.find((s) => s.id === nw?.id);
            if (visible) {
              // It's on screen — any material change is a nudge.
              if (
                nw.status !== "open" ||
                nw.rate_cents !== visible.rate_cents ||
                nw.ends_at !== visible.ends_at ||
                nw.starts_at !== visible.starts_at
              ) {
                bump();
              }
              return;
            }
            // Not on screen yet but transitioned into the window.
            if (nw?.status === "open" && inWindow(nw)) bump();
          }
        }
      )
      .subscribe();

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const dismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
    setPendingCount(0);
  };

  return { pendingCount, dismiss };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyInbox() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [parentRatings, setParentRatings] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, slot:nanny_slots(starts_at, ends_at), parent:profiles!bookings_parent_id_fkey(id, first_name, last_name)"
      )
      .eq("nanny_id", user.id)
      .in("status", ["pending", "confirmed", "completed"]);
    const now = Date.now();
    const all = data || [];
    setPending(all.filter((b) => b.status === "pending"));
    setUpcoming(
      all.filter(
        (b) => b.status === "confirmed" && new Date(b.slot.ends_at).getTime() > now
      )
    );
    setPast(
      all.filter(
        (b) =>
          b.status === "completed" ||
          (b.status === "confirmed" && new Date(b.slot.ends_at).getTime() <= now)
      )
    );

    const parentIds = [...new Set(all.map((b) => b.parent_id).filter(Boolean))];
    if (parentIds.length) {
      const { data: rows } = await supabase
        .from("ratings")
        .select("ratee_id, score")
        .in("ratee_id", parentIds)
        .eq("direction", "nanny_to_parent");
      const agg = {};
      for (const r of rows || []) {
        const cur = agg[r.ratee_id] || { sum: 0, n: 0 };
        cur.sum += r.score;
        cur.n += 1;
        agg[r.ratee_id] = cur;
      }
      const out = {};
      for (const [id, { sum, n }] of Object.entries(agg)) {
        out[id] = { avg: sum / n, n };
      }
      setParentRatings(out);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic mutation API. Each helper removes a row from its category
  // immediately for instant UI feedback and returns a rollback fn the
  // caller invokes on error to put the row back. On success, callers
  // should call refresh() to reconcile against authoritative server
  // state — that's how a newly-accepted booking shows up in Upcoming.
  const removeFrom = (setter) => (id) => {
    let snapshot = [];
    setter((rows) => {
      snapshot = rows;
      return rows.filter((b) => b.id !== id);
    });
    return () => setter(snapshot);
  };

  return {
    pending,
    upcoming,
    past,
    parentRatings,
    loading,
    refresh: load,
    removePending: removeFrom(setPending),
    removeUpcoming: removeFrom(setUpcoming),
    removePast: removeFrom(setPast),
  };
}

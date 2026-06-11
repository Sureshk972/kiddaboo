import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Returns open slots in the window, grouped by nanny and sorted by
 * average rating (highest first). Unrated nannies sort below rated
 * ones. Within each group, slots are chronological.
 *
 * Shape of `groups`:
 *   { nannyId, nanny, slots: [...], avgRating: number|null, ratingCount: number }
 */
export function useOpenSlots({ from, to, maxRateCents = null }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fromIso = from?.toISOString();
  const toIso = to?.toISOString();

  const fetchSlots = useCallback(async () => {
    if (!fromIso || !toIso) return;
    setLoading(true);

    let q = supabase
      .from("nanny_slots")
      .select(
        "*, nanny:profiles!nanny_slots_nanny_id_fkey(id, first_name, last_name, photo_url, bio, service_area_lat, service_area_lng)"
      )
      .eq("status", "open")
      .lt("starts_at", toIso)
      .gt("ends_at", fromIso)
      .order("starts_at", { ascending: true });
    if (maxRateCents != null) q = q.lte("rate_cents", maxRateCents);

    const { data: slots, error } = await q;
    if (error) {
      console.error("[useOpenSlots]", error);
      setGroups([]);
      setLoading(false);
      return;
    }

    const byNanny = new Map();
    for (const s of slots || []) {
      if (!s.nanny?.id) continue;
      const id = s.nanny.id;
      if (!byNanny.has(id)) {
        byNanny.set(id, { nannyId: id, nanny: s.nanny, slots: [] });
      }
      byNanny.get(id).slots.push(s);
    }

    const nannyIds = [...byNanny.keys()];
    let ratings = [];
    if (nannyIds.length) {
      const { data: rdata } = await supabase
        .from("ratings")
        .select("ratee_id, score")
        .in("ratee_id", nannyIds)
        .eq("direction", "parent_to_nanny");
      ratings = rdata || [];
    }
    const ratingByNanny = new Map();
    for (const r of ratings) {
      const cur = ratingByNanny.get(r.ratee_id) || { sum: 0, n: 0 };
      cur.sum += r.score;
      cur.n += 1;
      ratingByNanny.set(r.ratee_id, cur);
    }

    const out = [...byNanny.values()].map((g) => {
      const r = ratingByNanny.get(g.nannyId);
      return {
        ...g,
        avgRating: r ? r.sum / r.n : null,
        ratingCount: r ? r.n : 0,
      };
    });

    out.sort((a, b) => {
      if (a.avgRating != null && b.avgRating != null) {
        return b.avgRating - a.avgRating;
      }
      if (a.avgRating != null) return -1;
      if (b.avgRating != null) return 1;
      return new Date(a.slots[0].starts_at) - new Date(b.slots[0].starts_at);
    });

    setGroups(out);
    setLoading(false);
  }, [fromIso, toIso, maxRateCents]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchSlots();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSlots]);

  return { groups, loading, refresh: fetchSlots };
}

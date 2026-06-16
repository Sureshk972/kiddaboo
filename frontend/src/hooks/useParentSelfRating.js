import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Reads how nannies have rated this parent. Returns null while loading or
// when the parent has fewer than 3 ratings — the caller renders nothing
// in that case so a single bad score doesn't ambush a new parent.
const MIN_RATINGS_TO_SURFACE = 3;

export default function useParentSelfRating() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, avg: null, count: 0 });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("score")
        .eq("ratee_id", user.id)
        .eq("direction", "nanny_to_parent");
      if (cancelled) return;
      const rows = data || [];
      if (rows.length < MIN_RATINGS_TO_SURFACE) {
        setState({ loading: false, avg: null, count: rows.length });
        return;
      }
      const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length;
      setState({ loading: false, avg, count: rows.length });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return state;
}

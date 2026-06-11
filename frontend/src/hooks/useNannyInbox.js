import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyInbox() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [parentRatings, setParentRatings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, slot:nanny_slots(starts_at, ends_at), parent:profiles!bookings_parent_id_fkey(id, first_name, last_name)")
        .eq("nanny_id", user.id)
        .in("status", ["pending", "confirmed", "completed"]);
      if (cancelled) return;
      const now = Date.now();
      const all = data || [];
      setPending(all.filter(b => b.status === "pending"));
      setUpcoming(all.filter(b => b.status === "confirmed" && new Date(b.slot.ends_at).getTime() > now));
      setPast(all.filter(b => (b.status === "completed") || (b.status === "confirmed" && new Date(b.slot.ends_at).getTime() <= now)));

      const parentIds = [...new Set(all.map(b => b.parent_id).filter(Boolean))];
      if (parentIds.length) {
        const { data: rows } = await supabase
          .from("ratings")
          .select("ratee_id, score")
          .in("ratee_id", parentIds)
          .eq("direction", "nanny_to_parent");
        if (cancelled) return;
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
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { pending, upcoming, past, parentRatings, loading };
}

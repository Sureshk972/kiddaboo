import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useNannyProfile(id) {
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, bio, verified_at").eq("id", id).single(),
        supabase.from("ratings").select("score, text, created_at").eq("ratee_id", id).eq("direction", "parent_to_nanny").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setProfile(p);
      setRatings(r || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;
  return { profile, ratings, avg, loading };
}

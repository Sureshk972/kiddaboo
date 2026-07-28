import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useNannyProfile(id) {
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const [{ data: p }, { data: r }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, photo_url, bio, verified_at").eq("id", id).single(),
        supabase.from("ratings").select("score, text, created_at").eq("ratee_id", id).eq("direction", "parent_to_nanny").order("created_at", { ascending: false }),
        supabase.from("nanny_slots").select("id, starts_at, ends_at, rate_cents").eq("nanny_id", id).eq("status", "open").gte("starts_at", nowIso).order("starts_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setProfile(p);
      setRatings(r || []);
      setSlots(s || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;
  return { profile, ratings, slots, avg, loading };
}

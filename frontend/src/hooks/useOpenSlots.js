import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useOpenSlots({ from, to, maxRateCents = null }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("nanny_slots")
        .select("*, nanny:profiles!nanny_slots_nanny_id_fkey(id, full_name, avatar_url, bio, service_area_lat, service_area_lng)")
        .eq("status", "open")
        .gte("starts_at", from.toISOString())
        .lte("ends_at", to.toISOString())
        .order("starts_at", { ascending: true });
      if (maxRateCents != null) q = q.lte("rate_cents", maxRateCents);
      const { data: sessionData } = await supabase.auth.getSession();
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("[useOpenSlots] query failed", error);
      } else {
        console.log("[useOpenSlots] rows", data?.length ?? 0, {
          authed: !!sessionData?.session,
          userId: sessionData?.session?.user?.id ?? null,
          from: from.toISOString(),
          to: to.toISOString(),
          maxRateCents,
        });
      }
      setSlots(error ? [] : (data || []));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from?.toISOString(), to?.toISOString(), maxRateCents]);

  return { slots, loading };
}

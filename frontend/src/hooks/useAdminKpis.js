import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminKpis(fromIso, toIso) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("admin_kpis", { p_from: fromIso, p_to: toIso })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error(error);
        setData(data?.[0] ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromIso, toIso]);

  return { data, loading };
}

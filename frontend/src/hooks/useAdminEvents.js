import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminEvents(fnName, fromIso, toIso) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc(fnName, { p_from: fromIso, p_to: toIso })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error(error);
        setRows(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fnName, fromIso, toIso]);

  return { rows, loading };
}

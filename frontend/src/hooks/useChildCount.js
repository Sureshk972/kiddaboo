import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Module-scoped cache keyed by userId so multiple SessionCards on the
// same screen don't each fire their own query. The count is stable for
// the lifetime of the session — children only change via EditProfile,
// which already triggers a full refetch on its own page.
const cache = new Map();

export function invalidateChildCount(userId) {
  if (userId) cache.delete(userId);
}

export default function useChildCount(userId) {
  const [count, setCount] = useState(() => cache.get(userId) ?? null);

  useEffect(() => {
    if (!userId) return;
    if (cache.has(userId)) {
      setCount(cache.get(userId));
      return;
    }
    let cancelled = false;
    (async () => {
      const { count: n, error } = await supabase
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (cancelled) return;
      const value = error ? 0 : n ?? 0;
      cache.set(userId, value);
      setCount(value);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return count;
}

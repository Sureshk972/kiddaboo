import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyInbox() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, slot:nanny_slots(starts_at, ends_at)")
        .eq("nanny_id", user.id)
        .in("status", ["pending", "confirmed"]);
      if (cancelled) return;
      if (!error) {
        setPending((data || []).filter(b => b.status === "pending"));
        setUpcoming((data || []).filter(b => b.status === "confirmed"));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { pending, upcoming, loading };
}

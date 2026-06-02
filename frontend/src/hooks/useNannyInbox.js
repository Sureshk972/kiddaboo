import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useNannyInbox() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, slot:nanny_slots(starts_at, ends_at), parent:profiles!bookings_parent_id_fkey(id, full_name)")
        .eq("nanny_id", user.id)
        .in("status", ["pending", "confirmed", "completed"]);
      if (cancelled) return;
      const now = Date.now();
      const all = data || [];
      setPending(all.filter(b => b.status === "pending"));
      setUpcoming(all.filter(b => b.status === "confirmed" && new Date(b.slot.ends_at).getTime() > now));
      setPast(all.filter(b => (b.status === "completed") || (b.status === "confirmed" && new Date(b.slot.ends_at).getTime() <= now)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { pending, upcoming, past, loading };
}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useParentBookings(statuses) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, slot:nanny_slots(starts_at, ends_at), nanny:profiles!bookings_nanny_id_fkey(id, first_name, last_name, photo_url)")
        .eq("parent_id", user.id)
        .in("status", statuses)
        .order("requested_at", { ascending: false });
      if (cancelled) return;
      setBookings(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, statuses.join(",")]);

  return { bookings, loading };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useParentBookings(statuses) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const key = statuses.join(",");
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, slot:nanny_slots(starts_at, ends_at), nanny:profiles!bookings_nanny_id_fkey(id, first_name, last_name, photo_url)"
      )
      .eq("parent_id", user.id)
      .in("status", statuses)
      .order("requested_at", { ascending: false });
    setBookings(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);

  useEffect(() => {
    load();
  }, [load]);

  // Optimistic removal — returns a rollback fn for the error path.
  const removeBooking = (id) => {
    let snapshot = [];
    setBookings((rows) => {
      snapshot = rows;
      return rows.filter((b) => b.id !== id);
    });
    return () => setBookings(snapshot);
  };

  return { bookings, loading, refresh: load, removeBooking };
}

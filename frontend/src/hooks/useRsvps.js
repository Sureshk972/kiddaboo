import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function useRsvps(sessionId) {
  const { user } = useAuth();
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRsvps = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from("rsvps")
      .select(`
        *,
        profiles:user_id ( first_name, last_name )
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRsvps(
        data.map((r) => {
          const first = r.profiles?.first_name || "User";
          const last = r.profiles?.last_name || "";
          return {
            ...r,
            name: `${first} ${last}`.trim(),
            initials:
              (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase(),
          };
        })
      );
    }
    setLoading(false);
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchRsvps();
  }, [fetchRsvps]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`rsvps:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rsvps",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchRsvps()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId, fetchRsvps]);

  // Current user's RSVP
  const myRsvp = useMemo(
    () => (user ? rsvps.find((r) => r.user_id === user.id) : null),
    [rsvps, user]
  );

  // Counts
  const goingCount = useMemo(
    () => rsvps.filter((r) => r.status === "going").length,
    [rsvps]
  );
  const notGoingCount = useMemo(
    () => rsvps.filter((r) => r.status === "not_going").length,
    [rsvps]
  );

  // Upsert RSVP (create or update)
  const upsertRsvp = useCallback(
    async (status) => {
      if (!user || !sessionId) return { error: { message: "Not authenticated" } };

      if (myRsvp) {
        // Update existing
        const { data, error } = await supabase
          .from("rsvps")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", myRsvp.id)
          .select()
          .single();

        if (!error && data) {
          setRsvps((prev) =>
            prev.map((r) => (r.id === myRsvp.id ? { ...r, ...data } : r))
          );
        }
        return { data, error };
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("rsvps")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            status,
          })
          .select(`
            *,
            profiles:user_id ( first_name, last_name )
          `)
          .single();

        if (!error && data) {
          const first = data.profiles?.first_name || "User";
          const last = data.profiles?.last_name || "";
          const enriched = {
            ...data,
            name: `${first} ${last}`.trim(),
            initials:
              (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase(),
          };
          setRsvps((prev) => [...prev, enriched]);
        }
        return { data, error };
      }
    },
    [sessionId, user, myRsvp]
  );

  // Delete RSVP (retract)
  const deleteRsvp = useCallback(async () => {
    if (!myRsvp) return { error: null };

    const { error } = await supabase
      .from("rsvps")
      .delete()
      .eq("id", myRsvp.id);

    if (!error) {
      setRsvps((prev) => prev.filter((r) => r.id !== myRsvp.id));
    }
    return { error };
  }, [myRsvp]);

  return {
    rsvps,
    myRsvp,
    goingCount,
    notGoingCount,
    loading,
    upsertRsvp,
    deleteRsvp,
  };
}

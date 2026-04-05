import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export default function useSessions(playgroupId) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!playgroupId) return;

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("playgroup_id", playgroupId)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  }, [playgroupId]);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Realtime subscription
  useEffect(() => {
    if (!playgroupId) return;

    const channel = supabase
      .channel(`sessions:${playgroupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `playgroup_id=eq.${playgroupId}`,
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [playgroupId, fetchSessions]);

  // Create a new session
  const createSession = useCallback(
    async (sessionData) => {
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          playgroup_id: playgroupId,
          ...sessionData,
        })
        .select()
        .single();

      if (!error && data) {
        setSessions((prev) => {
          const updated = [...prev, data].sort(
            (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
          );
          return updated;
        });
      }

      return { data, error };
    },
    [playgroupId]
  );

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }

    return { error };
  }, []);

  // The next upcoming session (first in the sorted list)
  const nextSession = sessions.length > 0 ? sessions[0] : null;

  return {
    sessions,
    nextSession,
    loading,
    createSession,
    deleteSession,
    refetch: fetchSessions,
  };
}

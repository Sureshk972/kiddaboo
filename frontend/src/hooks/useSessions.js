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
      .is("cancelled_at", null)
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
      // TEMP DEBUG: have Postgres attempt the insert under the host's
      // session and report whether it works server-side via RPC.
      const { data: tryResult, error: tryErr } = await supabase.rpc("debug_try_session_insert", {
        p_playgroup_id: playgroupId,
      });
      // eslint-disable-next-line no-alert
      alert(
        `SERVER INSERT TEST\nresult: ${tryResult}\nrpc err: ${tryErr?.message || "none"}`
      );

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          playgroup_id: playgroupId,
          ...sessionData,
        })
        .select()
        .single();

      if (error) {
        // eslint-disable-next-line no-alert
        alert(
          `INSERT ERROR\nmessage: ${error.message}\ncode: ${error.code}\ndetails: ${error.details}\nhint: ${error.hint}`
        );
      }

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

  // Update an existing session. Mirrors cancelSession in shape: the
  // caller can pass hostUserId + sessionDateLabel so we post a system
  // message in the group chat when RSVP'd parents are affected by the
  // change. "What changed" is summarized by the caller, since it knows
  // which fields they edited.
  const updateSession = useCallback(
    async (sessionId, updates, { hostUserId, changeSummary } = {}) => {
      const { data, error } = await supabase
        .from("sessions")
        .update(updates)
        .eq("id", sessionId)
        .select()
        .single();

      if (error) return { error };

      setSessions((prev) => {
        const next = prev.map((s) => (s.id === sessionId ? data : s));
        return next.sort(
          (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
        );
      });

      if (playgroupId && hostUserId && changeSummary) {
        await supabase.from("messages").insert({
          sender_id: hostUserId,
          playgroup_id: playgroupId,
          content: `📅 Session updated. ${changeSummary}`,
        });
      }

      return { data, error: null };
    },
    [playgroupId]
  );

  // Count RSVPs on a session so the host can see who will be affected
  // before confirming a cancellation. "going" matches useRsvps — we
  // don't surface "maybe" / "can't" in the count because cancellation
  // only disrupts people who committed.
  const countRsvps = useCallback(async (sessionId) => {
    const { count } = await supabase
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "going");
    return count || 0;
  }, []);

  // Soft-cancel a session. Keeps the row + RSVPs (audit trail, future
  // review surfaces), and posts a system message in the group chat so
  // RSVP'd parents see the cancellation and any reason the host typed.
  // The chat message uses the host as sender — we don't have a system
  // identity and messages.sender_id is non-null, so attributing it to
  // the host is both accurate and the minimal schema change.
  const cancelSession = useCallback(
    async (sessionId, { reason, hostUserId, sessionDateLabel } = {}) => {
      const { error } = await supabase
        .from("sessions")
        .update({
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason?.trim() || null,
        })
        .eq("id", sessionId);

      if (error) return { error };

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      if (playgroupId && hostUserId) {
        const trimmed = reason?.trim();
        const body = trimmed
          ? `🚫 The ${sessionDateLabel || "upcoming"} session was cancelled. ${trimmed}`
          : `🚫 The ${sessionDateLabel || "upcoming"} session was cancelled.`;
        await supabase.from("messages").insert({
          sender_id: hostUserId,
          playgroup_id: playgroupId,
          content: body,
        });
      }

      return { error: null };
    },
    [playgroupId]
  );

  // The next upcoming session (first in the sorted list)
  const nextSession = sessions.length > 0 ? sessions[0] : null;

  return {
    sessions,
    nextSession,
    loading,
    createSession,
    updateSession,
    cancelSession,
    countRsvps,
    refetch: fetchSessions,
  };
}

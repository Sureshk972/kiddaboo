import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 50;

// Mirror of useGroupMessages, scoped to a single session. Filters
// messages on session_id (vs playgroup_id) so the host and attendees
// of a specific session get their own thread separate from the
// playgroup-wide chat. The session row carries playgroup_id, which
// we need on insert because messages.playgroup_id is NOT NULL.
export default function useSessionMessages(sessionId, playgroupId, userId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const oldestRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, created_at, sender_id, profiles:sender_id ( first_name, last_name, photo_url )"
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!error && data) {
        const reversed = data.reverse();
        setMessages(reversed);
        setHasMore(data.length === PAGE_SIZE);
        if (reversed.length > 0) {
          oldestRef.current = reversed[0].created_at;
        }
      }

      setLoading(false);
    };

    fetchMessages();
  }, [sessionId, userId]);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase
      .channel(`session-messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;

            supabase
              .from("profiles")
              .select("first_name, last_name, photo_url")
              .eq("id", payload.new.sender_id)
              .single()
              .then(({ data: profile }) => {
                setMessages((prev2) => {
                  const existing = prev2.find((m) => m.id === payload.new.id);
                  if (existing) {
                    if (!existing.profiles) {
                      return prev2.map((m) =>
                        m.id === payload.new.id ? { ...m, profiles: profile } : m
                      );
                    }
                    return prev2;
                  }
                  return [...prev2, { ...payload.new, profiles: profile }];
                });
              });

            return [...prev, { ...payload.new, profiles: null }];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId, userId]);

  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim() || sending) return false;
      if (!playgroupId) return false;

      setSending(true);
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        playgroup_id: playgroupId,
        session_id: sessionId,
        content: content.trim(),
      });
      setSending(false);
      return !error;
    },
    [sessionId, playgroupId, userId, sending]
  );

  const loadMore = useCallback(async () => {
    if (!oldestRef.current || !hasMore) return;

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, content, created_at, sender_id, profiles:sender_id ( first_name, last_name, photo_url )"
      )
      .eq("session_id", sessionId)
      .lt("created_at", oldestRef.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("Failed to load more session messages:", error);
      return;
    }

    if (data && data.length > 0) {
      const reversed = data.reverse();
      setMessages((prev) => [...reversed, ...prev]);
      oldestRef.current = reversed[0].created_at;
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [sessionId, hasMore]);

  return { messages, loading, sending, hasMore, sendMessage, loadMore };
}

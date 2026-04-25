import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const PAGE_SIZE = 50;

export default function useGroupMessages(playgroupId, userId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const oldestRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    if (!playgroupId || !userId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, created_at, sender_id, profiles:sender_id ( first_name, last_name, photo_url )"
        )
        .eq("playgroup_id", playgroupId)
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
  }, [playgroupId, userId]);

  // Realtime subscription
  useEffect(() => {
    if (!playgroupId || !userId) return;

    const channel = supabase
      .channel(`messages:${playgroupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `playgroup_id=eq.${playgroupId}`,
        },
        async (payload) => {
          // Side effects (the profile fetch) must not live inside a
          // setState updater — React 18 strict mode runs updaters
          // twice, so the fetch would fire twice per inbound message.
          // Instead: fetch the profile once, then setMessages once
          // with both the row and the profile attached.
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, photo_url")
            .eq("id", payload.new.sender_id)
            .single();

          setMessages((prev) => {
            // Don't duplicate if we sent it ourselves (optimistic
            // update already added the row) — instead, backfill the
            // profile if the optimistic row didn't have one.
            const existing = prev.find((m) => m.id === payload.new.id);
            if (existing) {
              if (!existing.profiles && profile) {
                return prev.map((m) =>
                  m.id === payload.new.id ? { ...m, profiles: profile } : m
                );
              }
              return prev;
            }
            return [...prev, { ...payload.new, profiles: profile }];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [playgroupId, userId]);

  // Send message
  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim() || sending) return;

      setSending(true);

      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        playgroup_id: playgroupId,
        content: content.trim(),
      });

      setSending(false);
      return !error;
    },
    [playgroupId, userId, sending]
  );

  // Load more (older messages)
  const loadMore = useCallback(async () => {
    if (!oldestRef.current || !hasMore) return;

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, content, created_at, sender_id, profiles:sender_id ( first_name, last_name, photo_url )"
      )
      .eq("playgroup_id", playgroupId)
      .lt("created_at", oldestRef.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("Failed to load more messages:", error);
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
  }, [playgroupId, hasMore]);

  return { messages, loading, sending, hasMore, sendMessage, loadMore };
}

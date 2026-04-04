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
          // Don't duplicate if we sent it ourselves (optimistic update)
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;

            // Fetch sender profile
            supabase
              .from("profiles")
              .select("first_name, last_name, photo_url")
              .eq("id", payload.new.sender_id)
              .single()
              .then(({ data: profile }) => {
                setMessages((prev2) => {
                  // Check again for duplicates
                  const existing = prev2.find((m) => m.id === payload.new.id);
                  if (existing) {
                    // Update with profile info if missing
                    if (!existing.profiles) {
                      return prev2.map((m) =>
                        m.id === payload.new.id
                          ? { ...m, profiles: profile }
                          : m
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

    const { data } = await supabase
      .from("messages")
      .select(
        "id, content, created_at, sender_id, profiles:sender_id ( first_name, last_name, photo_url )"
      )
      .eq("playgroup_id", playgroupId)
      .lt("created_at", oldestRef.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

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

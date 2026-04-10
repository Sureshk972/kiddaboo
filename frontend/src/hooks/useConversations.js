import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function useConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Get all playgroups user is creator or member of
    const { data: memberships, error } = await supabase
      .from("memberships")
      .select(`
        playgroup_id,
        role,
        playgroups:playgroup_id !inner (
          id, name, photos, is_active,
          profiles:creator_id ( first_name, last_name, photo_url )
        )
      `)
      .eq("user_id", userId)
      .eq("playgroups.is_active", true)
      .in("role", ["creator", "member"]);

    if (error || !memberships) {
      setLoading(false);
      return;
    }

    // For each playgroup, get the latest message
    try {
      const convos = await Promise.all(
        memberships
          .filter((m) => m.playgroups)
          .map(async (m) => {
            const pg = m.playgroups;

            // maybeSingle() — a brand-new playgroup with no messages yet
            // would 406 with .single() (expected exactly one row).
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("content, created_at, profiles:sender_id ( first_name )")
              .eq("playgroup_id", pg.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Count members — avoid HEAD count=exact (intermittent 503s
            // on cold load; same failure mode as BUG #1 in useNotifications).
            const { data: memberRows } = await supabase
              .from("memberships")
              .select("id")
              .eq("playgroup_id", pg.id)
              .in("role", ["creator", "member"]);

            return {
              playgroupId: pg.id,
              name: pg.name,
              photo: pg.photos?.[0] || null,
              role: m.role,
              memberCount: memberRows?.length || 0,
              lastMessage: lastMsg?.content || null,
              lastSender: lastMsg?.profiles?.first_name || null,
              lastMessageAt: lastMsg?.created_at || null,
            };
          })
      );

      // Sort by last message time (most recent first), no-message groups at bottom
      convos.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });

      setConversations(convos);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [userId]);

  // Realtime: listen for new messages to update previews
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("user-conversations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Refetch conversations to update last message preview
          fetchConversations();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  return { conversations, loading };
}

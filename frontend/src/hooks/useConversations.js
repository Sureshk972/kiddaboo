import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getLastReadMap } from "./useNotifications";

// Floor per-group unread lookback. Anything older than this isn't
// worth surfacing as a badge on the inbox card, and it bounds the
// range query for brand-new users who have no last-read markers yet.
// Matches the 30-day window used by the global notifications bell.
const UNREAD_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

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

      // Per-group unread counts (#23). Same technique as
      // useNotifications.fetchCounts: one range query over messages
      // that belong to any of my groups, are not from me, and are
      // newer than the earliest cutoff across all groups. Then bucket
      // client-side against each group's last-read marker. One query
      // per inbox render, not one per group.
      const lastReadMap = getLastReadMap();
      const pgIds = convos.map((c) => c.playgroupId);
      const unreadByGroup = Object.create(null);
      for (const id of pgIds) unreadByGroup[id] = 0;

      if (pgIds.length > 0) {
        const thirtyDaysAgo = new Date(Date.now() - UNREAD_LOOKBACK_MS).toISOString();
        const cutoffs = pgIds.map((id) => lastReadMap[id] || thirtyDaysAgo);
        const globalCutoff = cutoffs.reduce((a, b) => (a < b ? a : b));

        const { data: recent, error: recentErr } = await supabase
          .from("messages")
          .select("playgroup_id, created_at")
          .in("playgroup_id", pgIds)
          .neq("sender_id", userId)
          .gt("created_at", globalCutoff)
          .order("created_at", { ascending: false })
          .limit(500);

        if (recentErr) {
          console.error("useConversations: failed to fetch recent messages for unread counts", recentErr);
        } else {
          for (const msg of recent || []) {
            const lr = lastReadMap[msg.playgroup_id] || thirtyDaysAgo;
            if (msg.created_at > lr) {
              unreadByGroup[msg.playgroup_id] = (unreadByGroup[msg.playgroup_id] || 0) + 1;
            }
          }
        }
      }

      for (const c of convos) {
        c.unreadCount = unreadByGroup[c.playgroupId] || 0;
      }

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

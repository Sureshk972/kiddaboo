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
  // Stable sorted-and-joined playgroup id list. Used as the dep key
  // for the realtime subscription so we can scope it to just the
  // groups the current user actually belongs to (#25). Stored as a
  // string so referentially-stable diffing plays nicely with
  // useEffect's dep comparison.
  const [pgIdsKey, setPgIdsKey] = useState("");

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
      // Update the dep key for the realtime subscription. Sort so the
      // key is stable regardless of convos ordering above — we only
      // want to re-subscribe when the *set* of groups changes, not
      // when sort order flips.
      const nextKey = [...pgIds].sort().join(",");
      setPgIdsKey((prev) => (prev === nextKey ? prev : nextKey));
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [userId]);

  // Realtime: listen for new messages to update previews. Scope the
  // subscription to the user's own groups (#25) — previously this
  // had no filter, so every message inserted *anywhere* on the
  // platform triggered a full refetch for every user with the inbox
  // open. RLS blocked *reading* the foreign messages, but the
  // realtime notification still fired and the callback still ran.
  //
  // We re-subscribe whenever the set of groups changes (tracked via
  // the stable sorted-join pgIdsKey). No groups → no subscription;
  // the inbox just won't live-update, which is fine because there's
  // nothing to update.
  useEffect(() => {
    if (!userId || !pgIdsKey) return;

    const channel = supabase
      .channel(`user-conversations:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `playgroup_id=in.(${pgIdsKey})`,
        },
        async (payload) => {
          // Patch the affected conversation in place rather than
          // refetching every membership + per-group last-message +
          // per-group member count. The previous approach issued
          // 1 + 2N queries on every inbound message.
          const msg = payload.new;
          let senderFirstName = null;
          if (msg.sender_id && msg.sender_id !== userId) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("first_name")
              .eq("id", msg.sender_id)
              .maybeSingle();
            senderFirstName = prof?.first_name || null;
          }

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.playgroupId === msg.playgroup_id);
            if (idx === -1) return prev;

            const updated = {
              ...prev[idx],
              lastMessage: msg.content,
              lastSender: senderFirstName,
              lastMessageAt: msg.created_at,
              unreadCount:
                msg.sender_id !== userId
                  ? (prev[idx].unreadCount || 0) + 1
                  : prev[idx].unreadCount || 0,
            };

            const next = [...prev];
            next[idx] = updated;
            next.sort((a, b) => {
              if (!a.lastMessageAt && !b.lastMessageAt) return 0;
              if (!a.lastMessageAt) return 1;
              if (!b.lastMessageAt) return -1;
              return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
            });
            return next;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pgIdsKey]);

  return { conversations, loading };
}

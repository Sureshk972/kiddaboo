import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const LAST_READ_KEY = "kiddaboo_last_read";

function getLastReadMap() {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || "{}");
  } catch {
    return {};
  }
}

export function markChatRead(playgroupId) {
  const map = getLastReadMap();
  map[playgroupId] = new Date().toISOString();
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
}

export default function useNotifications(userId) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!userId) return;

    // 1. Pending join requests — playgroups where user is creator
    const { data: hosted } = await supabase
      .from("memberships")
      .select("playgroup_id")
      .eq("user_id", userId)
      .eq("role", "creator");

    if (hosted && hosted.length > 0) {
      const pgIds = hosted.map((h) => h.playgroup_id);
      const { count } = await supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .in("playgroup_id", pgIds)
        .eq("role", "pending");
      setPendingRequests(count || 0);
    } else {
      setPendingRequests(0);
    }

    // 2. Unread messages — groups where user is creator or member
    const { data: myGroups } = await supabase
      .from("memberships")
      .select("playgroup_id")
      .eq("user_id", userId)
      .in("role", ["creator", "member"]);

    if (myGroups && myGroups.length > 0) {
      const lastReadMap = getLastReadMap();
      let totalUnread = 0;

      await Promise.all(
        myGroups.map(async (m) => {
          const lastRead = lastReadMap[m.playgroup_id];
          let query = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("playgroup_id", m.playgroup_id)
            .neq("sender_id", userId); // don't count own messages

          if (lastRead) {
            query = query.gt("created_at", lastRead);
          }

          const { count } = await query;
          totalUnread += count || 0;
        })
      );

      setUnreadMessages(totalUnread);
    } else {
      setUnreadMessages(0);
    }
  }, [userId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime: listen for new messages and membership changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => fetchCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memberships" },
        () => fetchCounts()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, fetchCounts]);

  return { unreadMessages, pendingRequests, refetch: fetchCounts };
}

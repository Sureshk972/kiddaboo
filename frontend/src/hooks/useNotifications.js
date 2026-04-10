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
      const pgIds = myGroups.map((g) => g.playgroup_id);

      // Single range query instead of N parallel HEAD count=exact requests.
      // The old approach fired one `HEAD /messages?count=exact` per playgroup,
      // which intermittently 503'd on cold load and scaled linearly with group
      // count. We instead pull recent non-own messages for ALL my groups in
      // one shot and bucket client-side against each group's last-read marker.
      //
      // Floor the lookback at 30 days. Anything older than that is not worth
      // surfacing as an unread badge, and it bounds the query for brand-new
      // users who have no last-read markers at all.
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

      // Earliest cutoff across all groups. Groups with no last-read marker
      // fall back to 30 days ago.
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
        console.error("useNotifications: failed to fetch recent messages", recentErr);
        setUnreadMessages(0);
      } else {
        let totalUnread = 0;
        for (const msg of recent || []) {
          const lr = lastReadMap[msg.playgroup_id] || thirtyDaysAgo;
          if (msg.created_at > lr) totalUnread++;
        }
        setUnreadMessages(totalUnread);
      }
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

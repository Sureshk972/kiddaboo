import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export default function useBlocks(userId) {
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchBlocks = async () => {
      const { data, error } = await supabase
        .from("blocks")
        .select("blocked_user_id")
        .eq("blocker_id", userId);

      if (error) {
        console.error("Failed to fetch blocks:", error);
      }
      if (data) {
        setBlockedIds(new Set(data.map((b) => b.blocked_user_id)));
      }
      setLoading(false);
    };

    fetchBlocks();
  }, [userId]);

  const blockUser = useCallback(
    async (blockedUserId) => {
      if (!userId) return { error: "Not authenticated" };

      const { error } = await supabase.from("blocks").insert({
        blocker_id: userId,
        blocked_user_id: blockedUserId,
      });

      if (!error) {
        setBlockedIds((prev) => new Set([...prev, blockedUserId]));
      }
      return { error };
    },
    [userId]
  );

  const unblockUser = useCallback(
    async (blockedUserId) => {
      if (!userId) return { error: "Not authenticated" };

      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_user_id", blockedUserId);

      if (!error) {
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(blockedUserId);
          return next;
        });
      }
      return { error };
    },
    [userId]
  );

  const isBlocked = useCallback(
    (id) => blockedIds.has(id),
    [blockedIds]
  );

  const submitReport = useCallback(
    async ({ reportedUserId, reportType, context, relatedId, description }) => {
      if (!userId) return { error: "Not authenticated" };

      const { error } = await supabase.from("reports").insert({
        reporter_id: userId,
        reported_user_id: reportedUserId,
        report_type: reportType,
        context: context || null,
        related_id: relatedId || null,
        description: description || null,
      });

      return { error };
    },
    [userId]
  );

  return {
    blockedIds,
    loading,
    blockUser,
    unblockUser,
    isBlocked,
    submitReport,
  };
}

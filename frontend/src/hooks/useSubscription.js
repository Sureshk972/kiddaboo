import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const FREE_JOIN_LIMIT = 1;

export function useSubscription() {
  const { user } = useAuth();
  const [joinerSub, setJoinerSub] = useState(null);
  const [hostSub, setHostSub] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchSubscriptions();
    fetchUsage();
  }, [user]);

  async function fetchSubscriptions() {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to fetch subscriptions:", error);
    }
    const now = new Date();
    const subs = data || [];

    const activeJoiner = subs.find(
      (s) => s.type === "joiner" && s.status === "active" && new Date(s.current_period_end) > now
    );
    const activeHost = subs.find(
      (s) => s.type === "host_premium" && s.status === "active" && new Date(s.current_period_end) > now
    );

    setJoinerSub(activeJoiner || null);
    setHostSub(activeHost || null);
    setLoading(false);
  }

  async function fetchUsage() {
    const month = new Date().toISOString().slice(0, 7); // '2026-04'
    const { data, error } = await supabase
      .from("join_request_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .single();

    if (error) {
      console.error("Failed to fetch usage:", error);
    }
    setUsage(data || { request_count: 0 });
  }

  async function incrementUsage() {
    const month = new Date().toISOString().slice(0, 7);
    const currentCount = usage?.request_count || 0;

    const { data, error } = await supabase
      .from("join_request_usage")
      .upsert(
        {
          user_id: user.id,
          month,
          request_count: currentCount + 1,
        },
        { onConflict: "user_id,month" }
      )
      .select()
      .single();

    if (!error && data) {
      setUsage(data);
    }
    return { data, error };
  }

  // Joiner premium (backward compatible)
  const isPremium = !!joinerSub;
  const isJoinerPremium = isPremium;

  // Host premium
  const isHostPremium = !!hostSub;

  const joinRequestsUsed = usage?.request_count || 0;
  const joinRequestsRemaining = isPremium ? Infinity : Math.max(0, FREE_JOIN_LIMIT - joinRequestsUsed);
  const canSendJoinRequest = isPremium || joinRequestsRemaining > 0;

  return {
    // Joiner
    subscription: joinerSub,
    isPremium,
    isJoinerPremium,
    joinRequestsUsed,
    joinRequestsRemaining,
    joinRequestLimit: FREE_JOIN_LIMIT,
    canSendJoinRequest,
    incrementUsage,

    // Host
    hostSubscription: hostSub,
    isHostPremium,

    // General
    loading,
    refresh: fetchSubscriptions,
  };
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const FREE_JOIN_LIMIT = 3;

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchSubscription();
    fetchUsage();
  }, [user]);

  async function fetchSubscription() {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data && data.status === "active" && new Date(data.current_period_end) > new Date()) {
      setSubscription(data);
    } else {
      setSubscription(null);
    }
    setLoading(false);
  }

  async function fetchUsage() {
    const month = new Date().toISOString().slice(0, 7); // '2026-04'
    const { data } = await supabase
      .from("join_request_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .single();

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

  const isPremium = !!subscription;
  const joinRequestsUsed = usage?.request_count || 0;
  const joinRequestsRemaining = isPremium ? Infinity : Math.max(0, FREE_JOIN_LIMIT - joinRequestsUsed);
  const canSendJoinRequest = isPremium || joinRequestsRemaining > 0;

  return {
    subscription,
    isPremium,
    loading,
    joinRequestsUsed,
    joinRequestsRemaining,
    joinRequestLimit: FREE_JOIN_LIMIT,
    canSendJoinRequest,
    incrementUsage,
    refresh: fetchSubscription,
  };
}

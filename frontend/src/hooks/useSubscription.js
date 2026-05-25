import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Mirror of FREE_JOIN_LIMIT in supabase/functions/submit-join-request/index.ts.
// The server is authoritative — this constant only drives the UI's
// "X requests left" copy. If you change one, change the other.
const FREE_JOIN_LIMIT = 1;

export function useSubscription() {
  const { user, profile } = useAuth();
  const [joinerSub, setJoinerSub] = useState(null);
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

    setJoinerSub(activeJoiner || null);
    setLoading(false);
  }

  async function fetchUsage() {
    const month = new Date().toISOString().slice(0, 7); // '2026-04'
    // Use maybeSingle() — a free user who hasn't made any join requests
    // this month has no row in join_request_usage. .single() would return
    // a 406 for that (expected "exactly one row"); .maybeSingle() returns
    // null gracefully.
    const { data, error } = await supabase
      .from("join_request_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();

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

  // Hosts get the full feature suite for free — no paid host tier.
  // Gate on account_type so organizers get full features the moment
  // they sign up, before they've created their first playgroup.
  const isHostPremium = profile?.account_type === "organizer";

  const joinRequestsUsed = usage?.request_count || 0;
  const joinRequestsRemaining = isPremium ? Infinity : Math.max(0, FREE_JOIN_LIMIT - joinRequestsUsed);
  const canSendJoinRequest = (isPremium || joinRequestsRemaining > 0) && !!profile?.is_phone_verified;

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

    // Host — no paid tier; all hosts get full features.
    hostSubscription: null,
    isHostPremium,

    // General
    loading,
    refresh: fetchSubscriptions,
  };
}

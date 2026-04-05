import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function useReviews(playgroupId) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    if (!playgroupId) return;

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        profiles:reviewer_id ( first_name, last_name )
      `)
      .eq("playgroup_id", playgroupId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews(
        data.map((r) => {
          const first = r.profiles?.first_name || "User";
          const last = r.profiles?.last_name || "";
          return {
            ...r,
            reviewer_name: `${first} ${last}`.trim(),
            reviewer_initials:
              (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase(),
          };
        })
      );
    }
    setLoading(false);
  }, [playgroupId]);

  // Initial fetch
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Realtime subscription
  useEffect(() => {
    if (!playgroupId) return;

    const channel = supabase
      .channel(`reviews:${playgroupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `playgroup_id=eq.${playgroupId}`,
        },
        () => fetchReviews()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [playgroupId, fetchReviews]);

  // Compute aggregate ratings
  const ratings = reviews.length > 0
    ? {
        environment:
          reviews.reduce((s, r) => s + r.rating_environment, 0) / reviews.length,
        organization:
          reviews.reduce((s, r) => s + r.rating_organization, 0) / reviews.length,
        compatibility:
          reviews.reduce((s, r) => s + r.rating_compatibility, 0) / reviews.length,
        reliability:
          reviews.reduce((s, r) => s + r.rating_reliability, 0) / reviews.length,
        overall:
          reviews.reduce(
            (s, r) =>
              s +
              (r.rating_environment +
                r.rating_organization +
                r.rating_compatibility +
                r.rating_reliability) /
                4,
            0
          ) / reviews.length,
        count: reviews.length,
      }
    : { environment: 0, organization: 0, compatibility: 0, reliability: 0, overall: 0, count: 0 };

  // Find past sessions the current user can review
  const [reviewableSessions, setReviewableSessions] = useState([]);

  useEffect(() => {
    if (!playgroupId || !user) {
      setReviewableSessions([]);
      return;
    }

    const fetchReviewable = async () => {
      // Get past sessions for this playgroup
      const { data: pastSessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("playgroup_id", playgroupId)
        .lt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: false });

      if (!pastSessions || pastSessions.length === 0) {
        setReviewableSessions([]);
        return;
      }

      // Get sessions this user already reviewed
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("session_id")
        .eq("reviewer_id", user.id)
        .eq("playgroup_id", playgroupId);

      const reviewedSessionIds = new Set(
        (existingReviews || []).map((r) => r.session_id)
      );

      // Filter to sessions not yet reviewed
      setReviewableSessions(
        pastSessions.filter((s) => !reviewedSessionIds.has(s.id))
      );
    };

    fetchReviewable();
  }, [playgroupId, user, reviews]); // re-run when reviews change

  // Submit a new review
  const submitReview = useCallback(
    async (reviewData) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          playgroup_id: playgroupId,
          reviewer_id: user.id,
          ...reviewData,
        })
        .select(`
          *,
          profiles:reviewer_id ( first_name, last_name )
        `)
        .single();

      if (!error && data) {
        const first = data.profiles?.first_name || "User";
        const last = data.profiles?.last_name || "";
        const enriched = {
          ...data,
          reviewer_name: `${first} ${last}`.trim(),
          reviewer_initials:
            (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase(),
        };
        setReviews((prev) => [enriched, ...prev]);
      }

      return { data, error };
    },
    [playgroupId, user]
  );

  // Update an existing review
  const updateReview = useCallback(async (reviewId, updates) => {
    const { data, error } = await supabase
      .from("reviews")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", reviewId)
      .select()
      .single();

    if (!error) {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...data } : r))
      );
    }

    return { data, error };
  }, []);

  // Delete a review
  const deleteReview = useCallback(async (reviewId) => {
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (!error) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    }

    return { error };
  }, []);

  return {
    reviews,
    ratings,
    reviewableSessions,
    loading,
    submitReview,
    updateReview,
    deleteReview,
    refetch: fetchReviews,
  };
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useSubscription } from "../../hooks/useSubscription";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

// Helper: time ago string
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Format a day key as "Mon", "Tue", etc.
function dayLabel(date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export default function HostInsights() {
  useDocumentTitle("Host Insights"); // #50
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isHostPremium } = useSubscription();

  const [playgroup, setPlaygroup] = useState(null);
  const [loading, setLoading] = useState(true);

  // Analytics state
  const [viewsThisWeek, setViewsThisWeek] = useState(0);
  const [viewsLastWeek, setViewsLastWeek] = useState(0);
  const [dailyViews, setDailyViews] = useState([]); // last 7 days
  const [recentViewers, setRecentViewers] = useState([]);

  // Funnel state (all hosts see these — derived from memberships)
  const [funnel, setFunnel] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
    waitlisted: 0,
    total: 0,
    // #45: weekly counts, scoped to the last 7 days, so the view→request
    // conversion metric below divides against viewsThisWeek on the same
    // time window instead of mixing all-time requests with 7-day views.
    weeklyRequests: 0,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const load = async () => {
      // Find the host's active playgroup
      const { data: pgs } = await supabase
        .from("playgroups")
        .select("*")
        .eq("creator_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!pgs || pgs.length === 0) {
        setLoading(false);
        return;
      }
      const pg = pgs[0];
      setPlaygroup(pg);

      // Funnel — memberships by role. We also pull created_at so the
      // view→request conversion ratio below can be scoped to the same
      // 7-day window as viewsThisWeek (#45).
      const { data: memberships } = await supabase
        .from("memberships")
        .select("role, created_at")
        .eq("playgroup_id", pg.id);

      if (memberships) {
        const weekAgoMs = Date.now() - 7 * 86400000;
        const counts = {
          pending: 0,
          approved: 0,
          declined: 0,
          waitlisted: 0,
          total: memberships.length,
          weeklyRequests: 0,
        };
        memberships.forEach((m) => {
          if (m.role === "pending") counts.pending += 1;
          else if (m.role === "member" || m.role === "creator") counts.approved += 1;
          else if (m.role === "declined") counts.declined += 1;
          else if (m.role === "waitlisted") counts.waitlisted += 1;

          // Only count actual join attempts within the last 7 days. The
          // "creator" role is excluded — the host is not a viewer-turned-
          // requester.
          const createdAtMs = new Date(m.created_at).getTime();
          const isRequestAttempt =
            m.role === "pending" ||
            m.role === "member" ||
            m.role === "declined" ||
            m.role === "waitlisted";
          if (isRequestAttempt && createdAtMs >= weekAgoMs) {
            counts.weeklyRequests += 1;
          }
        });
        setFunnel(counts);
      }

      // View analytics — only pull data if the user is premium; free tier sees blurred zeros
      if (isHostPremium) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

        // Single GET over the past two weeks — bucket client-side.
        // Avoids HEAD count=exact (intermittent 503s; see BUG #1 notes).
        const { data: twoWeekData } = await supabase
          .from("playgroup_views")
          .select("viewed_at, profiles:viewer_id(first_name, last_name)")
          .eq("playgroup_id", pg.id)
          .gte("viewed_at", twoWeeksAgo.toISOString())
          .order("viewed_at", { ascending: false });

        const weekAgoMs = weekAgo.getTime();
        const windowData = (twoWeekData || []).filter(
          (v) => new Date(v.viewed_at).getTime() >= weekAgoMs
        );
        const lastWeekCount = (twoWeekData || []).length - windowData.length;

        setViewsThisWeek(windowData.length);
        setViewsLastWeek(lastWeekCount);

        // Build a 7-day bucket
        const buckets = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          d.setHours(0, 0, 0, 0);
          return { date: d, label: dayLabel(d), count: 0 };
        });
        (windowData || []).forEach((v) => {
          const vd = new Date(v.viewed_at);
          vd.setHours(0, 0, 0, 0);
          const bucket = buckets.find((b) => b.date.getTime() === vd.getTime());
          if (bucket) bucket.count += 1;
        });
        setDailyViews(buckets);

        setRecentViewers(
          (windowData || []).slice(0, 10).map((v) => ({
            name:
              `${v.profiles?.first_name || ""} ${v.profiles?.last_name || ""}`.trim() ||
              "Someone",
            viewedAt: v.viewed_at,
          }))
        );
      }

      setLoading(false);
    };
    load();
  }, [user, isHostPremium]);

  const header = (
    <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
      <div className="max-w-md mx-auto px-5 pt-4 pb-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'ChunkFive', serif", color: "#5C6B52" }}
          >
            Kiddaboo
          </h1>
          {isHostPremium ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#D97706">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Premium
            </span>
          ) : (
            <button
              onClick={() => navigate("/host/premium")}
              className="flex items-center gap-1 text-[11px] font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-full px-3 py-1.5 cursor-pointer border-none hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm flex-shrink-0"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Go Premium
            </button>
          )}
        </div>
        <p className="text-[11px] text-taupe uppercase tracking-wide">Insights</p>
        <h2 className="text-lg font-heading font-bold text-charcoal truncate">
          {loading ? "Loading…" : playgroup ? playgroup.name : "No playgroup yet"}
        </h2>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-cream flex-1 flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!playgroup) {
    return (
      <div className="bg-cream flex-1 flex flex-col">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h2 className="font-heading font-bold text-charcoal text-xl mb-2">
            Nothing to measure yet
          </h2>
          <p className="text-taupe text-sm mb-6">
            Create a playgroup to start seeing insights about who&apos;s viewing it and how
            it&apos;s growing.
          </p>
          <button
            onClick={() => navigate("/host/create")}
            className="bg-sage text-white font-medium rounded-2xl px-6 py-3 cursor-pointer border-none"
          >
            Organize a Playgroup
          </button>
        </div>
      </div>
    );
  }

  // Week-over-week delta
  const weekDelta = viewsThisWeek - viewsLastWeek;
  const weekDeltaPct =
    viewsLastWeek > 0 ? Math.round((weekDelta / viewsLastWeek) * 100) : null;

  // Conversion metrics — #45: numerator is now weekly requests (same
  // 7-day window as viewsThisWeek) so this ratio can't exceed 100% the
  // way it used to when all-time memberships were divided by weekly views.
  const viewToRequest =
    viewsThisWeek > 0
      ? Math.min(100, Math.round((funnel.weeklyRequests / viewsThisWeek) * 100))
      : 0;
  const requestToApproved =
    funnel.pending + funnel.approved + funnel.declined > 0
      ? Math.round(
          (funnel.approved / (funnel.pending + funnel.approved + funnel.declined)) * 100
        )
      : 0;

  // Max for the bar chart
  const maxDaily = Math.max(1, ...dailyViews.map((d) => d.count));

  return (
    <div className="bg-cream">
      {header}

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-5">
        {/* Hero view count + week-over-week */}
        <div className="bg-white rounded-2xl border border-cream-dark p-5 relative overflow-hidden">
          {!isHostPremium && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-lg border border-amber-200 px-5 py-4 max-w-[260px] text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#D97706">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  <p className="text-xs font-bold text-amber-700">Premium Insights</p>
                </div>
                <p className="text-xs text-taupe mb-3 leading-relaxed">
                  See who&apos;s viewing your playgroup, how traffic is trending, and which
                  days drive the most interest.
                </p>
                <button
                  onClick={() => navigate("/host/premium")}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold rounded-xl py-2 cursor-pointer border-none hover:from-amber-600 hover:to-amber-700 transition-all"
                >
                  Unlock for $4.99/mo
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-taupe uppercase tracking-wide font-medium mb-1">
            Views this week
          </p>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-heading font-bold text-charcoal">
              {isHostPremium ? viewsThisWeek : "—"}
            </p>
            {isHostPremium && weekDeltaPct !== null && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  weekDelta >= 0
                    ? "text-sage-dark bg-sage-light"
                    : "text-terracotta bg-terracotta-light/40"
                }`}
              >
                {weekDelta >= 0 ? "↑" : "↓"} {Math.abs(weekDeltaPct)}% vs last week
              </span>
            )}
            {isHostPremium && weekDeltaPct === null && viewsThisWeek > 0 && (
              <span className="text-xs text-taupe">new data</span>
            )}
          </div>

          {/* Mini daily bar chart */}
          <div className="mt-4 flex items-end justify-between gap-1.5 h-20">
            {(isHostPremium ? dailyViews : Array.from({ length: 7 })).map((d, i) => {
              const count = d?.count ?? Math.floor(Math.random() * 5) + 1; // placeholder bars for free
              const height = `${(count / maxDaily) * 100}%`;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-sage-light rounded-t-md"
                      style={{ height }}
                    />
                  </div>
                  <span className="text-[9px] text-taupe/60">
                    {d?.label || ["M", "T", "W", "T", "F", "S", "S"][i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion funnel */}
        <div>
          <h3 className="text-base font-heading font-bold text-charcoal mb-3">
            Conversion
          </h3>
          <div className="bg-white rounded-2xl border border-cream-dark p-5 flex flex-col gap-4">
            {/* Views */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-light flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke="#5C6B52"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="12" r="3" stroke="#5C6B52" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal">Profile views</p>
                  <p className="text-[11px] text-taupe">This week</p>
                </div>
              </div>
              <p className="text-xl font-heading font-bold text-charcoal">
                {isHostPremium ? viewsThisWeek : "—"}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-2 text-[11px] text-taupe pl-4">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M19 12l-7 7-7-7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                {isHostPremium && viewsThisWeek > 0
                  ? `${viewToRequest}% of viewers requested to join`
                  : "of viewers requested to join"}
              </span>
            </div>

            {/* Requests */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-terracotta-light/40 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                      stroke="#C07A5C"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal">Join requests</p>
                  <p className="text-[11px] text-taupe">All time</p>
                </div>
              </div>
              <p className="text-xl font-heading font-bold text-charcoal">
                {funnel.pending + funnel.approved + funnel.declined}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-2 text-[11px] text-taupe pl-4">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M19 12l-7 7-7-7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>{requestToApproved}% of requests approved</span>
            </div>

            {/* Approved */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage text-white flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal">Approved members</p>
                  <p className="text-[11px] text-taupe">
                    {funnel.pending > 0 && `${funnel.pending} pending · `}
                    {funnel.waitlisted > 0 && `${funnel.waitlisted} waitlisted`}
                    {funnel.pending === 0 && funnel.waitlisted === 0 && "Active"}
                  </p>
                </div>
              </div>
              <p className="text-xl font-heading font-bold text-charcoal">
                {funnel.approved}
              </p>
            </div>
          </div>
        </div>

        {/* Recent viewers — premium only */}
        <div className="relative">
          <h3 className="text-base font-heading font-bold text-charcoal mb-3">
            Recent viewers
          </h3>
          <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden relative">
            {!isHostPremium && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm px-6 text-center">
                <p className="text-xs text-taupe mb-3">
                  Premium hosts can see names of recent viewers.
                </p>
                <button
                  onClick={() => navigate("/host/premium")}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold rounded-xl px-4 py-2 cursor-pointer border-none hover:from-amber-600 hover:to-amber-700 transition-all"
                >
                  Unlock
                </button>
              </div>
            )}
            {isHostPremium && recentViewers.length > 0 ? (
              recentViewers.map((v, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-4 ${
                    i < recentViewers.length - 1 ? "border-b border-cream-dark" : ""
                  }`}
                >
                  <span className="text-sm text-charcoal">{v.name}</span>
                  <span className="text-[11px] text-taupe">{timeAgo(v.viewedAt)}</span>
                </div>
              ))
            ) : (
              // Blurred placeholders for free tier, real empty state for premium
              <>
                {["Alex M.", "Priya R.", "Jordan K.", "Sam T.", "Riya P."].map((name, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 ${
                      i < 4 ? "border-b border-cream-dark" : ""
                    }`}
                  >
                    <span className="text-sm text-charcoal">{name}</span>
                    <span className="text-[11px] text-taupe">{i + 1}h ago</span>
                  </div>
                ))}
                {isHostPremium && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-taupe">
                      No views yet this week. Share your playgroup to attract families!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tip card */}
        <div className="bg-sage-light/30 rounded-2xl border border-sage-light p-4 flex items-start gap-3">
          <span className="text-base flex-shrink-0">💡</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal mb-1">
              {viewToRequest < 10 && isHostPremium
                ? "Low view-to-request rate"
                : "Grow your playgroup"}
            </p>
            <p className="text-xs text-taupe leading-relaxed">
              {viewToRequest < 10 && isHostPremium
                ? "Try sharper photos and a clearer description to turn more views into requests."
                : "Post weekly on your social media, share the link with local parents, and keep photos fresh."}
            </p>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

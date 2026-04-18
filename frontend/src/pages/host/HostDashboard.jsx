import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useSubscription } from "../../hooks/useSubscription";
import RequestCard from "../../components/host/RequestCard";
import ScheduleSessionSheet from "../../components/host/ScheduleSessionSheet";
import CancelSessionSheet from "../../components/playgroup/CancelSessionSheet";
import useSessions from "../../hooks/useSessions";
import useReviews from "../../hooks/useReviews";
import RsvpCount from "../../components/host/RsvpCount";
import ReviewCard from "../../components/playgroup/ReviewCard";
import PlaygroupCard from "../../components/browse/PlaygroupCard";
import { transformPlaygroup } from "../../lib/playgroupTransform";
import { friendlyDate, formatSessionTime, formatDuration } from "../../lib/dateUtils";
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

export default function HostDashboard() {
  useDocumentTitle("Organizer Dashboard"); // #50
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Real data from Supabase
  const [realPlaygroup, setRealPlaygroup] = useState(null);
  const [realRequests, setRealRequests] = useState([]);
  const [realMembers, setRealMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  // #44: surface failures from approve/decline/waitlist mutations so the
  // host isn't left guessing when the optimistic state flips back.
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      // 1. Find the playgroup this user created
      const { data: playgroups, error: pgError } = await supabase
        .from("playgroups")
        .select("*")
        .eq("creator_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pgError || !playgroups || playgroups.length === 0) {
        setLoading(false);
        return;
      }

      const pg = playgroups[0];
      setRealPlaygroup(pg);

      // 2. Fetch all memberships for this playgroup with profile data
      const { data: memberships } = await supabase
        .from("memberships")
        .select(`
          id, user_id, role, intro_message, screening_answers, created_at, joined_at,
          profiles:user_id ( first_name, last_name, bio, philosophy_tags, photo_url, zip_code )
        `)
        .eq("playgroup_id", pg.id)
        .order("created_at", { ascending: false });

      if (memberships) {
        // Fetch children for all member user IDs
        const userIds = memberships.map((m) => m.user_id);
        const { data: allChildren } = await supabase
          .from("children")
          .select("user_id, name, age_range")
          .in("user_id", userIds);

        const childrenByUser = {};
        (allChildren || []).forEach((c) => {
          if (!childrenByUser[c.user_id]) childrenByUser[c.user_id] = [];
          childrenByUser[c.user_id].push(c);
        });

        // Split into pending requests and active members
        const pending = memberships
          .filter((m) => m.role === "pending")
          .map((m) => {
            const first = m.profiles?.first_name || "User";
            const last = m.profiles?.last_name || "";
            const initials =
              (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase();

            // Map screening_answers from {0: "answer", 1: "answer"} to [{question, answer}]
            const answers = (pg.screening_questions || []).map((q, i) => ({
              question: q,
              answer: m.screening_answers?.[i] || m.screening_answers?.[String(i)] || "",
            }));

            const kids = childrenByUser[m.user_id] || [];

            return {
              id: m.id,
              userId: m.user_id,
              name: `${first} ${last}`.trim(),
              initials,
              childrenAges: kids.map((c) => c.age_range ? `${c.name} (${c.age_range})` : c.name),
              philosophyTags: m.profiles?.philosophy_tags || [],
              bio: m.profiles?.bio || "",
              answers,
              requestedAt: timeAgo(m.created_at),
            };
          });

        const active = memberships
          .filter((m) => m.role === "member" || m.role === "creator")
          .map((m) => {
            const first = m.profiles?.first_name || "User";
            const last = m.profiles?.last_name || "";
            const kids = childrenByUser[m.user_id] || [];
            return {
              id: m.id,
              userId: m.user_id,
              name: `${first} ${last}`.trim(),
              initials:
                (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase(),
              role: m.role === "creator" ? "host" : "member",
              childrenAges: kids.map((c) => c.age_range ? `${c.name} (${c.age_range})` : c.name),
              bio: m.profiles?.bio || "",
              philosophyTags: m.profiles?.philosophy_tags || [],
              photoUrl: m.profiles?.photo_url || "",
              zipCode: m.profiles?.zip_code || "",
              joinedAt: m.joined_at
                ? new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : new Date(m.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            };
          });

        setRealRequests(pending);
        setRealMembers(active);
      }

      setLoading(false);
    };

    fetchDashboard();
  }, [user]);

  const [expandedRequest, setExpandedRequest] = useState(null);
  const [actionedIds, setActionedIds] = useState({});
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const { isHostPremium } = useSubscription();
  const [viewStats, setViewStats] = useState({ thisWeek: 0, recentViewers: [] });

  // Fetch view analytics for premium hosts
  useEffect(() => {
    if (!isHostPremium || !realPlaygroup) return;
    const fetchViews = async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, count } = await supabase
        .from("playgroup_views")
        .select("viewed_at, profiles:viewer_id(first_name, last_name)", { count: "exact" })
        .eq("playgroup_id", realPlaygroup.id)
        .gte("viewed_at", weekAgo)
        .order("viewed_at", { ascending: false })
        .limit(10);

      setViewStats({
        thisWeek: count || 0,
        recentViewers: (data || []).map((v) => ({
          name: `${v.profiles?.first_name || ""} ${v.profiles?.last_name || ""}`.trim() || "Someone",
          viewedAt: v.viewed_at,
        })),
      });
    };
    fetchViews();
  }, [isHostPremium, realPlaygroup]);

  // Session scheduling
  const {
    sessions,
    nextSession,
    createSession,
    cancelSession,
    countRsvps,
  } = useSessions(realPlaygroup?.id);

  // Cancel sheet state — keep the target session so the sheet can show
  // the date label and RSVP count without re-querying on every render.
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelRsvpCount, setCancelRsvpCount] = useState(0);

  const openCancelSheet = async (session) => {
    const count = await countRsvps(session.id);
    setCancelRsvpCount(count);
    setCancelTarget(session);
  };

  // Reviews
  const { reviews, ratings } = useReviews(realPlaygroup?.id);

  // Section refs for stat-card scroll-to-section CTAs
  const membersRef = useRef(null);
  const requestsRef = useRef(null);
  const reviewsRef = useRef(null);

  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const pg = realPlaygroup
    ? {
        ...realPlaygroup,
        memberCount: realMembers.filter((m) => m.role !== "host").length,
        trustScore: Number(realPlaygroup.trust_score) || 0,
        reviewCount: realPlaygroup.review_count || 0,
        location: realPlaygroup.location_name,
      }
    : {};

  const requests = realRequests;
  const members = realMembers.filter((m) => m.role !== "host");

  // #44: shared error-handling helper. On failure we roll back the
  // optimistic state AND surface the error to the host via the sticky
  // banner — old code only console.error'd.
  const rollback = (id, message) => {
    setActionedIds((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setDashboardError(message);
  };

  const handleApprove = async (id) => {
    const request = realRequests.find((r) => r.id === id);
    if (!request) return;
    const firstName = request.name.split(" ")[0] || "request";

    setActionedIds((prev) => ({ ...prev, [id]: "approved" }));
    setDashboardError("");

    const joinedAt = new Date().toISOString();
    const { error } = await supabase
      .from("memberships")
      .update({ role: "member", joined_at: joinedAt })
      .eq("id", id);
    if (error) {
      console.error("Failed to approve membership:", error);
      rollback(id, `Couldn't approve ${firstName}. ${error.message || "Please try again."}`);
      return;
    }

    // #44: promote the approved request into the local members list so
    // the Members section and the "X of Y families" stat card update
    // immediately, without waiting for a full refetch/navigation. We
    // leave the row in realRequests so the RequestCard still shows its
    // brief "approved" animation (activeRequests filters on actionedIds).
    setRealMembers((prev) => [
      ...prev,
      {
        id: request.id,
        userId: request.userId,
        name: request.name,
        initials: request.initials,
        role: "member",
        childrenAges: request.childrenAges,
        bio: request.bio || "",
        philosophyTags: request.philosophyTags || [],
        photoUrl: "",
        joinedAt: new Date(joinedAt).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      },
    ]);
  };

  const handleDecline = async (id) => {
    const request = realRequests.find((r) => r.id === id);
    const firstName = request?.name.split(" ")[0] || "request";

    setActionedIds((prev) => ({ ...prev, [id]: "declined" }));
    setDashboardError("");

    const { error } = await supabase.from("memberships").update({ role: "declined" }).eq("id", id);
    if (error) {
      console.error("Failed to decline membership:", error);
      rollback(id, `Couldn't decline ${firstName}. ${error.message || "Please try again."}`);
    }
  };

  const handleWaitlist = async (id) => {
    const request = realRequests.find((r) => r.id === id);
    const firstName = request?.name.split(" ")[0] || "request";

    setActionedIds((prev) => ({ ...prev, [id]: "waitlisted" }));
    setDashboardError("");

    const { error } = await supabase.from("memberships").update({ role: "waitlisted" }).eq("id", id);
    if (error) {
      console.error("Failed to waitlist membership:", error);
      rollback(id, `Couldn't waitlist ${firstName}. ${error.message || "Please try again."}`);
    }
  };

  const activeRequests = requests.filter((r) => !actionedIds[r.id]);

  const header = (
    <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
      <div className="max-w-md mx-auto px-5 pt-4 pb-3">
        {/* Brand row */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
              Kiddaboo
            </h1>
            {profile?.first_name && (
              <span className="text-sm font-medium text-taupe truncate">
                Hi, {profile.first_name} (Host)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isHostPremium ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#D97706">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                Premium
              </span>
            ) : (
              <button
                onClick={() => navigate("/host/premium")}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-full px-3 py-1.5 cursor-pointer border-none hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
                aria-label="Upgrade to Premium"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Go Premium
              </button>
            )}
            {profile && (
              <div
                className="w-9 h-9 rounded-full bg-sage-light flex items-center justify-center overflow-hidden cursor-pointer border-2 border-sage/30"
                onClick={() => navigate("/my-profile")}
                role="button"
                aria-label="Go to profile"
              >
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={`${profile.first_name}'s photo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-heading font-bold text-sage-dark">
                    {(profile.first_name?.[0] || "").toUpperCase()}
                    {(profile.last_name?.[0] || "").toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Playgroup name */}
        <div>
          <p className="text-[11px] text-taupe uppercase tracking-wide">Your playgroup</p>
          <h2 className="text-lg font-heading font-bold text-charcoal truncate">
            {loading ? "Loading…" : realPlaygroup ? pg.name : "No playgroup yet"}
          </h2>
        </div>
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

  if (!realPlaygroup) {
    return (
      <div className="bg-cream flex-1 flex flex-col">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h2 className="font-heading font-bold text-charcoal text-xl mb-2">
            No playgroup yet
          </h2>
          <p className="text-taupe text-sm mb-6">
            Create your first playgroup to see your dashboard.
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

  return (
    <div className="bg-cream">
      {header}

      {/* #44: sticky error banner — mirrors the Admin pattern. */}
      {dashboardError && (
        <div className="sticky top-[68px] z-20 px-5 pt-3">
          <div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm flex-1 leading-relaxed">{dashboardError}</p>
            <button
              type="button"
              onClick={() => setDashboardError("")}
              aria-label="Dismiss error"
              className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-0.5 shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-5">
        {/* How parents see you — preview card */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-heading font-bold text-charcoal">
                How parents see you
              </h3>
              <p className="text-[11px] text-taupe">
                This is your Browse listing
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/playgroup/${realPlaygroup.id}?preview=true`)}
              className="text-[11px] text-sage-dark font-medium bg-transparent border-none cursor-pointer underline underline-offset-2"
            >
              See full preview →
            </button>
          </div>
          <PlaygroupCard
            group={transformPlaygroup(realPlaygroup, 0, {
              hostFirstName: profile?.first_name,
              hostLastName: profile?.last_name,
              hostProfile: profile,
              memberCount: realMembers.filter((m) => m.role !== "host").length,
            })}
            premium={isHostPremium}
            onClick={() => navigate(`/playgroup/${realPlaygroup.id}?preview=true`)}
          />
        </div>

        {/* Stats row (each card is a CTA to its section below) */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => scrollToSection(membersRef)}
            aria-label="View members"
            className="bg-white rounded-2xl p-4 border border-cream-dark text-center cursor-pointer transition-all hover:border-sage-light hover:shadow-sm active:scale-[0.98]"
          >
            <p className="text-2xl font-heading font-bold text-charcoal">
              {pg.memberCount}
            </p>
            <p className="text-[11px] text-taupe mt-0.5">
              of {pg.max_families} families
            </p>
            <p className="text-[10px] text-sage font-medium mt-1">View →</p>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection(requestsRef)}
            aria-label="Review pending requests"
            className={`rounded-2xl p-4 border text-center cursor-pointer transition-all active:scale-[0.98] ${
              activeRequests.length > 0
                ? "bg-terracotta-light/40 border-terracotta-light hover:border-terracotta hover:shadow-sm"
                : "bg-white border-cream-dark hover:border-sage-light hover:shadow-sm"
            }`}
          >
            <p className="text-2xl font-heading font-bold text-charcoal">
              {activeRequests.length}
            </p>
            <p className="text-[11px] text-taupe mt-0.5">pending requests</p>
            <p className={`text-[10px] font-medium mt-1 ${activeRequests.length > 0 ? "text-terracotta" : "text-sage"}`}>
              {activeRequests.length > 0 ? "Review →" : "View →"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection(reviewsRef)}
            aria-label="Read reviews"
            className="bg-white rounded-2xl p-4 border border-cream-dark text-center cursor-pointer transition-all hover:border-sage-light hover:shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#5C6B52">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <p className="text-2xl font-heading font-bold text-charcoal">
                {ratings.count > 0 ? ratings.overall.toFixed(1) : "—"}
              </p>
            </div>
            <p className="text-[11px] text-taupe mt-0.5">
              {ratings.count} {ratings.count === 1 ? "review" : "reviews"}
            </p>
            <p className="text-[10px] text-sage font-medium mt-1">Read →</p>
          </button>
        </div>

        {/* Host Premium analytics / upsell */}
        {isHostPremium ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-heading font-bold text-charcoal flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" stroke="#D97706" strokeWidth="1.5" />
                </svg>
                Views This Week
              </h3>
              <span className="text-2xl font-heading font-bold text-amber-600">{viewStats.thisWeek}</span>
            </div>
            {viewStats.recentViewers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-taupe font-medium">Recent viewers</p>
                {viewStats.recentViewers.slice(0, 5).map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-charcoal">{v.name}</span>
                    <span className="text-xs text-taupe/60">{timeAgo(v.viewedAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-taupe">No views yet this week. Share your playgroup to attract families!</p>
            )}
          </div>
        ) : (
          <div
            className="relative bg-white rounded-2xl border border-cream-dark p-5 overflow-hidden cursor-pointer"
            onClick={() => navigate("/host/premium")}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-50/80 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-charcoal">Go Organizer Premium</p>
                <p className="text-xs text-taupe leading-relaxed">
                  Get a Premium badge, priority placement, and see who's viewing your group.
                </p>
              </div>
              <span className="text-amber-600 font-bold text-sm whitespace-nowrap">$4.99/mo</span>
            </div>
          </div>
        )}

        {/* Prominent CTA — hosts often miss the tiny "+ Add" inside the
            Next Session card header. Matches the visual weight of "Join
            Group" on PlaygroupDetail so adding sessions reads as the
            primary host action. Only shown when a session already exists
            — the empty state below already has its own full-width CTA. */}
        {nextSession && (
          <button
            onClick={() => setShowScheduleSheet(true)}
            className="w-full bg-sage-dark text-white font-bold text-sm rounded-2xl px-4 py-3 cursor-pointer border-none hover:bg-sage transition-colors flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 14V18M10 16H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add a Session
          </button>
        )}

        {/* Next session card */}
        {nextSession ? (
          <div className="bg-sage-light/30 rounded-2xl p-4 border border-sage-light">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-heading font-bold text-charcoal">
                Next Session
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openCancelSheet(nextSession)}
                  className="text-taupe/50 hover:text-terracotta transition-colors bg-transparent border-none cursor-pointer p-0.5"
                  title="Cancel session"
                  aria-label="Cancel session"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-taupe-dark mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {friendlyDate(nextSession.scheduled_at)} &middot; {formatSessionTime(nextSession.scheduled_at)}
            </div>
            <div className="flex items-center gap-2 text-sm text-taupe mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {formatDuration(nextSession.duration_minutes)}
            </div>
            <div className="flex items-center gap-2 text-sm text-taupe">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1" />
                <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
              </svg>
              {nextSession.location_name || pg.location || "Location TBD"}
            </div>
            {nextSession.notes && (
              <p className="text-xs text-taupe/70 mt-2 pl-[22px] italic">
                {nextSession.notes}
              </p>
            )}
            <RsvpCount sessionId={nextSession.id} />
          </div>
        ) : (
          <button
            onClick={() => setShowScheduleSheet(true)}
            className="bg-sage-light/30 rounded-2xl p-4 border border-sage-light border-dashed cursor-pointer w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#5C6B52" strokeWidth="1.5" />
                  <path d="M3 10H21" stroke="#5C6B52" strokeWidth="1.5" />
                  <path d="M8 2V6M16 2V6" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 14V18M10 16H14" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal">Schedule your first session</p>
                <p className="text-xs text-taupe">Tap to pick a date and time</p>
              </div>
            </div>
          </button>
        )

        }

        {/* Upcoming sessions list (if more than 1) */}
        {sessions.length > 1 && (
          <div>
            <h3 className="text-base font-heading font-bold text-charcoal mb-3">
              Upcoming Sessions
            </h3>
            <div className="flex flex-col gap-2">
              {sessions.slice(1, 4).map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl p-3 border border-cream-dark"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-sage-light rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="#5C6B52" strokeWidth="1.5" />
                          <path d="M3 10H21" stroke="#5C6B52" strokeWidth="1.5" />
                          <path d="M8 2V6M16 2V6" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {friendlyDate(session.scheduled_at)}
                        </p>
                        <p className="text-xs text-taupe">
                          {formatSessionTime(session.scheduled_at)} &middot; {formatDuration(session.duration_minutes)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openCancelSheet(session)}
                      className="text-taupe/40 hover:text-terracotta transition-colors bg-transparent border-none cursor-pointer p-1"
                      title="Cancel session"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <RsvpCount sessionId={session.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending requests */}
        <div ref={requestsRef} className="scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-heading font-bold text-charcoal">
              Join Requests
              {activeRequests.length > 0 && (
                <span className="ml-2 text-xs bg-terracotta-light text-taupe-dark px-2 py-0.5 rounded-full font-body font-normal">
                  {activeRequests.length} new
                </span>
              )}
            </h3>
          </div>

          {requests.length > 0 ? (
            <div className="flex flex-col gap-3">
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  isExpanded={expandedRequest === req.id}
                  onToggle={() =>
                    setExpandedRequest(
                      expandedRequest === req.id ? null : req.id
                    )
                  }
                  action={actionedIds[req.id]}
                  onApprove={() => handleApprove(req.id)}
                  onDecline={() => handleDecline(req.id)}
                  onWaitlist={() => handleWaitlist(req.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-cream-dark text-center">
              <p className="text-sm text-taupe">No pending requests</p>
            </div>
          )}
        </div>

        {/* Members */}
        <div ref={membersRef} className="scroll-mt-24">
          <h3 className="text-base font-heading font-bold text-charcoal mb-3">
            Members in Your Group
          </h3>
          <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
            {members.map((member, i) => (
              <div
                key={member.id}
                onClick={() => member.role !== "host" && setSelectedMember(member)}
                className={`flex items-center gap-3 p-4 ${
                  i < members.length - 1 ? "border-b border-cream-dark" : ""
                } ${member.role !== "host" ? "cursor-pointer hover:bg-cream/50 active:bg-cream transition-colors" : ""}`}
              >
                {/* Avatar */}
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      member.role === "host"
                        ? "bg-sage text-white"
                        : "bg-sage-light text-sage-dark"
                    }`}
                  >
                    <span className="text-xs font-bold">{member.initials}</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-charcoal">
                      {member.name}
                    </p>
                    {member.role === "host" && (
                      <span className="text-[10px] bg-sage-light text-sage-dark px-1.5 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-taupe">
                    Joined {member.joinedAt}
                  </p>
                </div>

                {/* Chevron for non-host members */}
                {member.role !== "host" && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A08C" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div ref={reviewsRef} className="scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-heading font-bold text-charcoal">
              Reviews
              {ratings.count > 0 && (
                <span className="ml-2 text-xs bg-sage-light text-sage-dark px-2 py-0.5 rounded-full font-body font-normal">
                  {ratings.overall.toFixed(1)} ★ · {ratings.count}
                </span>
              )}
            </h3>
          </div>
          {reviews.length > 0 ? (
            <div className="flex flex-col gap-3">
              {reviews.slice(0, 5).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              {reviews.length > 5 && (
                <p className="text-xs text-taupe text-center pt-1">
                  Showing 5 of {reviews.length} reviews
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-cream-dark text-center">
              <p className="text-sm text-taupe">
                No reviews yet. Your members will be able to leave a review after attending a session.
              </p>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <h3 className="text-base font-heading font-bold text-charcoal mb-3">
            Recent Activity
          </h3>
          {realRequests.length > 0 || realMembers.length > 1 ? (
            <div className="flex flex-col gap-2">
              {realRequests.map((req) => (
                <div
                  key={`req-${req.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl p-3 border border-cream-dark"
                >
                  <span className="text-base flex-shrink-0">📬</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-taupe-dark">{req.name} requested to join</p>
                  </div>
                  <span className="text-[10px] text-taupe/50 flex-shrink-0 whitespace-nowrap">
                    {req.requestedAt}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-cream-dark text-center">
              <p className="text-sm text-taupe">No activity yet. Share your playgroup to get started!</p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-base font-heading font-bold text-charcoal mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4C3.45 4 3 4.45 3 5V20C3 20.55 3.45 21 4 21H19C19.55 21 20 20.55 20 20V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                label: "Edit Group",
                onClick: () => realPlaygroup && navigate(`/host/edit/${realPlaygroup.id}`),
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 14V18M10 16H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                label: "Schedule Session",
                onClick: () => setShowScheduleSheet(true),
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M23 21V19C23 17.36 22.04 15.93 20.62 15.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M16.5 3.13C17.92 3.71 18.88 5.14 18.88 6.78C18.88 8.42 17.92 9.85 16.5 10.43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
                label: "Invite Families",
                disabled: true,
                onClick: () => {},
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.55 20.78 16.05 20.41 16.41C20.05 16.78 19.55 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                label: "Message Group",
                onClick: () => realPlaygroup && navigate(`/messages/${realPlaygroup.id}`),
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.disabled ? undefined : action.onClick}
                className={`bg-white rounded-2xl p-4 border border-cream-dark flex flex-col items-center gap-2 transition-colors text-taupe-dark ${
                  action.disabled
                    ? "opacity-50 cursor-default"
                    : "cursor-pointer hover:border-sage-light"
                }`}
              >
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
                {action.disabled && (
                  <span className="text-[9px] text-taupe/50">Coming soon</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-4" />
      </div>

      {/* Member detail slide-over */}
      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Schedule session bottom sheet */}
      <ScheduleSessionSheet
        isOpen={showScheduleSheet}
        onClose={() => setShowScheduleSheet(false)}
        defaultLocation={realPlaygroup?.location_name || ""}
        playgroupName={realPlaygroup?.name || ""}
        onSchedule={async (sessionData) => {
          const result = await createSession({
            ...sessionData,
            created_by: user.id,
          });
          return result;
        }}
      />

      <CancelSessionSheet
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        rsvpCount={cancelRsvpCount}
        sessionDateLabel={
          cancelTarget ? friendlyDate(cancelTarget.scheduled_at) : ""
        }
        onConfirm={(reason) =>
          cancelSession(cancelTarget.id, {
            reason,
            hostUserId: user.id,
            sessionDateLabel: friendlyDate(cancelTarget.scheduled_at),
          })
        }
      />
    </div>
  );
}

/**
 * Slide-over panel showing details of a member in the host's playgroup.
 * Keeps the same visual language as the admin detail panels.
 */
function MemberDetailPanel({ member, onClose }) {
  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-charcoal/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-cream z-50 shadow-xl overflow-y-auto animate-slideIn">
        {/* Header */}
        <div className="sticky top-0 bg-cream/95 backdrop-blur-sm border-b border-cream-dark px-5 py-4 flex items-center gap-3 z-10">
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <h2 className="font-heading font-bold text-charcoal text-base">
            Member Details
          </h2>
        </div>

        <div className="px-5 py-6 space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5 text-center">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-sage-dark">
                  {member.initials}
                </span>
              </div>
            )}
            <h3 className="font-heading font-bold text-charcoal text-lg">
              {member.name}
            </h3>
            <p className="text-xs text-taupe mt-1">
              Joined {member.joinedAt}
            </p>
            {member.zipCode && (
              <p className="text-xs text-charcoal font-medium mt-1">
                Zip: {member.zipCode}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
              About
            </h4>
            {member.bio?.trim() ? (
              <p className="text-sm text-charcoal leading-relaxed">
                {member.bio}
              </p>
            ) : (
              <p className="text-sm text-taupe/60 italic">No bio provided</p>
            )}
          </div>

          {/* Children */}
          {member.childrenAges?.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
                Children
              </h4>
              <div className="space-y-2">
                {member.childrenAges.map((child, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-cream rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-sage-dark">
                        {(child[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal">{child}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Philosophy tags */}
          {member.philosophyTags?.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
                Parenting Style
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {member.philosophyTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-sage-light text-sage-dark px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

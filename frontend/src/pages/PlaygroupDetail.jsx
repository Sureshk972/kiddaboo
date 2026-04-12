import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PhotoCarousel from "../components/playgroup/PhotoCarousel";
import HostCard from "../components/playgroup/HostCard";
import EnvironmentChecklist from "../components/playgroup/EnvironmentChecklist";
import RatingBreakdown from "../components/playgroup/RatingBreakdown";
import ReviewCard from "../components/playgroup/ReviewCard";
import MemberAvatars from "../components/playgroup/MemberAvatars";
import JoinRequestSheet from "../components/playgroup/JoinRequestSheet";
import Button from "../components/ui/Button";
import SessionCard from "../components/playgroup/SessionCard";
import ReviewFormSheet from "../components/playgroup/ReviewFormSheet";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import useSessions from "../hooks/useSessions";
import { useSubscription } from "../hooks/useSubscription";
import useReviews from "../hooks/useReviews";
import useBlocks from "../hooks/useBlocks";
import ReportSheet from "../components/ui/ReportSheet";
import { friendlyDate, formatSessionTime, formatDuration } from "../lib/dateUtils";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const ACCESS_LABELS = {
  open: { text: "Open", color: "bg-sage-light text-sage-dark" },
  request: { text: "Request to Join", color: "bg-terracotta-light text-terracotta" },
  invite: { text: "Invite Only", color: "bg-cream-dark text-taupe" },
};

// Transform a real Supabase playgroup into the shape PlaygroupDetail expects
function transformRealPlaygroup(pg) {
  const host = pg.profiles;
  const hostFirst = host?.first_name || "Host";
  const hostLast = host?.last_name || "";

  const members = (pg.memberships || [])
    .filter((m) => m.role === "member" || m.role === "creator")
    .map((m) => ({
      id: m.user_id,
      name: m.profiles?.first_name
        ? `${m.profiles.first_name} ${m.profiles.last_name || ""}`.trim()
        : "Member",
      initials:
        (m.profiles?.first_name?.[0] || "M").toUpperCase() +
        (m.profiles?.last_name?.[0] || "").toUpperCase(),
      isHost: m.role === "creator",
    }));

  return {
    id: pg.id,
    name: pg.name,
    description: pg.description || "",
    location: pg.location_name || "Location TBD",
    vibeTags: pg.vibe_tags || [],
    ageRange: pg.age_range || "All ages",
    frequency: pg.frequency || "TBD",
    maxFamilies: pg.max_families || 8,
    accessType: pg.access_type || "request",
    screeningQuestions: pg.screening_questions || [],
    photos: (pg.photos || []).length > 0 ? pg.photos : [],
    environment: { ...(pg.environment || {}), maxGroupSize: pg.max_families || 8 },
    host: {
      userId: pg.creator_id,
      name: `${hostFirst} ${hostLast}`.trim(),
      initials:
        (hostFirst[0] || "H").toUpperCase() + (hostLast[0] || "").toUpperCase(),
      bio: host?.bio || "",
      philosophyTags: host?.philosophy_tags || [],
      verified: host?.is_verified || false,
      trustScore: host?.trust_score || 0,
      memberSince: pg.created_at,
    },
    members,
    ratings: { environment: 0, organization: 0, compatibility: 0, reliability: 0, overall: 0 },
    reviews: [],
    nextSession: { date: pg.frequency || "TBD", time: "", location: pg.location_name || "" },
  };
}

export default function PlaygroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get("preview") === "true";
  const { user, profile: authProfile } = useAuth();
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [realGroup, setRealGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  // #50: dynamic per-group title — "Kiddaboo — DJT Forever" — falls
  // back to "Playgroup" while the fetch is in flight so we don't
  // briefly flash "Kiddaboo — null" in the tab.
  useDocumentTitle(realGroup?.name || "Playgroup");
  const [joinStatus, setJoinStatus] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  // #57: visible feedback for join actions — previously the CTA label
  // changed silently with no banner, and errors were swallowed.
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");

  const { blockUser, submitReport } = useBlocks(user?.id);
  const { canSendJoinRequest, joinRequestsRemaining, joinRequestLimit, isPremium, incrementUsage } = useSubscription();

  // Fetch upcoming sessions for this playgroup
  const { sessions, nextSession } = useSessions(id);

  // Fetch reviews
  const {
    reviews,
    ratings,
    reviewableSessions,
    submitReview,
    updateReview,
  } = useReviews(id);

  // Try fetching from Supabase first
  useEffect(() => {
    const fetchGroup = async () => {
      const { data, error } = await supabase
        .from("playgroups")
        .select(`
          *,
          profiles:creator_id ( first_name, last_name, bio, philosophy_tags, is_verified, trust_score ),
          memberships ( user_id, role, profiles:user_id ( first_name, last_name ) )
        `)
        .eq("id", id)
        .single();

      if (!error && data) {
        setRealGroup(transformRealPlaygroup(data));

        // In preview mode, don't reflect the host's own "creator" status —
        // we want to see the parent CTA as a parent would.
        if (user && !previewMode) {
          const existing = (data.memberships || []).find(
            (m) => m.user_id === user.id
          );
          if (existing) setJoinStatus(existing.role);
        }
      }
      setLoading(false);
    };
    fetchGroup();
  }, [id, user, previewMode]);

  // Track playgroup view for host analytics (deduplicated hourly)
  useEffect(() => {
    if (!id || !user) return;
    if (previewMode) return;
    const key = `pv_${id}`;
    const last = localStorage.getItem(key);
    if (last && Date.now() - parseInt(last) < 3600000) return;
    localStorage.setItem(key, Date.now().toString());
    supabase
      .from("playgroup_views")
      .insert({ playgroup_id: id, viewer_id: user.id })
      .then(() => {});
  }, [id, user?.id, previewMode]);

  const group = realGroup;

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-2">
            Playgroup not found
          </h2>
          <p className="text-taupe mb-4">This playgroup may no longer be active.</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const access = ACCESS_LABELS[group.accessType] || ACCESS_LABELS.request;

  const handleJoinClick = async () => {
    if (!user) {
      navigate("/verify");
      return;
    }

    // is_suspended check temporarily disabled — PostgREST schema cache issue

    // Check join request limit for free users
    if (!canSendJoinRequest) {
      setShowUpgradePrompt(true);
      return;
    }

    if (group.accessType === "open") {
      // Directly join open groups
      await incrementUsage();
      const { error } = await supabase.from("memberships").insert({
        user_id: user.id,
        playgroup_id: id,
        role: "member",
        joined_at: new Date().toISOString(),
      });
      if (!error) {
        setJoinStatus("member");
        setJoinError("");
        setJoinMessage("You're in! Say hi in the group chat.");
      } else {
        setJoinMessage("");
        setJoinError("Something went wrong joining this group. Please try again.");
      }
    } else {
      setShowJoinSheet(true);
    }
  };

  // Handle join request submission (for request-to-join groups).
  // #53: returns { error } so JoinRequestSheet can gate its success
  // screen on actual DB success, not fire-and-forget.
  const handleJoinSubmit = async ({ intro, answers }) => {
    if (!user) return { error: "Not signed in" };

    await incrementUsage();
    const { error } = await supabase.from("memberships").insert({
      user_id: user.id,
      playgroup_id: id,
      role: "pending",
      intro_message: intro,
      screening_answers: answers,
    });

    if (!error) {
      setJoinStatus("pending");
    }
    return { error: error || null };
  };

  return (
    <div className="min-h-screen bg-cream pb-24 page-transition">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-cream/80 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="#2F2F2F"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="font-heading font-bold text-charcoal text-sm truncate flex-1">
          {group.name}
        </h2>
        {user && joinStatus !== "creator" && (
          <button
            onClick={() =>
              setReportTarget({
                userId: group.host?.userId,
                userName: group.host?.name || group.name,
              })
            }
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors flex-shrink-0"
            aria-label="Report"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="#6B5E54"/>
              <circle cx="12" cy="12" r="1.5" fill="#6B5E54"/>
              <circle cx="12" cy="19" r="1.5" fill="#6B5E54"/>
            </svg>
          </button>
        )}
      </div>

      {previewMode && (
        <div className="max-w-md mx-auto w-full px-6 mt-2 mb-4">
          <div className="bg-sage-light border border-sage/30 rounded-2xl px-4 py-3 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="#5C6B52" strokeWidth="1.5"/>
            </svg>
            <div className="flex-1">
              <p className="text-xs font-heading font-bold text-sage-dark">Preview mode</p>
              <p className="text-[11px] text-sage-dark/80 leading-relaxed">
                This is how parents see your playgroup. Actions are disabled.
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-[11px] font-medium text-sage-dark underline underline-offset-2 cursor-pointer bg-transparent border-none flex-shrink-0"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto w-full px-6">
        {/* #57: success/error banners for join actions */}
        {joinMessage && (
          <div className="bg-sage-light border border-sage rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-sage-dark font-medium">{joinMessage}</p>
          </div>
        )}
        {joinError && (
          <div className="bg-terracotta-light/30 border border-terracotta-light rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-terracotta font-medium">{joinError}</p>
          </div>
        )}

        {/* Photo carousel */}
        <div className="mb-6">
          <PhotoCarousel photos={group.photos} />
        </div>

        {/* Title + access badge + location */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-heading font-bold text-charcoal">
              {group.name}
            </h1>
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${access.color}`}
            >
              {access.text}
            </span>
          </div>
          <p className="text-sm text-taupe flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
            </svg>
            {group.location}
          </p>

          {/* Vibe tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {group.vibeTags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-sage-light text-sage-dark px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-2">About</h3>
          <p className="text-sm text-taupe-dark leading-relaxed">
            {group.description}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Host */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-3">
            Your Host
          </h3>
          <HostCard host={group.host} />
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Environment checklist */}
        <div className="mb-6">
          <EnvironmentChecklist environment={group.environment} />
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Schedule */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-3">
            Schedule
          </h3>

          {nextSession ? (
            <div className="flex flex-col gap-2">
              {/* Next session - featured */}
              <SessionCard
                session={nextSession}
                location={group.location}
                frequency={group.frequency}
                ageRange={group.ageRange}
                showRsvp={joinStatus === "member"}
                variant="featured"
              />

              {/* Additional upcoming sessions */}
              {sessions.length > 1 && sessions.slice(1, 3).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  location={group.location}
                  frequency={group.frequency}
                  ageRange={group.ageRange}
                  showRsvp={joinStatus === "member"}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 border border-cream-dark">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="4" width="14" height="13" rx="2" stroke="#5C6B52" strokeWidth="1.5" />
                    <path d="M3 8H17" stroke="#5C6B52" strokeWidth="1.5" />
                    <path d="M7 2V5M13 2V5" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    No sessions scheduled yet
                  </p>
                  <p className="text-xs text-taupe">
                    Check back soon for upcoming playdates
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-cream-dark">
                <p className="text-xs text-taupe">
                  <span className="text-sage-dark font-medium">
                    {group.frequency}
                  </span>{" "}
                  &middot; Ages {group.ageRange}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Ratings & Reviews */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-4">
            Ratings & Reviews
          </h3>
          <RatingBreakdown ratings={ratings} />

          {/* Write a Review CTA */}
          {reviewableSessions.length > 0 && joinStatus === "member" && (
            <div className="mt-4 mb-2">
              <button
                onClick={() => {
                  setSelectedSession(reviewableSessions[0]);
                  setEditingReview(null);
                  setShowReviewSheet(true);
                }}
                className="w-full bg-sage text-white font-medium text-sm rounded-2xl px-4 py-3 cursor-pointer border-none hover:bg-sage-dark transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Write a Review
                {reviewableSessions.length > 1 && (
                  <span className="text-white/70 text-xs">
                    ({reviewableSessions.length} sessions)
                  </span>
                )}
              </button>
              {reviewableSessions.length > 1 && (
                <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
                  {reviewableSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSession(s);
                        setEditingReview(null);
                        setShowReviewSheet(true);
                      }}
                      className="text-[11px] text-sage-dark bg-sage-light/50 px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer border-none flex-shrink-0"
                    >
                      {friendlyDate(s.scheduled_at)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="flex flex-col gap-3 mt-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isOwn={user && review.reviewer_id === user.id}
                  onReport={(reviewerId, reviewerName) =>
                    setReportTarget({ userId: reviewerId, userName: reviewerName })
                  }
                  onEdit={(r) => {
                    setEditingReview(r);
                    setSelectedSession({ id: r.session_id, scheduled_at: r.created_at });
                    setShowReviewSheet(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-taupe mt-4 text-center">
              No reviews yet. Be the first to share your experience!
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Members */}
        <div className="mb-6">
          <MemberAvatars
            members={group.members}
            maxFamilies={group.maxFamilies}
            ageRange={group.ageRange}
          />
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-cream/90 backdrop-blur-md border-t border-cream-dark px-6 py-4 z-30">
        <div className="max-w-md mx-auto">
          {previewMode ? (
            <Button fullWidth variant="secondary" disabled>
              Preview mode — actions disabled
            </Button>
          ) : joinStatus === "member" || joinStatus === "creator" ? (
            <Button fullWidth onClick={() => navigate(`/messages/${id}`)}>
              Group Chat
            </Button>
          ) : joinStatus === "pending" ? (
            <Button fullWidth variant="secondary" disabled>
              Request Pending
            </Button>
          ) : joinStatus === "waitlisted" ? (
            <Button fullWidth variant="secondary" disabled>
              On Waitlist
            </Button>
          ) : group.accessType === "invite" ? (
            <div className="text-center">
              <p className="text-xs text-taupe mb-2">
                This group is invite-only. Ask a member for an invitation.
              </p>
              <Button fullWidth variant="secondary" disabled>
                Invite Only
              </Button>
            </div>
          ) : (
            <>
              <Button fullWidth onClick={handleJoinClick}>
                {group.accessType === "open"
                  ? "Join Group"
                  : "Request to Join"}
              </Button>
              {!isPremium && user && (
                <p className="text-[11px] text-taupe/60 text-center mt-2">
                  {joinRequestsRemaining} of {joinRequestLimit} free requests remaining
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Join request bottom sheet */}
      <JoinRequestSheet
        isOpen={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        screeningQuestions={group.screeningQuestions}
        playgroupName={group.name}
        onSubmit={handleJoinSubmit}
      />

      {/* Report/Block sheet */}
      <ReportSheet
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        userName={reportTarget?.userName || ""}
        onReport={async ({ reportType, description }) => {
          await submitReport({
            reportedUserId: reportTarget.userId,
            reportType,
            context: "profile",
            description,
          });
        }}
        onBlock={async () => {
          await blockUser(reportTarget.userId);
        }}
      />

      {/* Upgrade prompt */}
      {showUpgradePrompt && (
        <>
          <div
            className="fixed inset-0 bg-charcoal/40 z-40"
            onClick={() => setShowUpgradePrompt(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
              <div className="w-14 h-14 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6B52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
                You've used all {joinRequestLimit} free requests
              </h3>
              <p className="text-sm text-taupe leading-relaxed mb-5">
                Upgrade to Premium for unlimited join requests, advanced filters, and priority placement.
              </p>
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  navigate("/premium");
                }}
                className="w-full bg-sage hover:bg-sage-dark text-white font-heading font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer border-none mb-2"
              >
                View Premium — $7.99/mo
              </button>
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="text-xs text-taupe hover:text-charcoal transition-colors cursor-pointer bg-transparent border-none"
              >
                Maybe later
              </button>
            </div>
          </div>
        </>
      )}

      {/* Review form bottom sheet */}
      <ReviewFormSheet
        isOpen={showReviewSheet}
        onClose={() => {
          setShowReviewSheet(false);
          setSelectedSession(null);
          setEditingReview(null);
        }}
        session={selectedSession}
        existingReview={editingReview}
        onSubmit={async (reviewData) => {
          if (editingReview) {
            return updateReview(editingReview.id, reviewData);
          }
          return submitReview(reviewData);
        }}
      />
    </div>
  );
}

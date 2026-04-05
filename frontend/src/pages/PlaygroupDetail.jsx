import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PhotoCarousel from "../components/playgroup/PhotoCarousel";
import HostCard from "../components/playgroup/HostCard";
import EnvironmentChecklist from "../components/playgroup/EnvironmentChecklist";
import RatingBreakdown from "../components/playgroup/RatingBreakdown";
import ReviewCard from "../components/playgroup/ReviewCard";
import MemberAvatars from "../components/playgroup/MemberAvatars";
import JoinRequestSheet from "../components/playgroup/JoinRequestSheet";
import Button from "../components/ui/Button";
import ReviewFormSheet from "../components/playgroup/ReviewFormSheet";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import useSessions from "../hooks/useSessions";
import useReviews from "../hooks/useReviews";
import { friendlyDate, formatSessionTime, formatDuration } from "../lib/dateUtils";

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
      name: `${hostFirst} ${hostLast}`.trim(),
      initials:
        (hostFirst[0] || "H").toUpperCase() + (hostLast[0] || "").toUpperCase(),
      bio: host?.bio || "",
      philosophyTags: host?.philosophy_tags || [],
      verified: host?.is_verified || false,
      trustScore: host?.trust_score || 0,
    },
    members,
    ratings: { environment: 0, organization: 0, compatibility: 0, reliability: 0, overall: 0 },
    reviews: [],
    nextSession: { date: pg.frequency || "TBD", time: "", location: pg.location_name || "" },
    isReal: true,
  };
}

export default function PlaygroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [realGroup, setRealGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState(null); // null | "pending" | "member" | "creator"

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

        // Check if the current user already has a membership
        if (user) {
          const existing = (data.memberships || []).find(
            (m) => m.user_id === user.id
          );
          if (existing) setJoinStatus(existing.role);
        }
      }
      setLoading(false);
    };
    fetchGroup();
  }, [id, user]);

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

    if (group.accessType === "open" && group.isReal) {
      // Directly join open groups
      const { error } = await supabase.from("memberships").insert({
        user_id: user.id,
        playgroup_id: id,
        role: "member",
        joined_at: new Date().toISOString(),
      });
      if (!error) {
        setJoinStatus("member");
      }
    } else if (group.accessType === "open") {
      alert("You've joined the group!");
    } else {
      setShowJoinSheet(true);
    }
  };

  // Handle join request submission (for request-to-join groups)
  const handleJoinSubmit = async ({ intro, answers }) => {
    if (!user || !group.isReal) return;

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
  };

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-cream/80 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
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
        <h2 className="font-heading font-bold text-charcoal text-sm truncate">
          {group.name}
        </h2>
      </div>

      <div className="max-w-md mx-auto w-full px-6">
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
              <div className="bg-white rounded-2xl p-4 border border-cream-dark">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="4" width="14" height="13" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
                      <path d="M3 8H17" stroke="#7A8F6D" strokeWidth="1.5" />
                      <path d="M7 2V5M13 2V5" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {friendlyDate(nextSession.scheduled_at)} &middot; {formatSessionTime(nextSession.scheduled_at)}
                    </p>
                    <p className="text-xs text-taupe">
                      {formatDuration(nextSession.duration_minutes)}
                    </p>
                    <p className="text-xs text-taupe">
                      {nextSession.location_name || group.location}
                    </p>
                  </div>
                </div>
                {nextSession.notes && (
                  <p className="text-xs text-taupe/70 mt-2 italic">
                    {nextSession.notes}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-cream-dark">
                  <p className="text-xs text-taupe">
                    <span className="text-sage-dark font-medium">
                      {group.frequency}
                    </span>{" "}
                    &middot; Ages {group.ageRange}
                  </p>
                </div>
              </div>

              {/* Additional upcoming sessions */}
              {sessions.length > 1 && sessions.slice(1, 3).map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl p-3 border border-cream-dark flex items-center gap-3"
                >
                  <div className="w-9 h-9 bg-sage-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="4" width="14" height="13" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
                      <path d="M3 8H17" stroke="#7A8F6D" strokeWidth="1.5" />
                      <path d="M7 2V5M13 2V5" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {friendlyDate(session.scheduled_at)} &middot; {formatSessionTime(session.scheduled_at)}
                    </p>
                    <p className="text-xs text-taupe">
                      {formatDuration(session.duration_minutes)} &middot; {session.location_name || group.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 border border-cream-dark">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="4" width="14" height="13" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
                    <path d="M3 8H17" stroke="#7A8F6D" strokeWidth="1.5" />
                    <path d="M7 2V5M13 2V5" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
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
          {joinStatus === "member" || joinStatus === "creator" ? (
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
            <Button fullWidth onClick={handleJoinClick}>
              {group.accessType === "open"
                ? "Join Group"
                : "Request to Join"}
            </Button>
          )}
        </div>
      </div>

      {/* Join request bottom sheet */}
      <JoinRequestSheet
        isOpen={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        screeningQuestions={group.screeningQuestions}
        playgroupName={group.name}
        onSubmit={group.isReal ? handleJoinSubmit : (data) => console.log("Join request:", data)}
      />

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

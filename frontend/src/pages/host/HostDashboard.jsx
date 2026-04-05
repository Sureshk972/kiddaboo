import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import RequestCard from "../../components/host/RequestCard";
import ScheduleSessionSheet from "../../components/host/ScheduleSessionSheet";
import useSessions from "../../hooks/useSessions";
import { friendlyDate, formatSessionTime, formatDuration } from "../../lib/dateUtils";

const ACTIVITY_ICONS = {
  review: "\u2b50",
  join: "\ud83d\udcec",
  rsvp: "\u2705",
  session: "\ud83d\udcc5",
};

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
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Real data from Supabase
  const [realPlaygroup, setRealPlaygroup] = useState(null);
  const [realRequests, setRealRequests] = useState([]);
  const [realMembers, setRealMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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
        return; // Fall back to mock
      }

      const pg = playgroups[0];
      setRealPlaygroup(pg);

      // 2. Fetch all memberships for this playgroup with profile data
      const { data: memberships } = await supabase
        .from("memberships")
        .select(`
          id, user_id, role, intro_message, screening_answers, created_at, joined_at,
          profiles:user_id ( first_name, last_name, bio, philosophy_tags )
        `)
        .eq("playgroup_id", pg.id)
        .order("created_at", { ascending: false });

      if (memberships) {
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

            return {
              id: m.id,
              userId: m.user_id,
              name: `${first} ${last}`.trim(),
              initials,
              childrenAges: [], // TODO: fetch from children table later
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
            return {
              id: m.id,
              name: `${first} ${last}`.trim(),
              initials:
                (first[0] || "U").toUpperCase() + (last[0] || "").toUpperCase(),
              role: m.role === "creator" ? "host" : "member",
              childrenAges: [],
              joinedAt: m.joined_at
                ? new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : new Date(m.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              lastActive: timeAgo(m.created_at),
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

  // Session scheduling
  const {
    sessions,
    nextSession,
    createSession,
    deleteSession,
  } = useSessions(realPlaygroup?.id);

  if (!realPlaygroup && !loading) {
    return (
      <div className="bg-cream min-h-screen flex flex-col items-center justify-center px-6 text-center">
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
          Host a Playgroup
        </button>
      </div>
    );
  }

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
  const members = realMembers;

  const handleApprove = async (id) => {
    setActionedIds((prev) => ({ ...prev, [id]: "approved" }));

    await supabase
      .from("memberships")
      .update({ role: "member", joined_at: new Date().toISOString() })
      .eq("id", id);
  };

  const handleDecline = async (id) => {
    setActionedIds((prev) => ({ ...prev, [id]: "declined" }));
    await supabase.from("memberships").update({ role: "declined" }).eq("id", id);
  };

  const handleWaitlist = async (id) => {
    setActionedIds((prev) => ({ ...prev, [id]: "waitlisted" }));
    await supabase.from("memberships").update({ role: "waitlisted" }).eq("id", id);
  };

  const activeRequests = requests.filter((r) => !actionedIds[r.id]);

  if (loading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <p className="text-xs text-taupe">Your playgroup</p>
          <h1 className="text-lg font-heading font-bold text-charcoal">
            {pg.name}
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-cream-dark text-center">
            <p className="text-2xl font-heading font-bold text-charcoal">
              {pg.memberCount}
            </p>
            <p className="text-[11px] text-taupe mt-0.5">
              of {pg.maxFamilies} families
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-cream-dark text-center">
            <p className="text-2xl font-heading font-bold text-charcoal">
              {activeRequests.length}
            </p>
            <p className="text-[11px] text-taupe mt-0.5">pending requests</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-cream-dark text-center">
            <div className="flex items-center justify-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#7A8F6D">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <p className="text-2xl font-heading font-bold text-charcoal">
                {pg.trustScore}
              </p>
            </div>
            <p className="text-[11px] text-taupe mt-0.5">
              {pg.reviewCount} reviews
            </p>
          </div>
        </div>

        {/* Next session card */}
        {nextSession ? (
          <div className="bg-sage-light/30 rounded-2xl p-4 border border-sage-light">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-heading font-bold text-charcoal">
                Next Session
              </h3>
              <button
                onClick={() => setShowScheduleSheet(true)}
                className="text-[11px] text-sage-dark font-medium bg-transparent border-none cursor-pointer underline underline-offset-2"
              >
                + Add
              </button>
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
          </div>
        ) : (
          <button
            onClick={() => setShowScheduleSheet(true)}
            className="bg-sage-light/30 rounded-2xl p-4 border border-sage-light border-dashed cursor-pointer w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
                  <path d="M3 10H21" stroke="#7A8F6D" strokeWidth="1.5" />
                  <path d="M8 2V6M16 2V6" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 14V18M10 16H14" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
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
                  className="bg-white rounded-xl p-3 border border-cream-dark flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-sage-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
                        <path d="M3 10H21" stroke="#7A8F6D" strokeWidth="1.5" />
                        <path d="M8 2V6M16 2V6" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
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
                    onClick={() => deleteSession(session.id)}
                    className="text-taupe/40 hover:text-terracotta transition-colors bg-transparent border-none cursor-pointer p-1"
                    title="Cancel session"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending requests */}
        <div>
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
        <div>
          <h3 className="text-base font-heading font-bold text-charcoal mb-3">
            Members
          </h3>
          <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
            {members.map((member, i) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-4 ${
                  i < members.length - 1 ? "border-b border-cream-dark" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.role === "host"
                      ? "bg-sage text-white"
                      : "bg-sage-light text-sage-dark"
                  }`}
                >
                  <span className="text-xs font-bold">{member.initials}</span>
                </div>

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
                    Kids: {member.childrenAges.join(", ")} yrs &middot; Joined{" "}
                    {member.joinedAt}
                  </p>
                </div>

                {/* Last active */}
                <span className="text-[10px] text-taupe/60 flex-shrink-0">
                  {member.lastActive}
                </span>
              </div>
            ))}
          </div>
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
                onClick={action.onClick}
                className="bg-white rounded-2xl p-4 border border-cream-dark flex flex-col items-center gap-2 cursor-pointer hover:border-sage-light transition-colors text-taupe-dark"
              >
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-4" />
      </div>

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
    </div>
  );
}

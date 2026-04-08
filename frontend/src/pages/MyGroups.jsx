import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const CARD_COLORS = [
  "#7A8F6D", "#E8C4B0", "#F0EBE3", "#C08B6E",
  "#DAE4D0", "#5C6B52", "#D4A574", "#B8C9A3",
];


const STATUS_BADGES = {
  member: {
    label: "Member",
    bg: "bg-sage-light",
    text: "text-sage-dark",
  },
  pending: {
    label: "Pending",
    bg: "bg-terracotta-light/50",
    text: "text-taupe-dark",
  },
  waitlisted: {
    label: "Waitlisted",
    bg: "bg-cream-dark",
    text: "text-taupe",
  },
};

export default function MyGroups() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [hosting, setHosting] = useState(null);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      // Fetch all memberships for this user, joined with playgroup + host profile
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select(`
          id, role, created_at,
          playgroups:playgroup_id !inner (
            id, name, location_name, max_families, frequency,
            creator_id, is_active,
            profiles:creator_id ( first_name, last_name )
          )
        `)
        .eq("user_id", user.id)
        .eq("playgroups.is_active", true)
        .order("created_at", { ascending: false });

      if (error || !memberships) {
        setLoading(false);
        return;
      }

      // Split into hosting vs joined
      const hostingEntry = memberships.find((m) => m.role === "creator");
      const joinedEntries = memberships.filter(
        (m) => m.role !== "creator" && m.role !== "declined"
      );

      if (hostingEntry && hostingEntry.playgroups) {
        const pg = hostingEntry.playgroups;

        // Count members and pending for this playgroup
        const { data: pgMembers } = await supabase
          .from("memberships")
          .select("role")
          .eq("playgroup_id", pg.id);

        const memberCount = (pgMembers || []).filter(
          (m) => m.role === "member"
        ).length;
        const pendingCount = (pgMembers || []).filter(
          (m) => m.role === "pending"
        ).length;

        setHosting({
          id: pg.id,
          name: pg.name,
          location: pg.location_name || "Location TBD",
          memberCount,
          maxFamilies: pg.max_families || 8,
          pendingRequests: pendingCount,
          nextSession: pg.frequency || "TBD",
          photoColor: CARD_COLORS[0],
        });
      }

      // Map joined groups
      const joinedMapped = joinedEntries
        .filter((m) => m.playgroups)
        .map((m, i) => {
          const pg = m.playgroups;
          const host = pg.profiles;
          const hostFirst = host?.first_name || "Host";
          const hostLast = host?.last_name || "";
          return {
            id: pg.id,
            name: pg.name,
            location: pg.location_name || "Location TBD",
            status: m.role, // pending, member, waitlisted
            hostName: `${hostFirst} ${hostLast}`.trim(),
            hostInitials:
              (hostFirst[0] || "H").toUpperCase() +
              (hostLast[0] || "").toUpperCase(),
            nextSession: pg.frequency || "TBD",
            photoColor: CARD_COLORS[(i + 1) % CARD_COLORS.length],
          };
        });

      setJoined(joinedMapped);

      // No mock fallback when logged in — show real empty state

      setLoading(false);
    };

    fetchGroups();
  }, [user, authLoading]);

  // Use real data directly
  const displayHosting = hosting;
  const displayJoined = joined;


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
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            My Groups
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-6">
        {/* Host a playgroup CTA — show when user has no hosted group */}
        {!displayHosting && (
          <div>
            <h3 className="text-sm font-medium text-taupe mb-2">
              Your Playgroup
            </h3>
            <div
              onClick={() => navigate("/host/create")}
              className="bg-white rounded-2xl border-2 border-dashed border-sage-light/60 p-6 text-center cursor-pointer hover:border-sage transition-all hover:shadow-sm"
            >
              <div className="w-12 h-12 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-sage-dark">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-charcoal mb-1">
                Host a Playgroup
              </h3>
              <p className="text-xs text-taupe">
                Create your own curated group for families
              </p>
            </div>
          </div>
        )}

        {/* Hosting section */}
        {displayHosting && (
          <div>
            <h3 className="text-sm font-medium text-taupe mb-2">
              Your Playgroup
            </h3>
            <div
              onClick={() => navigate("/host/dashboard")}
              className="bg-white rounded-2xl border border-cream-dark overflow-hidden cursor-pointer hover:border-sage-light transition-all hover:shadow-sm"
            >
              {/* Color strip */}
              <div
                className="h-16 flex items-center justify-between px-4"
                style={{ backgroundColor: displayHosting.photoColor + "30" }}
              >
                <span className="text-[10px] bg-white/80 backdrop-blur-sm text-sage-dark px-2 py-0.5 rounded-full font-medium">
                  Host
                </span>
                {displayHosting.pendingRequests > 0 && (
                  <span className="text-[10px] bg-terracotta-light text-taupe-dark px-2 py-0.5 rounded-full font-medium">
                    {displayHosting.pendingRequests} requests
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-heading font-bold text-charcoal text-base mb-1">
                  {displayHosting.name}
                </h3>
                <p className="text-xs text-taupe mb-3 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <circle
                      cx="7"
                      cy="6"
                      r="1.5"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                  {displayHosting.location}
                </p>

                <div className="flex items-center justify-between text-xs text-taupe">
                  <span>
                    {displayHosting.memberCount} of {displayHosting.maxFamilies}{" "}
                    families
                  </span>
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M3 10H21"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 2V6M16 2V6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Next: {displayHosting.nextSession}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Joined groups */}
        <div>
          <h3 className="text-sm font-medium text-taupe mb-2">
            Joined Groups
          </h3>
          {displayJoined.length > 0 ? (
            <div className="flex flex-col gap-3">
              {displayJoined.map((group) => {
                const badge = STATUS_BADGES[group.status] || STATUS_BADGES.pending;
                return (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/playgroup/${group.id}`)}
                    className="bg-white rounded-2xl border border-cream-dark overflow-hidden cursor-pointer hover:border-sage-light transition-all hover:shadow-sm"
                  >
                    {/* Color strip */}
                    <div
                      className="h-12 flex items-center justify-end px-4"
                      style={{
                        backgroundColor: group.photoColor + "30",
                      }}
                    >
                      <span
                        className={`text-[10px] ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full font-medium`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="font-heading font-bold text-charcoal text-sm mb-1">
                        {group.name}
                      </h3>
                      <p className="text-xs text-taupe mb-2 flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <circle
                            cx="7"
                            cy="6"
                            r="1.5"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        </svg>
                        {group.location}
                      </p>

                      <div className="flex items-center justify-between text-xs text-taupe">
                        {/* Host */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center">
                            <span className="text-[8px] font-bold text-sage-dark">
                              {group.hostInitials}
                            </span>
                          </div>
                          <span>{group.hostName}</span>
                        </div>

                        {/* Next session */}
                        <div className="flex items-center gap-1">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M3 10H21"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M8 2V6M16 2V6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          {group.nextSession}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center overflow-hidden relative">
              {/* Decorative background */}
              <div className="absolute inset-0 opacity-[0.04]">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="groups-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="6" fill="#5C6B52" />
                      <circle cx="5" cy="5" r="3" fill="#C08B6E" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#groups-dots)" />
                </svg>
              </div>

              <div className="relative">
                {/* Illustration: three overlapping family circles */}
                <div className="flex items-center justify-center mb-4 -space-x-3">
                  <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center border-2 border-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="#5C6B52" strokeWidth="1.5" />
                      <path d="M20 21C20 16.58 16.42 13 12 13C7.58 13 4 16.58 4 21" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-terracotta-light flex items-center justify-center border-2 border-white z-10">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="#C08B6E" strokeWidth="1.5" />
                      <path d="M23 21V19C23 17.14 21.73 15.57 20 15.13" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M16 3.13C17.73 3.57 19 5.14 19 7C19 8.86 17.73 10.43 16 10.87" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-cream-dark flex items-center justify-center border-2 border-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="#6B5E54" strokeWidth="1.5" />
                      <path d="M20 21C20 16.58 16.42 13 12 13C7.58 13 4 16.58 4 21" stroke="#6B5E54" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
                  Your playgroup family awaits
                </h3>
                <p className="text-sm text-taupe leading-relaxed mb-5 max-w-[240px] mx-auto">
                  Find families near you who share your parenting style and schedule.
                </p>
                <button
                  onClick={() => navigate("/browse")}
                  className="bg-sage hover:bg-sage-dark text-white text-sm font-medium px-6 py-2.5 rounded-xl cursor-pointer border-none transition-colors"
                >
                  Browse Playgroups
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

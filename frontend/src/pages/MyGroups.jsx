import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const STATUS_BADGES = {
  member: {
    label: "Member",
    bg: "bg-sage-light",
    text: "text-sage-dark",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  waitlisted: {
    label: "Waitlisted",
    bg: "bg-cream-dark",
    text: "text-taupe",
    icon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
};

export default function MyGroups() {
  useDocumentTitle("My Groups");
  const navigate = useNavigate();
  const { user, accountType, loading: authLoading } = useAuth();

  const [hosting, setHosting] = useState(null);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select(`
          id, role, created_at,
          playgroups:playgroup_id !inner (
            id, name, location_name, max_families, frequency,
            creator_id, is_active, photos,
            profiles:creator_id ( first_name, last_name, photo_url )
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

        const photo = Array.isArray(pg.photos) && pg.photos.length > 0
          ? pg.photos[0]
          : null;

        setHosting({
          id: pg.id,
          name: pg.name,
          location: pg.location_name || "Location TBD",
          memberCount,
          maxFamilies: pg.max_families || 8,
          pendingRequests: pendingCount,
          nextSession: pg.frequency || "TBD",
          photo,
        });
      }

      const joinedMapped = joinedEntries
        .filter((m) => m.playgroups)
        .map((m) => {
          const pg = m.playgroups;
          const host = pg.profiles;
          const hostFirst = host?.first_name || "Host";
          const hostLast = host?.last_name || "";
          const photo = Array.isArray(pg.photos) && pg.photos.length > 0
            ? pg.photos[0]
            : null;
          return {
            id: pg.id,
            name: pg.name,
            location: pg.location_name || "Location TBD",
            status: m.role,
            hostName: `${hostFirst} ${hostLast}`.trim(),
            hostInitials:
              (hostFirst[0] || "H").toUpperCase() +
              (hostLast[0] || "").toUpperCase(),
            hostPhoto: host?.photo_url || null,
            nextSession: pg.frequency || "TBD",
            photo,
          };
        });

      setJoined(joinedMapped);
      setLoading(false);
    };

    fetchGroups();
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            My Groups
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-6 w-full flex-1">

        {/* ───────── HOSTING SECTION ───────── */}
        {/* Parent-account users don't see the Hosting section. The
            parent flow stays focused on browsing/joining; becoming a
            host requires re-onboarding as organizer. */}
        {accountType !== "parent" && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-sage/15 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 4.8L20 7.8l-4 3.9.9 5.3L12 14.2 7.1 17l.9-5.3-4-3.9 5.6-1L12 2z" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-charcoal uppercase tracking-wide">
              Hosting
            </h2>
          </div>

          {hosting ? (
            <div
              onClick={() => navigate("/host/dashboard")}
              className="bg-white rounded-2xl border-2 border-sage/25 overflow-hidden cursor-pointer hover:border-sage/50 transition-all hover:shadow-md group"
            >
              {/* Photo or gradient banner */}
              <div className="h-20 relative overflow-hidden">
                {hosting.photo ? (
                  <img
                    src={hosting.photo}
                    alt={hosting.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sage-light/60 to-sage/30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-2 left-3 flex items-center gap-2">
                  <span className="text-[10px] bg-white/90 backdrop-blur-sm text-sage-dark px-2.5 py-0.5 rounded-full font-bold">
                    Host
                  </span>
                  {hosting.pendingRequests > 0 && (
                    <span className="text-[10px] bg-terracotta text-white px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                      {hosting.pendingRequests} pending {hosting.pendingRequests === 1 ? "request" : "requests"}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-charcoal text-base leading-tight">
                    {hosting.name}
                  </h3>
                  <span className="text-[10px] text-sage font-bold shrink-0 bg-sage/10 px-2 py-1 rounded-lg group-hover:bg-sage group-hover:text-white transition-colors">
                    Manage →
                  </span>
                </div>

                <p className="text-xs text-taupe mb-3 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0">
                    <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1" />
                    <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <span className="truncate">{hosting.location}</span>
                </p>

                <div className="flex items-center justify-between text-xs text-taupe">
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span>{hosting.memberCount} of {hosting.maxFamilies} families</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {hosting.nextSession}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => navigate("/host/create")}
              className="bg-white rounded-2xl border-2 border-dashed border-sage/30 p-5 text-center cursor-pointer hover:border-sage/50 transition-all hover:shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sage-light/50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-sage-light transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-sage-dark">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-heading font-bold text-charcoal text-sm">
                    Organize a Playgroup
                  </h3>
                  <p className="text-xs text-taupe mt-0.5">
                    Create your own curated group for families in your area
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
        )}

        {/* ───────── DIVIDER ───────── */}
        {accountType !== "parent" && <div className="h-px bg-cream-dark" />}

        {/* ───────── JOINED SECTION ───────── */}
        <section className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-terracotta-light/40 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="#8B6E5A" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" stroke="#8B6E5A" strokeWidth="1.5" />
                  <path d="M23 21V19C23 17.14 21.73 15.57 20 15.13" stroke="#8B6E5A" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M16 3.13C17.73 3.57 19 5.14 19 7C19 8.86 17.73 10.43 16 10.87" stroke="#8B6E5A" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wide">
                Joined
              </h2>
              {joined.length > 0 && (
                <span className="text-[10px] font-bold text-taupe bg-cream-dark px-2 py-0.5 rounded-full">
                  {joined.length}
                </span>
              )}
            </div>
          </div>

          {joined.length > 0 ? (
            <div className="flex flex-col gap-3">
              {joined.map((group) => {
                const badge = STATUS_BADGES[group.status] || STATUS_BADGES.pending;
                return (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/playgroup/${group.id}`)}
                    className="bg-white rounded-2xl border border-cream-dark overflow-hidden cursor-pointer hover:border-sage-light transition-all hover:shadow-sm"
                  >
                    {/* Photo strip or color fallback */}
                    <div className="h-14 relative overflow-hidden">
                      {group.photo ? (
                        <img
                          src={group.photo}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-terracotta-light/40 to-cream-dark/60" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <span
                        className={`absolute bottom-2 right-3 text-[10px] ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full font-bold flex items-center gap-1`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="font-heading font-bold text-charcoal text-sm mb-1 leading-tight">
                        {group.name}
                      </h3>
                      <p className="text-xs text-taupe mb-3 flex items-center gap-1 min-w-0">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0">
                          <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1" />
                          <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
                        </svg>
                        <span className="truncate">{group.location}</span>
                      </p>

                      <div className="flex items-center justify-between text-xs text-taupe">
                        {/* Host avatar + name */}
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center overflow-hidden">
                            {group.hostPhoto ? (
                              <img
                                src={group.hostPhoto}
                                alt={group.hostName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] font-bold text-sage-dark">
                                {group.hostInitials}
                              </span>
                            )}
                          </div>
                          <span>{group.hostName}</span>
                        </div>

                        {/* Frequency */}
                        <div className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
            <div className="bg-white rounded-2xl border border-cream-dark p-6 text-center overflow-hidden relative flex-1 flex items-center justify-center">
              <div className="relative">
                {/* Illustration: three overlapping family circles */}
                <div className="flex items-center justify-center mb-4 -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center border-2 border-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="#5C6B52" strokeWidth="1.5" />
                      <path d="M20 21C20 16.58 16.42 13 12 13C7.58 13 4 16.58 4 21" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-terracotta-light flex items-center justify-center border-2 border-white z-10">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="#C08B6E" strokeWidth="1.5" />
                      <path d="M23 21V19C23 17.14 21.73 15.57 20 15.13" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M16 3.13C17.73 3.57 19 5.14 19 7C19 8.86 17.73 10.43 16 10.87" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center border-2 border-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="#6B5E54" strokeWidth="1.5" />
                      <path d="M20 21C20 16.58 16.42 13 12 13C7.58 13 4 16.58 4 21" stroke="#6B5E54" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <h3 className="font-heading font-bold text-charcoal text-base mb-1">
                  {hosting ? "Join more groups" : "Your playgroup family awaits"}
                </h3>
                <p className="text-sm text-taupe leading-relaxed mb-4 max-w-[240px] mx-auto">
                  {hosting
                    ? "Find other groups for your little ones to join as a member."
                    : "Find families near you who share your parenting style and schedule."
                  }
                </p>
                <button
                  onClick={() => navigate("/browse")}
                  className="bg-sage hover:bg-sage-dark text-white text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer border-none transition-colors"
                >
                  Browse Playgroups
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

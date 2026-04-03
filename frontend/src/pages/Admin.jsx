import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const ADMIN_EMAIL = "rooblix2000@gmail.com";

function timeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-5 flex flex-col gap-1">
      <span className="text-2xl">{icon}</span>
      <p className="text-3xl font-heading font-semibold text-charcoal">
        {value === null ? (
          <span className="inline-block w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
        ) : (
          value
        )}
      </p>
      <p className="text-sm text-taupe">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-terracotta-light text-charcoal",
    member: "bg-sage-light text-charcoal",
    declined: "bg-cream-dark text-taupe-dark",
    waitlisted: "bg-terracotta-light/30 text-charcoal",
    host: "bg-sage text-white",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        styles[status] || "bg-cream-dark text-taupe"
      }`}
    >
      {status}
    </span>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: null,
    totalPlaygroups: null,
    totalPending: null,
    totalMembers: null,
  });
  const [profiles, setProfiles] = useState([]);
  const [childrenCounts, setChildrenCounts] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [playgroups, setPlaygroups] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [togglingId, setTogglingId] = useState(null);

  // Auth gate
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) return;
    fetchAllData();
  }, [user, authLoading]);

  async function fetchAllData() {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfiles(),
        fetchPlaygroups(),
        fetchMemberships(),
        fetchChildren(),
        fetchRecentRequests(),
      ]);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProfiles(data);
      setStats((prev) => ({ ...prev, totalUsers: data.length }));
    }
  }

  async function fetchChildren() {
    const { data, error } = await supabase.from("children").select("id, user_id");
    if (!error && data) {
      const counts = {};
      data.forEach((c) => {
        counts[c.user_id] = (counts[c.user_id] || 0) + 1;
      });
      setChildrenCounts(counts);
    }
  }

  async function fetchPlaygroups() {
    const { data, error } = await supabase
      .from("playgroups")
      .select(
        `*, profiles:creator_id(id, first_name, last_name), memberships(id, role)`
      )
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPlaygroups(data);
      const activeCount = data.filter((pg) => pg.is_active).length;
      setStats((prev) => ({ ...prev, totalPlaygroups: activeCount }));
    }
  }

  async function fetchMemberships() {
    const { data, error } = await supabase.from("memberships").select("*");
    if (!error && data) {
      setMemberships(data);
      const pendingCount = data.filter((m) => m.role === "pending").length;
      const memberCount = data.filter((m) => m.role === "member").length;
      setStats((prev) => ({
        ...prev,
        totalPending: pendingCount,
        totalMembers: memberCount,
      }));
    }
  }

  async function fetchRecentRequests() {
    const { data, error } = await supabase
      .from("memberships")
      .select(
        `*, profiles:user_id(first_name, last_name), playgroups:playgroup_id(name)`
      )
      .in("role", ["pending", "member", "waitlisted", "declined"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) {
      setRecentRequests(data);
    }
  }

  async function togglePlaygroupActive(playgroupId, currentState) {
    setTogglingId(playgroupId);
    const { error } = await supabase
      .from("playgroups")
      .update({ is_active: !currentState })
      .eq("id", playgroupId);
    if (!error) {
      setPlaygroups((prev) =>
        prev.map((pg) =>
          pg.id === playgroupId ? { ...pg, is_active: !currentState } : pg
        )
      );
      // Update active count
      setStats((prev) => ({
        ...prev,
        totalPlaygroups: prev.totalPlaygroups + (currentState ? -1 : 1),
      }));
    }
    setTogglingId(null);
  }

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      const timer = setTimeout(() => navigate("/browse"), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, isAdmin]);

  // Access denied screen
  if (!authLoading && (!user || !isAdmin)) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="font-heading text-2xl text-charcoal font-semibold mb-2">
            Access Denied
          </h1>
          <p className="text-taupe text-sm mb-4">
            You do not have permission to view this page. Redirecting...
          </p>
          <button
            onClick={() => navigate("/browse")}
            className="text-sage-dark text-sm font-medium underline"
          >
            Go to Browse
          </button>
        </div>
      </div>
    );
  }

  // Loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-sage border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "playgroups", label: "Playgroups" },
    { key: "requests", label: "Requests" },
  ];

  // Derive user role from memberships
  function getUserRole(userId) {
    const pgCreated = playgroups.find((pg) => pg.creator_id === userId);
    if (pgCreated) return "host";
    const mem = memberships.find((m) => m.user_id === userId);
    return mem?.role || "none";
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/browse")}
            className="w-9 h-9 rounded-xl bg-white border border-cream-dark flex items-center justify-center text-charcoal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="font-heading text-xl font-semibold text-charcoal">
            Admin Dashboard
          </h1>
          <div className="ml-auto">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="w-9 h-9 rounded-xl bg-white border border-cream-dark flex items-center justify-center text-taupe hover:text-charcoal transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? "animate-spin" : ""}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-charcoal text-white"
                  : "bg-white border border-cream-dark text-taupe hover:text-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-sage border-t-transparent animate-spin" />
            <p className="text-taupe text-sm">Loading admin data...</p>
          </div>
        )}

        {/* Overview Tab */}
        {!loading && activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Users"
                value={stats.totalUsers}
                icon="👥"
              />
              <StatCard
                label="Active Playgroups"
                value={stats.totalPlaygroups}
                icon="🏠"
              />
              <StatCard
                label="Pending Requests"
                value={stats.totalPending}
                icon="⏳"
              />
              <StatCard
                label="Active Members"
                value={stats.totalMembers}
                icon="✅"
              />
            </div>

            {/* Quick Summary */}
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h2 className="font-heading text-lg font-semibold text-charcoal mb-3">
                Quick Summary
              </h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-taupe">Profiles with bio</span>
                  <span className="font-medium text-charcoal">
                    {profiles.filter((p) => p.bio && p.bio.trim().length > 0).length}{" "}
                    / {profiles.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-taupe">Profiles with children</span>
                  <span className="font-medium text-charcoal">
                    {Object.keys(childrenCounts).length} / {profiles.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-taupe">Hosts</span>
                  <span className="font-medium text-charcoal">
                    {new Set(playgroups.map((pg) => pg.creator_id)).size}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-taupe">Inactive playgroups</span>
                  <span className="font-medium text-charcoal">
                    {playgroups.filter((pg) => !pg.is_active).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-lg font-semibold text-charcoal">
                  Recent Activity
                </h2>
                <button
                  onClick={() => setActiveTab("requests")}
                  className="text-sage-dark text-xs font-medium"
                >
                  View all
                </button>
              </div>
              {recentRequests.length === 0 ? (
                <p className="text-taupe text-sm">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-charcoal truncate">
                          <span className="font-medium">
                            {req.profiles?.first_name || "User"}{" "}
                            {req.profiles?.last_name || ""}
                          </span>
                        </p>
                        <p className="text-xs text-taupe truncate">
                          {req.playgroups?.name || "Playgroup"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={req.role} />
                        <span className="text-xs text-taupe whitespace-nowrap">
                          {timeAgo(req.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {!loading && activeTab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading text-lg font-semibold text-charcoal">
                All Users
              </h2>
              <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
                {profiles.length} total
              </span>
            </div>
            {profiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
                <p className="text-taupe text-sm">No users found</p>
              </div>
            ) : (
              profiles.map((profile) => {
                const role = getUserRole(profile.id);
                const kidCount = childrenCounts[profile.id] || 0;
                const hasBio = profile.bio && profile.bio.trim().length > 0;
                return (
                  <div
                    key={profile.id}
                    className="bg-white rounded-2xl border border-cream-dark p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-sage-dark">
                          {(profile.first_name?.[0] || "?").toUpperCase()}
                          {(profile.last_name?.[0] || "").toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-charcoal text-sm truncate">
                            {profile.first_name || "—"} {profile.last_name || ""}
                          </p>
                          {role !== "none" && <StatusBadge status={role} />}
                        </div>
                        <p className="text-xs text-taupe mt-0.5 truncate">
                          ID: {profile.id.slice(0, 8)}...
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-taupe">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              hasBio ? "text-sage-dark" : "text-taupe"
                            }`}
                          >
                            {hasBio ? "✓" : "✗"} Bio
                          </span>
                          <span>
                            {kidCount} {kidCount === 1 ? "child" : "children"}
                          </span>
                          <span>
                            Joined{" "}
                            {profile.created_at
                              ? new Date(profile.created_at).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <button
                        className="shrink-0 px-3 py-1.5 rounded-lg border border-cream-dark text-xs text-taupe hover:text-charcoal hover:border-charcoal/20 transition-colors"
                        onClick={() => {}}
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Playgroups Tab */}
        {!loading && activeTab === "playgroups" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading text-lg font-semibold text-charcoal">
                All Playgroups
              </h2>
              <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
                {playgroups.length} total
              </span>
            </div>
            {playgroups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
                <p className="text-taupe text-sm">No playgroups found</p>
              </div>
            ) : (
              playgroups.map((pg) => {
                const host = pg.profiles;
                const hostName = host
                  ? `${host.first_name || ""} ${host.last_name || ""}`.trim()
                  : "Unknown";
                const memberCount = pg.memberships
                  ? pg.memberships.filter((m) => m.role === "member").length
                  : 0;
                const pendingCount = pg.memberships
                  ? pg.memberships.filter((m) => m.role === "pending").length
                  : 0;
                return (
                  <div
                    key={pg.id}
                    className="bg-white rounded-2xl border border-cream-dark p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-charcoal text-sm truncate">
                            {pg.name}
                          </h3>
                          <span
                            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                              pg.is_active ? "bg-sage" : "bg-cream-dark"
                            }`}
                          />
                        </div>
                        <p className="text-xs text-taupe mt-0.5">
                          Hosted by {hostName}
                        </p>
                        <p className="text-xs text-taupe mt-0.5">
                          {pg.location_name || "No location"}
                        </p>
                      </div>
                      <button
                        onClick={() => togglePlaygroupActive(pg.id, pg.is_active)}
                        disabled={togglingId === pg.id}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          pg.is_active
                            ? "bg-cream-dark text-taupe-dark hover:bg-terracotta-light"
                            : "bg-sage-light text-sage-dark hover:bg-sage"
                        }`}
                      >
                        {togglingId === pg.id
                          ? "..."
                          : pg.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-taupe flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-sage-dark font-medium">
                          {memberCount}
                        </span>{" "}
                        members
                      </span>
                      {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-terracotta font-medium">
                            {pendingCount}
                          </span>{" "}
                          pending
                        </span>
                      )}
                      <span className="capitalize">
                        {pg.access_type || "request"} access
                      </span>
                      <span>
                        Max {pg.max_families || "—"} families
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Requests Tab */}
        {!loading && activeTab === "requests" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading text-lg font-semibold text-charcoal">
                Recent Join Requests
              </h2>
              <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
                {recentRequests.length} shown
              </span>
            </div>
            {recentRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
                <p className="text-taupe text-sm">No join requests found</p>
              </div>
            ) : (
              recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-cream-dark p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal truncate">
                        {req.profiles?.first_name || "Unknown"}{" "}
                        {req.profiles?.last_name || "User"}
                      </p>
                      <p className="text-xs text-taupe mt-0.5 truncate">
                        {req.playgroups?.name || "Unknown Playgroup"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={req.role} />
                      <span className="text-xs text-taupe whitespace-nowrap">
                        {timeAgo(req.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

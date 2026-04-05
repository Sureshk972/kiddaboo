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
    reviewed: "bg-sage-light text-sage-dark",
    dismissed: "bg-cream-dark text-taupe",
    suspended: "bg-red-100 text-red-700",
    active: "bg-sage-light text-sage-dark",
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

function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading }) {
  return (
    <>
      <div className="fixed inset-0 bg-charcoal/40 z-40" onClick={!loading ? onCancel : undefined} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h3 className="font-heading font-bold text-charcoal text-lg mb-2">{title}</h3>
          <p className="text-sm text-taupe leading-relaxed mb-5">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${confirmColor || "bg-red-500 hover:bg-red-600"} text-white font-medium rounded-xl py-3 text-sm cursor-pointer border-none transition-colors disabled:opacity-50`}
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-white border border-cream-dark text-charcoal font-medium rounded-xl py-3 text-sm cursor-pointer transition-colors hover:bg-cream-dark/50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
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
    totalReports: null,
    openReports: null,
    totalReviews: null,
    totalBlocks: null,
  });
  const [profiles, setProfiles] = useState([]);
  const [childrenCounts, setChildrenCounts] = useState({});
  const [memberships, setMemberships] = useState([]);
  const [playgroups, setPlaygroups] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [togglingId, setTogglingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        fetchReports(),
        fetchReviews(),
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

  async function fetchReports() {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `*, reporter:reporter_id(first_name, last_name), reported:reported_user_id(first_name, last_name)`
      )
      .order("created_at", { ascending: false });
    if (!error && data) {
      setReports(data);
      setStats((prev) => ({
        ...prev,
        totalReports: data.length,
        openReports: data.filter((r) => r.status === "pending").length,
      }));
    }
  }

  async function fetchReviews() {
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `*, profiles:reviewer_id(first_name, last_name), playgroups:playgroup_id(name)`
      )
      .order("created_at", { ascending: false });
    if (!error && data) {
      setReviews(data);
      setStats((prev) => ({ ...prev, totalReviews: data.length }));
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
      setStats((prev) => ({
        ...prev,
        totalPlaygroups: prev.totalPlaygroups + (currentState ? -1 : 1),
      }));
    }
    setTogglingId(null);
  }

  async function updateReportStatus(reportId, newStatus) {
    setActionLoading(true);
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);
    if (!error) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      setStats((prev) => ({
        ...prev,
        openReports:
          newStatus === "pending"
            ? prev.openReports + 1
            : prev.openReports - 1,
      }));
    }
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function deleteReview(reviewId) {
    setActionLoading(true);
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (!error) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setStats((prev) => ({ ...prev, totalReviews: prev.totalReviews - 1 }));
    }
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function suspendUser(userId) {
    setActionLoading(true);
    // Remove all memberships (effectively suspends their access)
    await supabase.from("memberships").delete().eq("user_id", userId);
    // Deactivate their playgroups
    await supabase
      .from("playgroups")
      .update({ is_active: false })
      .eq("creator_id", userId);
    // Mark profile as suspended
    await supabase
      .from("profiles")
      .update({ is_suspended: true })
      .eq("id", userId);
    // Refresh data
    await fetchAllData();
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function unsuspendUser(userId) {
    setActionLoading(true);
    await supabase
      .from("profiles")
      .update({ is_suspended: false })
      .eq("id", userId);
    await fetchAllData();
    setActionLoading(false);
    setConfirmAction(null);
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
    { key: "reports", label: `Reports${stats.openReports ? ` (${stats.openReports})` : ""}` },
    { key: "reviews", label: "Reviews" },
    { key: "requests", label: "Requests" },
  ];

  // Derive user role from memberships
  function getUserRole(userId) {
    const profile = profiles.find((p) => p.id === userId);
    if (profile?.is_suspended) return "suspended";
    const pgCreated = playgroups.find((pg) => pg.creator_id === userId);
    if (pgCreated) return "host";
    const mem = memberships.find((m) => m.user_id === userId);
    return mem?.role || "none";
  }

  // Get user name by ID
  function getUserName(userId) {
    const p = profiles.find((pr) => pr.id === userId);
    if (!p) return "Unknown";
    return `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
  }

  // Filter reports
  const filteredReports =
    reportFilter === "all"
      ? reports
      : reports.filter((r) => r.status === reportFilter);

  // Filter users by search
  const filteredProfiles = searchQuery
    ? profiles.filter((p) => {
        const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        const id = p.id.toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || id.includes(q);
      })
    : profiles;

  // Star rating display
  function Stars({ rating }) {
    return (
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={i <= Math.round(rating) ? "#A3B18A" : "none"}
            stroke="#A3B18A"
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/browse")}
            className="w-9 h-9 rounded-xl bg-white border border-cream-dark flex items-center justify-center text-charcoal cursor-pointer"
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
              className="w-9 h-9 rounded-xl bg-white border border-cream-dark flex items-center justify-center text-taupe hover:text-charcoal transition-colors disabled:opacity-50 cursor-pointer"
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-none ${
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

        {/* ─── Overview Tab ─── */}
        {!loading && activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Users" value={stats.totalUsers} icon="👥" />
              <StatCard label="Active Playgroups" value={stats.totalPlaygroups} icon="🏠" />
              <StatCard label="Pending Requests" value={stats.totalPending} icon="⏳" />
              <StatCard label="Active Members" value={stats.totalMembers} icon="✅" />
              <StatCard label="Open Reports" value={stats.openReports} icon="🚩" />
              <StatCard label="Total Reviews" value={stats.totalReviews} icon="⭐" />
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
                <div className="flex justify-between items-center">
                  <span className="text-taupe">Suspended users</span>
                  <span className="font-medium text-charcoal">
                    {profiles.filter((p) => p.is_suspended).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-taupe">Total reports filed</span>
                  <span className="font-medium text-charcoal">
                    {stats.totalReports || 0}
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
                  className="text-sage-dark text-xs font-medium cursor-pointer bg-transparent border-none"
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

            {/* Open Reports Preview */}
            {stats.openReports > 0 && (
              <div className="bg-white rounded-2xl border border-red-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-red-600">
                    Open Reports
                  </h2>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className="text-red-500 text-xs font-medium cursor-pointer bg-transparent border-none"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {reports
                    .filter((r) => r.status === "pending")
                    .slice(0, 3)
                    .map((report) => (
                      <div key={report.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-charcoal truncate">
                            <span className="font-medium">
                              {report.reporter?.first_name || "User"}{" "}
                              {report.reporter?.last_name || ""}
                            </span>
                            {" reported "}
                            <span className="font-medium">
                              {report.reported?.first_name || "User"}{" "}
                              {report.reported?.last_name || ""}
                            </span>
                          </p>
                          <p className="text-xs text-taupe capitalize">
                            {report.report_type?.replace(/_/g, " ")}
                          </p>
                        </div>
                        <span className="text-xs text-taupe whitespace-nowrap">
                          {timeAgo(report.created_at)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Users Tab ─── */}
        {!loading && activeTab === "users" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading text-lg font-semibold text-charcoal">
                All Users
              </h2>
              <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
                {filteredProfiles.length} total
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A3A08C"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search users by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-cream-dark rounded-xl py-2.5 pl-9 pr-4 text-sm text-charcoal placeholder:text-taupe/50 outline-none focus:border-sage-light"
              />
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
                <p className="text-taupe text-sm">No users found</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const role = getUserRole(profile.id);
                const kidCount = childrenCounts[profile.id] || 0;
                const hasBio = profile.bio && profile.bio.trim().length > 0;
                const isSuspended = profile.is_suspended;
                const reportCount = reports.filter(
                  (r) => r.reported_user_id === profile.id
                ).length;
                return (
                  <div
                    key={profile.id}
                    className={`bg-white rounded-2xl border p-4 ${
                      isSuspended ? "border-red-200" : "border-cream-dark"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isSuspended ? "bg-red-100" : "bg-sage-light"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            isSuspended ? "text-red-600" : "text-sage-dark"
                          }`}
                        >
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
                        <div className="flex items-center gap-3 mt-2 text-xs text-taupe flex-wrap">
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
                          {reportCount > 0 && (
                            <span className="text-red-500 font-medium">
                              {reportCount} {reportCount === 1 ? "report" : "reports"}
                            </span>
                          )}
                          <span>
                            Joined{" "}
                            {profile.created_at
                              ? new Date(profile.created_at).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isSuspended) {
                            setConfirmAction({
                              type: "unsuspend",
                              title: "Unsuspend User",
                              message: `Restore access for ${profile.first_name || "this user"}? They will be able to use the app again.`,
                              confirmLabel: "Unsuspend",
                              confirmColor: "bg-sage hover:bg-sage-dark",
                              onConfirm: () => unsuspendUser(profile.id),
                            });
                          } else {
                            setConfirmAction({
                              type: "suspend",
                              title: "Suspend User",
                              message: `Suspend ${profile.first_name || "this user"}? This will remove all their memberships and deactivate their playgroups.`,
                              confirmLabel: "Suspend",
                              onConfirm: () => suspendUser(profile.id),
                            });
                          }
                        }}
                        className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isSuspended
                            ? "border-sage bg-sage-light text-sage-dark hover:bg-sage hover:text-white"
                            : "border-cream-dark text-taupe hover:text-red-600 hover:border-red-200"
                        }`}
                      >
                        {isSuspended ? "Unsuspend" : "Suspend"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Playgroups Tab ─── */}
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
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer border-none ${
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
                      <span>Max {pg.max_families || "—"} families</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Reports Tab ─── */}
        {!loading && activeTab === "reports" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading text-lg font-semibold text-charcoal">
                User Reports
              </h2>
              <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
                {filteredReports.length} shown
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {["all", "pending", "reviewed", "dismissed"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReportFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-none capitalize ${
                    reportFilter === filter
                      ? "bg-charcoal text-white"
                      : "bg-white border border-cream-dark text-taupe hover:text-charcoal"
                  }`}
                >
                  {filter === "all" ? "All" : filter}
                  {filter === "pending" && stats.openReports
                    ? ` (${stats.openReports})`
                    : ""}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
                <p className="text-taupe text-sm">No reports found</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-white rounded-2xl border p-4 ${
                    report.status === "pending" ? "border-red-200" : "border-cream-dark"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={report.status} />
                        <span className="text-xs text-taupe">
                          {timeAgo(report.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal">
                        <span className="font-medium">
                          {report.reporter?.first_name || "User"}{" "}
                          {report.reporter?.last_name || ""}
                        </span>
                        {" reported "}
                        <span className="font-medium">
                          {report.reported?.first_name || "User"}{" "}
                          {report.reported?.last_name || ""}
                        </span>
                      </p>
                      <p className="text-xs text-taupe mt-1 capitalize">
                        Reason: {report.report_type?.replace(/_/g, " ")}
                      </p>
                      {report.description && (
                        <p className="text-xs text-taupe-dark mt-1.5 bg-cream-dark/50 rounded-lg p-2.5 leading-relaxed">
                          "{report.description}"
                        </p>
                      )}
                    </div>
                  </div>
                  {report.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "review-report",
                            title: "Mark as Reviewed",
                            message: `Mark this report as reviewed? You can also suspend the reported user from the Users tab.`,
                            confirmLabel: "Mark Reviewed",
                            confirmColor: "bg-sage hover:bg-sage-dark",
                            onConfirm: () => updateReportStatus(report.id, "reviewed"),
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-sage-light text-sage-dark text-xs font-medium hover:bg-sage hover:text-white transition-colors cursor-pointer border-none"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "dismiss-report",
                            title: "Dismiss Report",
                            message: `Dismiss this report? It will be marked as not requiring action.`,
                            confirmLabel: "Dismiss",
                            confirmColor: "bg-taupe hover:bg-taupe-dark",
                            onConfirm: () => updateReportStatus(report.id, "dismissed"),
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-cream-dark text-taupe text-xs font-medium hover:bg-terracotta-light transition-colors cursor-pointer border-none"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "suspend-reported",
                            title: "Suspend Reported User",
                            message: `Suspend ${
                              report.reported?.first_name || "this user"
                            }? This will remove all their memberships and deactivate their playgroups.`,
                            confirmLabel: "Suspend User",
                            onConfirm: async () => {
                              await suspendUser(report.reported_user_id);
                              await updateReportStatus(report.id, "reviewed");
                            },
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer border-none"
                      >
                        Suspend User
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Reviews Tab ─── */}
        {!loading && activeTab === "reviews" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-heading text-lg font-semibold text-charcoal">
                All Reviews
              </h2>
              <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
                {reviews.length} total
              </span>
            </div>
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
                <p className="text-taupe text-sm">No reviews yet</p>
              </div>
            ) : (
              reviews.map((review) => {
                const avgRating =
                  ((review.rating_environment || 0) +
                    (review.rating_organization || 0) +
                    (review.rating_compatibility || 0) +
                    (review.rating_reliability || 0)) /
                  4;
                return (
                  <div
                    key={review.id}
                    className="bg-white rounded-2xl border border-cream-dark p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Stars rating={avgRating} />
                          <span className="text-xs text-taupe font-medium">
                            {avgRating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal font-medium">
                          {review.profiles?.first_name || "User"}{" "}
                          {review.profiles?.last_name || ""}
                        </p>
                        <p className="text-xs text-taupe mt-0.5">
                          on {review.playgroups?.name || "Unknown Playgroup"}
                        </p>
                        {review.comment && (
                          <p className="text-xs text-taupe-dark mt-1.5 bg-cream-dark/50 rounded-lg p-2.5 leading-relaxed">
                            "{review.comment}"
                          </p>
                        )}
                        <p className="text-xs text-taupe mt-1.5">
                          {timeAgo(review.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: "delete-review",
                            title: "Delete Review",
                            message: `Delete this review by ${
                              review.profiles?.first_name || "User"
                            }? This action cannot be undone.`,
                            confirmLabel: "Delete",
                            onConfirm: () => deleteReview(review.id),
                          })
                        }
                        className="shrink-0 px-3 py-1.5 rounded-lg border border-cream-dark text-xs text-taupe hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Requests Tab ─── */}
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

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          confirmColor={confirmAction.confirmColor}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

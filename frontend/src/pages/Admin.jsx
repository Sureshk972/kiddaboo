import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { timeAgo } from "./admin/timeAgo";

import ConfirmModal from "./admin/ConfirmModal";
import UsersTab from "./admin/UsersTab";
import PlaygroupsTab from "./admin/PlaygroupsTab";
import ReportsTab from "./admin/ReportsTab";
import ReviewsTab from "./admin/ReviewsTab";
import RequestsTab from "./admin/RequestsTab";
import SubscriptionsTab from "./admin/SubscriptionsTab";
import AnalyticsTab from "./admin/AnalyticsTab";
import AuditLogTab from "./admin/AuditLogTab";

// Admin access is now enforced via database role column + RequireAdmin wrapper in App.jsx

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
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
  const [subscriptions, setSubscriptions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        fetchSubscriptions(),
        fetchAuditLog(),
        fetchAdminStats(),
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
      .select("id, first_name, last_name, bio, photo_url, philosophy_tags, trust_score, is_verified, created_at, updated_at, notification_prefs, role")
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

  async function fetchSubscriptions() {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, profiles:user_id(first_name, last_name)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setSubscriptions(data);
    }
  }

  async function fetchAuditLog() {
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("*, profiles:admin_id(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) {
      setAuditLogs(data);
    }
  }

  async function fetchAdminStats() {
    const { data, error } = await supabase.rpc("get_admin_stats");
    if (!error && data) {
      setAdminStats(data);
    }
  }

  // Audit log helper — fire-and-forget
  async function logAdminAction(action, targetType, targetId, details = {}) {
    if (!user) return;
    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  }

  async function togglePlaygroupActive(playgroupId, currentState) {
    setTogglingId(playgroupId);
    const { error } = await supabase
      .from("playgroups")
      .update({ is_active: !currentState })
      .eq("id", playgroupId);
    if (!error) {
      logAdminAction(currentState ? "deactivate_playgroup" : "activate_playgroup", "playgroup", playgroupId);
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
      logAdminAction("update_report", "report", reportId, { new_status: newStatus });
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
      logAdminAction("delete_review", "review", reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setStats((prev) => ({ ...prev, totalReviews: prev.totalReviews - 1 }));
    }
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function suspendUser(userId) {
    setActionLoading(true);
    await supabase.from("memberships").delete().eq("user_id", userId);
    await supabase
      .from("playgroups")
      .update({ is_active: false })
      .eq("creator_id", userId);
    await supabase
      .from("profiles")
      .update({ is_suspended: true })
      .eq("id", userId);
    logAdminAction("suspend_user", "profile", userId);
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
    logAdminAction("unsuspend_user", "profile", userId);
    await fetchAllData();
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function deleteUser(userId) {
    setActionLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId }),
      }
    );
    const result = await res.json();
    if (!res.ok) {
      console.error("Delete user failed:", result.error);
      alert(`Failed to delete user: ${result.error}`);
    } else {
      logAdminAction("delete_user", "profile", userId);
    }
    await fetchAllData();
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function flagPlaygroup(playgroupId, reason) {
    const { error } = await supabase
      .from("playgroups")
      .update({
        is_flagged: true,
        flag_reason: reason,
        flagged_at: new Date().toISOString(),
        flagged_by: user.id,
      })
      .eq("id", playgroupId);
    if (!error) {
      logAdminAction("flag_playgroup", "playgroup", playgroupId, { reason });
      setPlaygroups((prev) =>
        prev.map((pg) =>
          pg.id === playgroupId
            ? { ...pg, is_flagged: true, flag_reason: reason, flagged_at: new Date().toISOString(), flagged_by: user.id }
            : pg
        )
      );
    }
    setConfirmAction(null);
  }

  async function unflagPlaygroup(playgroupId) {
    const { error } = await supabase
      .from("playgroups")
      .update({
        is_flagged: false,
        flag_reason: null,
        flagged_at: null,
        flagged_by: null,
      })
      .eq("id", playgroupId);
    if (!error) {
      logAdminAction("unflag_playgroup", "playgroup", playgroupId);
      setPlaygroups((prev) =>
        prev.map((pg) =>
          pg.id === playgroupId
            ? { ...pg, is_flagged: false, flag_reason: null, flagged_at: null, flagged_by: null }
            : pg
        )
      );
    }
  }

  async function bulkDeactivatePlaygroups(ids) {
    setActionLoading(true);
    for (const id of ids) {
      await supabase
        .from("playgroups")
        .update({ is_active: false })
        .eq("id", id);
    }
    logAdminAction("bulk_deactivate_playgroups", "playgroup", ids[0], { count: ids.length, ids });
    const deactivatedActive = playgroups.filter((pg) => ids.includes(pg.id) && pg.is_active).length;
    setPlaygroups((prev) =>
      prev.map((pg) => (ids.includes(pg.id) ? { ...pg, is_active: false } : pg))
    );
    setStats((prev) => ({
      ...prev,
      totalPlaygroups: prev.totalPlaygroups - deactivatedActive,
    }));
    setActionLoading(false);
    setConfirmAction(null);
  }

  async function bulkFlagPlaygroups(ids, reason) {
    setActionLoading(true);
    const now = new Date().toISOString();
    for (const id of ids) {
      await supabase
        .from("playgroups")
        .update({
          is_flagged: true,
          flag_reason: reason,
          flagged_at: now,
          flagged_by: user.id,
        })
        .eq("id", id);
    }
    logAdminAction("bulk_flag_playgroups", "playgroup", ids[0], { count: ids.length, ids, reason });
    setPlaygroups((prev) =>
      prev.map((pg) =>
        ids.includes(pg.id)
          ? { ...pg, is_flagged: true, flag_reason: reason, flagged_at: now, flagged_by: user.id }
          : pg
      )
    );
    setActionLoading(false);
    setConfirmAction(null);
  }

  // Derive user role from memberships
  function getUserRole(userId) {
    const profile = profiles.find((p) => p.id === userId);
    // is_suspended not available via PostgREST yet — skip suspended check for now
    const pgCreated = playgroups.find((pg) => pg.creator_id === userId);
    if (pgCreated) return "host";
    const mem = memberships.find((m) => m.user_id === userId);
    return mem?.role || "none";
  }

  const [activeSection, setActiveSection] = useState("dashboard");

  // Loading state during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#eeffdf] flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="w-10 h-10 rounded-full border-3 border-[#44533b] border-t-transparent animate-spin" />
      </div>
    );
  }

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "users", label: "Users", icon: "group" },
    { key: "playgroups", label: "Playgroups", icon: "child_care" },
    { key: "reports", label: "Reports", icon: "flag", badge: stats.openReports },
    { key: "reviews", label: "Reviews", icon: "rate_review" },
    { key: "requests", label: "Requests", icon: "pending_actions" },
    { key: "subscriptions", label: "Subscriptions", icon: "payments" },
    { key: "analytics", label: "Analytics", icon: "analytics" },
    { key: "audit", label: "Audit Log", icon: "history" },
  ];

  const activePlaygroups = playgroups.filter((pg) => pg.is_active).length;

  return (
    <div className="min-h-screen bg-[#eeffdf]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar — desktop only */}
      <aside className="fixed left-0 top-0 h-full hidden md:flex flex-col p-6 w-72 bg-[#e8f9d9] z-50">
        <div className="mb-10">
          <span className="text-2xl font-black text-[#44533b] tracking-tighter" style={{ fontFamily: "'Manrope', sans-serif" }}>Kiddaboo</span>
        </div>
        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer text-left ${
                activeSection === item.key
                  ? "text-[#44533b] font-bold bg-white"
                  : "text-[#5c6b52] hover:bg-white/50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-semibold tracking-tight text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <button
            onClick={() => navigate("/browse")}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#5c6b52] hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-semibold tracking-tight text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>Back to App</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-72 min-h-screen">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 flex justify-between items-center px-6 md:px-8 h-16 md:h-20 bg-[#eeffdf]/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-[#44533b] cursor-pointer" onClick={() => navigate("/browse")}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold text-[#44533b]" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {sidebarItems.find((s) => s.key === activeSection)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="text-[#5c6b52] hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-40"
              title="Refresh data"
            >
              <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>refresh</span>
            </button>
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Admin" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#44533b]/10" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#d7e8c9] flex items-center justify-center ring-2 ring-[#44533b]/10">
                <span className="text-sm font-bold text-[#44533b]">
                  {(profile?.first_name?.[0] || "A").toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Mobile section pills */}
        <div className="md:hidden px-4 pt-3 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border-none ${
                activeSection === item.key
                  ? "bg-[#44533b] text-white"
                  : "bg-white text-[#5c6b52]"
              }`}
            >
              {item.label}
              {item.badge > 0 && ` (${item.badge})`}
            </button>
          ))}
        </div>

        <main className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-[#44533b] border-t-transparent animate-spin" />
              <p className="text-[#5c6b52] text-sm">Loading admin data...</p>
            </div>
          )}

          {!loading && activeSection === "dashboard" && (
            <>
              {/* Welcome */}
              <section className="space-y-2">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter text-[#44533b]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Welcome back{profile?.first_name ? `, ${profile.first_name}` : ""}
                </h2>
                <p className="text-[#5c6b52] text-lg">Here is what's happening with Kiddaboo today.</p>
              </section>

              {/* Stat Cards */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 md:p-8 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-[#44533b] text-3xl">groups</span>
                  </div>
                  <div className="mt-6 md:mt-8">
                    <h3 className="text-[#5c6b52] text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Total Users</h3>
                    <p className="text-4xl md:text-5xl font-black text-[#44533b] mt-2" style={{ fontFamily: "'Manrope', sans-serif" }}>{stats.totalUsers ?? "—"}</p>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined" style={{ fontSize: "120px", transform: "translate(25%, 25%)" }}>groups</span>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-[#44533b] text-3xl">child_care</span>
                    <div className="text-[#5c6b52] font-bold text-xs">Active Now</div>
                  </div>
                  <div className="mt-6 md:mt-8">
                    <h3 className="text-[#5c6b52] text-xs font-bold uppercase tracking-widest">Active Playgroups</h3>
                    <p className="text-4xl md:text-5xl font-black text-[#44533b] mt-2" style={{ fontFamily: "'Manrope', sans-serif" }}>{activePlaygroups}</p>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined" style={{ fontSize: "120px", transform: "translate(25%, 25%)" }}>child_care</span>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-[#87503a] text-3xl">flag</span>
                    {stats.openReports > 0 && (
                      <div className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold">Action Needed</div>
                    )}
                  </div>
                  <div className="mt-6 md:mt-8">
                    <h3 className="text-[#5c6b52] text-xs font-bold uppercase tracking-widest">Open Reports</h3>
                    <p className="text-4xl md:text-5xl font-black text-[#44533b] mt-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      {String(stats.openReports ?? 0).padStart(2, "0")}
                    </p>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined" style={{ fontSize: "120px", transform: "translate(25%, 25%)" }}>flag</span>
                  </div>
                </div>
              </section>

              {/* Activity & Quick Actions Grid */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold tracking-tight text-[#44533b]" style={{ fontFamily: "'Manrope', sans-serif" }}>Recent Activity</h3>
                    <button onClick={() => setActiveSection("audit")} className="text-[#44533b] font-bold text-sm hover:underline underline-offset-4 cursor-pointer bg-transparent border-none">
                      View All Logs
                    </button>
                  </div>
                  <div className="bg-[#e8f9d9] rounded-2xl overflow-hidden">
                    <div className="divide-y divide-[#d7e8c9]/50">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="p-5 md:p-6 flex items-center gap-4 hover:bg-white/50 transition-colors">
                          <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                            log.action?.includes("delete") || log.action?.includes("suspend")
                              ? "bg-red-50 text-red-600"
                              : log.action?.includes("flag")
                              ? "bg-amber-50 text-amber-600"
                              : "bg-[#d7e8c9] text-[#44533b]"
                          }`}>
                            <span className="material-symbols-outlined text-[20px]">
                              {log.action?.includes("delete") ? "delete" :
                               log.action?.includes("suspend") ? "block" :
                               log.action?.includes("flag") ? "flag" :
                               log.action?.includes("playgroup") ? "child_care" :
                               log.action?.includes("report") ? "flag" :
                               log.action?.includes("review") ? "rate_review" : "history"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#121f0c] font-semibold text-sm truncate">
                              {log.profiles?.first_name || "Admin"}: <span className="text-[#44533b]">{log.action?.replace(/_/g, " ")}</span>
                            </p>
                            <p className="text-[#5c6b52] text-xs mt-0.5">
                              {log.target_type} {log.target_id ? `• ${log.target_id.slice(0, 8)}...` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-[#5c6b52] font-medium shrink-0">{timeAgo(log.created_at)}</span>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <div className="p-8 text-center text-[#5c6b52] text-sm">No recent activity</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-4 space-y-6">
                  <h3 className="text-2xl font-bold tracking-tight text-[#44533b]" style={{ fontFamily: "'Manrope', sans-serif" }}>Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => setActiveSection("users")}
                      className="flex items-center gap-4 p-5 bg-[#44533b] text-white rounded-xl hover:bg-[#5c6b52] transition-all text-left shadow-lg shadow-[#44533b]/10 group cursor-pointer border-none"
                    >
                      <span className="material-symbols-outlined p-2 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">manage_accounts</span>
                      <div>
                        <span className="block font-bold">Manage Users</span>
                        <span className="text-xs opacity-70">Audit accounts & permissions</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveSection("playgroups")}
                      className="flex items-center gap-4 p-5 bg-white text-[#44533b] rounded-xl hover:bg-[#44533b] hover:text-white transition-all text-left border border-[#d7e8c9] group cursor-pointer"
                    >
                      <span className="material-symbols-outlined p-2 bg-[#44533b]/5 rounded-lg group-hover:bg-white/10 transition-colors">child_care</span>
                      <div>
                        <span className="block font-bold">Manage Playgroups</span>
                        <span className="text-xs text-[#5c6b52] group-hover:text-white/70">Flag, deactivate, moderate</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveSection("reports")}
                      className="flex items-center gap-4 p-5 bg-white text-[#44533b] rounded-xl hover:bg-[#44533b] hover:text-white transition-all text-left border border-[#d7e8c9] group cursor-pointer"
                    >
                      <span className="material-symbols-outlined p-2 bg-[#44533b]/5 rounded-lg group-hover:bg-white/10 transition-colors">flag</span>
                      <div>
                        <span className="block font-bold">Review Reports</span>
                        <span className="text-xs text-[#5c6b52] group-hover:text-white/70">{stats.openReports || 0} pending reports</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveSection("analytics")}
                      className="flex items-center gap-4 p-5 bg-white text-[#44533b] rounded-xl hover:bg-[#44533b] hover:text-white transition-all text-left border border-[#d7e8c9] group cursor-pointer"
                    >
                      <span className="material-symbols-outlined p-2 bg-[#44533b]/5 rounded-lg group-hover:bg-white/10 transition-colors">analytics</span>
                      <div>
                        <span className="block font-bold">View Analytics</span>
                        <span className="text-xs text-[#5c6b52] group-hover:text-white/70">Growth, heatmap & metrics</span>
                      </div>
                    </button>
                  </div>

                  {/* Platform Health */}
                  <div className="p-6 bg-[#feb69a] text-[#350f02] rounded-2xl relative overflow-hidden">
                    <h4 className="font-bold mb-2">Platform Health</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-green-700 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">All systems operational</span>
                    </div>
                    <div className="h-2 bg-[#350f02]/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#350f02] rounded-full" style={{ width: "98%" }}></div>
                    </div>
                    <p className="text-[10px] mt-2 opacity-60 uppercase tracking-wider">
                      {profiles.length} users • {playgroups.length} playgroups • {subscriptions.length} subs
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Section views */}
          {!loading && activeSection === "users" && (
            <UsersTab
              profiles={profiles}
              reports={reports}
              childrenCounts={childrenCounts}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              getUserRole={getUserRole}
              setConfirmAction={setConfirmAction}
              suspendUser={suspendUser}
              unsuspendUser={unsuspendUser}
              deleteUser={deleteUser}
            />
          )}

          {!loading && activeSection === "playgroups" && (
            <PlaygroupsTab
              playgroups={playgroups}
              togglingId={togglingId}
              togglePlaygroupActive={togglePlaygroupActive}
              flagPlaygroup={flagPlaygroup}
              unflagPlaygroup={unflagPlaygroup}
              bulkDeactivatePlaygroups={bulkDeactivatePlaygroups}
              bulkFlagPlaygroups={bulkFlagPlaygroups}
              setConfirmAction={setConfirmAction}
            />
          )}

          {!loading && activeSection === "reports" && (
            <ReportsTab
              reports={reports}
              stats={stats}
              reportFilter={reportFilter}
              setReportFilter={setReportFilter}
              setConfirmAction={setConfirmAction}
              updateReportStatus={updateReportStatus}
              suspendUser={suspendUser}
            />
          )}

          {!loading && activeSection === "reviews" && (
            <ReviewsTab
              reviews={reviews}
              setConfirmAction={setConfirmAction}
              deleteReview={deleteReview}
            />
          )}

          {!loading && activeSection === "requests" && (
            <RequestsTab recentRequests={recentRequests} />
          )}

          {!loading && activeSection === "subscriptions" && (
            <SubscriptionsTab subscriptions={subscriptions} />
          )}

          {!loading && activeSection === "analytics" && (
            <AnalyticsTab adminStats={adminStats} playgroups={playgroups} />
          )}

          {!loading && activeSection === "audit" && (
            <AuditLogTab auditLogs={auditLogs} />
          )}
        </main>
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

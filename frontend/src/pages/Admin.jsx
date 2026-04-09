import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import ConfirmModal from "./admin/ConfirmModal";
import OverviewTab from "./admin/OverviewTab";
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
  const [activeTab, setActiveTab] = useState("overview");
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
    { key: "subscriptions", label: "Subs" },
    { key: "analytics", label: "Analytics" },
    { key: "audit", label: "Audit" },
  ];

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

        {!loading && activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            profiles={profiles}
            playgroups={playgroups}
            childrenCounts={childrenCounts}
            recentRequests={recentRequests}
            reports={reports}
            setActiveTab={setActiveTab}
          />
        )}

        {!loading && activeTab === "users" && (
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

        {!loading && activeTab === "playgroups" && (
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

        {!loading && activeTab === "reports" && (
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

        {!loading && activeTab === "reviews" && (
          <ReviewsTab
            reviews={reviews}
            setConfirmAction={setConfirmAction}
            deleteReview={deleteReview}
          />
        )}

        {!loading && activeTab === "requests" && (
          <RequestsTab recentRequests={recentRequests} />
        )}

        {!loading && activeTab === "subscriptions" && (
          <SubscriptionsTab subscriptions={subscriptions} />
        )}

        {!loading && activeTab === "analytics" && (
          <AnalyticsTab adminStats={adminStats} playgroups={playgroups} />
        )}

        {!loading && activeTab === "audit" && (
          <AuditLogTab auditLogs={auditLogs} />
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

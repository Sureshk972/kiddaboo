import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";
import { timeAgo } from "./timeAgo";

export default function OverviewTab({
  stats,
  profiles,
  playgroups,
  childrenCounts,
  recentRequests,
  reports,
  setActiveTab,
}) {
  return (
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
              0 {/* is_suspended not available via PostgREST yet */}
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
  );
}

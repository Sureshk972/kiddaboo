import StatusBadge from "./StatusBadge";
import { timeAgo } from "./timeAgo";

export default function ReportsTab({
  reports,
  stats,
  reportFilter,
  setReportFilter,
  setConfirmAction,
  updateReportStatus,
  suspendUser,
}) {
  const filteredReports =
    reportFilter === "all"
      ? reports
      : reports.filter((r) => r.status === reportFilter);

  return (
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
                    &ldquo;{report.description}&rdquo;
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
  );
}

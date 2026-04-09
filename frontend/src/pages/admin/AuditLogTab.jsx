import { useState } from "react";
import { timeAgo } from "./timeAgo";

const ACTION_LABELS = {
  suspend_user: "Suspended user",
  unsuspend_user: "Unsuspended user",
  deactivate_playgroup: "Deactivated playgroup",
  activate_playgroup: "Activated playgroup",
  flag_playgroup: "Flagged playgroup",
  unflag_playgroup: "Unflagged playgroup",
  bulk_deactivate_playgroups: "Bulk deactivated playgroups",
  bulk_flag_playgroups: "Bulk flagged playgroups",
  update_report: "Updated report",
  delete_review: "Deleted review",
};

function getActionLabel(action) {
  return ACTION_LABELS[action] || action?.replace(/_/g, " ") || "Unknown action";
}

export default function AuditLogTab({ auditLogs }) {
  const [actionFilter, setActionFilter] = useState("all");

  const actionTypes = ["all", ...new Set(auditLogs.map((log) => log.action).filter(Boolean))];

  const filtered =
    actionFilter === "all"
      ? auditLogs
      : auditLogs.filter((log) => log.action === actionFilter);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-lg font-semibold text-charcoal">
          Audit Log
        </h2>
        <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
          {filtered.length} entries
        </span>
      </div>

      {/* Filter by action type */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {actionTypes.map((action) => (
          <button
            key={action}
            onClick={() => setActionFilter(action)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-none ${
              actionFilter === action
                ? "bg-charcoal text-white"
                : "bg-white border border-cream-dark text-taupe hover:text-charcoal"
            }`}
          >
            {action === "all" ? "All" : getActionLabel(action)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">No audit log entries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => {
            const adminName = log.profiles
              ? `${log.profiles.first_name || ""} ${log.profiles.last_name || ""}`.trim()
              : "System";
            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-cream-dark p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal">
                      {getActionLabel(log.action)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-taupe flex-wrap">
                      <span>
                        Target: {log.target_type || "—"}{" "}
                        {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ""}
                      </span>
                      <span className="text-cream-dark">|</span>
                      <span>By: {adminName}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-taupe mt-1.5 bg-cream-dark/50 rounded-lg p-2 leading-relaxed">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-taupe whitespace-nowrap shrink-0">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

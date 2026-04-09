import StatusBadge from "./StatusBadge";
import { timeAgo } from "./timeAgo";

export default function RequestsTab({ recentRequests }) {
  return (
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
  );
}

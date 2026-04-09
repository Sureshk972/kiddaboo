import { useState } from "react";
import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";

const PRICES = {
  monthly: 799,
  annual: 7999,
  host_monthly: 499,
  host_annual: 4999,
};

function getSubType(sub) {
  if (sub.type === "host" || sub.plan_id?.includes("host")) return "Host Premium";
  return "Joiner";
}

function getSubPlan(sub) {
  if (sub.interval === "year" || sub.plan_id?.includes("annual")) return "Annual";
  return "Monthly";
}

function getMrrCents(sub) {
  const isHost = sub.type === "host" || sub.plan_id?.includes("host");
  const isAnnual = sub.interval === "year" || sub.plan_id?.includes("annual");
  if (isHost) {
    return isAnnual ? Math.round(PRICES.host_annual / 12) : PRICES.host_monthly;
  }
  return isAnnual ? Math.round(PRICES.annual / 12) : PRICES.monthly;
}

export default function SubscriptionsTab({ subscriptions }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const statusFilters = ["all", "active", "cancelled", "expired"];
  const typeFilters = ["all", "joiner", "host"];

  const filtered = subscriptions.filter((sub) => {
    if (statusFilter !== "all" && sub.status !== statusFilter) return false;
    if (typeFilter === "joiner" && (sub.type === "host" || sub.plan_id?.includes("host"))) return false;
    if (typeFilter === "host" && sub.type !== "host" && !sub.plan_id?.includes("host")) return false;
    return true;
  });

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const activeJoiners = activeSubs.filter((s) => s.type !== "host" && !s.plan_id?.includes("host")).length;
  const activeHosts = activeSubs.filter((s) => s.type === "host" || s.plan_id?.includes("host")).length;
  const mrr = activeSubs.reduce((sum, sub) => sum + getMrrCents(sub), 0);
  const mrrDollars = (mrr / 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Revenue metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active Joiner Subs" value={activeJoiners} icon="👤" />
        <StatCard label="Active Host Subs" value={activeHosts} icon="🏠" />
        <StatCard label="MRR ($)" value={`$${mrrDollars}`} icon="💰" />
        <StatCard label="Total Subscribers" value={subscriptions.length} icon="📊" />
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-none capitalize ${
                statusFilter === f
                  ? "bg-charcoal text-white"
                  : "bg-white border border-cream-dark text-taupe hover:text-charcoal"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-none capitalize ${
                typeFilter === f
                  ? "bg-charcoal text-white"
                  : "bg-white border border-cream-dark text-taupe hover:text-charcoal"
              }`}
            >
              {f === "host" ? "Host Premium" : f === "joiner" ? "Joiner" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriber table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">No subscriptions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const name = sub.profiles
              ? `${sub.profiles.first_name || ""} ${sub.profiles.last_name || ""}`.trim()
              : "Unknown";
            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-cream-dark p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal truncate">
                      {name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-taupe">
                      <span>{getSubType(sub)}</span>
                      <span className="text-cream-dark">|</span>
                      <span>{getSubPlan(sub)}</span>
                      <span className="text-cream-dark">|</span>
                      <span>
                        Started{" "}
                        {sub.created_at
                          ? new Date(sub.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={sub.status || "active"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

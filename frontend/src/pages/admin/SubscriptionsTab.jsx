import { useState } from "react";
import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";

// #40: The admin Subscriptions tab used to reconstruct MRR from a
// hardcoded price table keyed by substring-matching a nonexistent
// `sub.plan_id` column (the actual column is `plan`), and a
// nonexistent `sub.interval` column. That meant every subscription
// fell through to the "joiner monthly" bucket and all the numbers
// were wrong — but because live data was $0 during testing, nobody
// noticed. The rewrite below:
//
//   1. Reads `sub.price_cents` directly — that's the amount that was
//      actually billed, straight from Stripe. Discounts, promos,
//      grandfathered prices, regional variants all flow through.
//   2. Falls back to the LEGACY_PRICES table only if `price_cents`
//      is null or zero (which shouldn't happen since the column is
//      NOT NULL, but belt-and-suspenders in case a future migration
//      loosens that).
//   3. Uses the real `plan` column (monthly / annual / host_monthly
//      / host_annual) instead of the nonexistent `plan_id`, and
//      derives "annual" from `plan.endsWith('annual')` instead of
//      the nonexistent `interval` column.
//   4. Rolls `past_due` into MRR alongside `active` — past_due subs
//      are still the host's customers, they just failed a single
//      billing cycle. Churning them out of the MRR card would make
//      the number swing wildly on normal card-decline noise.
//
// The LEGACY_PRICES table below matches the PRICES map in
// supabase/functions/create-checkout/index.ts as of 2026-04. If you
// change prices there, change them here too — but the fallback only
// fires for rows with a missing price_cents, so the drift risk is
// limited to historical rows.
const LEGACY_PRICES = {
  monthly: 799,
  annual: 7999,
  host_monthly: 799,
  host_annual: 7999,
};

function isHostSub(sub) {
  // `type` is authoritative (added in migration 010). `plan` prefix
  // check is a belt-and-suspenders fallback for any row that
  // predates the type column.
  return sub.type === "host_premium" || sub.plan?.startsWith("host_");
}

function isAnnualSub(sub) {
  // `plan` is monthly | annual | host_monthly | host_annual.
  return sub.plan?.endsWith("annual");
}

function getSubType(sub) {
  return isHostSub(sub) ? "Organizer Premium" : "Parent";
}

function getSubPlan(sub) {
  return isAnnualSub(sub) ? "Annual" : "Monthly";
}

function getMrrCents(sub) {
  // Preferred path: use the actual billed amount from the row.
  // price_cents is the per-period amount in cents. For annual plans
  // we normalize to monthly by dividing by 12.
  const billed = Number.isFinite(sub.price_cents) && sub.price_cents > 0
    ? sub.price_cents
    : null;

  if (billed !== null) {
    return isAnnualSub(sub) ? Math.round(billed / 12) : billed;
  }

  // Legacy fallback: reconstruct from the hardcoded table. This is
  // only reachable for rows with a missing or zero price_cents,
  // which shouldn't exist under the current schema.
  const fallbackKey = sub.plan && LEGACY_PRICES[sub.plan]
    ? sub.plan
    : (isHostSub(sub) ? (isAnnualSub(sub) ? "host_annual" : "host_monthly")
                      : (isAnnualSub(sub) ? "annual" : "monthly"));
  const fallback = LEGACY_PRICES[fallbackKey] || 0;
  return isAnnualSub(sub) ? Math.round(fallback / 12) : fallback;
}

// Subscriptions that contribute to MRR: actively billing. We include
// `past_due` because those customers haven't churned — their card
// just failed the last attempt and Stripe will retry. Excluding them
// would make the MRR card jitter on normal payment noise.
const MRR_STATUSES = new Set(["active", "past_due"]);

export default function SubscriptionsTab({ subscriptions }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // #40: added `past_due` to the filter so admins can see the
  // subscriptions that are currently contributing to MRR but may
  // need attention (failed payment, expiring card).
  const statusFilters = ["all", "active", "past_due", "cancelled", "expired"];
  const typeFilters = ["all", "joiner", "host"];

  const filtered = subscriptions.filter((sub) => {
    if (statusFilter !== "all" && sub.status !== statusFilter) return false;
    if (typeFilter === "joiner" && isHostSub(sub)) return false;
    if (typeFilter === "host" && !isHostSub(sub)) return false;
    return true;
  });

  // MRR-contributing subs: active + past_due, split by type for the
  // count cards. These feed both the "Active X Subs" counts and the
  // MRR total below.
  const billingSubs = subscriptions.filter((s) => MRR_STATUSES.has(s.status));
  const activeJoiners = billingSubs.filter((s) => !isHostSub(s)).length;
  const activeHosts = billingSubs.filter((s) => isHostSub(s)).length;
  const mrr = billingSubs.reduce((sum, sub) => sum + getMrrCents(sub), 0);
  const mrrDollars = (mrr / 100).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Revenue metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active Joiner Subs" value={activeJoiners} icon="👤" />
        <StatCard label="Active Organizer Subs" value={activeHosts} icon="🏠" />
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
              {f === "host" ? "Organizer Premium" : f === "joiner" ? "Parent" : "All"}
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

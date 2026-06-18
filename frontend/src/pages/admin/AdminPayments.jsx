import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import StatCard from "../../components/admin/StatCard";
import DataTable from "../../components/admin/DataTable";
import { useAdminKpis } from "../../hooks/useAdminKpis";

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export default function AdminPayments() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, [days]);

  const { data: kpis, loading: kpiLoading } = useAdminKpis(range.fromIso, range.toIso);
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRowsLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, requested_at, rate_cents, platform_fee_cents, status, stripe_payment_intent_id, parent:profiles!bookings_parent_id_fkey(first_name, last_name), nanny:profiles!bookings_nanny_id_fkey(first_name, last_name)"
        )
        .gte("requested_at", range.fromIso)
        .lt("requested_at", range.toIso)
        .not("stripe_payment_intent_id", "is", null)
        .order("requested_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setRows(data ?? []);
      setRowsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [range.fromIso, range.toIso]);

  const cols = [
    {
      key: "requested_at",
      header: "Date",
      render: (r) => new Date(r.requested_at).toLocaleString(),
    },
    {
      key: "parent",
      header: "Parent",
      render: (r) => `${r.parent?.first_name ?? ""} ${r.parent?.last_name ?? ""}`.trim(),
    },
    {
      key: "nanny",
      header: "Nanny",
      render: (r) => `${r.nanny?.first_name ?? ""} ${r.nanny?.last_name ?? ""}`.trim(),
    },
    {
      key: "charged",
      header: "Charged",
      render: (r) => money((r.rate_cents ?? 0) + (r.platform_fee_cents ?? 0)),
    },
    { key: "fee", header: "Fee", render: (r) => money(r.platform_fee_cents) },
    { key: "status", header: "Status" },
    {
      key: "stripe",
      header: "Stripe",
      render: (r) => (
        <a
          href={`https://dashboard.stripe.com/payments/${r.stripe_payment_intent_id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sage-dark underline"
        >
          PI
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Payments</h1>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={
              "px-3 py-1 rounded-md text-sm " +
              (days === p.days
                ? "bg-sage-light text-charcoal font-medium"
                : "bg-white border border-cream-dark text-taupe-dark hover:bg-cream")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="GMV"
          value={kpiLoading ? "…" : money(kpis?.gmv_cents)}
          hint={`Last ${days}d`}
        />
        <StatCard
          label="Platform fees"
          value={kpiLoading ? "…" : money(kpis?.platform_fee_cents)}
        />
        <StatCard
          label="Processing fees"
          value={kpiLoading ? "…" : money(kpis?.processing_fee_cents)}
          hint="Estimated (~2.9% + $0.30)"
        />
        <StatCard
          label="Net revenue"
          value={kpiLoading ? "…" : money(kpis?.net_revenue_cents)}
        />
      </div>

      {rowsLoading ? (
        <div className="text-sm text-taupe-dark">Loading…</div>
      ) : (
        <DataTable rows={rows} columns={cols} rowKey={(r) => r.id} emptyMessage="No payments" />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import DataTable from "../../components/admin/DataTable";

const STATUSES = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function AdminBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("bookings")
        .select(
          "id, requested_at, status, rate_cents, platform_fee_cents, stripe_payment_intent_id, parent_id, nanny_id, parent:profiles!bookings_parent_id_fkey(first_name, last_name), nanny:profiles!bookings_nanny_id_fkey(first_name, last_name)"
        )
        .order("requested_at", { ascending: false })
        .limit(200);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) console.error(error);
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const cols = [
    {
      key: "requested_at",
      header: "Requested",
      sortable: true,
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
    { key: "status", header: "Status" },
    {
      key: "rate_cents",
      header: "Rate",
      render: (r) => `$${((r.rate_cents ?? 0) / 100).toFixed(2)}`,
    },
    {
      key: "platform_fee_cents",
      header: "Fee",
      render: (r) => `$${((r.platform_fee_cents ?? 0) / 100).toFixed(2)}`,
    },
    {
      key: "stripe_payment_intent_id",
      header: "Stripe",
      render: (r) =>
        r.stripe_payment_intent_id ? (
          <a
            href={`https://dashboard.stripe.com/payments/${r.stripe_payment_intent_id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sage-dark underline"
          >
            PI
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "id",
      header: "",
      render: (r) => (
        <Link to={`/admin/bookings/${r.id}`} className="text-sage-dark underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Bookings</h1>
      <div className="mb-4">
        <label className="text-sm text-taupe-dark mr-2" htmlFor="status-filter">
          Status:
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-cream-dark rounded-md px-2 py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="text-sm text-taupe-dark">Loading…</div>
      ) : (
        <DataTable rows={rows} columns={cols} rowKey={(r) => r.id} emptyMessage="No bookings" />
      )}
    </div>
  );
}

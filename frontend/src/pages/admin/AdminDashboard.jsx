import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import StatCard from "../../components/admin/StatCard";
import { useAdminKpis } from "../../hooks/useAdminKpis";
import { useAdminTimeseries } from "../../hooks/useAdminTimeseries";
import { supabase } from "../../lib/supabase";

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

const COLORS = ["#6b8e7b", "#c98a6e", "#7b8ea8"];

function pivotByBucket(rows, splitKey, valueKey = "count") {
  const map = new Map();
  const splits = new Set();
  for (const r of rows) {
    splits.add(r[splitKey]);
    if (!map.has(r.bucket)) map.set(r.bucket, { bucket: r.bucket });
    map.get(r.bucket)[r[splitKey]] = r[valueKey];
  }
  return {
    data: Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket)),
    splits: Array.from(splits),
  };
}

export default function AdminDashboard() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }, []);

  const { data: kpis, loading: kpiLoading } = useAdminKpis(range.fromIso, range.toIso);
  const { rows: signups } = useAdminTimeseries(
    "admin_signups_timeseries",
    range.fromIso,
    range.toIso
  );
  const { rows: bookings } = useAdminTimeseries(
    "admin_bookings_timeseries",
    range.fromIso,
    range.toIso
  );
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        if (cancelled) return;
        setPendingCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signupsPivot = useMemo(() => pivotByBucket(signups, "account_type"), [signups]);
  const gmvPivot = useMemo(
    () => pivotByBucket(bookings, "status", "gmv_cents"),
    [bookings]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-charcoal text-xl">Dashboard</h1>
        <Link
          to="/admin/verifications"
          className="bg-cream border border-cream-dark px-3 py-1 rounded-md text-sm text-charcoal hover:bg-sage-light"
        >
          Pending verifications: {pendingCount ?? "…"}
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="GMV (30d)" value={kpiLoading ? "…" : money(kpis?.gmv_cents)} />
        <StatCard
          label="Platform fees (30d)"
          value={kpiLoading ? "…" : money(kpis?.platform_fee_cents)}
        />
        <StatCard
          label="Processing fees (30d)"
          value={kpiLoading ? "…" : money(kpis?.processing_fee_cents)}
          hint="Estimated"
        />
        <StatCard
          label="Bookings (30d)"
          value={kpiLoading ? "…" : kpis?.booking_count ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-cream-dark rounded-md bg-white p-4">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-3">GMV trend</h2>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={gmvPivot.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Legend />
                {gmvPivot.splits.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-cream-dark rounded-md bg-white p-4">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-3">Signups</h2>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={signupsPivot.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Legend />
                {signupsPivot.splits.map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

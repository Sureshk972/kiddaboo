import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useAdminTimeseries } from "../../hooks/useAdminTimeseries";
import { useAdminEvents } from "../../hooks/useAdminEvents";
import { supabase } from "../../lib/supabase";

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "YTD", days: null, ytd: true },
];

function rangeFromPreset(p) {
  const to = new Date();
  let from;
  if (p.ytd) from = new Date(to.getFullYear(), 0, 1);
  else from = new Date(to.getTime() - p.days * 24 * 60 * 60 * 1000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

function pivotByBucket(rows, splitKey, valueKey = "count") {
  const map = new Map();
  const splits = new Set();
  for (const r of rows) {
    splits.add(r[splitKey]);
    const day = r.bucket;
    if (!map.has(day)) map.set(day, { bucket: day });
    map.get(day)[r[splitKey]] = r[valueKey];
  }
  return {
    data: Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket)),
    splits: Array.from(splits),
  };
}

const COLORS = ["#6b8e7b", "#c98a6e", "#7b8ea8", "#b89b6c"];

function ChartCard({ title, children }) {
  return (
    <div className="border border-cream-dark rounded-md bg-white p-4">
      <h2 className="font-heading font-bold text-charcoal text-sm mb-3">{title}</h2>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [preset, setPreset] = useState(PRESETS[1]);
  const range = useMemo(() => rangeFromPreset(preset), [preset]);

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
  const [funnel, setFunnel] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("admin_host_funnel", { p_from: range.fromIso, p_to: range.toIso })
      .then(({ data }) => {
        if (cancelled) return;
        setFunnel(data?.[0] ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [range.fromIso, range.toIso]);

  const pageviews = useAdminEvents("admin_events_by_day", range.fromIso, range.toIso);
  const topPages = useAdminEvents("admin_top_pages", range.fromIso, range.toIso);
  const topClicks = useAdminEvents("admin_top_clicks", range.fromIso, range.toIso);
  const sessions = useAdminEvents("admin_active_sessions", range.fromIso, range.toIso);
  const clickFunnel = useAdminEvents("admin_funnel_signup_book_pay", range.fromIso, range.toIso);

  const signupsPivot = useMemo(() => pivotByBucket(signups, "account_type"), [signups]);
  const bookingsPivot = useMemo(() => pivotByBucket(bookings, "status"), [bookings]);
  const gmvPivot = useMemo(
    () => pivotByBucket(bookings, "status", "gmv_cents"),
    [bookings]
  );
  const pageviewsPivot = useMemo(
    () => pivotByBucket(pageviews.rows, "user_role"),
    [pageviews.rows]
  );

  return (
    <div>
      <h1 className="font-heading font-bold text-charcoal text-xl mb-4">Reports</h1>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p)}
            className={
              "px-3 py-1 rounded-md text-sm " +
              (preset.label === p.label
                ? "bg-sage-light text-charcoal font-medium"
                : "bg-white border border-cream-dark text-taupe-dark hover:bg-cream")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Signups">
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
        </ChartCard>

        <ChartCard title="Bookings">
          <LineChart data={bookingsPivot.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            {bookingsPivot.splits.map((s, i) => (
              <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} />
            ))}
          </LineChart>
        </ChartCard>

        <ChartCard title="GMV (cents)">
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
        </ChartCard>

        <div className="border border-cream-dark rounded-md bg-white p-4">
          <h2 className="font-heading font-bold text-charcoal text-sm mb-3">Host funnel</h2>
          {funnel ? (
            <div className="flex gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-taupe-dark">Signups</div>
                <div className="font-heading text-charcoal text-2xl">{funnel.signups}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-taupe-dark">Verified</div>
                <div className="font-heading text-charcoal text-2xl">{funnel.verified}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-taupe-dark">Booked</div>
                <div className="font-heading text-charcoal text-2xl">{funnel.booked}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-taupe-dark">Loading…</div>
          )}
        </div>

        <ChartCard title="Pageviews per day (by role)">
          <LineChart data={pageviewsPivot.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Legend />
            {pageviewsPivot.splits.map((role, i) => (
              <Line key={role} type="monotone" dataKey={role} stroke={COLORS[i % COLORS.length]} />
            ))}
          </LineChart>
        </ChartCard>

        <ChartCard title="Top pages">
          <BarChart data={topPages.rows} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="path" type="category" width={180} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Top click events">
          <BarChart data={topClicks.rows} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="event_name" type="category" width={180} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[1]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Active sessions per day">
          <LineChart data={sessions.rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke={COLORS[2]} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Signup → Booking → Payment">
          <BarChart data={clickFunnel.rows}>
            <XAxis dataKey="step" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[3]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

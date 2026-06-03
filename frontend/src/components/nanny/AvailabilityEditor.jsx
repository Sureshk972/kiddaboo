import { useState } from "react";
import { useNannyBlocks } from "../../hooks/useNannyBlocks";
import Button from "../ui/Button";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, "0")} ${period}`;
}

const inputCls =
  "block w-full min-w-0 box-border appearance-none bg-white border border-cream-dark px-3 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none";
const labelCls = "text-xs font-medium text-charcoal";

export default function AvailabilityEditor() {
  const { blocks, loading, upsert, remove } = useNannyBlocks();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "13:00",
    rate_cents: 8000,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const grouped = DAYS.map((name, dow) => ({
    dow,
    name,
    blocks: blocks.filter((b) => b.day_of_week === dow),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const { error } = await upsert(form);
    setSaving(false);
    if (error) {
      setErr(error.message || "Couldn't save block.");
      return;
    }
    setShowForm(false);
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
          Weekly availability
        </h1>
        {!showForm && !loading && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm font-medium bg-sage text-white px-4 py-2"
          >
            + Add block
          </button>
        )}
      </div>

      <p className="text-xs text-taupe">
        Set the days and times you're regularly available. Kiddaboo turns each
        block into 8 weeks of bookable slots, refreshed daily.
      </p>

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {grouped.map(({ dow, name, blocks }) => (
            <li key={dow} className="bg-white border border-cream-dark p-4">
              <h2 className="text-sm font-bold text-charcoal mb-2">{name}</h2>
              {blocks.length === 0 ? (
                <p className="text-xs text-taupe italic">No availability</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {blocks.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 border-t border-cream-dark pt-2 first:border-t-0 first:pt-0"
                    >
                      <div className="text-sm text-charcoal">
                        <span className="font-medium">
                          {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                        </span>
                        <span className="text-taupe ml-2">
                          · ${(b.rate_cents / 100).toFixed(0)}/hr
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(b.id)}
                        className="text-xs font-medium text-terracotta hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-cream-dark p-4 flex flex-col gap-3"
        >
          <h2 className="text-sm font-bold text-charcoal">New availability block</h2>

          <label className="flex flex-col gap-1">
            <span className={labelCls}>Day of week</span>
            <select
              value={form.day_of_week}
              onChange={(e) =>
                setForm({ ...form, day_of_week: Number(e.target.value) })
              }
              className={inputCls}
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelCls}>Start</span>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className={inputCls}
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelCls}>End</span>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className={inputCls}
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelCls}>Rate ($/hr)</span>
            <input
              type="number"
              min={1}
              value={form.rate_cents / 100}
              onChange={(e) =>
                setForm({ ...form, rate_cents: Math.round(e.target.value * 100) })
              }
              className={inputCls}
              required
            />
          </label>

          {err && <p className="text-xs text-terracotta">{err}</p>}

          <div className="flex gap-2 mt-1">
            <Button type="submit" size="sm" fullWidth disabled={saving}>
              {saving ? "Saving…" : "Save block"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setErr(null);
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

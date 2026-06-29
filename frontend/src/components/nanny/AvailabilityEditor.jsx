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

function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const inputCls =
  "block w-full min-w-0 box-border appearance-none bg-white border border-cream-dark px-3 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none";
const labelCls = "text-xs font-medium text-charcoal";

const EMPTY_FORM = (mode) => ({
  mode,
  day_of_week: 1,
  specific_date: todayIso(),
  start_time: "09:00",
  end_time: "13:00",
  rate_cents: 8000,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

export default function AvailabilityEditor() {
  const { blocks, loading, upsert, remove } = useNannyBlocks();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM("weekly"));

  const weeklyGrouped = DAYS.map((name, dow) => ({
    dow,
    name,
    blocks: blocks.filter((b) => b.day_of_week === dow),
  }));
  const todayStr = todayIso();
  const dateBlocks = blocks
    .filter((b) => b.specific_date && b.specific_date >= todayStr)
    .sort((a, b) => a.specific_date.localeCompare(b.specific_date));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const { mode, ...rest } = form;
    const payload =
      mode === "date"
        ? { ...rest, day_of_week: null, specific_date: rest.specific_date }
        : { ...rest, specific_date: null, day_of_week: rest.day_of_week };
    const { error } = await upsert(payload);
    setSaving(false);
    if (error) {
      setErr(error.message || "Couldn't save block.");
      return;
    }
    setShowForm(false);
    setForm(EMPTY_FORM(mode));
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}>
          Availability
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
        Set a specific date or a regular weekly slot. Kiddaboo turns each block
        into bookable slots, refreshed daily.
      </p>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-cream-dark p-4 flex flex-col gap-3"
        >
          <h2 className="text-sm font-bold text-charcoal">New availability block</h2>

          <div className="flex gap-2">
            {["date", "weekly"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForm({ ...form, mode: m })}
                className={`flex-1 text-xs font-medium px-3 py-2 border ${
                  form.mode === m
                    ? "bg-sage text-white border-sage"
                    : "bg-white text-charcoal border-cream-dark"
                }`}
              >
                {m === "date" ? "Specific date" : "Weekly"}
              </button>
            ))}
          </div>

          {form.mode === "date" ? (
            <label className="flex flex-col gap-1">
              <span className={labelCls}>Date</span>
              <input
                type="date"
                min={todayIso()}
                value={form.specific_date}
                onChange={(e) =>
                  setForm({ ...form, specific_date: e.target.value })
                }
                className={inputCls}
                required
              />
            </label>
          ) : (
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
          )}

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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.rate_cents > 0 ? String(form.rate_cents / 100) : ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setForm({ ...form, rate_cents: digits ? Number(digits) * 100 : 0 });
              }}
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

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading…</p>
      ) : (
        <>
          {dateBlocks.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-taupe mb-2">
                One-off dates
              </h2>
              <ul className="flex flex-col gap-2">
                {dateBlocks.map((b) => (
                  <li
                    key={b.id}
                    className="bg-white border border-cream-dark p-4 flex items-center justify-between gap-3"
                  >
                    <div className="text-sm text-charcoal">
                      <div className="font-bold">{fmtDate(b.specific_date)}</div>
                      <div className="mt-0.5">
                        <span className="font-medium">
                          {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                        </span>
                        <span className="text-taupe ml-2">
                          · ${(b.rate_cents / 100).toFixed(0)}/hr
                        </span>
                      </div>
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
            </section>
          )}

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-taupe mb-2">
              Weekly
            </h2>
            <ul className="flex flex-col gap-3">
              {weeklyGrouped.map(({ dow, name, blocks }) => (
                <li key={dow} className="bg-white border border-cream-dark p-4">
                  <h3 className="text-sm font-bold text-charcoal mb-2">{name}</h3>
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
          </section>
        </>
      )}

    </div>
  );
}

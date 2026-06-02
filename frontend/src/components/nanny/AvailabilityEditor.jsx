import { useState } from "react";
import { useNannyBlocks } from "../../hooks/useNannyBlocks";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2,"0")} ${period}`;
}

export default function AvailabilityEditor() {
  const { blocks, loading, upsert, remove } = useNannyBlocks();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "13:00",
    rate_cents: 8000,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const grouped = DAYS.map((name, dow) => ({
    dow, name, blocks: blocks.filter(b => b.day_of_week === dow),
  }));

  const submit = async (e) => {
    e.preventDefault();
    const { error } = await upsert(form);
    if (!error) setShowForm(false);
  };

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h1>Availability</h1>
      {grouped.map(({ dow, name, blocks }) => (
        <div key={dow}>
          <h2>{name}</h2>
          {blocks.length === 0 && <p>No blocks</p>}
          {blocks.map(b => (
            <div key={b.id}>
              <span>{fmtTime(b.start_time)}–{fmtTime(b.end_time)}</span>
              <span> · ${(b.rate_cents/100).toFixed(0)}</span>
              <button onClick={() => remove(b.id)}>Remove</button>
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => setShowForm(true)}>Add block</button>
      {showForm && (
        <form onSubmit={submit}>
          <label>Day of week
            <select
              value={form.day_of_week}
              onChange={e => setForm({...form, day_of_week: Number(e.target.value)})}
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>
          <label>Start
            <input type="time" value={form.start_time}
              onChange={e => setForm({...form, start_time: e.target.value})} />
          </label>
          <label>End
            <input type="time" value={form.end_time}
              onChange={e => setForm({...form, end_time: e.target.value})} />
          </label>
          <label>Rate ($)
            <input type="number" min={1} value={form.rate_cents/100}
              onChange={e => setForm({...form, rate_cents: Math.round(e.target.value*100)})} />
          </label>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}
    </section>
  );
}

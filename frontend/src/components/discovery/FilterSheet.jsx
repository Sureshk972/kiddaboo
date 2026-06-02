import { useState } from "react";

export default function FilterSheet({ initial, onApply }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [maxRate, setMaxRate] = useState(initial.maxRateCents ? initial.maxRateCents/100 : "");

  return (
    <form onSubmit={e => {
      e.preventDefault();
      onApply({
        from: new Date(from),
        to: new Date(to),
        maxRateCents: maxRate ? Math.round(maxRate*100) : null,
      });
    }}>
      <label>From<input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} required /></label>
      <label>To<input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} required /></label>
      <label>Max rate ($)<input type="number" value={maxRate} onChange={e => setMaxRate(e.target.value)} /></label>
      <button type="submit">Apply</button>
    </form>
  );
}

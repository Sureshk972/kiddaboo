import { useState } from "react";
import Button from "../ui/Button";

export default function FilterSheet({ initial, onApply }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [maxRate, setMaxRate] = useState(initial.maxRateCents ? initial.maxRateCents / 100 : "");

  // iOS Safari's native datetime-local input enforces an intrinsic
  // minimum width that ignores w-full and overflows the container.
  // min-w-0 + appearance-none neutralizes that; box-border is the
  // Tailwind preflight default but stated explicitly for clarity.
  const inputCls =
    "block w-full min-w-0 box-border appearance-none bg-white border border-cream-dark px-3 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none";
  const labelCls = "text-xs font-medium text-charcoal";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({
          from: new Date(from),
          to: new Date(to),
          maxRateCents: maxRate ? Math.round(maxRate * 100) : null,
        });
      }}
      className="bg-white border border-cream-dark p-4 flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1">
        <span className={labelCls}>From</span>
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          required
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>To</span>
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelCls}>Max rate ($/hr)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={maxRate}
          onChange={(e) => setMaxRate(e.target.value)}
          placeholder="Any"
          className={inputCls}
        />
      </label>
      <Button type="submit" size="sm" fullWidth>
        Apply filters
      </Button>
    </form>
  );
}

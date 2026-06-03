import { useState } from "react";
import { useOpenSlots } from "../hooks/useOpenSlots";
import FilterSheet from "../components/discovery/FilterSheet";
import NannyCard from "../components/discovery/NannyCard";

export default function Discover() {
  // Default window: tomorrow → two weeks out. Narrower windows produced
  // empty results on first visit even when nannies had slots later in
  // the month, which felt broken.
  const tomorrow = new Date(Date.now() + 86400_000);
  const twoWeeksOut = new Date(Date.now() + 14 * 86400_000);
  const [filters, setFilters] = useState({
    from: tomorrow,
    to: twoWeeksOut,
    maxRateCents: null,
  });
  const { groups, loading } = useOpenSlots(filters);

  const fmtForInput = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Find a nanny
      </h1>

      <FilterSheet
        initial={{
          from: fmtForInput(filters.from),
          to: fmtForInput(filters.to),
          maxRateCents: filters.maxRateCents,
        }}
        onApply={setFilters}
      />

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">
          Loading available nannies…
        </p>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No nannies available in that window.</p>
          <p className="text-xs text-taupe mt-1">
            Try widening your date range or removing the max rate.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.nannyId}>
              <NannyCard group={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useOpenSlots } from "../hooks/useOpenSlots";
import FilterSheet from "../components/discovery/FilterSheet";
import NannyCard from "../components/discovery/NannyCard";
import MapView from "../components/discovery/MapView";

export default function Discover() {
  const tomorrow = new Date(Date.now() + 86400_000);
  const dayAfter = new Date(Date.now() + 2 * 86400_000);
  const [filters, setFilters] = useState({
    from: tomorrow,
    to: dayAfter,
    maxRateCents: null,
  });
  const [view, setView] = useState("list");
  const { groups, loading } = useOpenSlots(filters);

  // Map view still works on the flat slot list — flatten from groups.
  const flatSlots = useMemo(
    () => groups.flatMap((g) => g.slots.map((s) => ({ ...s, nanny: g.nanny }))),
    [groups]
  );

  const fmtForInput = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const toggleBase =
    "flex-1 text-sm font-medium py-2 transition-colors border border-cream-dark";
  const toggleOn = "bg-sage text-white border-sage";
  const toggleOff = "bg-white text-charcoal hover:border-sage";

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

      <div className="flex gap-0">
        <button
          type="button"
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
          className={`${toggleBase} ${view === "list" ? toggleOn : toggleOff}`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView("map")}
          aria-pressed={view === "map"}
          className={`${toggleBase} ${view === "map" ? toggleOn : toggleOff} border-l-0`}
        >
          Map
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading available nannies…</p>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No nannies available in that window.</p>
          <p className="text-xs text-taupe mt-1">
            Try widening your date range or removing the max rate.
          </p>
        </div>
      ) : view === "list" ? (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.nannyId}>
              <NannyCard group={g} />
            </li>
          ))}
        </ul>
      ) : (
        <MapView slots={flatSlots} />
      )}
    </div>
  );
}

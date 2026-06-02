import { useState } from "react";
import { useOpenSlots } from "../hooks/useOpenSlots";
import FilterSheet from "../components/discovery/FilterSheet";
import NannyCard from "../components/discovery/NannyCard";
import MapView from "../components/discovery/MapView";

export default function Discover() {
  const tomorrow = new Date(Date.now() + 86400_000);
  const dayAfter = new Date(Date.now() + 2*86400_000);
  const [filters, setFilters] = useState({
    from: tomorrow,
    to: dayAfter,
    maxRateCents: null,
  });
  const [view, setView] = useState("list");
  const { slots, loading } = useOpenSlots(filters);

  const fmtForInput = (d) => d.toISOString().slice(0,16);

  return (
    <main>
      <FilterSheet
        initial={{
          from: fmtForInput(filters.from),
          to: fmtForInput(filters.to),
          maxRateCents: filters.maxRateCents,
        }}
        onApply={setFilters}
      />
      <div>
        <button onClick={() => setView("list")} aria-pressed={view==="list"}>List</button>
        <button onClick={() => setView("map")} aria-pressed={view==="map"}>Map</button>
      </div>
      {loading ? <p>Loading…</p> : view === "list" ? (
        <ul>{slots.map(s => <li key={s.id}><NannyCard slot={s} /></li>)}</ul>
      ) : (
        <MapView slots={slots} />
      )}
    </main>
  );
}

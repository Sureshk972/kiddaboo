import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useOpenSlots } from "../hooks/useOpenSlots";
import { useSlotUpdates } from "../hooks/useSlotUpdates";
import FilterSheet from "../components/discovery/FilterSheet";
import NannyCard from "../components/discovery/NannyCard";
import NannyCardSkeleton from "../components/discovery/NannyCardSkeleton";
import NewSlotsBanner from "../components/discovery/NewSlotsBanner";

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

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
  const { groups, loading, refresh } = useOpenSlots(filters);

  const visibleSlots = useMemo(
    () =>
      groups.flatMap((g) =>
        g.slots.map((s) => ({
          id: s.id,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          rate_cents: s.rate_cents,
        }))
      ),
    [groups]
  );
  const { pendingCount, dismiss } = useSlotUpdates({
    from: filters.from,
    to: filters.to,
    maxRateCents: filters.maxRateCents,
    visibleSlots,
  });
  const applyUpdates = () => {
    dismiss();
    refresh();
  };

  const fmtForInput = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Find a nanny
      </h1>

      <NewSlotsBanner count={pendingCount} onTap={applyUpdates} />

      <FilterSheet
        initial={{
          from: fmtForInput(filters.from),
          to: fmtForInput(filters.to),
          maxRateCents: filters.maxRateCents,
        }}
        onApply={setFilters}
      />

      {loading ? (
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <NannyCardSkeleton />
            </li>
          ))}
        </ul>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No nannies available in that window.</p>
          <p className="text-xs text-taupe mt-1">
            Try widening your date range or removing the max rate.
          </p>
        </div>
      ) : (
        <motion.ul
          className="flex flex-col gap-3"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {groups.map((g) => (
            <motion.li key={g.nannyId} variants={itemVariants}>
              <NannyCard group={g} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

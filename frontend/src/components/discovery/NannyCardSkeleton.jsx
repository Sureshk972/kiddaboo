import Skeleton from "../ui/Skeleton";

// Visual stand-in for NannyCard while data loads. Mirrors the card's
// vertical rhythm so the layout doesn't reflow when rows arrive.
export default function NannyCardSkeleton() {
  return (
    <article className="bg-white border border-cream-dark p-4">
      <div className="flex gap-3 items-start">
        <Skeleton className="w-14 h-14 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-3 w-24 rounded" />
          <div className="pt-2 space-y-1.5">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        </div>
      </div>
    </article>
  );
}

import Skeleton from "./Skeleton";

// Generic skeleton for booking-shaped cards used across the parent app
// (Upcoming, History, Inbox, Requests). Mirrors a row with a small
// avatar, name + status, and two lines of metadata.
export default function BookingCardSkeleton() {
  return (
    <div className="bg-white border border-cream-dark p-4">
      <div className="flex gap-3 items-start">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}

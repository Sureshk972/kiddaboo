// Tailwind animate-pulse on a cream-dark block. Use as a building block:
//   <Skeleton className="h-14 w-14 rounded-full" />
// Compose larger skeletons by stacking these in the same shape as the
// real content. Keep it dumb — no shimmer libs, no custom animations.
export default function Skeleton({ className = "" }) {
  return <div className={`bg-cream-dark animate-pulse ${className}`} />;
}

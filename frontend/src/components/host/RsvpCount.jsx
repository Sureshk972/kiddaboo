import useRsvps from "../../hooks/useRsvps";

export default function RsvpCount({ sessionId }) {
  const { goingCount, notGoingCount, loading } = useRsvps(sessionId);

  if (loading) return null;

  if (goingCount === 0 && notGoingCount === 0) {
    return (
      <p className="text-xs text-taupe/50 mt-2">No RSVPs yet</p>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-sage-dark flex-shrink-0">
        <path d="M16 21V19C16 16.79 14.21 15 12 15H6C3.79 15 2 16.79 2 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="text-xs text-sage-dark font-medium">
        {goingCount} going
      </span>
      {notGoingCount > 0 && (
        <span className="text-xs text-taupe">
          &middot; {notGoingCount} can't make it
        </span>
      )}
    </div>
  );
}

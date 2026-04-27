import useRsvps from "../../hooks/useRsvps";

export default function RsvpCount({ sessionId }) {
  const { rsvps, goingCount, notGoingCount, loading } = useRsvps(sessionId);

  if (loading) return null;

  if (goingCount === 0 && notGoingCount === 0) {
    return (
      <p className="text-xs text-taupe/50 mt-2">No RSVPs yet</p>
    );
  }

  const going = rsvps.filter((r) => r.status === "going");

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
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

      {going.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5 pl-[22px]">
          {going.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sage-light text-sage-dark text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {r.initials}
              </span>
              <span className="text-xs text-charcoal truncate">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

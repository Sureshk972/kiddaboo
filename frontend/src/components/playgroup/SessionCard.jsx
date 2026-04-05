import { useState } from "react";
import useRsvps from "../../hooks/useRsvps";
import { friendlyDate, formatSessionTime, formatDuration } from "../../lib/dateUtils";

function RsvpButtons({ sessionId }) {
  const { myRsvp, goingCount, upsertRsvp, deleteRsvp } = useRsvps(sessionId);
  const [saving, setSaving] = useState(false);

  const handleRsvp = async (status) => {
    setSaving(true);
    if (myRsvp?.status === status) {
      await deleteRsvp();
    } else {
      await upsertRsvp(status);
    }
    setSaving(false);
  };

  const isGoing = myRsvp?.status === "going";
  const isNotGoing = myRsvp?.status === "not_going";

  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        onClick={() => handleRsvp("going")}
        disabled={saving}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border ${
          isGoing
            ? "bg-sage text-white border-sage"
            : "bg-sage-light/50 text-sage-dark border-sage-light hover:border-sage"
        } ${saving ? "opacity-50" : ""}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Going{goingCount > 0 ? ` (${goingCount})` : ""}
      </button>

      <button
        onClick={() => handleRsvp("not_going")}
        disabled={saving}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border ${
          isNotGoing
            ? "bg-terracotta-light text-terracotta border-terracotta"
            : "bg-cream-dark/50 text-taupe border-cream-dark hover:border-taupe"
        } ${saving ? "opacity-50" : ""}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Can't make it
      </button>
    </div>
  );
}

export default function SessionCard({
  session,
  location,
  frequency,
  ageRange,
  showRsvp = false,
  variant = "featured",
}) {
  if (variant === "compact") {
    return (
      <div className="bg-white rounded-xl p-3 border border-cream-dark">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sage-light rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
              <path d="M3 8H17" stroke="#7A8F6D" strokeWidth="1.5" />
              <path d="M7 2V5M13 2V5" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-charcoal">
              {friendlyDate(session.scheduled_at)} &middot; {formatSessionTime(session.scheduled_at)}
            </p>
            <p className="text-xs text-taupe">
              {formatDuration(session.duration_minutes)} &middot; {session.location_name || location}
            </p>
          </div>
        </div>
        {showRsvp && <RsvpButtons sessionId={session.id} />}
      </div>
    );
  }

  // Featured variant
  return (
    <div className="bg-white rounded-2xl p-4 border border-cream-dark">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="4" width="14" height="13" rx="2" stroke="#7A8F6D" strokeWidth="1.5" />
            <path d="M3 8H17" stroke="#7A8F6D" strokeWidth="1.5" />
            <path d="M7 2V5M13 2V5" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-charcoal">
            {friendlyDate(session.scheduled_at)} &middot; {formatSessionTime(session.scheduled_at)}
          </p>
          <p className="text-xs text-taupe">
            {formatDuration(session.duration_minutes)}
          </p>
          <p className="text-xs text-taupe">
            {session.location_name || location}
          </p>
        </div>
      </div>
      {session.notes && (
        <p className="text-xs text-taupe/70 mt-2 italic">
          {session.notes}
        </p>
      )}

      {showRsvp && <RsvpButtons sessionId={session.id} />}

      <div className="mt-3 pt-3 border-t border-cream-dark">
        <p className="text-xs text-taupe">
          <span className="text-sage-dark font-medium">
            {frequency}
          </span>{" "}
          &middot; Ages {ageRange}
        </p>
      </div>
    </div>
  );
}

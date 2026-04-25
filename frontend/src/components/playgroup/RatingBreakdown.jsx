function RatingBar({ label, value, max = 5 }) {
  const percent = (value / max) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-taupe w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-cream-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-sage rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-medium text-charcoal w-7 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function RatingBreakdown({ ratings }) {
  if (!ratings) return null;

  // Brand-new groups have no reviews yet. Showing "0.0" with empty
  // bars reads as "rated zero out of five" rather than "unrated", so
  // render a neutral placeholder instead.
  if (!ratings.count) {
    return (
      <div className="bg-cream-dark/30 border border-cream-dark rounded-2xl px-4 py-5 text-center">
        <p className="text-sm font-medium text-charcoal">No reviews yet</p>
        <p className="text-xs text-taupe mt-0.5">
          Be the first to share your experience after a session.
        </p>
      </div>
    );
  }

  const overall =
    (ratings.environment +
      ratings.organization +
      ratings.compatibility +
      ratings.reliability) /
    4;

  return (
    <div>
      {/* Overall score */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-4xl font-heading font-bold text-charcoal">
          {overall.toFixed(1)}
        </span>
        <div>
          {/* Stars */}
          <div className="flex gap-0.5 mb-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill={star <= Math.round(overall) ? "#7A8F6D" : "#F0EBE3"}
              >
                <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
              </svg>
            ))}
          </div>
          <p className="text-xs text-taupe">{ratings.count} reviews</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex flex-col gap-2.5">
        <RatingBar label="Environment" value={ratings.environment} />
        <RatingBar label="Organization" value={ratings.organization} />
        <RatingBar label="Compatibility" value={ratings.compatibility} />
        <RatingBar label="Reliability" value={ratings.reliability} />
      </div>
    </div>
  );
}

export default function ReviewCard({ review, isOwn, onEdit, onReport }) {
  if (!review) return null;

  // Support both old shape (mock) and new shape (real)
  const name = review.reviewer_name || review.reviewer || "User";
  const initials = review.reviewer_initials || review.initials || "U";
  const overall = review.rating_environment
    ? Math.round(
        (review.rating_environment +
          review.rating_organization +
          review.rating_compatibility +
          review.rating_reliability) /
          4
      )
    : review.rating || 0;
  const comment = review.comment || "";
  const date = review.created_at
    ? new Date(review.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : review.date || "";

  return (
    <div className="bg-white rounded-2xl p-4 border border-cream-dark">
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-terracotta-light flex items-center justify-center flex-shrink-0">
          <span className="text-terracotta text-xs font-bold">{initials}</span>
        </div>

        {/* Name + date */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-charcoal">{name}</h4>
          <p className="text-[11px] text-taupe">{date}</p>
        </div>

        {/* Star rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill={star <= overall ? "#7A8F6D" : "#F0EBE3"}
            >
              <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
            </svg>
          ))}
        </div>
      </div>

      {comment && (
        <p className="text-sm text-taupe-dark leading-relaxed">{comment}</p>
      )}

      {isOwn && onEdit && (
        <button
          onClick={() => onEdit(review)}
          className="mt-2 text-xs text-sage font-medium bg-transparent border-none cursor-pointer underline underline-offset-2"
        >
          Edit your review
        </button>
      )}
      {!isOwn && onReport && (
        <button
          onClick={() => onReport(review.reviewer_id, name)}
          className="mt-2 text-xs text-taupe/50 hover:text-taupe font-medium bg-transparent border-none cursor-pointer underline underline-offset-2"
        >
          Report
        </button>
      )}
    </div>
  );
}

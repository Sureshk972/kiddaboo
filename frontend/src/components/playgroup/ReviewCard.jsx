export default function ReviewCard({ review }) {
  if (!review) return null;

  return (
    <div className="bg-white rounded-2xl p-4 border border-cream-dark">
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-terracotta-light flex items-center justify-center flex-shrink-0">
          <span className="text-terracotta text-xs font-bold">
            {review.initials}
          </span>
        </div>

        {/* Name + date */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-charcoal">
            {review.reviewer}
          </h4>
          <p className="text-[11px] text-taupe">{review.date}</p>
        </div>

        {/* Star rating */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill={star <= review.rating ? "#A3B18A" : "#F0EBE3"}
            >
              <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
            </svg>
          ))}
        </div>
      </div>

      <p className="text-sm text-taupe-dark leading-relaxed">
        {review.comment}
      </p>
    </div>
  );
}

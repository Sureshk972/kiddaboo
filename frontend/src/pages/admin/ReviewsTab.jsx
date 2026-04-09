import Stars from "./Stars";
import { timeAgo } from "./timeAgo";

export default function ReviewsTab({ reviews, setConfirmAction, deleteReview }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-lg font-semibold text-charcoal">
          All Reviews
        </h2>
        <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
          {reviews.length} total
        </span>
      </div>
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">No reviews yet</p>
        </div>
      ) : (
        reviews.map((review) => {
          const avgRating =
            ((review.rating_environment || 0) +
              (review.rating_organization || 0) +
              (review.rating_compatibility || 0) +
              (review.rating_reliability || 0)) /
            4;
          return (
            <div
              key={review.id}
              className="bg-white rounded-2xl border border-cream-dark p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Stars rating={avgRating} />
                    <span className="text-xs text-taupe font-medium">
                      {avgRating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal font-medium">
                    {review.profiles?.first_name || "User"}{" "}
                    {review.profiles?.last_name || ""}
                  </p>
                  <p className="text-xs text-taupe mt-0.5">
                    on {review.playgroups?.name || "Unknown Playgroup"}
                  </p>
                  {review.comment && (
                    <p className="text-xs text-taupe-dark mt-1.5 bg-cream-dark/50 rounded-lg p-2.5 leading-relaxed">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-taupe mt-1.5">
                    {timeAgo(review.created_at)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfirmAction({
                      type: "delete-review",
                      title: "Delete Review",
                      message: `Delete this review by ${
                        review.profiles?.first_name || "User"
                      }? This action cannot be undone.`,
                      confirmLabel: "Delete",
                      onConfirm: () => deleteReview(review.id),
                    })
                  }
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-cream-dark text-xs text-taupe hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

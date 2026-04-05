import { useState } from "react";
import Button from "../ui/Button";
import StarRating from "../ui/StarRating";
import { friendlyDate } from "../../lib/dateUtils";

export default function ReviewFormSheet({
  isOpen,
  onClose,
  session,
  existingReview,
  onSubmit,
}) {
  const [environment, setEnvironment] = useState(existingReview?.rating_environment || 0);
  const [organization, setOrganization] = useState(existingReview?.rating_organization || 0);
  const [compatibility, setCompatibility] = useState(existingReview?.rating_compatibility || 0);
  const [reliability, setReliability] = useState(existingReview?.rating_reliability || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = environment > 0 && organization > 0 && compatibility > 0 && reliability > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    const reviewData = {
      session_id: session.id,
      rating_environment: environment,
      rating_organization: organization,
      rating_compatibility: compatibility,
      rating_reliability: reliability,
      comment: comment.trim() || null,
    };

    const result = await onSubmit(reviewData);
    setSaving(false);

    if (result?.error) {
      setError(result.error.message || "Failed to submit review");
    } else {
      setSubmitted(true);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setEnvironment(0);
    setOrganization(0);
    setCompatibility(0);
    setReliability(0);
    setComment("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl max-h-[85vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-cream-dark rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {submitted ? (
            /* Success state */
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#7A8F6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
                Thanks for your review!
              </h3>
              <p className="text-sm text-taupe mb-6">
                Your feedback helps other families find great playgroups.
              </p>
              <Button onClick={handleClose}>Done</Button>
            </div>
          ) : (
            <>
              <h3 className="font-heading font-bold text-charcoal text-lg mb-1">
                {existingReview ? "Edit Review" : "Write a Review"}
              </h3>

              {session && (
                <p className="text-xs text-taupe mb-5">
                  Session on {friendlyDate(session.scheduled_at)}
                </p>
              )}

              {/* Rating categories */}
              <div className="flex flex-col gap-4 mb-5">
                <div>
                  <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                    Environment
                  </label>
                  <StarRating value={environment} onChange={setEnvironment} size={24} />
                  <p className="text-[10px] text-taupe mt-0.5">Cleanliness, safety, comfort</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                    Organization
                  </label>
                  <StarRating value={organization} onChange={setOrganization} size={24} />
                  <p className="text-[10px] text-taupe mt-0.5">Planning, activities, structure</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                    Compatibility
                  </label>
                  <StarRating value={compatibility} onChange={setCompatibility} size={24} />
                  <p className="text-[10px] text-taupe mt-0.5">Age match, shared values, vibe</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                    Reliability
                  </label>
                  <StarRating value={reliability} onChange={setReliability} size={24} />
                  <p className="text-[10px] text-taupe mt-0.5">Punctuality, consistency, communication</p>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-5">
                <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                  Comments <span className="text-taupe/50 font-normal">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  placeholder="Share your experience..."
                  rows={3}
                  className="w-full bg-white border border-cream-dark rounded-xl px-4 py-3 text-sm text-charcoal font-body outline-none resize-none transition-all duration-150 placeholder:text-taupe/40 focus:ring-2 focus:ring-sage-light focus:border-sage"
                />
                <p className="text-[10px] text-taupe/50 text-right mt-1">
                  {comment.length}/500
                </p>
              </div>

              {error && (
                <p className="text-xs text-terracotta mb-3 text-center">{error}</p>
              )}

              <Button
                fullWidth
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={saving}
              >
                {existingReview ? "Update Review" : "Submit Review"}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

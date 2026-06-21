import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import Button from "./ui/Button";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function FeedbackSheet({ open, onClose }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setRating(0);
      setHover(0);
      setComment("");
      setSubmitting(false);
    }
  }, [open]);

  // Lock body scroll while open + Escape to close
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!user || rating < 1) return;
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit feedback. Please try again.");
      console.error("feedback insert failed:", error);
      return;
    }
    toast.success("Thanks for the feedback.");
    onClose?.();
  };

  const displayRating = hover || rating;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 z-[9998] transition-opacity"
        onClick={() => !submitting && onClose?.()}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-label="Share your feedback"
      >
        <div className="bg-cream rounded-3xl max-h-[85vh] overflow-y-auto w-full max-w-sm pointer-events-auto shadow-xl relative">
          {/* Close button */}
          <button
            onClick={() => !submitting && onClose?.()}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-taupe hover:text-charcoal hover:bg-cream-dark bg-transparent border-none cursor-pointer transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="px-6 py-7">
            <h3 className="text-lg font-heading font-bold text-charcoal mb-1">
              Share your feedback
            </h3>
            <p className="text-sm text-taupe mb-5">
              How is Kiddaboo working for you?
            </p>

            {/* Star picker */}
            <div
              className="flex gap-1 mb-5"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= displayRating;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} star`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    className="p-1 bg-transparent border-none cursor-pointer"
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 14 14"
                      fill={active ? "#7A8F6D" : "none"}
                      stroke={active ? "#7A8F6D" : "#9A8E80"}
                      strokeWidth={active ? "0" : "1.4"}
                      strokeLinejoin="round"
                    >
                      <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Comment */}
            <label className="text-sm font-medium text-taupe block mb-1.5">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Tell us what's working or what could be better."
              className="w-full bg-white border border-cream-dark rounded-xl px-4 py-3 text-charcoal font-body text-sm outline-none resize-none placeholder:text-taupe/40 focus:ring-2 focus:ring-sage-light focus:border-sage mb-5"
            />

            <div className="flex items-center gap-4">
              <Button
                fullWidth
                onClick={handleSubmit}
                disabled={rating < 1 || submitting}
                loading={submitting}
              >
                Submit
              </Button>
              <button
                type="button"
                onClick={() => !submitting && onClose?.()}
                className="text-sm text-taupe hover:text-charcoal bg-transparent border-none cursor-pointer underline underline-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

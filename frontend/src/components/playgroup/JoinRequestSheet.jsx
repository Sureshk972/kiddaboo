import { useState } from "react";
import Button from "../ui/Button";

export default function JoinRequestSheet({
  isOpen,
  onClose,
  screeningQuestions = [],
  playgroupName,
  onSubmit,
}) {
  const [intro, setIntro] = useState("");
  const [answers, setAnswers] = useState(
    screeningQuestions.reduce((acc, q, i) => ({ ...acc, [i]: "" }), {})
  );
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit?.({ intro, answers });
  };

  const canSubmit =
    intro.trim().length > 0 &&
    screeningQuestions.every((_, i) => answers[i]?.trim().length > 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 z-40 transition-opacity"
        onClick={onClose}
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
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="#7A8F6D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-bold text-charcoal mb-2">
                Request sent!
              </h3>
              <p className="text-sm text-taupe leading-relaxed mb-6">
                The host of {playgroupName} will review your request. You'll be
                notified when they respond.
              </p>
              <Button variant="secondary" onClick={onClose}>
                Got it
              </Button>
            </div>
          ) : (
            /* Request form */
            <>
              <h3 className="text-xl font-heading font-bold text-charcoal mb-1">
                Request to join
              </h3>
              <p className="text-sm text-taupe mb-6">
                Tell the host a bit about you and your family.
              </p>

              {/* Intro message */}
              <div className="mb-5">
                <label className="text-sm font-medium text-taupe block mb-1.5">
                  Introduce yourself
                </label>
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  placeholder="Hi! We're the [family name]. We'd love to join because..."
                  maxLength={300}
                  rows={3}
                  className="
                    w-full bg-white border border-cream-dark rounded-xl px-4 py-3.5
                    text-charcoal font-body text-sm outline-none transition-all duration-150
                    resize-none placeholder:text-taupe/40
                    focus:ring-2 focus:ring-sage-light focus:border-sage
                  "
                />
                <span className="text-[11px] text-taupe/50 block text-right mt-1">
                  {intro.length}/300
                </span>
              </div>

              {/* Screening questions */}
              {screeningQuestions.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-taupe/60 uppercase tracking-wide font-medium mb-3">
                    From the host
                  </p>
                  <div className="flex flex-col gap-4">
                    {screeningQuestions.map((q, i) => (
                      <div key={i}>
                        <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                          {q}
                        </label>
                        <textarea
                          value={answers[i]}
                          onChange={(e) =>
                            setAnswers({ ...answers, [i]: e.target.value })
                          }
                          placeholder="Your answer..."
                          rows={2}
                          className="
                            w-full bg-white border border-cream-dark rounded-xl px-4 py-3
                            text-charcoal font-body text-sm outline-none transition-all duration-150
                            resize-none placeholder:text-taupe/40
                            focus:ring-2 focus:ring-sage-light focus:border-sage
                          "
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button fullWidth onClick={handleSubmit} disabled={!canSubmit}>
                Send Request
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import Button from "../ui/Button";

export default function JoinRequestSheet({
  isOpen,
  onClose,
  screeningQuestions = [],
  playgroupName,
  playgroupId,
  onSubmit,
}) {
  // Draft autosave key — scoped to the playgroup so a parent who opens
  // multiple groups before submitting doesn't clobber drafts. Falls
  // back to name when id isn't passed (older callers).
  const draftKey = `kiddaboo.joinDraft.${playgroupId || playgroupName || "unknown"}`;

  const [intro, setIntro] = useState("");
  const [answers, setAnswers] = useState(
    screeningQuestions.reduce((acc, q, i) => ({ ...acc, [i]: "" }), {})
  );

  // Restore draft when the sheet opens.
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.intro === "string") setIntro(parsed.intro);
      if (parsed?.answers && typeof parsed.answers === "object") {
        setAnswers((prev) => ({ ...prev, ...parsed.answers }));
      }
    } catch {
      // Corrupt draft — ignore.
    }
  }, [isOpen, draftKey]);

  // Autosave draft as the user types. sessionStorage (not localStorage)
  // because join-intro can include personal context the parent wouldn't
  // expect to persist across browser restarts.
  useEffect(() => {
    if (!isOpen) return;
    if (!intro && Object.values(answers).every((v) => !v)) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ intro, answers }));
    } catch {
      // Quota / private mode — silently drop.
    }
  }, [isOpen, intro, answers, draftKey]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // #51: Escape-to-close for keyboard users. Click-outside already
  // worked via the backdrop onClick, but Escape was ignored so keyboard
  // users had no way out short of tabbing to Send Request and filling
  // out the form. Listener is scoped to `isOpen` so we're not keeping a
  // window handler live for every mounted sheet — and we bail if the
  // sheet is already in the "submitted" success state, since at that
  // point Escape should still close (identical to clicking Got it).
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // #53: await the parent callback so we only show "Request sent!" on
  // actual success. Previously this was fire-and-forget — the success
  // screen appeared even if the DB insert failed, which is the worst
  // possible outcome for a trust-based product: silent false confirmation.
  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await onSubmit?.({ intro, answers });
      // The parent callback should return { error } on failure
      if (result?.error) {
        setError("Something went wrong sending your request. Please try again.");
        setSaving(false);
        return;
      }
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong sending your request. Please try again.");
    } finally {
      setSaving(false);
    }
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
                    stroke="#5C6B52"
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

              {error && (
                <div className="bg-terracotta-light/30 border border-terracotta-light rounded-xl p-3 mb-4 text-center">
                  <p className="text-sm text-terracotta font-medium">{error}</p>
                </div>
              )}

              <Button fullWidth onClick={handleSubmit} disabled={!canSubmit || saving}>
                {saving ? "Sending..." : "Send Request"}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

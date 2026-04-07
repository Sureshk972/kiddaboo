import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

const REPORT_REASONS = [
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam or fake profile" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "fake_profile", label: "Fake or misleading profile" },
  { value: "other", label: "Other" },
];

export default function ReportSheet({
  isOpen,
  onClose,
  userName,
  onReport,
  onBlock,
  showBlock = true,
}) {
  const [step, setStep] = useState("choose"); // choose | report | done
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onReport?.({ reportType: reason, description: description.trim() });
    setSubmitting(false);
    setStep("done");
  };

  const handleBlock = async () => {
    setSubmitting(true);
    await onBlock?.();
    setSubmitting(false);
    setStep("done");
  };

  const handleClose = () => {
    setStep("choose");
    setReason("");
    setDescription("");
    onClose();
  };

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Use portal to escape page-transition transform context
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 z-[9998] transition-opacity"
        onClick={handleClose}
      />

      {/* Modal — centered on screen */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-cream rounded-3xl max-h-[80vh] overflow-y-auto w-full max-w-sm pointer-events-auto shadow-xl">
          <div className="px-6 py-6">
            {step === "done" ? (
              /* Success */
              <div className="py-6 text-center">
                <div className="w-14 h-14 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#7A8F6D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-heading font-bold text-charcoal mb-2">
                  Thanks for letting us know
                </h3>
                <p className="text-sm text-taupe leading-relaxed mb-6">
                  We'll review this and take action if needed. Your report is confidential.
                </p>
                <Button variant="secondary" onClick={handleClose}>
                  Done
                </Button>
              </div>
            ) : step === "report" ? (
              /* Report form */
              <>
                <h3 className="text-lg font-heading font-bold text-charcoal mb-1">
                  Report {userName}
                </h3>
                <p className="text-sm text-taupe mb-5">
                  Select a reason for your report.
                </p>

                <div className="flex flex-col gap-2 mb-5">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all border cursor-pointer ${
                        reason === r.value
                          ? "bg-sage-light text-sage-dark border-sage"
                          : "bg-white text-taupe-dark border-cream-dark hover:border-sage-light"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {reason && (
                  <div className="mb-5">
                    <label className="text-sm font-medium text-taupe block mb-1.5">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell us more about what happened..."
                      rows={3}
                      maxLength={500}
                      className="w-full bg-white border border-cream-dark rounded-xl px-4 py-3 text-charcoal font-body text-sm outline-none resize-none placeholder:text-taupe/40 focus:ring-2 focus:ring-sage-light focus:border-sage"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    fullWidth
                    onClick={handleReport}
                    disabled={!reason || submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Report"}
                  </Button>
                  <Button variant="secondary" onClick={() => setStep("choose")}>
                    Back
                  </Button>
                </div>
              </>
            ) : (
              /* Choose action */
              <>
                <h3 className="text-lg font-heading font-bold text-charcoal mb-1">
                  {userName}
                </h3>
                <p className="text-sm text-taupe mb-5">
                  What would you like to do?
                </p>

                <div className="flex flex-col gap-3">
                  {/* Report */}
                  <button
                    onClick={() => setStep("report")}
                    className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-xl border border-cream-dark cursor-pointer hover:border-sage-light transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-terracotta-light/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 22V15" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal">Report</p>
                      <p className="text-xs text-taupe">
                        Flag inappropriate behavior for review
                      </p>
                    </div>
                  </button>

                  {/* Block */}
                  {showBlock && (
                    <button
                      onClick={handleBlock}
                      disabled={submitting}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-xl border border-cream-dark cursor-pointer hover:border-sage-light transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-cream-dark rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#8B7E74" strokeWidth="1.5"/>
                          <path d="M4.93 4.93L19.07 19.07" stroke="#8B7E74" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {submitting ? "Blocking..." : "Block"}
                        </p>
                        <p className="text-xs text-taupe">
                          Hide this person's content from you
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Cancel */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 text-sm text-taupe font-medium bg-transparent border-none cursor-pointer underline underline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

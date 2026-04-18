import { useState, useEffect } from "react";
import Button from "../ui/Button";

// Sheet that replaces the native confirm() for session cancellation.
// Shows how many families will be affected, lets the host add an
// optional reason, and forwards both to the parent's onConfirm so the
// hook can post a system message in the group chat.
export default function CancelSessionSheet({
  isOpen,
  onClose,
  onConfirm,
  rsvpCount = 0,
  sessionDateLabel,
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setError("");
      setSaving(false);
      return;
    }
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSaving(true);
    setError("");
    const result = await onConfirm?.(reason);
    if (result?.error) {
      setError("Couldn't cancel the session. Try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose?.();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-charcoal/40 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-cream-dark rounded-full" />
        </div>

        <div className="px-6 pb-8">
          <h3 className="text-xl font-heading font-bold text-charcoal mb-1">
            Cancel this session?
          </h3>
          <p className="text-sm text-taupe mb-4">
            {sessionDateLabel
              ? `The ${sessionDateLabel} session will be removed from the schedule.`
              : "This session will be removed from the schedule."}
          </p>

          {rsvpCount > 0 ? (
            <div className="bg-terracotta-light/40 border border-terracotta/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm text-charcoal font-medium">
                {rsvpCount} {rsvpCount === 1 ? "family is" : "families are"} RSVP'd
              </p>
              <p className="text-xs text-taupe-dark mt-0.5">
                They'll get a message in the group chat letting them know.
              </p>
            </div>
          ) : (
            <div className="bg-sage-light/40 border border-sage/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm text-charcoal">
                No families have RSVP'd yet.
              </p>
            </div>
          )}

          <div className="mb-5">
            <label className="text-sm font-medium text-taupe block mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Weather, illness, scheduling — anything you want parents to know."
              maxLength={280}
              rows={3}
              className="
                w-full bg-white border border-cream-dark rounded-xl px-4 py-3
                text-charcoal font-body text-sm outline-none transition-all duration-150
                resize-none placeholder:text-taupe/40
                focus:ring-2 focus:ring-sage-light focus:border-sage
              "
            />
            <span className="text-[11px] text-taupe/50 block text-right mt-1">
              {reason.length}/280
            </span>
          </div>

          {error && (
            <p className="text-xs text-terracotta mb-3">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full bg-terracotta text-white font-bold text-sm rounded-2xl px-4 py-3 cursor-pointer border-none hover:bg-terracotta/90 transition-colors disabled:opacity-60"
            >
              {saving ? "Cancelling…" : "Cancel session"}
            </button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Keep session
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

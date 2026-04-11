import { useState, useEffect } from "react";

// #39: ConfirmModal optionally prompts for a reason (or any free-text
// field) before confirming. Pass an `input` object to opt in:
//
//   setConfirmAction({
//     ...,
//     input: {
//       label: "Reason",
//       placeholder: "Why are you flagging this?",
//       initial: "",             // optional default
//       required: true,          // optional; blocks confirm if blank
//       fallback: "Flagged by admin",  // optional; used when blank + !required
//     },
//     onConfirm: (reason) => flagPlaygroup(pg.id, reason),
//   })
//
// When `input` is present, the modal renders a text field and passes
// the trimmed value (or `fallback` if blank and not required) to
// `onConfirm`. Callers that don't use `input` are unaffected — their
// onConfirm still gets called with `undefined`, which they already
// ignore. This lets us unify single-flag and bulk-flag behind a
// consistent reason-prompt UX (#39).
export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  loading,
  input,
}) {
  const [value, setValue] = useState(input?.initial || "");

  // Reset the input when the modal is opened with a new input config.
  // Without this, clicking Flag on one playgroup, cancelling, then
  // opening it on another would keep the previous draft reason.
  useEffect(() => {
    setValue(input?.initial || "");
  }, [input?.initial, input?.label, input?.placeholder]);

  const trimmed = value.trim();
  const isBlank = trimmed.length === 0;
  const isBlocked = !!input && !!input.required && isBlank;

  function handleConfirm() {
    if (isBlocked) return;
    if (input) {
      // Blank-but-allowed → fall back to the provided default label
      // (e.g., "Flagged by admin") so the DB column is never empty.
      const finalValue = isBlank ? (input.fallback || "") : trimmed;
      onConfirm(finalValue);
    } else {
      onConfirm();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-charcoal/40 z-40"
        onClick={!loading ? onCancel : undefined}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
            {title}
          </h3>
          <p className="text-sm text-taupe leading-relaxed mb-4">{message}</p>

          {input && (
            <div className="mb-5">
              {input.label && (
                <label className="block text-xs font-medium text-taupe-dark mb-1.5">
                  {input.label}
                  {input.required && (
                    <span className="text-terracotta ml-0.5">*</span>
                  )}
                </label>
              )}
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && !isBlocked) {
                    handleConfirm();
                  }
                }}
                placeholder={input.placeholder || ""}
                autoFocus
                disabled={loading}
                className="w-full bg-white border border-cream-dark rounded-xl px-4 py-2.5 text-sm text-charcoal placeholder:text-taupe/50 outline-none focus:ring-2 focus:ring-sage-light focus:border-sage transition-all disabled:opacity-50"
              />
              {input.fallback && !input.required && (
                <p className="text-[11px] text-taupe/60 mt-1">
                  Leave blank to use: &ldquo;{input.fallback}&rdquo;
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading || isBlocked}
              className={`flex-1 ${confirmColor || "bg-red-500 hover:bg-red-600"} text-white font-medium rounded-xl py-3 text-sm cursor-pointer border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-white border border-cream-dark text-charcoal font-medium rounded-xl py-3 text-sm cursor-pointer transition-colors hover:bg-cream-dark/50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

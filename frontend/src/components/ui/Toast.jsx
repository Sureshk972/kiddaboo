import { useEffect } from "react";

// Bottom-floating toast for fire-and-forget feedback after an optimistic
// mutation. Auto-dismisses; tap anywhere on the toast to dismiss early.
// Sits above the TabBar by clearing its 64px height + safe-area inset.
export default function Toast({ toast, onDismiss, durationMs = 3000 }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;
  const tone =
    toast.type === "error"
      ? "bg-terracotta text-white"
      : "bg-sage-dark text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className={`fixed left-1/2 -translate-x-1/2 z-40 px-4 py-3 rounded-xl text-sm font-medium shadow-lg max-w-[88%] text-center cursor-pointer ${tone}`}
      style={{
        bottom: "calc(4rem + env(safe-area-inset-bottom) + 16px)",
      }}
    >
      {toast.message}
    </div>
  );
}

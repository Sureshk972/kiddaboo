import { useEffect } from "react";

export default function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-charcoal/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-cream-dark shadow-lg flex flex-col"
      >
        <div className="px-5 py-3 border-b border-cream-dark flex items-center justify-between">
          <h2 id="drawer-title" className="font-heading font-bold text-charcoal text-sm">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="text-taupe-dark hover:text-charcoal text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading }) {
  return (
    <>
      <div className="fixed inset-0 bg-charcoal/40 z-40" onClick={!loading ? onCancel : undefined} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h3 className="font-heading font-bold text-charcoal text-lg mb-2">{title}</h3>
          <p className="text-sm text-taupe leading-relaxed mb-5">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 ${confirmColor || "bg-red-500 hover:bg-red-600"} text-white font-medium rounded-xl py-3 text-sm cursor-pointer border-none transition-colors disabled:opacity-50`}
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

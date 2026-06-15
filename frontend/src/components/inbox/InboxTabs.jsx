export default function InboxTabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Inbox sections"
      className="flex gap-1 bg-cream-dark/40 p-1 rounded-xl"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`flex-1 text-center text-xs font-medium py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-sage text-white"
                : "text-taupe-dark hover:text-charcoal"
            }`}
          >
            {t.label}
            {!isActive && t.count > 0 && (
              <span className="ml-1 text-taupe">· {t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

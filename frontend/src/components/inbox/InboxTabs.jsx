// Inactive tabs that need attention show a colored dot to the right of the
// label instead of a "· N" count. `attention` can be:
//   "alert" — action needed (terracotta), pulses gently
//   "info"  — heads-up (sage), static
//   null    — nothing
const DOT_TONE = {
  alert: "bg-terracotta animate-pulse",
  info: "bg-teal",
};

export default function InboxTabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Inbox sections"
      className="flex gap-1 bg-cream-dark/40 p-1 rounded-xl"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        const showDot = !isActive && t.attention;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors ${
              isActive
                ? "bg-sage text-white"
                : "text-taupe-dark hover:text-charcoal"
            }`}
          >
            <span>{t.label}</span>
            {showDot && (
              <span
                aria-label="Needs attention"
                className={`inline-block w-1.5 h-1.5 rounded-full ${DOT_TONE[t.attention] || ""}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

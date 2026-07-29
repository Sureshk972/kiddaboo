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
      className="flex gap-4 border-b border-cream-dark"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        const showDot = !isActive && t.attention;
        // Asterisk marks a tab with new/unseen entries; hidden on the active
        // tab and cleared once the nanny views it (see NannyDashboard).
        const showNew = !isActive && t.isNew;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center justify-center gap-1 text-xs font-medium py-2 -mb-px transition-colors duration-200 border-b-2 ${
              isActive
                ? "border-sage text-sage font-semibold"
                : "border-transparent text-taupe-dark hover:text-charcoal"
            }`}
          >
            <span>{t.label}</span>
            {showNew && (
              <span aria-label="New entries" className="text-sage font-bold leading-none">
                *
              </span>
            )}
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

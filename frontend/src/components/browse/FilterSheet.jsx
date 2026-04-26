import { createPortal } from "react-dom";
import { VIBE_TAGS, AGE_RANGES } from "../../data/mockData";

const SETTINGS = ["Indoor", "Outdoor", "Indoor + Outdoor"];
const ACCESS_TYPES = [
  { value: "open", label: "Open" },
  { value: "request", label: "Request to Join" },
  { value: "invite", label: "Invite Only" },
];

function ChipGroup({ label, options, selected, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-charcoal">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const display = typeof opt === "string" ? opt : opt.label;
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={`
                px-3 py-2 rounded-full text-xs font-medium
                transition-all duration-150 cursor-pointer border
                ${
                  isSelected
                    ? "bg-sage-light text-sage-dark border-sage"
                    : "bg-cream-dark text-taupe border-transparent hover:border-sage-light"
                }
              `}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DISTANCE_OPTIONS = [
  { value: 5, label: "≤ 5 mi" },
  { value: 10, label: "≤ 10 mi" },
  { value: 25, label: "≤ 25 mi" },
  { value: 50, label: "≤ 50 mi" },
];

export default function FilterSheet({ open, onClose, filters, onChange, isPremium = false, onUpgrade, hasLocation = false }) {
  if (!open) return null;

  const toggle = (key, value) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const activeCount =
    (filters.vibeTags?.length || 0) +
    (filters.ageRange?.length || 0) +
    (filters.setting?.length || 0) +
    (filters.accessType?.length || 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.maxDistance ? 1 : 0);

  const clearAll = () => {
    onChange({
      vibeTags: [],
      ageRange: [],
      setting: [],
      accessType: [],
      verifiedOnly: false,
      maxDistance: null,
    });
  };

  const setMaxDistance = (value) => {
    // Single-select: tapping the active chip clears it.
    onChange({
      ...filters,
      maxDistance: filters.maxDistance === value ? null : value,
    });
  };

  const toggleVerifiedOnly = () => {
    onChange({ ...filters, verifiedOnly: !filters.verifiedOnly });
  };

  const PremiumLock = () => (
    <button
      type="button"
      onClick={onUpgrade}
      className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors"
    >
      <span className="flex items-center gap-2 text-xs text-charcoal">
        <span>🔒</span>
        <span><span className="font-bold">Premium filter.</span> <span className="text-taupe">Tap to unlock.</span></span>
      </span>
      <span className="text-xs font-bold text-amber-700">→</span>
    </button>
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 z-30 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-cream rounded-t-3xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-cream-dark" />
        </div>

        <div className="px-6 pb-4 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-heading font-bold text-charcoal">
              Filters
            </h2>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-sage font-medium hover:text-sage-dark cursor-pointer bg-transparent border-none underline underline-offset-4"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* Distance — needs user location to be meaningful */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-charcoal">Distance</label>
              {hasLocation ? (
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_OPTIONS.map((opt) => {
                    const isSelected = filters.maxDistance === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMaxDistance(opt.value)}
                        className={`
                          px-3 py-2 rounded-full text-xs font-medium
                          transition-all duration-150 cursor-pointer border
                          ${
                            isSelected
                              ? "bg-sage-light text-sage-dark border-sage"
                              : "bg-cream-dark text-taupe border-transparent hover:border-sage-light"
                          }
                        `}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-taupe/70 bg-cream-dark/60 rounded-xl px-3 py-2.5">
                  Enable location on the Browse page to filter by distance.
                </p>
              )}
            </div>

            {/* Vibe */}
            <ChipGroup
              label="Vibe"
              options={[...VIBE_TAGS, "Outdoorsy", "Gentle parenting", "Screen-free", "Faith-based", "Waldorf"]}
              selected={filters.vibeTags}
              onToggle={(v) => toggle("vibeTags", v)}
            />

            {/* Age range — premium gated */}
            {isPremium ? (
              <ChipGroup
                label="Age range"
                options={AGE_RANGES}
                selected={filters.ageRange}
                onToggle={(v) => toggle("ageRange", v)}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-charcoal">Age range</label>
                <PremiumLock />
              </div>
            )}

            {/* Setting — premium gated */}
            {isPremium ? (
              <ChipGroup
                label="Setting"
                options={SETTINGS}
                selected={filters.setting}
                onToggle={(v) => toggle("setting", v)}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-charcoal">Setting</label>
                <PremiumLock />
              </div>
            )}

            {/* Access type */}
            <ChipGroup
              label="Access"
              options={ACCESS_TYPES}
              selected={filters.accessType}
              onToggle={(v) => toggle("accessType", v)}
            />

            {/* Trust — verified hosts only. Free for everyone since
                trust-and-safety filters shouldn't be paywalled. */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-charcoal">Trust</label>
              <button
                type="button"
                onClick={toggleVerifiedOnly}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors border ${
                  filters.verifiedOnly
                    ? "bg-blue-50 border-blue-300 text-blue-800"
                    : "bg-cream-dark border-transparent text-charcoal hover:border-sage-light"
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  Verified hosts only
                </span>
                <span
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    filters.verifiedOnly ? "bg-blue-600" : "bg-cream"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      filters.verifiedOnly ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Apply button */}
        <div className="px-6 pb-8 pt-4 shrink-0 bg-cream border-t border-cream-dark/20">
          <button
            onClick={onClose}
            className="
              w-full bg-sage text-white font-medium text-base
              rounded-2xl px-6 py-4 transition-all duration-150 cursor-pointer
              hover:bg-sage-dark active:scale-[0.98] shadow-sm
            "
          >
            Show results
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// Warm illustrated empty state — a soft terracotta line-icon in a cream
// circle, a title, and an optional supportive line. Replaces the bare
// "No X yet." text boxes for a friendlier feel.

const ICONS = {
  heart: (
    <path d="M24 41s-14-8.5-14-19a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 10.5-14 19-14 19Z" />
  ),
  calendar: (
    <>
      <rect x="8" y="12" width="32" height="28" rx="4" />
      <path d="M8 20h32M16 8v6M32 8v6" />
      <circle cx="24" cy="30" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  chat: (
    <>
      <path d="M10 12h28a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H20l-8 7v-7h-2a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2Z" />
      <path d="M17 22h14M17 26h9" />
    </>
  ),
  clock: (
    <>
      <circle cx="24" cy="24" r="15" />
      <path d="M24 15v9l6 4" />
    </>
  ),
};

export default function EmptyState({ icon = "chat", title, children }) {
  return (
    <div className="bg-white border border-cream-dark rounded-2xl p-8 text-center flex flex-col items-center gap-3 shadow-sm">
      <div className="bg-sage-light rounded-full p-3.5 inline-flex">
        <svg
          width="44"
          height="44"
          viewBox="0 0 48 48"
          fill="none"
          stroke="#C2673C"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ICONS[icon] || ICONS.chat}
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-charcoal">{title}</p>
        {children && <p className="text-xs text-taupe mt-1 max-w-[16rem]">{children}</p>}
      </div>
    </div>
  );
}

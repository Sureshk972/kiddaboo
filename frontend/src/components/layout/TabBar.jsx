import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
  {
    path: "/browse",
    label: "Browse",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="11"
          cy="11"
          r="7"
          stroke="currentColor"
          strokeWidth="1.5"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.15 : 0}
        />
        <path
          d="M16 16L21 21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    path: "/my-groups",
    matchPaths: ["/my-groups", "/host/dashboard"],
    label: "My Groups",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 21V19C16 16.79 14.21 15 12 15H6C3.79 15 2 16.79 2 19V21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle
          cx="9"
          cy="7"
          r="4"
          stroke="currentColor"
          strokeWidth="1.5"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.15 : 0}
        />
        <path
          d="M22 21V19C22 17.36 21.04 15.93 19.62 15.35"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M16 3.13C17.42 3.71 18.38 5.14 18.38 6.78C18.38 8.42 17.42 9.85 16 10.43"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    path: "/messages",
    label: "Messages",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15C21 15.55 20.78 16.05 20.41 16.41C20.05 16.78 19.55 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.15 : 0}
        />
      </svg>
    ),
  },
  {
    path: "/my-profile",
    label: "Profile",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke="currentColor"
          strokeWidth="1.5"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.15 : 0}
        />
        <path
          d="M20 21C20 17.13 16.42 14 12 14C7.58 14 4 17.13 4 21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sticky bottom-0 z-30 bg-cream/95 backdrop-blur-sm border-t border-cream-dark pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-1">
        {TABS.map((tab) => {
          const isActive = tab.matchPaths
            ? tab.matchPaths.some((p) => location.pathname.startsWith(p))
            : location.pathname === tab.path;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl
                transition-colors duration-150 cursor-pointer
                bg-transparent border-none min-w-[60px]
                ${isActive ? "text-sage-dark" : "text-taupe/50 hover:text-taupe"}
              `}
            >
              {tab.icon(isActive)}
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-sage-dark" : "text-taupe/50"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

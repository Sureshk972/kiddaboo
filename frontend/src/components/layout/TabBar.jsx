import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../hooks/useNotifications";

// Icons
const BrowseIcon = (active) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle
      cx="11"
      cy="11"
      r="7"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
    <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GroupsIcon = (active) => (
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
      fillOpacity={active ? 0.3 : 0}
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
);

const DashboardIcon = (active) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="3"
      width="7"
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
    <rect
      x="14"
      y="3"
      width="7"
      height="5"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
    <rect
      x="14"
      y="12"
      width="7"
      height="9"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
    <rect
      x="3"
      y="16"
      width="7"
      height="5"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
  </svg>
);

const InsightsIcon = (active) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 3V21H21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 14L11 10L14 13L20 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
    <circle
      cx="20"
      cy="7"
      r="1.5"
      fill="currentColor"
      fillOpacity={active ? 1 : 0.4}
    />
  </svg>
);

const MessagesIcon = (active) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 15C21 15.55 20.78 16.05 20.41 16.41C20.05 16.78 19.55 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
  </svg>
);

const ProfileIcon = (active) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="8"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.3 : 0}
    />
    <path
      d="M20 21C20 17.13 16.42 14 12 14C7.58 14 4 17.13 4 21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const PARENT_TABS = [
  { path: "/browse", label: "Browse", icon: BrowseIcon },
  {
    path: "/my-groups",
    matchPaths: ["/my-groups"],
    label: "My Groups",
    icon: GroupsIcon,
  },
  { path: "/messages", label: "Messages", icon: MessagesIcon },
  { path: "/my-profile", label: "Profile", icon: ProfileIcon },
];

const ORGANIZER_TABS = [
  {
    path: "/host/dashboard",
    matchPaths: ["/host/dashboard", "/my-groups"],
    label: "My Group",
    icon: DashboardIcon,
  },
  { path: "/host/insights", label: "Members", icon: InsightsIcon },
  { path: "/messages", label: "Messages", icon: MessagesIcon },
  { path: "/my-profile", label: "Profile", icon: ProfileIcon },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, accountType } = useAuth();
  const { unreadMessages, pendingRequests } = useNotifications(user?.id);
  const TABS = accountType === "organizer" ? ORGANIZER_TABS : PARENT_TABS;
  const badges = {
    "/messages": unreadMessages,
    "/host/dashboard": pendingRequests,
  };

  return (
    <nav aria-label="Main navigation" className="sticky bottom-0 z-30 bg-white border-t border-cream-dark shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-1">
        {TABS.map((tab) => {
          const isActive = tab.matchPaths
            ? tab.matchPaths.some((p) => location.pathname.startsWith(p))
            : location.pathname === tab.path;

          const badgeCount = badges[tab.path] || 0;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl
                transition-colors duration-150 cursor-pointer
                border-none min-w-[60px] relative
                ${isActive
                  ? "text-sage-dark bg-sage-light"
                  : "bg-transparent text-taupe hover:text-taupe-dark"}
              `}
            >
              <div className="relative">
                {tab.icon(isActive)}
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-terracotta text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-sage-dark" : "text-taupe"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          aria-label="Sign out"
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors duration-150 cursor-pointer bg-transparent border-none min-w-[60px] text-taupe hover:text-taupe-dark"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-medium text-taupe">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

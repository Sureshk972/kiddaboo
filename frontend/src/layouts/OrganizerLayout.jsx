import TabBar from "../components/layout/TabBar";
import { useNotificationCounts } from "../context/NotificationsContext";

/**
 * Organizer-mode wrapper. Terracotta accent, "ORGANIZER" label, and
 * warmer background so the mode feels visually different from Parent.
 * We scope the accent with data-mode="organizer" so individual pages
 * can opt into mode-aware styling via CSS attribute selectors if they
 * want (e.g., buttons that read from [data-mode=organizer] .btn).
 */
export default function OrganizerLayout({ children }) {
  const { unreadMessages, pendingRequests } = useNotificationCounts();
  const badges = {
    "/host/dashboard": pendingRequests,
    "/messages": unreadMessages,
  };
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="organizer">
      <div className="hidden md:block bg-sage-dark text-center py-2 text-xs text-white">
        Kiddaboo is designed for mobile — open this on your phone for the best experience.
      </div>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="px-5 pt-3">
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: '#8B3FE0' }}>
            Organizer
          </span>
        </div>
        <div className="flex-1">{children}</div>
        <TabBar badges={badges} />
      </div>
    </div>
  );
}

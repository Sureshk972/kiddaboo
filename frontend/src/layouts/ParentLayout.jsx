import TabBar from "../components/layout/TabBar";
import LegalFooter from "../components/LegalFooter";
import { useNotificationCounts } from "../context/NotificationsContext";

/**
 * Parent-mode wrapper. Adds the small uppercase "PARENT" label at the
 * top of the page and reserves space for the bottom TabBar. We rely on
 * TabBar to pick the correct tabs via accountType (Task 7 wires that).
 *
 * Accent color (sage #5C6B52) is already the global default in
 * Kiddaboo, so there's nothing to override here. OrganizerLayout
 * does the accent overriding.
 */
export default function ParentLayout({ children }) {
  const { unreadMessages, pendingRequests } = useNotificationCounts();
  const badges = {
    "/my-groups": pendingRequests,
    "/messages": unreadMessages,
  };
  return (
    <div className="min-h-screen bg-cream flex flex-col" data-mode="parent">
      <div className="hidden md:block bg-sage-dark text-center py-2 text-xs text-white">
        Kiddaboo is designed for mobile — open this on your phone for the best experience.
      </div>
      <div className="w-full" style={{ backgroundColor: '#8B3FE0' }}>
        <div className="max-w-md mx-auto px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-2">
          <span
            className="text-base text-white tracking-tight"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
          >
            Kiddaboo
          </span>
          <span className="text-white/50 text-[10px]">·</span>
          <span className="text-[10px] font-bold tracking-[1.5px] text-white uppercase">
            Parent
          </span>
        </div>
      </div>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {children}
          <LegalFooter />
        </div>
        <TabBar badges={badges} />
      </div>
    </div>
  );
}

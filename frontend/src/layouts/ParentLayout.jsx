import TopBar from "../components/layout/TopBar";
import TabBar from "../components/layout/TabBar";
import LegalFooter from "../components/LegalFooter";
import { useNotificationCounts } from "../context/NotificationsContext";

/**
 * Parent-mode wrapper. TopBar provides the greeting + brand bar.
 * TabBar picks the correct tabs via accountType.
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
      <TopBar />
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

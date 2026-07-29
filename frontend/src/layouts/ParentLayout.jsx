import TabBar from "../components/layout/TabBar";
import LegalFooter from "../components/LegalFooter";
import { useAuth } from "../context/AuthContext";
import { useNotificationCounts } from "../context/NotificationsContext";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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
  const { profile } = useAuth();
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
      <div className="w-full bg-cream">
        <div className="max-w-md mx-auto px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-2">
          <span className="text-lg text-charcoal tracking-tight font-display font-semibold">
            Kiddaboo
          </span>
          <span className="text-taupe text-[10px]">·</span>
          <span className="text-[10px] font-bold tracking-[1.5px] text-taupe uppercase">
            Parent
          </span>
          {profile?.first_name && (
            <span className="ml-auto text-sm text-taupe tracking-tight">
              {greeting()}, {profile.first_name}
            </span>
          )}
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

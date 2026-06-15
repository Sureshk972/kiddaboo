import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import TabBar from "./TabBar";
import { useAuth } from "../../context/AuthContext";
import usePushNotifications from "../../hooks/usePushNotifications";
import useInboxAttention from "../../hooks/useInboxAttention";
import { useAccountType } from "../../hooks/useAccountType";
import PushPermissionPrompt from "../ui/PushPermissionPrompt";
import PageTransition from "../ui/PageTransition";
import LegalFooter from "../LegalFooter";

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const { shouldShowPrompt, subscribe, dismissPrompt } = usePushNotifications(user?.id);
  const { isNanny } = useAccountType();
  const { badgeCount } = useInboxAttention();
  const location = useLocation();
  const scrollRef = useRef(null);

  // Scroll to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Bottom-tab attention badge sits on the Inbox tab for both roles —
  // the path differs (parent: /inbox, nanny: /nanny/dashboard).
  const badges = {
    [isNanny ? "/nanny/dashboard" : "/inbox"]: badgeCount,
  };

  return (
    <div className="h-dvh bg-cream flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col min-h-0 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {shouldShowPrompt && (
          <div className="pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <PushPermissionPrompt
              onEnable={subscribe}
              onDismiss={dismissPrompt}
            />
          </div>
        )}
        <PageTransition>
          {children}
        </PageTransition>
        <LegalFooter />
      </div>
      <TabBar badges={badges} />
    </div>
  );
}

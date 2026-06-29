import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import TabBar from "./TabBar";
import { useAuth } from "../../context/AuthContext";
import usePushNotifications from "../../hooks/usePushNotifications";
import { useInboxAttention } from "../../context/InboxAttentionContext";
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
      <div
        className="px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-2"
        style={{ backgroundColor: '#8B3FE0' }}
      >
        <span
          className="text-base text-white tracking-tight"
          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800 }}
        >
          Kiddaboo
        </span>
        <span className="text-white/50 text-[10px]">·</span>
        <span className="text-[10px] font-bold tracking-[1.5px] text-white uppercase">
          {isNanny ? 'Nanny' : 'Parent'}
        </span>
      </div>
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

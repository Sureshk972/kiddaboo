import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import TabBar from "./TabBar";
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../hooks/useNotifications";
import usePushNotifications from "../../hooks/usePushNotifications";
import PushPermissionPrompt from "../ui/PushPermissionPrompt";
import PageTransition from "../ui/PageTransition";

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const { unreadMessages, pendingRequests } = useNotifications(user?.id);
  const { shouldShowPrompt, subscribe, dismissPrompt } = usePushNotifications(user?.id);
  const location = useLocation();
  const scrollRef = useRef(null);

  // Scroll to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const badges = {
    "/my-groups": pendingRequests,
    "/messages": unreadMessages,
  };

  return (
    <div className="h-dvh bg-cream flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {shouldShowPrompt && (
          <div className="pt-3">
            <PushPermissionPrompt
              onEnable={subscribe}
              onDismiss={dismissPrompt}
            />
          </div>
        )}
        <PageTransition>
          {children}
        </PageTransition>
      </div>
      <TabBar badges={badges} />
    </div>
  );
}

import TabBar from "./TabBar";
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../hooks/useNotifications";
import usePushNotifications from "../../hooks/usePushNotifications";
import PushPermissionPrompt from "../ui/PushPermissionPrompt";

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const { unreadMessages, pendingRequests } = useNotifications(user?.id);
  const { shouldShowPrompt, subscribe, dismissPrompt } = usePushNotifications(user?.id);

  const badges = {
    "/my-groups": pendingRequests,
    "/messages": unreadMessages,
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 overflow-y-auto pb-16">
        {shouldShowPrompt && (
          <div className="pt-3">
            <PushPermissionPrompt
              onEnable={subscribe}
              onDismiss={dismissPrompt}
            />
          </div>
        )}
        {children}
      </div>
      <TabBar badges={badges} />
    </div>
  );
}

import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import useNotifications from "../hooks/useNotifications";

// Single subscriber for unread/pending counts. Wrapped once around the
// auth'd app so OrganizerLayout, ParentLayout, and AppLayout all read
// from the same realtime channel — multiple subscribers were causing
// the host-side TabBar to show no badges (it just rendered TabBar
// without the AppLayout wrapper that previously held the hook).
const NotificationsContext = createContext({
  unreadMessages: 0,
  pendingRequests: 0,
  refetch: () => {},
});

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const value = useNotifications(user?.id);
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationCounts() {
  return useContext(NotificationsContext);
}

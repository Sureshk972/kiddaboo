import { createContext, useContext } from "react";

// Stub context — playgroup-era badge counts (unread messages, join
// requests) are removed. Badge wiring for the nanny model will be
// added when the Nanny dashboard inbox is built out.
const NotificationsContext = createContext({
  unreadMessages: 0,
  pendingRequests: 0,
  refetch: () => {},
});

export function NotificationsProvider({ children }) {
  return (
    <NotificationsContext.Provider value={{ unreadMessages: 0, pendingRequests: 0, refetch: () => {} }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationCounts() {
  return useContext(NotificationsContext);
}

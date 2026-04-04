import TabBar from "./TabBar";
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../hooks/useNotifications";

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const { unreadMessages, pendingRequests } = useNotifications(user?.id);

  const badges = {
    "/my-groups": pendingRequests,
    "/messages": unreadMessages,
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 overflow-y-auto pb-16">{children}</div>
      <TabBar badges={badges} />
    </div>
  );
}

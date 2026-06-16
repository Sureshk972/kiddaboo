import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useAccountType } from "../hooks/useAccountType";

// Single source of truth for the Inbox attention signals so the bottom
// tab badge (rendered in AppLayout) and the segmented tab dots (rendered
// inside ParentInbox / NannyDashboard) stay in lockstep. After any
// optimistic action that could change pending or today counts, callers
// invoke refresh() and both surfaces update.

const InboxAttentionContext = createContext({
  pending: 0,
  today: 0,
  badgeCount: 0,
  refresh: () => {},
});

export function InboxAttentionProvider({ children }) {
  const { user } = useAuth();
  const { isNanny } = useAccountType();
  const [state, setState] = useState({ pending: 0, today: 0, badgeCount: 0 });

  const load = useCallback(async () => {
    if (!user) return;
    const userIdCol = isNanny ? "nanny_id" : "parent_id";
    const { data } = await supabase
      .from("bookings")
      .select("status, slot:nanny_slots(starts_at, ends_at)")
      .eq(userIdCol, user.id)
      .in("status", ["pending", "pending_payment_retry", "confirmed"]);
    if (!data) return;
    const now = new Date();
    const todayStr = now.toDateString();
    let pending = 0;
    let today = 0;
    for (const b of data) {
      if (b.status === "pending" || b.status === "pending_payment_retry") pending++;
      else if (
        b.status === "confirmed" &&
        b.slot?.starts_at &&
        new Date(b.slot.starts_at).toDateString() === todayStr &&
        (!b.slot.ends_at || new Date(b.slot.ends_at).getTime() > now.getTime())
      )
        today++;
    }
    setState({ pending, today, badgeCount: pending + today });
  }, [user, isNanny]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <InboxAttentionContext.Provider value={{ ...state, refresh: load }}>
      {children}
    </InboxAttentionContext.Provider>
  );
}

export function useInboxAttention() {
  return useContext(InboxAttentionContext);
}

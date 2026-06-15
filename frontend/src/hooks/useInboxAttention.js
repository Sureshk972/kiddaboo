import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useAccountType } from "./useAccountType";

// Returns the per-tab attention flags + the rolled-up bottom-tab badge.
//   pending: any booking awaiting a response (parent: awaiting nanny;
//            nanny: awaiting accept/decline)
//   today:   any confirmed upcoming session happening today
// badgeCount = pending + today, capped at the visual maximum elsewhere.
export default function useInboxAttention() {
  const { user } = useAuth();
  const { isNanny } = useAccountType();
  const [state, setState] = useState({ pending: 0, today: 0, badgeCount: 0 });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const userIdCol = isNanny ? "nanny_id" : "parent_id";
      const { data } = await supabase
        .from("bookings")
        .select("status, slot:nanny_slots(starts_at, ends_at)")
        .eq(userIdCol, user.id)
        .in("status", ["pending", "pending_payment_retry", "confirmed"]);
      if (cancelled || !data) return;
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
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, isNanny]);

  return state;
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useAccountType } from "../hooks/useAccountType";
import { formatProfileName } from "../lib/profileName";

const STATUS_LABEL = {
  pending: "Pending",
  pending_payment_retry: "Payment retry",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  cancelled_refunded: "Refunded",
  cancelled_no_refund: "Cancelled · no refund",
};

const STATUS_TONE = {
  completed: "bg-gold text-white",
  confirmed: "bg-sage-light text-sage-dark",
  pending: "bg-cream-dark text-taupe-dark",
  pending_payment_retry: "bg-terracotta-light text-terracotta",
  declined: "bg-cream-dark text-taupe-dark",
  expired: "bg-cream-dark text-taupe-dark",
  cancelled_refunded: "bg-cream-dark text-taupe-dark",
  cancelled_no_refund: "bg-terracotta-light text-terracotta",
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Amount semantics by role:
//   parent → out-of-pocket = rate + Kiddaboo fee; zero when never charged
//            (declined, expired) or after a refund
//   nanny  → take = rate_cents; zero when cancelled with refund (parent
//            got the fee back, nothing landed in the nanny's bank)
function rowAmount(b, isNanny) {
  if (isNanny) {
    if (
      b.status === "cancelled_refunded" ||
      b.status === "declined" ||
      b.status === "expired"
    )
      return 0;
    return (b.rate_cents || 0) / 100;
  }
  if (b.status === "declined" || b.status === "expired" || b.status === "cancelled_refunded")
    return 0;
  return ((b.rate_cents || 0) + (b.platform_fee_cents || 0)) / 100;
}

export default function BillingHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isNanny } = useAccountType();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const userCol = isNanny ? "nanny_id" : "parent_id";
      const counterpartyCol = isNanny
        ? "parent:profiles!bookings_parent_id_fkey(id, first_name, last_name)"
        : "nanny:profiles!bookings_nanny_id_fkey(id, first_name, last_name)";
      const { data } = await supabase
        .from("bookings")
        .select(`*, slot:nanny_slots(starts_at), ${counterpartyCol}`)
        .eq(userCol, user.id)
        .order("requested_at", { ascending: false });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isNanny]);

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-xs text-taupe self-start hover:text-charcoal bg-transparent border-none"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Billing history
      </h1>
      <p className="text-xs text-taupe -mt-2">
        {isNanny
          ? "Every session you've taken, with your share of each."
          : "Every booking you've made, with what you were charged."}
      </p>

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No transactions yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((b) => {
            const counterparty = isNanny ? b.parent : b.nanny;
            const amount = rowAmount(b, isNanny);
            const sessionDate = b.slot?.starts_at || b.requested_at;
            return (
              <li key={b.id}>
                <article className="bg-white border border-cream-dark p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-taupe">{fmtDate(sessionDate)}</div>
                    <div className="text-sm font-medium text-charcoal truncate">
                      {formatProfileName(counterparty) || "—"}
                    </div>
                    <span
                      className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 ${
                        STATUS_TONE[b.status] || "bg-cream-dark text-taupe-dark"
                      }`}
                    >
                      {STATUS_LABEL[b.status] || b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-sage-dark whitespace-nowrap">
                    {amount > 0 ? `$${amount.toFixed(2)}` : "—"}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

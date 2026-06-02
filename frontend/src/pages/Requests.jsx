import { useParentBookings } from "../hooks/useParentBookings";

export default function Requests() {
  const { bookings, loading } = useParentBookings(["pending", "pending_payment_retry"]);

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Pending requests
      </h1>

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No pending requests.</p>
          <p className="text-xs text-taupe mt-1">
            Booking requests waiting on a nanny will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <article className="bg-white border border-cream-dark p-4 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-heading font-bold text-charcoal truncate">
                    {b.nanny.full_name}
                  </h3>
                  <span className="text-sm font-bold text-sage-dark whitespace-nowrap">
                    ${(b.rate_cents / 100).toFixed(0)}
                  </span>
                </div>
                <div className="text-xs text-taupe">
                  {new Date(b.slot.starts_at).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-xs text-charcoal">
                  Expires{" "}
                  {new Date(b.acceptance_expires_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                {b.status === "pending_payment_retry" && (
                  <div className="mt-1 bg-terracotta-light px-3 py-2">
                    <p className="text-xs text-terracotta font-medium">
                      Update your payment method to keep this request alive.
                    </p>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

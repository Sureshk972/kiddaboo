import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParentBookings } from "../hooks/useParentBookings";
import RatingSheet from "../components/booking/RatingSheet";
import { formatProfileName } from "../lib/profileName";
import BookingCardSkeleton from "../components/ui/BookingCardSkeleton";

const STATUS_LABEL = {
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  cancelled_refunded: "Cancelled · refunded",
  cancelled_no_refund: "Cancelled · no refund",
};

const STATUS_TONE = {
  completed: "bg-sage-light text-sage-dark",
  declined: "bg-terracotta-light text-terracotta",
  expired: "bg-cream-dark text-taupe-dark",
  cancelled_refunded: "bg-cream-dark text-taupe-dark",
  cancelled_no_refund: "bg-terracotta-light text-terracotta",
};

function RatingPrompt({ booking }) {
  const [alreadyRated, setAlreadyRated] = useState(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("direction", "parent_to_nanny");
      setAlreadyRated((data || []).length > 0);
    })();
  }, [booking.id]);

  if (alreadyRated === null) return null;
  if (alreadyRated) {
    return <span className="text-xs text-sage-dark font-medium">Rated ✓</span>;
  }
  if (!opened) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="text-xs font-medium bg-sage text-white px-3 py-1.5 self-start"
      >
        Rate nanny
      </button>
    );
  }
  return (
    <RatingSheet
      booking={booking}
      direction="parent_to_nanny"
      rateeId={booking.nanny_id}
      onDone={() => setAlreadyRated(true)}
    />
  );
}

export default function History() {
  const { bookings: raw, loading } = useParentBookings([
    "completed",
    "confirmed",
    "declined",
    "expired",
    "cancelled_refunded",
    "cancelled_no_refund",
  ]);
  // A confirmed session whose slot has ended is effectively complete from
  // the parent's perspective — surface it here so the rating prompt is
  // available without waiting on the nanny to tap "Mark complete".
  const now = Date.now();
  const bookings = raw.filter(
    (b) =>
      b.status !== "confirmed" ||
      (b.slot?.ends_at && new Date(b.slot.ends_at).getTime() <= now)
  );

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        History
      </h1>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No past bookings yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <article className="bg-white border border-cream-dark p-4 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-heading font-bold text-charcoal truncate">
                    {formatProfileName(b.nanny)}
                  </h3>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 whitespace-nowrap ${
                      STATUS_TONE[b.status === "confirmed" ? "completed" : b.status] ||
                      "bg-cream-dark text-taupe-dark"
                    }`}
                  >
                    {b.status === "confirmed"
                      ? "Completed"
                      : STATUS_LABEL[b.status] || b.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-xs text-taupe">
                  {new Date(b.slot.starts_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                {(b.status === "completed" || b.status === "confirmed") && (
                  <RatingPrompt booking={b} />
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

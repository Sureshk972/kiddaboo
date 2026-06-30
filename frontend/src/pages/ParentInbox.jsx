import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import InboxTabs from "../components/inbox/InboxTabs";
import { useParentBookings } from "../hooks/useParentBookings";
import { useInboxAttention } from "../context/InboxAttentionContext";
import { supabase } from "../lib/supabase";
import { formatProfileName } from "../lib/profileName";
import RatingSheet from "../components/booking/RatingSheet";
import BookingCardSkeleton from "../components/ui/BookingCardSkeleton";

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </div>
  );
}

const PAST_STATUSES = [
  "completed",
  "confirmed",
  "declined",
  "expired",
  "cancelled_refunded",
  "cancelled_no_refund",
];

const STATUS_LABEL = {
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  cancelled_refunded: "Cancelled · refunded",
  cancelled_no_refund: "Cancelled · no refund",
};

const STATUS_TONE = {
  completed: "bg-gold text-white",
  declined: "bg-terracotta-light text-terracotta",
  expired: "bg-cream-dark text-taupe-dark",
  cancelled_refunded: "bg-cream-dark text-taupe-dark",
  cancelled_no_refund: "bg-terracotta-light text-terracotta",
};

// Parent's out-of-pocket = nanny share + Kiddaboo fee. Both stored on
// the booking row at request time, so this is the authoritative total
// regardless of any rate edits to the underlying slot.
function totalDollars(b) {
  const cents = (b.rate_cents || 0) + (b.platform_fee_cents || 0);
  return (cents / 100).toFixed(2);
}

function dayLabel(d) {
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function fmtSessionTime(d) {
  const time = new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dayLabel(d)} at ${time}`;
}

function isToday(d) {
  return new Date(d).toDateString() === new Date().toDateString();
}

function Empty({ children }) {
  return (
    <div className="bg-white border border-cream-dark p-6 text-center">
      <p className="text-sm text-charcoal">{children}</p>
    </div>
  );
}

function CancelRequestButton({ booking, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const busy = useRef(false);

  const cancel = () => {
    if (busy.current) return;
    busy.current = true;
    onCancel(booking);
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-terracotta hover:underline self-start"
      >
        Cancel request
      </button>
    );
  }
  return (
    <div role="alertdialog" className="border border-cream-dark bg-cream/60 p-3 flex flex-col gap-2">
      <p className="text-xs text-charcoal">
        The nanny will be notified. You won't be charged.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          className="flex-1 text-xs font-medium bg-terracotta text-white py-2"
        >
          Confirm cancel
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 text-xs font-medium bg-white border border-cream-dark text-charcoal py-2"
        >
          Keep request
        </button>
      </div>
    </div>
  );
}

function PendingList() {
  const { bookings, loading, refresh, removeBooking } = useParentBookings([
    "pending",
    "pending_payment_retry",
  ]);
  const { refresh: refreshAttention } = useInboxAttention();
  const onCancel = async (b) => {
    const rollback = removeBooking(b.id);
    const { error } = await supabase.functions.invoke("cancel-booking", {
      body: { booking_id: b.id },
    });
    if (error) {
      rollback();
      toast.error(`Couldn't cancel. ${error.message || ""}`.trim());
      return;
    }
    refresh();
    refreshAttention();
  };
  if (loading) return <ListSkeleton />;
  if (bookings.length === 0)
    return <Empty>No pending requests. Booking requests waiting on a nanny will show up here.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
      {bookings.map((b) => (
        <motion.li
          key={b.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: -12, overflow: "hidden" }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        >
          <article className="bg-white border border-cream-dark p-4 flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3
                className="text-lg text-charcoal truncate"
                style={{ fontWeight: 500 }}
              >
                {formatProfileName(b.nanny)}
              </h3>
              <span
                className="text-base text-sage-dark whitespace-nowrap"
                style={{ fontWeight: 500 }}
              >
                ${totalDollars(b)}
              </span>
            </div>
            {b.slot?.starts_at && (
              <div className="text-xs text-taupe">
                {new Date(b.slot.starts_at).toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
            {b.acceptance_expires_at && (
              <div className="text-xs text-charcoal">
                Expires{" "}
                {new Date(b.acceptance_expires_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            )}
            {b.status === "pending_payment_retry" && (
              <div className="mt-1 bg-terracotta-light px-3 py-2">
                <p className="text-xs text-terracotta font-medium">
                  Update your payment method to keep this request alive.
                </p>
              </div>
            )}
            <CancelRequestButton booking={b} onCancel={onCancel} />
          </article>
        </motion.li>
      ))}
      </AnimatePresence>
    </ul>
  );
}

function UpcomingCancelButton({ booking, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const busy = useRef(false);
  const hoursUntil = booking.slot?.starts_at
    ? (new Date(booking.slot.starts_at) - new Date()) / 3600_000
    : Infinity;
  const inside24 = hoursUntil < 24;

  const cancel = () => {
    if (busy.current) return;
    busy.current = true;
    onCancel(booking);
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-terracotta hover:underline self-start"
      >
        Cancel booking
      </button>
    );
  }
  return (
    <div role="alertdialog" className="border border-cream-dark bg-cream/60 p-3 flex flex-col gap-2">
      {inside24 ? (
        <p className="text-xs text-charcoal">
          Within 24h of the session — <strong>no refund</strong> will be issued.
        </p>
      ) : (
        <p className="text-xs text-charcoal">
          More than 24h away — you'll get a full refund.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          className="flex-1 text-xs font-medium bg-terracotta text-white py-2"
        >
          Confirm cancel
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 text-xs font-medium bg-white border border-cream-dark text-charcoal py-2"
        >
          Keep booking
        </button>
      </div>
    </div>
  );
}

function UpcomingList() {
  const { bookings: all, loading, refresh, removeBooking } = useParentBookings(["confirmed"]);
  const { refresh: refreshAttention } = useInboxAttention();
  const onCancel = async (b) => {
    const rollback = removeBooking(b.id);
    const { error } = await supabase.functions.invoke("cancel-booking", {
      body: { booking_id: b.id },
    });
    if (error) {
      rollback();
      toast.error(`Couldn't cancel. ${error.message || ""}`.trim());
      return;
    }
    refresh();
    refreshAttention();
  };
  const now = Date.now();
  const bookings = useMemo(
    () => all.filter((b) => !b.slot?.ends_at || new Date(b.slot.ends_at).getTime() > now),
    [all, now]
  );
  const [phones, setPhones] = useState({});

  useEffect(() => {
    (async () => {
      const ids = bookings.map((b) => b.nanny?.id).filter(Boolean);
      if (!ids.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, phone_number")
        .in("id", ids);
      setPhones(Object.fromEntries((data || []).map((p) => [p.id, p.phone_number])));
    })();
  }, [bookings.length]);

  if (loading) return <ListSkeleton />;
  if (bookings.length === 0)
    return <Empty>No upcoming bookings. Confirmed sessions will appear here with the nanny's contact info.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
      {bookings.map((b) => {
        const today = b.slot?.starts_at && isToday(b.slot.starts_at);
        return (
          <motion.li
            key={b.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -12, overflow: "hidden" }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            <article
              className={`bg-white border border-cream-dark p-4 flex flex-col gap-2.5 ${
                today ? "border-l-4 border-l-sage" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className="text-lg text-charcoal"
                    style={{ fontWeight: 500 }}
                  >
                    {formatProfileName(b.nanny)}
                  </h3>
                  <div className="text-xs text-taupe mt-0.5 flex items-center gap-2">
                    {today && (
                      <span className="text-[10px] font-bold tracking-wide uppercase bg-sage text-white px-1.5 py-0.5">
                        Today
                      </span>
                    )}
                    <span>
                      {b.slot?.starts_at ? fmtSessionTime(b.slot.starts_at) : "Time TBD"}
                    </span>
                  </div>
                </div>
                <span
                  className="text-base text-sage-dark whitespace-nowrap"
                  style={{ fontWeight: 500 }}
                >
                  ${totalDollars(b)}
                </span>
              </div>
              {b.nanny?.id && phones[b.nanny.id] && (
                <div className="flex gap-2">
                  <a
                    href={`tel:${phones[b.nanny.id]}`}
                    className="flex-1 text-center text-sm font-medium bg-sage text-white py-2"
                  >
                    Call
                  </a>
                  <a
                    href={`sms:${phones[b.nanny.id]}`}
                    className="flex-1 text-center text-sm font-medium bg-white border border-sage text-sage-dark py-2"
                  >
                    Text
                  </a>
                </div>
              )}
              <UpcomingCancelButton booking={b} onCancel={onCancel} />
            </article>
          </motion.li>
        );
      })}
      </AnimatePresence>
    </ul>
  );
}

function RateNannyPrompt({ booking }) {
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
  if (alreadyRated) return <span className="text-xs text-sage-dark font-medium">Rated ✓</span>;
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

function PastList() {
  const { bookings: raw, loading } = useParentBookings(PAST_STATUSES);
  const now = Date.now();
  const bookings = useMemo(
    () =>
      raw.filter(
        (b) =>
          b.status !== "confirmed" ||
          (b.slot?.ends_at && new Date(b.slot.ends_at).getTime() <= now)
      ),
    [raw, now]
  );

  if (loading) return <ListSkeleton />;
  if (bookings.length === 0) return <Empty>No past bookings yet.</Empty>;
  return (
    <ul className="flex flex-col gap-3">
      {bookings.map((b) => {
        const displayStatus = b.status === "confirmed" ? "completed" : b.status;
        return (
          <li key={b.id}>
            <article className="bg-white border border-cream-dark p-4 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  className="text-lg text-charcoal truncate"
                  style={{ fontWeight: 500 }}
                >
                  {formatProfileName(b.nanny)}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 whitespace-nowrap ${
                    STATUS_TONE[displayStatus] || "bg-cream-dark text-taupe-dark"
                  }`}
                >
                  {STATUS_LABEL[displayStatus] || displayStatus.replace(/_/g, " ")}
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
              {b.status === "cancelled_refunded" ? (
                <div className="text-xs text-charcoal">
                  Refunded <strong>${totalDollars(b)}</strong>
                </div>
              ) : b.status === "cancelled_no_refund" ? (
                <div className="text-xs text-charcoal">
                  Paid <strong>${totalDollars(b)}</strong> · no refund
                </div>
              ) : b.status === "completed" || b.status === "confirmed" ? (
                <div className="text-xs text-charcoal">
                  Paid <strong>${totalDollars(b)}</strong>
                </div>
              ) : null}
              {(b.status === "completed" || b.status === "confirmed") && (
                <RateNannyPrompt booking={b} />
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export default function ParentInbox() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const [tab, setTab] = useState(tabParam || null);
  const { pending, today, refresh: refreshAttention } = useInboxAttention();
  const resolvedTab = tab || (pending > 0 ? "pending" : "upcoming");

  // Catch counts created elsewhere (Book flow, accept/decline from the
  // other party, etc.) the moment the inbox page mounts. The provider
  // itself only loads once at app boot.
  useEffect(() => {
    refreshAttention();
  }, [refreshAttention]);

  const onChange = (next) => {
    setTab(next);
    setParams({ tab: next }, { replace: true });
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Inbox
      </h1>

      <InboxTabs
        tabs={[
          { key: "pending", label: "Pending", attention: pending > 0 ? "alert" : null },
          { key: "upcoming", label: "Upcoming", attention: today > 0 ? "info" : null },
          { key: "past", label: "Past" },
        ]}
        active={resolvedTab}
        onChange={onChange}
      />

      {resolvedTab === "pending" && <PendingList />}
      {resolvedTab === "upcoming" && <UpcomingList />}
      {resolvedTab === "past" && <PastList />}
    </div>
  );
}

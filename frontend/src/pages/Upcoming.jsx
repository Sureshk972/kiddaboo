import { useEffect, useState } from "react";
import { useParentBookings } from "../hooks/useParentBookings";
import { supabase } from "../lib/supabase";
import { formatProfileName } from "../lib/profileName";

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

function CancelButton({ booking }) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState(null);
  const hoursUntil = booking.slot?.starts_at
    ? (new Date(booking.slot.starts_at) - new Date()) / 3600_000
    : Infinity;
  const inside24 = hoursUntil < 24;

  const cancel = async () => {
    setWorking(true);
    setErr(null);
    const { error } = await supabase.functions.invoke("cancel-booking", {
      body: { booking_id: booking.id },
    });
    if (error) {
      setErr(error.message);
      setWorking(false);
    } else {
      window.location.reload();
    }
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
      {err && <p className="text-xs text-terracotta">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={working}
          className="flex-1 text-xs font-medium bg-terracotta text-white py-2 disabled:opacity-50"
        >
          {working ? "Cancelling…" : "Confirm cancel"}
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

export default function Upcoming() {
  const { bookings: all, loading } = useParentBookings(["confirmed"]);
  // A confirmed session whose slot has already ended belongs in History
  // (where the rating prompt lives), not Upcoming.
  const now = Date.now();
  const bookings = all.filter(
    (b) => !b.slot?.ends_at || new Date(b.slot.ends_at).getTime() > now
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

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Upcoming
      </h1>

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">No upcoming bookings.</p>
          <p className="text-xs text-taupe mt-1">
            Confirmed sessions will appear here with the nanny's contact info.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => {
            const today = b.slot?.starts_at && isToday(b.slot.starts_at);
            return (
            <li key={b.id}>
              <article
                className={`bg-white border border-cream-dark p-4 flex flex-col gap-2.5 ${
                  today ? "border-l-4 border-l-sage" : ""
                }`}
              >
                <div>
                  <h3 className="text-base font-heading font-bold text-charcoal">
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
                <CancelButton booking={b} />
              </article>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

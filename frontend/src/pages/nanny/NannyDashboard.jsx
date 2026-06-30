import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useNannyInbox } from "../../hooks/useNannyInbox";
import { supabase } from "../../lib/supabase";
import RatingSheet from "../../components/booking/RatingSheet";
import InboxTabs from "../../components/inbox/InboxTabs";
import { useInboxAttention } from "../../context/InboxAttentionContext";
import useNannyStats from "../../hooks/useNannyStats";

const STATUS_LABEL = {
  completed: "Completed",
  confirmed: "Confirmed",
  declined: "Declined",
  expired: "Expired",
  cancelled_refunded: "Cancelled · refunded",
  cancelled_no_refund: "Cancelled · no refund",
  pending: "Pending",
  pending_payment_retry: "Payment retry",
};

const STATUS_TONE = {
  completed: "bg-gold-light text-gold-dark",
  confirmed: "bg-sage-light text-sage-dark",
  declined: "bg-terracotta-light text-terracotta",
  expired: "bg-cream-dark text-taupe-dark",
  cancelled_refunded: "bg-cream-dark text-taupe-dark",
  cancelled_no_refund: "bg-terracotta-light text-terracotta",
  pending: "bg-cream-dark text-taupe-dark",
  pending_payment_retry: "bg-terracotta-light text-terracotta",
};

function parentName(p) {
  if (!p) return "(parent)";
  const joined = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return joined || "(parent)";
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

function fmtDateTime(d) {
  const time = new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dayLabel(d)} at ${time}`;
}

function isToday(d) {
  return new Date(d).toDateString() === new Date().toDateString();
}

function ParentRatingPill({ rating }) {
  if (!rating || !rating.n) {
    return (
      <span className="text-[10px] text-taupe italic">New parent · no ratings yet</span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-sage-dark inline-flex items-center gap-0.5">
      <span className="text-gold">★</span>
      {rating.avg.toFixed(1)}
      <span className="text-taupe ml-1">
        · {rating.n} rating{rating.n === 1 ? "" : "s"} from nannies
      </span>
    </span>
  );
}

async function invokeFn(name, body) {
  // Send the user's JWT explicitly so the edge function's admin.auth
  // .getUser(token) call resolves to *this* user. We deliberately do
  // NOT call refreshSession() here — it fires SIGNED_OUT through
  // onAuthStateChange when the refresh token is stale, which kicks
  // the user back to /welcome mid-action. The SDK auto-refreshes
  // the access token internally inside functions.invoke if it's near
  // expiry, so the explicit refresh was only adding risk.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) return { error: { message: "Signed out. Please sign in again." } };
  const res = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.error) {
    try {
      const txt = await res.error.context?.text?.();
      if (txt) {
        const parsed = JSON.parse(txt);
        return { error: { message: parsed.error || txt } };
      }
    } catch {
      /* fall through */
    }
    return { error: res.error };
  }
  return res;
}

function StatusPill({ status }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 whitespace-nowrap ${STATUS_TONE[status] || "bg-cream-dark text-taupe-dark"}`}
    >
      {STATUS_LABEL[status] || status.replace(/_/g, " ")}
    </span>
  );
}

function PendingCard({ b, onRespond, rating }) {
  const busy = useRef(false);
  const handle = (decision) => {
    if (busy.current) return;
    busy.current = true;
    onRespond(b, decision);
  };
  return (
    <article className="bg-white border border-cream-dark p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-heading font-bold text-charcoal">
            {parentName(b.parent)}
          </div>
          <div className="mt-0.5">
            <ParentRatingPill rating={rating} />
          </div>
          <div className="text-xs text-taupe mt-1">
            {fmtDateTime(b.slot.starts_at)} – {new Date(b.slot.ends_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        <span className="text-sm font-bold text-sage-dark whitespace-nowrap">
          ${(b.rate_cents / 100).toFixed(2)}
        </span>
      </div>
      {b.note_from_parent && (
        <p className="text-sm text-charcoal whitespace-pre-line bg-cream/60 p-3">
          {b.note_from_parent}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handle("accept")}
          className="flex-1 text-sm font-medium bg-sage text-white py-2"
          data-track="nanny_accept"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => handle("decline")}
          className="flex-1 text-sm font-medium bg-white border border-cream-dark text-charcoal py-2"
          data-track="nanny_decline"
        >
          Decline
        </button>
      </div>
    </article>
  );
}

function UpcomingCard({ b, onCancel, rating, parentPhone }) {
  const [confirming, setConfirming] = useState(false);
  const busy = useRef(false);

  const cancel = () => {
    if (busy.current) return;
    busy.current = true;
    onCancel(b);
  };

  const today = isToday(b.slot.starts_at);
  return (
    <article
      className={`bg-white border border-cream-dark p-4 flex flex-col gap-2 ${
        today ? "border-l-4 border-l-sage" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-heading font-bold text-charcoal">
            {parentName(b.parent)}
          </div>
          <div className="mt-0.5">
            <ParentRatingPill rating={rating} />
          </div>
          <div className="text-xs text-taupe mt-1 flex items-center gap-2">
            {today && (
              <span className="text-[10px] font-bold tracking-wide uppercase bg-sage text-white px-1.5 py-0.5">
                Today
              </span>
            )}
            <span>{fmtDateTime(b.slot.starts_at)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-sage-dark whitespace-nowrap">
            ${(b.rate_cents / 100).toFixed(2)}
          </span>
          <StatusPill status="confirmed" />
        </div>
      </div>
      {parentPhone && (
        <div className="flex gap-2">
          <a
            href={`tel:${parentPhone}`}
            className="flex-1 text-center text-sm font-medium bg-sage text-white py-2"
          >
            Call
          </a>
          <a
            href={`sms:${parentPhone}`}
            className="flex-1 text-center text-sm font-medium bg-white border border-sage text-sage-dark py-2"
          >
            Text
          </a>
        </div>
      )}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs font-medium text-terracotta hover:underline self-start"
        >
          Cancel session
        </button>
      ) : (
        <div className="border border-cream-dark bg-cream/60 p-3 flex flex-col gap-2">
          <p className="text-xs text-charcoal">
            Parent will receive a full refund. This can't be undone.
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
              Keep session
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function NannyRatingPrompt({ booking }) {
  const [alreadyRated, setAlreadyRated] = useState(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("direction", "nanny_to_parent");
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
        Rate parent
      </button>
    );
  }
  return (
    <RatingSheet
      booking={booking}
      direction="nanny_to_parent"
      rateeId={booking.parent_id}
      onDone={() => setAlreadyRated(true)}
    />
  );
}

function PastCard({ b, onComplete }) {
  const busy = useRef(false);
  const complete = () => {
    if (busy.current) return;
    busy.current = true;
    onComplete(b);
  };

  return (
    <article className="bg-white border border-cream-dark p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-heading font-bold text-charcoal">
            {parentName(b.parent)}
          </div>
          <div className="text-xs text-taupe mt-0.5">
            {fmtDateTime(b.slot.starts_at)}
          </div>
        </div>
        <StatusPill
          status={
            b.status === "confirmed" &&
            b.slot?.ends_at &&
            new Date(b.slot.ends_at) <= new Date()
              ? "completed"
              : b.status
          }
        />
      </div>
      {b.status === "cancelled_refunded" ? (
        <div className="text-xs text-charcoal">Cancelled · refunded to parent · you keep $0</div>
      ) : b.status === "cancelled_no_refund" ? (
        <div className="text-xs text-charcoal">Cancelled late · you keep <strong>${(b.rate_cents / 100).toFixed(2)}</strong></div>
      ) : b.status === "completed" || b.status === "confirmed" ? (
        <div className="text-xs text-charcoal">Earned <strong>${(b.rate_cents / 100).toFixed(2)}</strong></div>
      ) : null}
      {b.status === "confirmed" && (
        <button
          type="button"
          onClick={complete}
          className="text-xs font-medium bg-sage text-white px-3 py-1.5 self-start"
        >
          Mark complete
        </button>
      )}
      <NannyRatingPrompt booking={b} />
    </article>
  );
}

function Empty({ children }) {
  return (
    <div className="bg-white border border-cream-dark p-6 text-center">
      <p className="text-sm text-charcoal">{children}</p>
    </div>
  );
}

export default function NannyDashboard() {
  const {
    pending,
    upcoming,
    past,
    parentRatings,
    loading,
    refresh,
    removePending,
    removeUpcoming,
    removePast,
  } = useNannyInbox();
  const { refresh: refreshAttention } = useInboxAttention();

  // Catch pending bookings created since app boot — the provider only
  // auto-loads at mount, so a parent who books while the nanny is
  // already in the inbox would otherwise see no attention dot.
  useEffect(() => {
    refreshAttention();
  }, [refreshAttention]);

  const onRespond = async (b, decision) => {
    const rollback = removePending(b.id);
    const { error } = await invokeFn("respond-to-booking", {
      booking_id: b.id,
      decision,
    });
    if (error) {
      rollback();
      toast.error(`Couldn't ${decision}. ${error.message || ""}`.trim());
      return;
    }
    refresh();
    refreshAttention();
  };

  const onCancelUpcoming = async (b) => {
    const rollback = removeUpcoming(b.id);
    const { error } = await invokeFn("cancel-booking", { booking_id: b.id });
    if (error) {
      rollback();
      toast.error(`Couldn't cancel. ${error.message || ""}`.trim());
      return;
    }
    refresh();
    refreshAttention();
  };

  const onComplete = async (b) => {
    const rollback = removePast(b.id);
    const { error } = await invokeFn("complete-booking", { booking_id: b.id });
    if (error) {
      rollback();
      toast.error(`Couldn't mark complete. ${error.message || ""}`.trim());
      return;
    }
    refresh();
    refreshAttention();
  };

  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const [tab, setTab] = useState(tabParam || null);
  const resolvedTab = tab || (pending.length > 0 ? "pending" : "upcoming");

  // Parent phone lookup for the Call / Text buttons on confirmed sessions —
  // batched once per upcoming list so each card renders without a per-row
  // fetch. profiles RLS allows the nanny to read the other party's phone
  // once a booking links them.
  const [parentPhones, setParentPhones] = useState({});
  useEffect(() => {
    const ids = upcoming.map((b) => b.parent?.id).filter(Boolean);
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, phone_number")
        .in("id", ids);
      if (cancelled) return;
      setParentPhones(Object.fromEntries((data || []).map((p) => [p.id, p.phone_number])));
    })();
    return () => {
      cancelled = true;
    };
  }, [upcoming.length]);

  const onChange = (next) => {
    setTab(next);
    setParams({ tab: next }, { replace: true });
  };

  const stats = useNannyStats();

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}>
        Inbox
      </h1>

      {!stats.loading && (
        <section className="bg-white border border-black/[0.06] px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-medium tracking-[0.14em] uppercase text-taupe">
              This week
            </div>
            {stats.weekDeltaCents !== 0 && (
              <div className="text-[10px] font-medium text-sage-dark inline-flex items-center gap-1">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                  style={{ transform: stats.weekDeltaCents > 0 ? "rotate(0)" : "rotate(90deg)" }}
                >
                  <path
                    d="M2 8L8 2M8 2H3.5M8 2V6.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                {stats.weekDeltaCents > 0 ? "+" : "−"}$
                {Math.abs(stats.weekDeltaCents / 100).toFixed(0)}
              </div>
            )}
          </div>
          <div
            className="text-charcoal mt-1 leading-none"
            style={{ fontWeight: 500, fontSize: "36px", letterSpacing: "-1px" }}
          >
            ${(stats.weekEarningsCents / 100).toFixed(stats.weekEarningsCents < 10000 ? 2 : 0)}
          </div>
          <div className="flex gap-5 mt-4 pt-4 border-t border-black/[0.06]">
            <div>
              <div
                className="text-base text-charcoal leading-none"
                style={{ fontWeight: 500 }}
              >
                {stats.weekSessions}
              </div>
              <div className="text-[9px] font-medium tracking-[0.1em] uppercase text-taupe mt-1">
                Sessions
              </div>
            </div>
            <div className="w-px bg-black/10 self-stretch" />
            <div>
              <div
                className="text-base text-charcoal leading-none"
                style={{ fontWeight: 500 }}
              >
                {stats.weekHours.toFixed(1)}
              </div>
              <div className="text-[9px] font-medium tracking-[0.1em] uppercase text-taupe mt-1">
                Hours
              </div>
            </div>
            <div className="w-px bg-black/10 self-stretch" />
            <div>
              <div
                className="text-base text-charcoal leading-none"
                style={{ fontWeight: 500 }}
              >
                {stats.rating ? stats.rating.avg.toFixed(1) : "—"}
              </div>
              <div className="text-[9px] font-medium tracking-[0.1em] uppercase text-taupe mt-1">
                Rating
              </div>
            </div>
          </div>
        </section>
      )}

      <InboxTabs
        tabs={[
          {
            key: "pending",
            label: "Pending",
            attention: pending.length > 0 ? "alert" : null,
          },
          {
            key: "upcoming",
            label: "Upcoming",
            attention: upcoming.some(
              (b) =>
                b.slot?.starts_at &&
                new Date(b.slot.starts_at).toDateString() === new Date().toDateString()
            )
              ? "info"
              : null,
          },
          { key: "past", label: "Past" },
        ]}
        active={resolvedTab}
        onChange={onChange}
      />

      {loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading…</p>
      ) : resolvedTab === "pending" ? (
        pending.length === 0 ? (
          <Empty>No requests waiting for a response.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {pending.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: -12, overflow: "hidden" }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                >
                  <PendingCard
                    b={b}
                    onRespond={onRespond}
                    rating={parentRatings[b.parent_id]}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : resolvedTab === "upcoming" ? (
        upcoming.length === 0 ? (
          <Empty>No confirmed sessions ahead.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {upcoming.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: -12, overflow: "hidden" }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                >
                  <UpcomingCard
                    b={b}
                    onCancel={onCancelUpcoming}
                    rating={parentRatings[b.parent_id]}
                    parentPhone={parentPhones[b.parent?.id]}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : past.length === 0 ? (
        <Empty>No sessions yet.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {past.map((b) => (
            <PastCard key={b.id} b={b} onComplete={onComplete} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNannyInbox } from "../../hooks/useNannyInbox";
import { supabase } from "../../lib/supabase";
import RatingSheet from "../../components/booking/RatingSheet";
import InboxTabs from "../../components/inbox/InboxTabs";

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
  completed: "bg-sage-light text-sage-dark",
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
      <span className="text-sage">★</span>
      {rating.avg.toFixed(1)}
      <span className="text-taupe ml-1">
        · {rating.n} rating{rating.n === 1 ? "" : "s"} from nannies
      </span>
    </span>
  );
}

async function invokeFn(name, body) {
  // Force refresh + send JWT explicitly (same pattern Book.jsx uses).
  await supabase.auth.refreshSession().catch(() => {});
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

function PendingCard({ b, onResolved, rating }) {
  const [working, setWorking] = useState(null); // 'accept' | 'decline' | null
  const [err, setErr] = useState(null);

  const respond = async (decision) => {
    setErr(null);
    setWorking(decision);
    const { error } = await invokeFn("respond-to-booking", {
      booking_id: b.id,
      decision,
    });
    if (error) {
      setErr(error.message);
      setWorking(null);
      return;
    }
    onResolved();
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
          ${(b.rate_cents / 100).toFixed(0)}
        </span>
      </div>
      {b.note_from_parent && (
        <p className="text-sm text-charcoal whitespace-pre-line bg-cream/60 p-3">
          {b.note_from_parent}
        </p>
      )}
      {err && <p className="text-xs text-terracotta">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={working != null}
          className="flex-1 text-sm font-medium bg-sage text-white py-2 disabled:opacity-50"
        >
          {working === "accept" ? "Accepting…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={working != null}
          className="flex-1 text-sm font-medium bg-white border border-cream-dark text-charcoal py-2 disabled:opacity-50"
        >
          {working === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
    </article>
  );
}

function UpcomingCard({ b, onResolved, rating, parentPhone }) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState(null);

  const cancel = async () => {
    setWorking(true);
    setErr(null);
    const { error } = await invokeFn("cancel-booking", { booking_id: b.id });
    if (error) {
      setErr(error.message);
      setWorking(false);
      return;
    }
    onResolved();
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
        <StatusPill status="confirmed" />
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

function PastCard({ b, onResolved }) {
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState(null);

  const complete = async () => {
    setWorking(true);
    setErr(null);
    const { error } = await invokeFn("complete-booking", { booking_id: b.id });
    if (error) {
      setErr(error.message);
      setWorking(false);
      return;
    }
    onResolved();
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
      {err && <p className="text-xs text-terracotta">{err}</p>}
      {b.status === "confirmed" && (
        <button
          type="button"
          onClick={complete}
          disabled={working}
          className="text-xs font-medium bg-sage text-white px-3 py-1.5 self-start disabled:opacity-50"
        >
          {working ? "Marking…" : "Mark complete"}
        </button>
      )}
      {/* Allow rating once the session has ended, even before "Mark complete"
          — Mark complete is now mostly cosmetic; the auto-complete cron will
          flip the status within 24h regardless. */}
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
  const { pending, upcoming, past, parentRatings, loading } = useNannyInbox();
  const reload = () => window.location.reload();

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

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Inbox
      </h1>

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
            {pending.map((b) => (
              <PendingCard
                key={b.id}
                b={b}
                onResolved={reload}
                rating={parentRatings[b.parent_id]}
              />
            ))}
          </div>
        )
      ) : resolvedTab === "upcoming" ? (
        upcoming.length === 0 ? (
          <Empty>No confirmed sessions ahead.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <UpcomingCard
                key={b.id}
                b={b}
                onResolved={reload}
                rating={parentRatings[b.parent_id]}
                parentPhone={parentPhones[b.parent?.id]}
              />
            ))}
          </div>
        )
      ) : past.length === 0 ? (
        <Empty>No sessions yet.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {past.map((b) => (
            <PastCard key={b.id} b={b} onResolved={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNannyInbox } from "../../hooks/useNannyInbox";
import { supabase } from "../../lib/supabase";
import RatingSheet from "../../components/booking/RatingSheet";

async function respondToBooking(bookingId, decision) {
  const { error } = await supabase.functions.invoke("respond-to-booking", {
    body: { booking_id: bookingId, decision },
  });
  if (error) {
    alert(error.message || "Something went wrong. Please try again.");
    return false;
  }
  return true;
}

function NannyRatingPrompt({ booking }) {
  const [alreadyRated, setAlreadyRated] = useState(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ratings")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("direction", "nanny_to_parent");
      setAlreadyRated((data || []).length > 0);
    })();
  }, [booking.id]);

  if (alreadyRated === null) return null;
  if (alreadyRated) return <span>Rated ✓</span>;
  if (!opened) return <button onClick={() => setOpened(true)}>Rate Parent</button>;
  return (
    <RatingSheet
      booking={booking}
      direction="nanny_to_parent"
      rateeId={booking.parent_id}
      onDone={() => setAlreadyRated(true)}
    />
  );
}

export default function NannyDashboard() {
  const { pending, upcoming, past, loading } = useNannyInbox();
  if (loading) return <p>Loading…</p>;
  return (
    <main>
      <section>
        <h2>Pending requests ({pending.length})</h2>
        {pending.length === 0 && <p>None right now.</p>}
        {pending.map(b => (
          <article key={b.id}>
            <div>{new Date(b.slot.starts_at).toLocaleString()} – {new Date(b.slot.ends_at).toLocaleString()}</div>
            <div>${(b.rate_cents/100).toFixed(0)}</div>
            <p>{b.note_from_parent}</p>
            <div>
              <button onClick={async () => {
                const ok = await respondToBooking(b.id, "accept");
                if (ok) window.location.reload();
              }}>Accept</button>
              <button onClick={async () => {
                const ok = await respondToBooking(b.id, "decline");
                if (ok) window.location.reload();
              }}>Decline</button>
            </div>
          </article>
        ))}
      </section>
      <section>
        <h2>Upcoming ({upcoming.length})</h2>
        {upcoming.map(b => (
          <article key={b.id}>
            <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
            <div>Confirmed</div>
            <button onClick={async () => {
              if (!confirm("Cancel this booking? Parent will receive a full refund.")) return;
              const { error } = await supabase.functions.invoke("cancel-booking", { body: { booking_id: b.id }});
              if (error) alert(error.message);
              else window.location.reload();
            }}>Cancel</button>
          </article>
        ))}
      </section>
      <section>
        <h2>Past sessions ({past.length})</h2>
        {past.length === 0 && <p>None yet.</p>}
        {past.map(b => (
          <article key={b.id}>
            <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
            <div>with {b.parent ? `${b.parent.first_name ?? ""} ${b.parent.last_name ?? ""}`.trim() || "(parent)" : "(parent)"}</div>
            <div>Status: {b.status}</div>
            {b.status === "confirmed" && (
              <button onClick={async () => {
                const { error } = await supabase.functions.invoke("complete-booking", { body: { booking_id: b.id }});
                if (error) alert(error.message);
                else window.location.reload();
              }}>Mark complete</button>
            )}
            {b.status === "completed" && <NannyRatingPrompt booking={b} />}
          </article>
        ))}
      </section>
    </main>
  );
}

import { useNannyInbox } from "../../hooks/useNannyInbox";
import { supabase } from "../../lib/supabase";

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

export default function NannyDashboard() {
  const { pending, upcoming, loading } = useNannyInbox();
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
          </article>
        ))}
      </section>
    </main>
  );
}

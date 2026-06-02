import { useEffect, useState } from "react";
import { useParentBookings } from "../hooks/useParentBookings";
import { supabase } from "../lib/supabase";

function CancelButton({ booking }) {
  const [confirming, setConfirming] = useState(false);
  const hoursUntil = (new Date(booking.slot.starts_at) - new Date()) / 3600_000;
  const inside24 = hoursUntil < 24;

  const cancel = async () => {
    const { error } = await supabase.functions.invoke("cancel-booking", { body: { booking_id: booking.id } });
    if (error) alert(error.message);
    else window.location.reload();
  };

  if (!confirming) return <button onClick={() => setConfirming(true)}>Cancel</button>;
  return (
    <div role="alertdialog">
      {inside24
        ? <p>Within 24h of the session — <strong>no refund</strong> will be issued.</p>
        : <p>More than 24h away — you'll get a full refund.</p>}
      <button onClick={cancel}>Confirm cancel</button>
      <button onClick={() => setConfirming(false)}>Keep booking</button>
    </div>
  );
}

export default function Upcoming() {
  const { bookings, loading } = useParentBookings(["confirmed"]);
  const [phones, setPhones] = useState({});

  useEffect(() => {
    (async () => {
      const ids = bookings.map(b => b.nanny.id);
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("id, phone").in("id", ids);
      setPhones(Object.fromEntries((data || []).map(p => [p.id, p.phone])));
    })();
  }, [bookings.length]);

  if (loading) return <p>Loading…</p>;
  if (bookings.length === 0) return <p>No upcoming bookings.</p>;
  return (
    <ul>{bookings.map(b => (
      <li key={b.id}>
        <article>
          <h3>{b.nanny.full_name}</h3>
          <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
          {phones[b.nanny.id] && (
            <>
              <a href={`tel:${phones[b.nanny.id]}`}>Call</a>{" · "}
              <a href={`sms:${phones[b.nanny.id]}`}>Text</a>
            </>
          )}
          <CancelButton booking={b} />
        </article>
      </li>
    ))}</ul>
  );
}

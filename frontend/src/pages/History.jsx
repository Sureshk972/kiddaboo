import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useParentBookings } from "../hooks/useParentBookings";
import RatingSheet from "../components/booking/RatingSheet";

function RatingPrompt({ booking }) {
  const [alreadyRated, setAlreadyRated] = useState(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ratings")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("direction", "parent_to_nanny");
      setAlreadyRated((data || []).length > 0);
    })();
  }, [booking.id]);

  if (alreadyRated === null) return null;
  if (alreadyRated) return <span>Rated ✓</span>;
  if (!opened) return <button onClick={() => setOpened(true)}>Rate Nanny</button>;
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
  const { bookings, loading } = useParentBookings(["completed","declined","expired","cancelled_refunded","cancelled_no_refund"]);
  if (loading) return <p>Loading…</p>;
  return (
    <ul>{bookings.map(b => (
      <li key={b.id}>
        <article>
          <h3>{b.nanny.full_name}</h3>
          <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
          <div>{b.status.replace(/_/g, " ")}</div>
          {b.status === "completed" && <RatingPrompt booking={b} />}
        </article>
      </li>
    ))}</ul>
  );
}

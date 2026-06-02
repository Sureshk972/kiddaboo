import { useParentBookings } from "../hooks/useParentBookings";

function RatingPrompt({ booking }) {
  // Full rating UI ships in Phase 10
  return <button>Rate Nanny</button>;
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

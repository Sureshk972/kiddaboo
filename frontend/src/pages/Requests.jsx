import { useParentBookings } from "../hooks/useParentBookings";

export default function Requests() {
  const { bookings, loading } = useParentBookings(["pending", "pending_payment_retry"]);
  if (loading) return <p>Loading…</p>;
  if (bookings.length === 0) return <p>No pending requests.</p>;
  return (
    <ul>{bookings.map(b => (
      <li key={b.id}>
        <article>
          <h3>{b.nanny.full_name}</h3>
          <div>{new Date(b.slot.starts_at).toLocaleString()}</div>
          <div>Expires {new Date(b.acceptance_expires_at).toLocaleString()}</div>
          <div>${(b.rate_cents/100).toFixed(0)}</div>
          {b.status === "pending_payment_retry" && <strong>Update payment method to keep this request alive.</strong>}
        </article>
      </li>
    ))}</ul>
  );
}

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function money(cents) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export default function AdminBookingDetail() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "*, parent:profiles!bookings_parent_id_fkey(id, first_name, last_name), nanny:profiles!bookings_nanny_id_fkey(id, first_name, last_name), slot:nanny_slots(*)"
        )
        .eq("id", id)
        .single();
      if (cancelled) return;
      setB(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="text-sm text-taupe-dark">Loading…</div>;
  if (!b) return <div className="text-sm text-taupe-dark">Booking not found.</div>;

  return (
    <div>
      <Link to="/admin/bookings" className="text-sm text-taupe-dark underline">
        ← Bookings
      </Link>
      <h1 className="font-heading font-bold text-charcoal text-xl mt-2 mb-4">
        Booking {b.id.slice(0, 8)}…
      </h1>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-taupe-dark">Status:</span> {b.status}</div>
        <div>
          <span className="text-taupe-dark">Stripe:</span>{" "}
          {b.stripe_payment_intent_id ? (
            <a
              href={`https://dashboard.stripe.com/payments/${b.stripe_payment_intent_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sage-dark underline"
            >
              {b.stripe_payment_intent_id}
            </a>
          ) : "—"}
        </div>
        <div>
          <span className="text-taupe-dark">Parent:</span>{" "}
          <Link to={`/admin/users/${b.parent_id}`} className="text-sage-dark underline">
            {`${b.parent?.first_name ?? ""} ${b.parent?.last_name ?? ""}`.trim()}
          </Link>
        </div>
        <div>
          <span className="text-taupe-dark">Nanny:</span>{" "}
          <Link to={`/admin/users/${b.nanny_id}`} className="text-sage-dark underline">
            {`${b.nanny?.first_name ?? ""} ${b.nanny?.last_name ?? ""}`.trim()}
          </Link>
        </div>
        <div><span className="text-taupe-dark">Rate:</span> {money(b.rate_cents)}</div>
        <div><span className="text-taupe-dark">Platform fee:</span> {money(b.platform_fee_cents)}</div>
        <div><span className="text-taupe-dark">Requested at:</span> {new Date(b.requested_at).toLocaleString()}</div>
        <div><span className="text-taupe-dark">Responded at:</span> {b.responded_at ? new Date(b.responded_at).toLocaleString() : "—"}</div>
        <div><span className="text-taupe-dark">Acceptance expires:</span> {new Date(b.acceptance_expires_at).toLocaleString()}</div>
        <div><span className="text-taupe-dark">Cancelled at:</span> {b.cancelled_at ? new Date(b.cancelled_at).toLocaleString() : "—"}</div>
        <div><span className="text-taupe-dark">Completed at:</span> {b.completed_at ? new Date(b.completed_at).toLocaleString() : "—"}</div>
        <div><span className="text-taupe-dark">Cancelled by:</span> {b.cancelled_by ?? "—"}</div>
      </div>

      {b.note_from_parent && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-taupe-dark mb-1">Note from parent</div>
          <div className="text-sm text-charcoal whitespace-pre-wrap">{b.note_from_parent}</div>
        </div>
      )}
    </div>
  );
}

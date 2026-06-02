import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function BookForm({ slot }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const total = slot.rate_cents + Math.round(slot.rate_cents * 0.15);

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
    });
    if (pmErr) { setError(pmErr.message); setSubmitting(false); return; }
    const { data, error: invokeErr } = await supabase.functions.invoke("create-booking-request", {
      body: { slot_id: slot.id, note, payment_method_id: paymentMethod.id },
    });
    if (invokeErr) { setError(invokeErr.message); setSubmitting(false); return; }
    navigate("/requests");
  };

  return (
    <form onSubmit={submit}>
      <h2>Note to {slot.nanny.full_name}</h2>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="e.g., Watching my 3-year-old Maya, peanut allergy, drop-off at your place"
        rows={5}
      />
      <CardElement />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : `Request — $${(total/100).toFixed(2)}`}
      </button>
    </form>
  );
}

export default function Book() {
  const { slotId } = useParams();
  const [slot, setSlot] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("nanny_slots")
        .select("*, nanny:profiles!nanny_slots_nanny_id_fkey(id, full_name, bio, avatar_url)")
        .eq("id", slotId).single();
      setSlot(data);
    })();
  }, [slotId]);
  if (!slot) return <p>Loading…</p>;
  return (
    <Elements stripe={stripePromise}>
      <main>
        <header>
          <h1>Book {slot.nanny.full_name}</h1>
          <div>{new Date(slot.starts_at).toLocaleString()} – {new Date(slot.ends_at).toLocaleTimeString()}</div>
        </header>
        <BookForm slot={slot} />
      </main>
    </Elements>
  );
}

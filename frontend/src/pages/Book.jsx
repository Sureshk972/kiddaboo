import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";
import Button from "../components/ui/Button";
import { formatProfileName } from "../lib/profileName";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const cardElementOptions = {
  style: {
    base: {
      color: "#2F2F2F",
      fontFamily: "'Inter', sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#8B3FE0" },
    },
    invalid: { color: "#B07A5B" },
  },
};

function BookForm({ slot }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const platformFee = Math.round(slot.rate_cents * 0.15);
  const total = slot.rate_cents + platformFee;

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
    });
    if (pmErr) {
      setError(pmErr.message);
      setSubmitting(false);
      return;
    }
    const { error: invokeErr } = await supabase.functions.invoke("create-booking-request", {
      body: { slot_id: slot.id, note, payment_method_id: paymentMethod.id },
    });
    if (invokeErr) {
      // supabase-js wraps non-2xx as "Edge Function returned a non-2xx status
      // code" — the real error (JSON {error: "..."}) is on .context (a Response).
      let detail = invokeErr.message;
      try {
        const body = await invokeErr.context?.text?.();
        if (body) {
          const parsed = JSON.parse(body);
          detail = parsed.error || body;
        }
      } catch {
        /* fall through with generic message */
      }
      setError(detail);
      setSubmitting(false);
      return;
    }
    navigate("/requests");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="bg-white border border-cream-dark p-4">
        <div className="flex justify-between text-sm text-charcoal">
          <span>Session rate</span>
          <span>${(slot.rate_cents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-charcoal mt-1">
          <span>Service fee</span>
          <span>${(platformFee / 100).toFixed(2)}</span>
        </div>
        <div className="border-t border-cream-dark mt-3 pt-3 flex justify-between font-bold text-charcoal">
          <span>Total today</span>
          <span className="text-sage-dark">${(total / 100).toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-taupe mt-2">
          Card is authorized now and charged when {formatProfileName(slot.nanny)} accepts.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-charcoal">
          Note to {formatProfileName(slot.nanny)}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Watching my 3-year-old Maya, peanut allergy, drop-off at your place"
          rows={5}
          className="bg-white border border-cream-dark px-3 py-2.5 text-sm text-charcoal focus:border-sage focus:outline-none resize-none"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-charcoal">Card details</span>
        <div className="bg-white border border-cream-dark px-3 py-3">
          <CardElement options={cardElementOptions} />
        </div>
      </label>

      {error && (
        <p role="alert" className="text-sm text-terracotta">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} fullWidth>
        {submitting ? "Submitting…" : `Request — $${(total / 100).toFixed(2)}`}
      </Button>
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
        .select("*, nanny:profiles!nanny_slots_nanny_id_fkey(id, first_name, last_name, bio, photo_url)")
        .eq("id", slotId)
        .single();
      setSlot(data);
    })();
  }, [slotId]);

  if (!slot) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-taupe">Loading…</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-cream">
        <div className="max-w-md mx-auto px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-10">
          <Link to="/" className="text-sm text-taupe hover:text-sage-dark inline-block mb-4">
            ← Back
          </Link>
          <header className="mb-5">
            <h1 className="text-2xl font-heading font-bold text-sage-dark tracking-tight">
              Book {formatProfileName(slot.nanny)}
            </h1>
            <div className="text-sm text-taupe mt-1">
              {new Date(slot.starts_at).toLocaleString([], {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" – "}
              {new Date(slot.ends_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </header>
          <BookForm slot={slot} />
        </div>
      </div>
    </Elements>
  );
}

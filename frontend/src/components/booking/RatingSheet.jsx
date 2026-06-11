import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RatingSheet({ booking, direction, rateeId, onDone }) {
  const [score, setScore] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertErr } = await supabase.from("ratings").insert({
      booking_id: booking.id,
      rater_id: user.id,
      ratee_id: rateeId,
      score,
      text: text || null,
      direction,
    });
    setSubmitting(false);
    if (insertErr) { setError(insertErr.message); return; }
    onDone?.();
  };

  const active = hover || score;

  return (
    <form
      onSubmit={submit}
      className="border border-cream-dark bg-cream/60 p-3 flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-sage-dark">
          Rating
        </span>
        <div
          className="flex gap-1"
          onMouseLeave={() => setHover(0)}
          role="radiogroup"
          aria-label="Rating"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHover(n)}
              className={`text-2xl leading-none w-8 h-8 flex items-center justify-center transition-colors ${
                n <= active ? "text-sage" : "text-cream-dark"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-sage-dark">
          Comment <span className="font-normal normal-case text-taupe">(optional)</span>
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="bg-white border border-cream-dark p-2 text-sm text-charcoal resize-none focus:outline-none focus:border-sage"
          placeholder="Share what went well…"
        />
      </label>

      {error && (
        <p role="alert" className="text-xs text-terracotta">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="text-xs font-medium bg-sage text-white px-3 py-2 self-start disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit rating"}
      </button>
    </form>
  );
}

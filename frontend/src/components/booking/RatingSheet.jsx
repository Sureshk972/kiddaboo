import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RatingSheet({ booking, direction, rateeId, onDone }) {
  const [score, setScore] = useState(5);
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

  return (
    <form onSubmit={submit}>
      <label>Rating
        <select value={score} onChange={e => setScore(Number(e.target.value))}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </label>
      <label>Comment (optional)<textarea value={text} onChange={e => setText(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>Submit</button>
    </form>
  );
}

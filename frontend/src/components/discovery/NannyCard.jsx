import { Link } from "react-router-dom";

export default function NannyCard({ slot }) {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  return (
    <Link to={`/book/${slot.id}`}>
      <article>
        {slot.nanny.avatar_url && <img src={slot.nanny.avatar_url} alt="" />}
        <h3>{slot.nanny.full_name}</h3>
        <p>{slot.nanny.bio}</p>
        <div>{start.toLocaleString()} – {end.toLocaleTimeString()}</div>
        <div>${(slot.rate_cents/100).toFixed(0)}</div>
      </article>
    </Link>
  );
}

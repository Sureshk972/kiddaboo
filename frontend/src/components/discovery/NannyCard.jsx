import { Link } from "react-router-dom";
import { formatProfileName, profileInitial } from "../../lib/profileName";

export default function NannyCard({ slot }) {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  const dateLine = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLine = `${start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  return (
    <Link
      to={`/book/${slot.id}`}
      className="block bg-white border border-cream-dark p-4 hover:border-sage transition-colors"
    >
      <article className="flex gap-3 items-start">
        <div className="w-14 h-14 bg-sage-light flex items-center justify-center overflow-hidden shrink-0">
          {slot.nanny.photo_url ? (
            <img
              src={slot.nanny.photo_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-heading font-bold text-sage-dark">
              {profileInitial(slot.nanny)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base font-heading font-bold text-charcoal truncate">
              {formatProfileName(slot.nanny)}
            </h3>
            <span className="text-sm font-bold text-sage-dark whitespace-nowrap">
              ${(slot.rate_cents / 100).toFixed(0)}/hr
            </span>
          </div>
          <div className="text-xs text-taupe mt-0.5">
            {dateLine} · {timeLine}
          </div>
          {slot.nanny.bio && (
            <p className="text-sm text-charcoal mt-2 line-clamp-2">{slot.nanny.bio}</p>
          )}
        </div>
      </article>
    </Link>
  );
}

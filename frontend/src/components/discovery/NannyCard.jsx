import { useState } from "react";
import { Link } from "react-router-dom";
import { formatProfileName, profileInitial } from "../../lib/profileName";

function fmtDayLabel(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTimeRange(start, end) {
  const opts = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString([], opts)} – ${end.toLocaleTimeString([], opts)}`;
}

function StarRow({ score }) {
  const full = Math.round(score);
  return (
    <span aria-label={`${score.toFixed(1)} out of 5`}>
      <span className="text-sage-dark">{"★".repeat(full)}</span>
      <span className="text-cream-dark">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default function NannyCard({ group }) {
  const { nanny, slots, avgRating, ratingCount } = group;
  const [expanded, setExpanded] = useState(false);

  const rates = slots.map((s) => s.rate_cents);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const earliest = new Date(slots[0].starts_at);
  const visibleSlots = expanded ? slots : slots.slice(0, 2);
  const remaining = slots.length - visibleSlots.length;

  return (
    <article className="bg-white border border-cream-dark">
      <header className="p-4 flex gap-3 items-start">
        <Link
          to={`/nanny/${nanny.id}`}
          className="w-14 h-14 bg-sage-light flex items-center justify-center overflow-hidden shrink-0"
        >
          {nanny.photo_url ? (
            <img
              src={nanny.photo_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-heading font-bold text-sage-dark">
              {profileInitial(nanny)}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <Link
              to={`/nanny/${nanny.id}`}
              className="text-base font-heading font-bold text-charcoal truncate hover:text-sage-dark"
            >
              {formatProfileName(nanny)}
            </Link>
            <span className="text-sm font-bold text-sage-dark whitespace-nowrap">
              {minRate === maxRate
                ? `$${(minRate / 100).toFixed(0)}/hr`
                : `$${(minRate / 100).toFixed(0)}–${(maxRate / 100).toFixed(0)}/hr`}
            </span>
          </div>
          <div className="text-xs text-taupe mt-0.5 flex items-center gap-2 flex-wrap">
            {avgRating != null ? (
              <span className="flex items-center gap-1">
                <StarRow score={avgRating} />
                <span>
                  {avgRating.toFixed(1)} ({ratingCount})
                </span>
              </span>
            ) : (
              <span className="italic">New on Kiddaboo</span>
            )}
            <span>·</span>
            <span>
              {slots.length} slot{slots.length === 1 ? "" : "s"} from{" "}
              {fmtDayLabel(earliest)}
            </span>
          </div>
          {nanny.bio && (
            <p className="text-sm text-charcoal mt-2 line-clamp-2">{nanny.bio}</p>
          )}
        </div>
      </header>

      <ul className="border-t border-cream-dark divide-y divide-cream-dark">
        {visibleSlots.map((s) => {
          const start = new Date(s.starts_at);
          const end = new Date(s.ends_at);
          return (
            <li key={s.id}>
              <Link
                to={`/book/${s.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream/40"
              >
                <div>
                  <div className="text-sm font-medium text-charcoal">
                    {fmtDayLabel(start)}
                  </div>
                  <div className="text-xs text-taupe">
                    {fmtTimeRange(start, end)}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-sage-dark">
                    ${(s.rate_cents / 100).toFixed(0)}/hr
                  </span>
                  <span className="text-xs font-medium text-sage-dark">Book →</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-xs font-medium text-sage-dark py-2 border-t border-cream-dark hover:bg-cream/40"
        >
          Show {remaining} more slot{remaining === 1 ? "" : "s"}
        </button>
      )}
      {expanded && slots.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full text-xs font-medium text-taupe py-2 border-t border-cream-dark hover:bg-cream/40"
        >
          Show less
        </button>
      )}
    </article>
  );
}

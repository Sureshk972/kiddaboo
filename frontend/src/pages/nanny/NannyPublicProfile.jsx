import { useParams, Link, useNavigate } from "react-router-dom";
import { useNannyProfile } from "../../hooks/useNannyProfile";
import { formatProfileName, profileInitial } from "../../lib/profileName";
import EmptyState from "../../components/ui/EmptyState";

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function StarRow({ score }) {
  const full = Math.round(score);
  return (
    <span className="text-gold" aria-label={`${score} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-cream-dark">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default function NannyPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, ratings, slots, avg, loading } = useNannyProfile(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm text-taupe">Loading…</p>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-5 gap-3">
        <p className="text-base text-charcoal">Provider not found.</p>
        <Link to="/" className="text-sm text-sage-dark underline">
          Back to discover
        </Link>
      </div>
    );
  }

  const initial = profileInitial(profile);
  const displayName = formatProfileName(profile);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-md mx-auto px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-taupe hover:text-sage-dark inline-block mb-4"
        >
          ← Back
        </button>

        <header className="bg-white border border-cream-dark p-5 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-sage-light flex items-center justify-center mb-3 overflow-hidden">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-heading font-bold text-sage-dark">
                {initial}
              </span>
            )}
          </div>
          <h1 className="text-xl font-display font-bold text-charcoal">
            {displayName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            {profile.verified_at && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-gold text-white px-2 py-0.5">
                Verified
              </span>
            )}
            {avg != null && (
              <span className="text-sm text-charcoal flex items-center gap-1">
                <StarRow score={avg} />
                <span className="text-taupe">
                  {avg.toFixed(1)} ({ratings.length})
                </span>
              </span>
            )}
          </div>
          {profile.bio && (
            <p className="text-sm text-charcoal mt-4 text-left whitespace-pre-line">
              {profile.bio}
            </p>
          )}
        </header>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-[1.5px] text-charcoal mb-3">
            Available times
          </h2>
          {slots.length === 0 ? (
            <EmptyState icon="calendar" title="No open times right now">
              This provider will post new availability soon — check back.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {slots.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/book/${s.id}`}
                    className="bg-white border border-cream-dark p-4 flex items-center justify-between gap-3 hover:border-sage transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-charcoal">{fmtDay(s.starts_at)}</div>
                      <div className="text-xs text-taupe mt-0.5">
                        {fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-charcoal">
                        ${(s.rate_cents / 100).toFixed(0)}/hr
                      </span>
                      <span className="text-sm font-medium text-sage whitespace-nowrap">Book &rarr;</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-[1.5px] text-charcoal mb-3">
            Reviews
          </h2>
          {ratings.length === 0 ? (
            <EmptyState icon="heart" title="No reviews yet">
              Reviews from parents will show up here after their first session.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {ratings.map((r, i) => (
                <li
                  key={i}
                  className="bg-white border border-cream-dark p-4"
                >
                  <StarRow score={r.score} />
                  {r.text && (
                    <p className="text-sm text-charcoal mt-1.5">{r.text}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

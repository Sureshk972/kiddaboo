import { useParams, Link, useNavigate } from "react-router-dom";
import { useNannyProfile } from "../../hooks/useNannyProfile";

function StarRow({ score }) {
  const full = Math.round(score);
  return (
    <span className="text-sage-dark" aria-label={`${score} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-cream-dark">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default function NannyPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, ratings, avg, loading } = useNannyProfile(id);

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
        <p className="text-base text-charcoal">Nanny not found.</p>
        <Link to="/" className="text-sm text-sage-dark underline">
          Back to discover
        </Link>
      </div>
    );
  }

  const initial = (profile.full_name || "?").charAt(0).toUpperCase();

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
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-heading font-bold text-sage-dark">
                {initial}
              </span>
            )}
          </div>
          <h1 className="text-xl font-heading font-bold text-charcoal">
            {profile.full_name}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            {profile.verified_at && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-sage-light text-sage-dark px-2 py-0.5">
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
          <h2 className="text-sm font-bold uppercase tracking-[1.5px] text-sage-dark mb-3">
            Reviews
          </h2>
          {ratings.length === 0 ? (
            <div className="bg-white border border-cream-dark p-4 text-center">
              <p className="text-sm text-taupe">No reviews yet.</p>
            </div>
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

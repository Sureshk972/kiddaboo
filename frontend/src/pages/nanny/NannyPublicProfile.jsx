import { useParams } from "react-router-dom";
import { useNannyProfile } from "../../hooks/useNannyProfile";

export default function NannyPublicProfile() {
  const { id } = useParams();
  const { profile, ratings, avg, loading } = useNannyProfile(id);
  if (loading) return <p>Loading…</p>;
  if (!profile) return <p>Not found.</p>;
  return (
    <main>
      {profile.avatar_url && <img src={profile.avatar_url} alt="" />}
      <h1>{profile.full_name}</h1>
      {profile.verified_at && <span>Verified</span>}
      {avg != null && <div>★ {avg.toFixed(1)} ({ratings.length})</div>}
      <p>{profile.bio}</p>
      <section>
        <h2>Reviews</h2>
        {ratings.length === 0 ? <p>No reviews yet.</p> : ratings.map((r, i) => (
          <article key={i}>
            <div>★ {r.score}</div>
            {r.text && <p>{r.text}</p>}
          </article>
        ))}
      </section>
    </main>
  );
}

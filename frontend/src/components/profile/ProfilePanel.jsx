import RoleBadge from "./RoleBadge";
import VerifiedBadge from "./VerifiedBadge";

function VerifiedLabel({ accountType }) {
  return (
    <div className="text-xs text-sage-dark font-bold mt-1">
      ✓ {accountType === "organizer" ? "Verified organizer" : "Verified parent"}
    </div>
  );
}

function ChildrenCard({ children }) {
  if (!children || children.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-widest text-taupe font-bold mb-1.5">Children</div>
      <div className="flex gap-2 flex-wrap">
        {children.map((c) => (
          <span
            key={c.name}
            className="bg-white border border-cream-dark rounded-xl px-3 py-2 text-xs text-charcoal"
          >
            {c.name}, {c.age}
          </span>
        ))}
      </div>
    </div>
  );
}

// v1 intentionally omits tenure, review rating, and groups-in-common —
// unreliable on a brand-new network. Gate behind a prop when v2 lands.
export default function ProfilePanel({ profile, onMessage }) {
  if (!profile) return null;
  const verified = !!profile.phone_verified_at;
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

  return (
    <div className="bg-cream rounded-t-2xl p-5 max-w-md mx-auto">
      <div className="flex flex-col items-center text-center mb-3">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-full bg-sage-light border-[3px] border-white shadow flex items-center justify-center overflow-hidden">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={`${fullName || "user"}'s photo`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-heading font-bold text-sage-dark">
                {(profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 right-0">
            <VerifiedBadge verified={verified} />
          </div>
        </div>
        <div className="font-bold text-charcoal mt-2">{fullName || "Kiddaboo user"}</div>
        {verified && <VerifiedLabel accountType={profile.account_type} />}
      </div>

      <div className="text-center py-3 border-t border-b border-cream-dark mb-4">
        <div className="flex justify-center mb-1"><RoleBadge role={profile.account_type} /></div>
        {profile.zip_code && (
          <div className="text-xs text-taupe">Zip {profile.zip_code}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-center bg-white rounded-xl border border-cream-dark py-3 mb-4">
        <div>
          <div className="text-base font-bold text-charcoal">{profile.children?.length ?? 0}</div>
          <div className="text-[9px] uppercase text-taupe">Kids</div>
        </div>
        <div className="border-l border-cream-dark">
          <div className="text-base font-bold text-charcoal">{profile.groups_joined_count ?? 0}</div>
          <div className="text-[9px] uppercase text-taupe">Groups</div>
        </div>
      </div>

      <ChildrenCard children={profile.children} />

      {profile.bio && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-taupe font-bold mb-1.5">About</div>
          <div className="text-sm text-charcoal leading-relaxed">{profile.bio}</div>
        </div>
      )}

      {profile.philosophy_tags?.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-taupe font-bold mb-1.5">Parenting style</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.philosophy_tags.map((t) => (
              <span key={t} className="bg-sage-light text-sage-dark rounded-full text-[11px] px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onMessage}
        className="w-full bg-sage-dark text-white rounded-xl py-3 font-bold text-sm cursor-pointer border-none"
      >
        Message
      </button>
    </div>
  );
}

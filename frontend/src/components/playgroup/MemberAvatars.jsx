export default function MemberAvatars({ members = [], maxFamilies, ageRange }) {
  const allChildAges = members
    .flatMap((m) => m.childrenAges)
    .map(Number)
    .filter((n) => !isNaN(n));
  const minAge = allChildAges.length ? Math.min(...allChildAges) : null;
  const maxAge = allChildAges.length ? Math.max(...allChildAges) : null;

  const colors = [
    "bg-sage-light text-sage-dark",
    "bg-terracotta-light text-terracotta",
    "bg-cream-dark text-taupe",
    "bg-sage/20 text-sage-dark",
    "bg-terracotta/10 text-terracotta",
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-cream-dark">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-charcoal">Members</h3>
        <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
          {members.length} of {maxFamilies} families
        </span>
      </div>

      {/* Capacity bar */}
      <div className="w-full h-2 bg-cream-dark rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-sage rounded-full transition-all duration-500"
          style={{ width: `${(members.length / maxFamilies) * 100}%` }}
        />
      </div>

      {/* Avatar row */}
      <div className="flex items-center mb-3">
        <div className="flex -space-x-2">
          {members.slice(0, 5).map((member, i) => (
            <div
              key={member.id}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                text-xs font-bold border-2 border-white
                ${colors[i % colors.length]}
              `}
              title={member.name}
            >
              {member.initials}
            </div>
          ))}
          {members.length > 5 && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white bg-cream-dark text-taupe">
              +{members.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-3 text-xs text-taupe">
        {minAge !== null && maxAge !== null && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1" />
              <path d="M1.5 11C1.5 8.5 3.5 7 6 7C8.5 7 10.5 8.5 10.5 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            Kids ages {minAge === maxAge ? minAge : `${minAge}-${maxAge}`}
          </span>
        )}
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          {maxFamilies - members.length} spots open
        </span>
      </div>
    </div>
  );
}

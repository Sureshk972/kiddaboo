const ACCESS_LABELS = {
  open: "Open",
  request: "Request",
  invite: "Invite Only",
};

export default function PlaygroupCard({ group, onClick, featured = false, premium = false }) {
  const spotsLeft = group.maxFamilies - group.familyCount;

  if (featured) {
    return (
      <div
        onClick={onClick}
        className="group relative overflow-hidden rounded-2xl bg-white border border-cream-dark transition-all duration-500 hover:shadow-xl cursor-pointer col-span-1 md:col-span-2"
      >
        <div className="grid md:grid-cols-2 h-full">
          {/* Photo side */}
          <div className="relative h-56 md:h-full min-h-[240px] overflow-hidden">
            {group.photos?.length > 0 ? (
              <img
                src={group.photos[0]}
                alt={group.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ backgroundColor: group.photoColor + "40" }}
              />
            )}
            <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-amber-400/90 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase text-white">
                Premium
              </span>
              {group.isNewlyPosted && (
                <span className="px-3 py-1 bg-terracotta/90 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase text-white">
                  New
                </span>
              )}
              <span className={`px-3 py-1 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase ${
                group.accessType === "open"
                  ? "bg-sage/90 text-white"
                  : "bg-white/80 text-terracotta"
              }`}>
                {ACCESS_LABELS[group.accessType]}
              </span>
            </div>
          </div>

          {/* Content side */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {group.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-sage-light/40 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-sage-dark"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-xl md:text-2xl font-heading font-bold text-charcoal mb-2">
                {group.name}
              </h3>
              <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#5C6B52">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <span className="font-bold text-sm text-charcoal">{group.rating}</span>
                <span className="text-taupe text-sm">({group.reviewCount} reviews)</span>
              </div>
              <p className="text-taupe text-sm mb-4 flex items-center gap-1.5 min-w-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1" />
                  <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="truncate">{group.location}</span>
                {group.distance != null && (
                  <span className="text-taupe/60 shrink-0">
                    &middot; {group.distance < 0.1 ? "<0.1" : group.distance.toFixed(1)} mi
                  </span>
                )}
              </p>
              <div className="flex gap-6 text-xs font-semibold text-taupe uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="9" cy="13" r="2" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                  </svg>
                  Ages {group.ageRange}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-cream-dark">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center overflow-hidden">
                    {group.hostPhoto ? (
                      <img src={group.hostPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-sage-dark">{group.hostInitials}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-charcoal">{group.hostName}</span>
                  {group.verified && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" fill="#7A8F6D" />
                      <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#5C6B52">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  <span className="text-sm font-bold text-charcoal">{group.rating}</span>
                </div>
              </div>
              {group.joinStatus === "member" || group.joinStatus === "creator" ? (
                <div className="w-full text-center py-3 rounded-xl text-sm font-bold bg-sage-light text-sage-dark">
                  Joined
                </div>
              ) : group.joinStatus === "pending" ? (
                <div className="w-full text-center py-3 rounded-xl text-sm font-bold bg-cream-dark text-taupe">
                  Request Pending
                </div>
              ) : group.joinStatus === "waitlisted" ? (
                <div className="w-full text-center py-3 rounded-xl text-sm font-bold bg-cream-dark text-taupe">
                  On Waitlist
                </div>
              ) : (
                <div className={`w-full text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                  spotsLeft > 0
                    ? "bg-sage text-white group-hover:bg-sage-dark"
                    : "bg-cream-dark text-taupe"
                }`}>
                  {spotsLeft > 0
                    ? group.accessType === "open" ? "Join Group" : "Request to Join"
                    : "Waitlist"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard card
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-cream-dark hover:border-sage-light overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer"
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden">
        {group.photos?.length > 0 ? (
          <img
            src={group.photos[0]}
            alt={group.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: group.photoColor + "40" }}
          />
        )}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
          {premium && (
            <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase" style={{ color: '#6B21D4' }}>
              Premium
            </span>
          )}
          {group.isNewlyPosted && (
            <span className="px-3 py-1 bg-terracotta/90 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase text-white">
              New
            </span>
          )}
          <span className={`px-3 py-1 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase ${
            group.accessType === "open"
              ? "bg-sage/90 text-white"
              : "bg-white/90"
          }`} style={group.accessType === "open" ? undefined : { color: '#6B21D4' }}>
            {ACCESS_LABELS[group.accessType]}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {group.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="bg-sage-light/30 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-sage-dark"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="font-heading font-bold text-base mb-1 leading-tight" style={{ color: '#8B3FE0' }}>
          {group.name}
        </h3>

        <p className="text-xs text-taupe mb-4 flex items-center gap-1 min-w-0">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1" />
            <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="truncate">{group.location}</span>
          {group.distance != null && (
            <span className="text-taupe/60 shrink-0 ml-1">
              &middot; {group.distance < 0.1 ? "<0.1" : group.distance.toFixed(1)} mi
            </span>
          )}
        </p>

        {/* Stats bar */}
        <div className="flex justify-between items-center text-xs font-bold bg-sage-light/20 p-3 rounded-xl mb-4">
          <span className="text-sage-dark">Ages {group.ageRange}</span>
          <span className="text-sage-dark">
            {spotsLeft > 0 ? `${spotsLeft} Spots Available` : "Full"}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center overflow-hidden">
              {group.hostPhoto ? (
                <img src={group.hostPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-sage-dark">{group.hostInitials}</span>
              )}
            </div>
            <span className="text-xs font-medium text-taupe-dark">{group.hostName}</span>
            {group.verified && (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#7A8F6D" />
                <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#8B3FE0">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span className="text-xs font-bold" style={{ color: '#8B3FE0' }}>{group.rating}</span>
          </div>
        </div>

        {/* CTA Button */}
        {group.isOwnGroup ? (
          <div className="w-full text-center py-2.5 rounded-xl text-sm font-bold bg-cream-dark text-taupe">
            Your Group
          </div>
        ) : group.joinStatus === "member" || group.joinStatus === "creator" ? (
          <div className="w-full text-center py-2.5 rounded-xl text-sm font-bold bg-sage-light text-sage-dark">
            Joined
          </div>
        ) : group.joinStatus === "pending" ? (
          <div className="w-full text-center py-2.5 rounded-xl text-sm font-bold bg-cream-dark text-taupe">
            Request Pending
          </div>
        ) : group.joinStatus === "waitlisted" ? (
          <div className="w-full text-center py-2.5 rounded-xl text-sm font-bold bg-cream-dark text-taupe">
            On Waitlist
          </div>
        ) : (
          <div className={`w-full text-center py-2.5 rounded-xl text-sm font-bold transition-colors ${
            spotsLeft > 0
              ? "bg-sage text-white group-hover:bg-sage-dark"
              : "bg-cream-dark text-taupe"
          }`}>
            {spotsLeft > 0
              ? group.accessType === "open" ? "Join Group" : "Request to Join"
              : "Waitlist"}
          </div>
        )}
      </div>
    </div>
  );
}

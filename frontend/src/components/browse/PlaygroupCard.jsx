const ACCESS_ICONS = {
  open: "Open",
  request: "Request",
  invite: "Invite Only",
};

export default function PlaygroupCard({ group, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-cream-dark overflow-hidden hover:border-sage-light transition-all duration-150 cursor-pointer hover:shadow-sm"
    >
      {/* Photo strip */}
      <div
        className="h-28 flex items-end p-3 relative overflow-hidden"
        style={{ backgroundColor: group.photoColor + "40" }}
      >
        {group.photos?.length > 0 && (
          <img
            src={group.photos[0]}
            alt={group.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay for tag readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        <div className="flex items-center gap-1.5 relative z-10">
          {group.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-white/80 backdrop-blur-sm text-sage-dark px-2 py-0.5 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-heading font-bold text-charcoal text-base leading-tight">
            {group.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#7A8F6D">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span className="text-sm font-medium text-charcoal">
              {group.rating}
            </span>
            <span className="text-xs text-taupe">
              ({group.reviewCount})
            </span>
          </div>
        </div>

        {/* Location */}
        <p className="text-xs text-taupe mb-3 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
          </svg>
          {group.location}
          {group.distance != null && (
            <span className="text-taupe/60 ml-1">
              &middot; {group.distance < 0.1 ? "<0.1" : group.distance.toFixed(1)} mi
            </span>
          )}
        </p>

        {/* Info row */}
        <div className="flex items-center justify-between">
          {/* Host info */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center">
              <span className="text-[9px] font-bold text-sage-dark">
                {group.hostInitials}
              </span>
            </div>
            <span className="text-xs text-taupe-dark">
              {group.hostName}
            </span>
            {group.verified && (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#A3B18A" />
                <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 text-[11px] text-taupe">
            <span>Ages {group.ageRange}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-taupe/40" />
            <span>
              {group.maxFamilies - group.familyCount > 0
                ? `${group.maxFamilies - group.familyCount} spots`
                : "Full"}
            </span>
          </div>
        </div>

        {/* Next session */}
        <div className="mt-3 pt-3 border-t border-cream-dark flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-taupe">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Next: {group.nextSession}
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              group.accessType === "open"
                ? "bg-sage-light/50 text-sage-dark"
                : group.accessType === "request"
                ? "bg-terracotta-light/50 text-taupe-dark"
                : "bg-cream-dark text-taupe"
            }`}
          >
            {ACCESS_ICONS[group.accessType]}
          </span>
        </div>
      </div>
    </div>
  );
}

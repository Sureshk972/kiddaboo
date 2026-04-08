export default function PlaygroupCardMini({ group, onClick }) {
  const spots = group.maxFamilies - group.familyCount;

  return (
    <div
      onClick={onClick}
      className="w-56 bg-white rounded-xl border border-cream-dark overflow-hidden cursor-pointer"
    >
      {/* Photo or color bar */}
      <div
        className="h-16 relative overflow-hidden"
        style={{ backgroundColor: group.photoColor + "40" }}
      >
        {group.photos?.length > 0 && (
          <img
            src={group.photos[0]}
            alt={group.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      <div className="p-2.5">
        <h4 className="font-heading font-bold text-charcoal text-sm leading-tight truncate">
          {group.name}
        </h4>

        <p className="text-[11px] text-taupe mt-0.5 flex items-center gap-1 truncate">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
          </svg>
          {group.location}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#5C6B52">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span className="text-xs font-medium text-charcoal">{group.rating}</span>
          </div>
          <div className="flex gap-1">
            {group.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[9px] bg-sage-light text-sage-dark px-1.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <button className="w-full mt-2 bg-sage text-white text-xs font-medium rounded-lg py-1.5 border-none cursor-pointer hover:bg-sage-dark transition-colors">
          {spots > 0 ? `View · ${spots} spot${spots !== 1 ? "s" : ""} left` : "View · Full"}
        </button>
      </div>
    </div>
  );
}

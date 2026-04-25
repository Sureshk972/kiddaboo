const ACTION_STATES = {
  approved: {
    bg: "bg-sage-light/40",
    border: "border-sage",
    label: "Approved",
    icon: "\u2705",
    textColor: "text-sage-dark",
  },
  declined: {
    bg: "bg-cream-dark",
    border: "border-cream-dark",
    label: "Declined",
    icon: "\u274c",
    textColor: "text-taupe",
  },
  waitlisted: {
    bg: "bg-terracotta-light/30",
    border: "border-terracotta-light",
    label: "Waitlisted",
    icon: "\u23f3",
    textColor: "text-taupe-dark",
  },
};

export default function RequestCard({
  request,
  isExpanded,
  onToggle,
  action,
  onApprove,
  onDecline,
  onWaitlist,
}) {
  const actionState = action ? ACTION_STATES[action] : null;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
        actionState
          ? `${actionState.bg} ${actionState.border}`
          : "bg-white border-cream-dark"
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer bg-transparent border-none"
      >
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-terracotta-light flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-taupe-dark">
            {request.initials}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-charcoal">
              {request.name}
            </p>
            {request.isPremium && !actionState && (
              <span className="text-[10px] bg-sage text-white px-1.5 py-0.5 rounded-full font-medium">
                Premium
              </span>
            )}
            {actionState && (
              <span
                className={`text-[10px] ${actionState.textColor} font-medium flex items-center gap-0.5`}
              >
                {actionState.icon} {actionState.label}
              </span>
            )}
          </div>
          <p className="text-xs text-taupe">
            {request.childrenAges.length > 0
              ? `Kids: ${request.childrenAges.join(", ")}`
              : "No children listed"}
            {" "}&middot; {request.requestedAt}
          </p>
        </div>

        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`text-taupe/40 flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Philosophy tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {request.philosophyTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-sage-light text-sage-dark px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Bio */}
          <div className="mb-4">
            <p className="text-xs font-medium text-taupe mb-1">About</p>
            <p className="text-sm text-taupe-dark leading-relaxed">
              {request.bio}
            </p>
          </div>

          {/* Screening answers */}
          <div className="flex flex-col gap-3 mb-4">
            <p className="text-xs font-medium text-taupe">
              Screening Answers
            </p>
            {request.answers.map((a, i) => (
              <div
                key={i}
                className="bg-cream-dark/50 rounded-xl p-3"
              >
                <p className="text-[11px] text-taupe font-medium mb-1">
                  {a.question}
                </p>
                <p className="text-sm text-taupe-dark leading-relaxed">
                  {a.answer}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {!action && (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                className="flex-1 bg-sage text-white font-medium text-sm rounded-xl px-4 py-3 cursor-pointer border-none hover:bg-sage-dark transition-colors active:scale-[0.98]"
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWaitlist();
                }}
                className="flex-1 bg-cream-dark text-taupe-dark font-medium text-sm rounded-xl px-4 py-3 cursor-pointer border border-cream-dark hover:border-sage-light transition-colors"
              >
                Waitlist
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDecline();
                }}
                className="px-4 py-3 text-sm text-taupe/60 font-medium rounded-xl cursor-pointer bg-transparent border-none hover:text-terracotta transition-colors"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

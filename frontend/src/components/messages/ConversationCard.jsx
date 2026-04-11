function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ConversationCard({ conversation, onClick }) {
  const { name, photo, lastMessage, lastSender, lastMessageAt, memberCount, unreadCount = 0 } =
    conversation;

  const preview = lastMessage
    ? `${lastSender}: ${lastMessage}`
    : "No messages yet — say hi!";

  const hasUnread = unreadCount > 0;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm active:scale-[0.99] ${
        hasUnread
          ? "bg-sage-light/20 border-sage-light hover:border-sage"
          : "bg-white border-cream-dark hover:border-sage-light"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden bg-sage-light flex items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-sage-dark"
            >
              <path
                d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle
                cx="9"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M23 21V19C23 17.36 22.04 15.93 20.62 15.35"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M16.5 3.13C17.92 3.71 18.88 5.14 18.88 6.78C18.88 8.42 17.92 9.85 16.5 10.43"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className={`font-heading text-sm truncate ${
              hasUnread ? "font-bold text-charcoal" : "font-bold text-charcoal"
            }`}>
              {name}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {lastMessageAt && (
                <span className={`text-[10px] ${hasUnread ? "text-sage-dark font-semibold" : "text-taupe"}`}>
                  {timeAgo(lastMessageAt)}
                </span>
              )}
              {hasUnread && (
                <span
                  aria-label={`${unreadCount} unread`}
                  className="bg-sage text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate ${hasUnread ? "text-charcoal font-medium" : "text-taupe"}`}>
              {preview}
            </p>
            <span className="text-[10px] text-taupe/60 shrink-0">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="text-taupe/30 shrink-0"
        >
          <path
            d="M9 6L15 12L9 18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

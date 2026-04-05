function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessageBubble({
  message,
  isOwn,
  showSender,
  showAvatar,
  onReport,
}) {
  const senderName = message.profiles
    ? `${message.profiles.first_name || ""} ${message.profiles.last_name || ""}`.trim()
    : "...";

  const initials = message.profiles
    ? (message.profiles.first_name?.[0] || "").toUpperCase() +
      (message.profiles.last_name?.[0] || "").toUpperCase()
    : "?";

  return (
    <div
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} ${
        showSender ? "mt-3" : "mt-0.5"
      }`}
    >
      {/* Avatar space */}
      <div className="w-7 shrink-0">
        {!isOwn && showAvatar && (
          <div className="w-7 h-7 rounded-full bg-sage-light flex items-center justify-center">
            {message.profiles?.photo_url ? (
              <img
                src={message.profiles.photo_url}
                alt={senderName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-[9px] font-bold text-sage-dark">
                {initials}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        {!isOwn && showSender && (
          <p className="text-[10px] text-taupe font-medium mb-0.5 px-1">
            {senderName}
          </p>
        )}

        <div
          className={`
            px-3.5 py-2.5 text-sm leading-relaxed break-words
            ${
              isOwn
                ? "bg-sage text-white rounded-2xl rounded-br-md"
                : "bg-white border border-cream-dark text-charcoal rounded-2xl rounded-bl-md"
            }
          `}
        >
          {message.content}
        </div>

        <div
          className={`flex items-center gap-2 mt-0.5 px-1 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <p className="text-[10px] text-taupe/50">
            {formatTime(message.created_at)}
          </p>
          {!isOwn && onReport && (
            <button
              onClick={() => onReport(message.sender_id, senderName)}
              className="text-[10px] text-taupe/30 hover:text-taupe bg-transparent border-none cursor-pointer p-0"
              aria-label="Report message"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <circle cx="19" cy="12" r="1" fill="currentColor"/>
                <circle cx="5" cy="12" r="1" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

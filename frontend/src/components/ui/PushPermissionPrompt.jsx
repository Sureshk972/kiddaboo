import Button from "./Button";

export default function PushPermissionPrompt({ onEnable, onDismiss }) {
  return (
    <div className="mx-5 mb-4 bg-sage-light/40 border border-sage-light rounded-2xl p-4">
      <div className="flex items-start gap-3">
        {/* Bell icon */}
        <div className="w-10 h-10 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="#7A8F6D"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 0 1-3.46 0"
              stroke="#7A8F6D"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-heading font-bold text-charcoal mb-0.5">
            Stay in the loop
          </h4>
          <p className="text-xs text-taupe leading-relaxed mb-3">
            Get notified when families request to join, new messages arrive, or
            sessions are scheduled.
          </p>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={onEnable}>
              Enable Notifications
            </Button>
            <button
              onClick={onDismiss}
              className="text-xs text-taupe hover:text-taupe-dark bg-transparent border-none cursor-pointer underline underline-offset-2"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

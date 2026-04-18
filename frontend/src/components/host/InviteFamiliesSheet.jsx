import { useState } from "react";
import Button from "../ui/Button";

// Builds the shareable playgroup URL for this environment. window.origin
// is correct on kiddaboo.com, localhost, and Netlify deploy previews —
// we don't hardcode the prod domain so preview links stay on the preview.
function buildInviteUrl(playgroupId) {
  return `${window.location.origin}/playgroup/${playgroupId}`;
}

export default function InviteFamiliesSheet({
  isOpen,
  onClose,
  playgroupId,
  playgroupName = "our playgroup",
}) {
  const [copied, setCopied] = useState(false);
  const url = playgroupId ? buildInviteUrl(playgroupId) : "";
  // Web Share API is present on iOS Safari + Android Chrome but absent
  // on most desktop browsers; gate the Share button on it so desktop
  // users just see Copy (which always works).
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail in insecure contexts or if the user denies
      // permission. Fall back to selecting the text so they can copy
      // manually.
      const input = document.getElementById("invite-url-input");
      input?.select();
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `Join ${playgroupName} on Kiddaboo`,
        text: `Come join ${playgroupName} — playgroup invite:`,
        url,
      });
    } catch {
      // User dismissed the share sheet — not an error worth surfacing.
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-charcoal/40 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-cream-dark rounded-full" />
        </div>

        <div className="px-6 pb-8">
          <h3 className="text-xl font-heading font-bold text-charcoal mb-1">
            Invite families
          </h3>
          <p className="text-sm text-taupe mb-5">
            Share this link with parents you'd like to invite. They'll sign in
            (or sign up) and can request to join.
          </p>

          <label className="text-[10px] uppercase tracking-widest text-taupe font-bold block mb-1.5">
            Invite link
          </label>
          <input
            id="invite-url-input"
            type="text"
            readOnly
            value={url}
            onClick={(e) => e.target.select()}
            className="w-full bg-white border border-cream-dark rounded-xl px-4 py-3 text-charcoal font-body text-xs outline-none mb-4 focus:ring-2 focus:ring-sage-light focus:border-sage"
          />

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-white border border-cream-dark text-charcoal font-medium rounded-xl py-3 text-sm cursor-pointer transition-colors hover:bg-cream-dark/50 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="#5C6B52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Copy link
                </>
              )}
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex-1 bg-sage hover:bg-sage-dark text-white font-medium rounded-xl py-3 text-sm cursor-pointer border-none transition-colors flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Share
              </button>
            )}
          </div>

          <p className="text-[11px] text-taupe/70 mt-4 leading-relaxed">
            Invitees will see the playgroup page after signing in, and can tap Join to request access.
          </p>

          <div className="mt-6">
            <Button variant="secondary" fullWidth onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

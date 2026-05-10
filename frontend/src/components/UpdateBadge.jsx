import { useVersionCheck } from "../hooks/useVersionCheck";

/**
 * Floating pill that appears top-right when a newer build is live.
 * Tap reloads the SPA so the new index.html (and its hashed asset
 * bundle) loads. iOS PWAs in standalone mode disable native
 * pull-to-refresh, so we use a tap target.
 */
export default function UpdateBadge() {
  const updateAvailable = useVersionCheck();
  if (!updateAvailable) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed z-50 right-3 text-[11px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-full shadow-md cursor-pointer border-none text-white"
      style={{
        top: "calc(env(safe-area-inset-top) + 0.5rem)",
        backgroundColor: "#8B3FE0",
        fontFamily: "'Inter', sans-serif",
      }}
      aria-label="New version available — tap to refresh"
    >
      Update — tap to refresh
    </button>
  );
}

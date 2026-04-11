import { useEffect } from "react";

// #50: Single-page apps don't naturally update <title> on client-side
// navigation, so the browser tab was showing "Kiddaboo — Find Your
// Playgroup" everywhere regardless of the active route. That's a
// three-way annoyance: (1) users with multiple Kiddaboo tabs open
// can't tell them apart in the tab strip, (2) duplicate <title> tags
// are an SEO negative signal, and (3) screen readers announce the
// same page title on every nav, which is worse than useless.
//
// This hook is deliberately stupid-simple: pass a string, it sets
// document.title when the component mounts (and on every change),
// and restores the app-level default on unmount so a per-page title
// never leaks past the page that set it. We prefix with "Kiddaboo —"
// to keep brand consistency in tabbed browsers.
//
// Usage:
//   useDocumentTitle("Browse");           // → "Kiddaboo — Browse"
//   useDocumentTitle("Messages");         // → "Kiddaboo — Messages"
//   useDocumentTitle(playgroup?.name);    // → "Kiddaboo — DJT Forever"
//
// Pass `null`/`undefined`/"" to opt out for that render — useful for
// async pages where the title shouldn't flash "Kiddaboo — undefined"
// while data loads.
const DEFAULT_TITLE = "Kiddaboo — Find Your Playgroup";
const BRAND_PREFIX = "Kiddaboo — ";

export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title || typeof title !== "string" || !title.trim()) return;
    const previous = document.title;
    document.title = title.startsWith(BRAND_PREFIX)
      ? title
      : `${BRAND_PREFIX}${title.trim()}`;
    return () => {
      // Restore whatever was there before this page mounted — usually
      // the default, but if a parent route also set a title we don't
      // want to clobber it.
      document.title = previous || DEFAULT_TITLE;
    };
  }, [title]);
}

export default useDocumentTitle;

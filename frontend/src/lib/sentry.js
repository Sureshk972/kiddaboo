import * as Sentry from "@sentry/react";

// Sentry is opt-in via env var and only initializes in production builds.
// Without VITE_SENTRY_DSN, every Sentry.* call in the app is a safe no-op
// (the SDK silently drops events when the client isn't initialized), so
// dev builds and PR previews don't ship errors to the production project.
//
// Minimal config for soft launch:
//   - errors only (no performance tracing, no session replay)
//   - no source map upload (needs an auth token; defer to post-launch)
//   - 100% error sample rate — volume is still tiny
//
// To enable: set VITE_SENTRY_DSN in the Netlify environment and rebuild.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  if (!import.meta.env.PROD) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "production",
    // Errors only — tracesSampleRate omitted so the BrowserTracing
    // integration stays off and we don't pay the bundle-size / request
    // cost of performance monitoring for the soft launch.
    sampleRate: 1.0,
    // Scrub anything that looks like a Supabase JWT from the URL before
    // the event is serialized. Our query strings also carry `success`
    // and `cancelled` markers from Stripe but those are safe.
    beforeSend(event) {
      try {
        if (event.request?.url) {
          event.request.url = event.request.url.replace(
            /([?&](?:access_token|refresh_token|token)=)[^&]+/g,
            "$1[REDACTED]"
          );
        }
      } catch {
        /* noop */
      }
      return event;
    },
  });
}

// Re-export the pieces the rest of the app needs. Keeping the import
// surface in one place means we can swap providers later without
// touching every call site.
export const ErrorBoundary = Sentry.ErrorBoundary;
export const captureException = Sentry.captureException;

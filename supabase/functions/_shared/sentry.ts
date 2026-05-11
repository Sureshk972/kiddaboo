// Minimal Sentry error reporter for Kiddaboo Supabase edge functions.
//
// Why a hand-rolled client instead of @sentry/deno:
//   - Zero npm/esm.sh dependency; nothing to break across SDK versions.
//   - Edge function cold-start matters; this is ~30 lines and ships
//     with no transitive deps.
//   - We only need error capture, not the full Sentry SDK surface
//     (no breadcrumbs, no performance, no sessions).
//
// If SENTRY_DSN is unset, every call is a safe no-op so local
// `supabase functions serve` and unconfigured projects don't blow up.

interface Dsn {
  host: string;
  projectId: string;
  publicKey: string;
}

function parseDsn(raw: string | undefined): Dsn | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, "");
    if (!projectId || !url.username) return null;
    return { host: url.host, projectId, publicKey: url.username };
  } catch {
    return null;
  }
}

const DSN = parseDsn(Deno.env.get("SENTRY_DSN"));

function uuid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Fire-and-forget error report to Sentry. Tagged with the function
 * name so issues group per-edge-function in the Sentry UI. Always
 * resolves; never throws — Sentry outages must not break our handlers.
 */
export async function captureException(
  err: unknown,
  fn: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  if (!DSN) return;
  try {
    const error = err instanceof Error ? err : new Error(String(err));
    const payload = {
      event_id: uuid(),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      environment: "production",
      logger: "edge-function",
      server_name: fn,
      tags: { fn },
      extra: extra || {},
      exception: {
        values: [
          {
            type: error.name || "Error",
            value: error.message || "Unknown error",
            stacktrace: error.stack
              ? { frames: parseStack(error.stack) }
              : undefined,
          },
        ],
      },
    };

    const url = `https://${DSN.host}/api/${DSN.projectId}/store/?sentry_version=7&sentry_client=kiddaboo-edge/1.0&sentry_key=${DSN.publicKey}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Reporting must never break the function itself.
  }
}

function parseStack(stack: string) {
  // Sentry expects frames in oldest→newest order. V8 stacks are
  // newest→oldest, so we reverse.
  const lines = stack.split("\n").slice(1);
  const frames: Array<Record<string, unknown>> = [];
  for (const line of lines) {
    const match = line.match(/at (?:(.+?) )?\(?([^()]+):(\d+):(\d+)\)?$/);
    if (!match) continue;
    frames.push({
      function: match[1] || "<anonymous>",
      filename: match[2],
      lineno: Number(match[3]),
      colno: Number(match[4]),
      in_app: true,
    });
  }
  return frames.reverse();
}

/**
 * Wraps a Deno serve handler so any uncaught throw is reported and
 * still surfaces as a 500. Use this as a safety net AROUND the
 * function's existing error handling — don't replace per-block catches
 * because those produce specific 4xx responses Stripe / clients expect.
 */
export function withSentry(
  fn: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      await captureException(err, fn);
      return new Response("Internal Server Error", { status: 500 });
    }
  };
}

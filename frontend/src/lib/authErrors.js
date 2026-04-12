// #55: Map raw Supabase auth error messages to parent-voice copy.
// Supabase GoTrue returns English error strings that read like log
// messages ("Invalid login credentials", "Email not confirmed").
// Parents shouldn't see those — they're confusing and scary.
//
// The mapping is case-insensitive substring matching so it survives
// minor Supabase wording changes across versions.

const ERROR_MAP = [
  {
    match: "invalid login credentials",
    message: "That email and password don't match. Double-check and try again, or tap \"Forgot password?\" below.",
  },
  {
    match: "email not confirmed",
    message: "Almost there — check your email for the confirmation link we sent.",
  },
  {
    match: "user already registered",
    message: "Looks like you already have an account. Try signing in instead.",
    action: "switch_to_signin",
  },
  {
    match: "email rate limit exceeded",
    message: "Too many attempts — please wait a minute and try again.",
  },
  {
    match: "rate limit",
    message: "Too many attempts — please wait a minute and try again.",
  },
  {
    match: "password should be at least",
    message: "Your password needs to be at least 6 characters.",
  },
  {
    match: "unable to validate email",
    message: "That doesn't look like a valid email address. Please check and try again.",
  },
  {
    match: "invalid email",
    message: "That doesn't look like a valid email address. Please check and try again.",
  },
  {
    match: "signup is disabled",
    message: "New accounts aren't available right now. Please try again later.",
  },
  {
    match: "email link is invalid or has expired",
    message: "That link has expired. Please request a new one.",
  },
];

const FALLBACK = "Something went wrong — please try again in a moment.";

/**
 * Convert a raw Supabase auth error into parent-friendly copy.
 * Returns { message, action? } where action is an optional hint
 * for the UI (e.g. "switch_to_signin").
 */
export function friendlyAuthError(raw) {
  if (!raw || typeof raw !== "string") return { message: FALLBACK };

  const lower = raw.toLowerCase();
  for (const entry of ERROR_MAP) {
    if (lower.includes(entry.match)) {
      return { message: entry.message, action: entry.action || null };
    }
  }

  return { message: FALLBACK };
}

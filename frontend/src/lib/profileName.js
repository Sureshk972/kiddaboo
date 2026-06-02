// Small helpers for rendering a profile row's display name + initial.
// Schema uses first_name + last_name (NOT full_name) — these helpers
// keep call sites consistent and tolerate missing fields.

export function formatProfileName(p, fallback = "Nanny") {
  if (!p) return fallback;
  const joined = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return joined || fallback;
}

export function profileInitial(p) {
  if (!p) return "?";
  const a = (p.first_name?.[0] || "").toUpperCase();
  const b = (p.last_name?.[0] || "").toUpperCase();
  return a + b || "?";
}

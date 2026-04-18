// Build a .ics (iCalendar) file for a session and trigger a download.
// .ics is the universal format — tapping the download on iOS opens
// Apple Calendar, on Android it opens Google Calendar, on desktop it
// opens whichever app is registered. No backend or OAuth needed.

// Format a Date as a UTC timestamp in iCalendar form: 20260501T143000Z
function toIcsUtc(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

// RFC 5545 requires commas, semicolons, backslashes, and newlines in
// text fields to be escaped. Without this, a note like "Bring snacks;
// sunscreen" would corrupt the file.
function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs({ session, playgroupName }) {
  const start = new Date(session.scheduled_at);
  const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000);

  const title = playgroupName
    ? `${playgroupName} playdate`
    : session.title || "Playdate";

  const descParts = [];
  if (playgroupName) descParts.push(`Kiddaboo playgroup: ${playgroupName}`);
  if (session.notes) descParts.push(session.notes);

  // UID must be stable + unique so calendars dedupe on re-download.
  const uid = `session-${session.id}@kiddaboo`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kiddaboo//Session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(title)}`,
  ];
  if (session.location_name) lines.push(`LOCATION:${escapeText(session.location_name)}`);
  if (descParts.length > 0) lines.push(`DESCRIPTION:${escapeText(descParts.join("\n"))}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  // CRLF line endings are part of the RFC 5545 spec; some strict
  // parsers (older Outlook versions) reject plain \n.
  return lines.join("\r\n");
}

export function downloadIcs({ session, playgroupName }) {
  const ics = buildIcs({ session, playgroupName });
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kiddaboo-session-${session.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give Safari a tick before revoking — it can race the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { describe, test, expect } from "vitest";
import { buildIcs } from "./icsExport";

const baseSession = {
  id: "abc-123",
  scheduled_at: "2026-05-01T14:30:00Z",
  duration_minutes: 90,
  location_name: "Central Park playground",
  notes: "Bring sunscreen",
  title: "Playdate",
};

describe("buildIcs", () => {
  test("includes required iCalendar envelope + VEVENT fields", () => {
    const ics = buildIcs({ session: baseSession, playgroupName: "Westside Toddlers" });
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/END:VCALENDAR$/);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("UID:session-abc-123@kiddaboo");
    expect(ics).toContain("SUMMARY:Westside Toddlers playdate");
  });

  test("computes DTEND from duration_minutes", () => {
    const ics = buildIcs({ session: baseSession });
    expect(ics).toContain("DTSTART:20260501T143000Z");
    expect(ics).toContain("DTEND:20260501T160000Z");
  });

  test("escapes commas, semicolons, and newlines in text fields", () => {
    const ics = buildIcs({
      session: { ...baseSession, notes: "Bring snacks; sunscreen, hats\nmeet at gate" },
    });
    expect(ics).toContain("Bring snacks\\; sunscreen\\, hats\\nmeet at gate");
  });

  test("omits LOCATION and DESCRIPTION when empty", () => {
    const ics = buildIcs({
      session: { ...baseSession, location_name: null, notes: null },
    });
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
  });

  test("uses CRLF line endings per RFC 5545", () => {
    const ics = buildIcs({ session: baseSession });
    expect(ics.split("\r\n").length).toBeGreaterThan(5);
    expect(ics).not.toMatch(/[^\r]\n/);
  });
});

/**
 * Date formatting utilities for Kiddaboo
 * Uses Intl.DateTimeFormat — no external libraries needed
 */

/** "Sat, Apr 12" */
export function formatSessionDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "10:00 AM" */
export function formatSessionTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "2 hrs" or "1.5 hrs" or "90 min" */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hrs = minutes / 60;
  if (hrs === Math.floor(hrs)) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  return `${hrs} hrs`;
}

/** True if the date is in the future */
export function isUpcoming(isoString) {
  return new Date(isoString) > new Date();
}

/** "Apr 12, 2026 · 10:00 AM" — combined format */
export function formatSessionDateTime(isoString) {
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} · ${timePart}`;
}

/** Returns "Today", "Tomorrow", or formatted date */
export function friendlyDate(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Gets a default date string for the date input (YYYY-MM-DD) */
export function toDateInputValue(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Gets today's date as YYYY-MM-DD for min attribute */
export function todayDateString() {
  return toDateInputValue(new Date());
}

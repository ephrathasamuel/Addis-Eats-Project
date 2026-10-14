/**
 * Shared formatting module for Day 47.
 * Formatters are built once at module level for optimal performance.
 */

// Currency formatting in Ethiopian Birr
export const etb = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

// Explicit timezone (Africa/Addis_Ababa, UTC+3) and locale ensures server and client never mismatch
export const when = new Intl.DateTimeFormat("en-ET", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Addis_Ababa",
});

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Human-friendly relative time ("5 minutes ago", "in 2 hours")
export function relative(date) {
  const diffSec = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const minutes = Math.round(diffSec / 60);
  if (Math.abs(minutes) < 60) {
    return relativeFormatter.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return relativeFormatter.format(hours, "hour");
  }
  const days = Math.round(hours / 24);
  return relativeFormatter.format(days, "day");
}

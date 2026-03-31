/**
 * Safely converts a Date object or date string to a valid Date instance.
 * Returns null if the input is null, undefined, or results in an invalid date.
 */
function toValidDate(date: Date | string | null): Date | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date value as a UTC date-only string (YYYY-MM-DD).
 * Use for date-only fields like releaseDate, birthDate.
 * Returns null if the input is null or invalid.
 */
export function formatUtcDate(date: Date | string | null): string | null {
  const d = toValidDate(date);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Formats a date value as a full UTC ISO 8601 datetime string.
 * Use for timestamp fields like createdAt, updatedAt, reviewedAt.
 * Returns null if the input is null or invalid.
 */
export function formatUtcDateTime(date: Date | string | null): string | null {
  const d = toValidDate(date);
  if (!d) return null;
  return d.toISOString();
}

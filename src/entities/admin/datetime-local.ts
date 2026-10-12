/**
 * Conversions between `<input type="datetime-local">` values (`YYYY-MM-DDTHH:mm`, no timezone,
 * wall-clock time of the admin) and the RFC 3339 timestamps the API requires.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Interprets a datetime-local value in the browser's timezone and returns an ISO-8601 UTC string. */
export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

/** Formats an API timestamp as a datetime-local value in the browser's timezone. */
export function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Conversions between `<input type="datetime-local">` values (`YYYY-MM-DDTHH:mm`, no timezone)
 * and the RFC 3339 timestamps the API requires.
 *
 * The wall-clock value is always interpreted in the storefront's market time zone
 * (`TIME_ZONE` in `src/i18n/formats.ts`, Asia/Jakarta = WIB), never in the browser's time zone,
 * so an admin abroad enters and sees the same times as the storefront displays. WIB is UTC+7
 * with no daylight saving time, so a fixed offset is exact.
 */

const WIB_OFFSET_MINUTES = 7 * 60;
const WIB_OFFSET_SUFFIX = '+07:00';
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Interprets a datetime-local value as WIB wall-clock time and returns an ISO-8601 UTC string.
 * Returns `''` for empty or invalid input.
 */
export function datetimeLocalToIso(value: string): string {
  const match = DATETIME_LOCAL_PATTERN.exec(value);
  if (!match) return '';
  const date = new Date(`${value}${match[1] ? '' : ':00'}${WIB_OFFSET_SUFFIX}`);
  if (Number.isNaN(date.getTime())) return '';
  // Reject values the engine silently rolls over (e.g. `2026-02-30`).
  if (isoToDatetimeLocal(date.toISOString()) !== value.slice(0, 16)) return '';
  return date.toISOString();
}

/**
 * Formats an API timestamp as a datetime-local value in WIB.
 * Returns `''` for `null`, `undefined`, empty or unparseable input.
 */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const wib = new Date(time + WIB_OFFSET_MINUTES * 60_000);
  return (
    `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}` +
    `T${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}`
  );
}

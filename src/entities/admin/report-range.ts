/**
 * Date-range helpers for the admin reports.
 *
 * The UI works with inclusive calendar days (`YYYY-MM-DD`, both ends shown in
 * the picker). The reports API takes `from` inclusive and `to` exclusive, and
 * reads a bare date as midnight in the tenant timezone, so the query sends the
 * day after the last selected day as `to`. Calendar arithmetic runs in UTC on
 * date-only values so DST never shifts a day.
 */
import type { AdminReportKind, AdminReportRangeParams } from './types';

export type ReportRangePreset = '7d' | '30d' | '90d' | 'custom';

export const REPORT_RANGE_PRESETS: Exclude<ReportRangePreset, 'custom'>[] = ['7d', '30d', '90d'];

/** Longest range the API accepts (to - from, in days). */
export const REPORT_MAX_DAYS = 366;

/** Inclusive calendar-day range as shown in the picker. */
export interface ReportDateRange {
  from: string;
  to: string;
}

export type ReportRangeError = 'invalid' | 'order' | 'tooLong';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function parseDay(value: string): number | null {
  if (!DATE_RE.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return null;
  // Reject rollovers such as 2026-02-31.
  return new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

/** `YYYY-MM-DD` plus `days` (may be negative). */
export function addDays(value: string, days: number): string {
  const time = parseDay(value);
  if (time === null) throw new RangeError(`Invalid date: ${value}`);
  return new Date(time + days * DAY_MS).toISOString().slice(0, 10);
}

/** The calendar date of `date` in the browser's timezone, as `YYYY-MM-DD`. */
export function localDay(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const PRESET_DAYS: Record<Exclude<ReportRangePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** The last `n` days ending today (inclusive), matching the API's 30-day default for '30d'. */
export function presetRange(
  preset: Exclude<ReportRangePreset, 'custom'>,
  today: string = localDay(),
): ReportDateRange {
  return { from: addDays(today, -(PRESET_DAYS[preset] - 1)), to: today };
}

/** Why `range` cannot be sent, or null when it is valid. */
export function validateReportRange(range: ReportDateRange): ReportRangeError | null {
  const from = parseDay(range.from);
  const to = parseDay(range.to);
  if (from === null || to === null) return 'invalid';
  if (from > to) return 'order';
  if ((to - from) / DAY_MS + 1 > REPORT_MAX_DAYS) return 'tooLong';
  return null;
}

/** API query for an inclusive picker range: `to` becomes the exclusive next day. */
export function reportRangeQuery(range: ReportDateRange): Required<AdminReportRangeParams> {
  return { from: range.from, to: addDays(range.to, 1) };
}

/**
 * The name the backend gives a CSV export (`<report>_<from>_<to>.csv`, tenant
 * dates, `to` exclusive). Used when the Content-Disposition header is not
 * readable, e.g. cross-origin without `Access-Control-Expose-Headers`.
 */
export function reportCsvFilename(
  report: AdminReportKind,
  query: Required<AdminReportRangeParams>,
): string {
  return `${report}_${query.from.slice(0, 10)}_${query.to.slice(0, 10)}.csv`;
}

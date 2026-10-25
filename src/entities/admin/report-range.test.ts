import { describe, expect, it } from 'vitest';

import {
  addDays,
  localDay,
  presetRange,
  reportCsvFilename,
  reportRangeQuery,
  validateReportRange,
} from './report-range';

describe('report range helpers', () => {
  it('adds calendar days across month, year and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(() => addDays('2026-02-31', 1)).toThrow(RangeError);
  });

  it('formats the browser-local calendar day', () => {
    expect(localDay(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });

  it('builds presets ending today, inclusive', () => {
    expect(presetRange('7d', '2026-10-25')).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(presetRange('30d', '2026-10-25')).toEqual({ from: '2026-09-26', to: '2026-10-25' });
    expect(presetRange('90d', '2026-10-25')).toEqual({ from: '2026-07-28', to: '2026-10-25' });
  });

  it('sends the day after the last selected day as the exclusive `to`', () => {
    expect(reportRangeQuery({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      from: '2026-10-01',
      to: '2026-11-01',
    });
    // 30d preset matches the API default window (to - from = 30 days).
    const query = reportRangeQuery(presetRange('30d', '2026-10-25'));
    expect((Date.parse(query.to) - Date.parse(query.from)) / 86_400_000).toBe(30);
  });

  it('validates the range like the API', () => {
    expect(validateReportRange({ from: '2026-10-01', to: '2026-10-01' })).toBeNull();
    expect(validateReportRange({ from: '', to: '2026-10-01' })).toBe('invalid');
    expect(validateReportRange({ from: '2026-02-30', to: '2026-03-01' })).toBe('invalid');
    expect(validateReportRange({ from: '2026-10-02', to: '2026-10-01' })).toBe('order');
    // 366 selected days is the maximum (to - from = 366 days once `to` is exclusive).
    expect(validateReportRange({ from: '2025-01-01', to: '2026-01-01' })).toBeNull();
    expect(validateReportRange({ from: '2025-01-01', to: '2026-01-02' })).toBe('tooLong');
  });

  it('names CSV files like the backend', () => {
    expect(reportCsvFilename('sales-by-product', { from: '2026-10-01', to: '2026-11-01' })).toBe(
      'sales-by-product_2026-10-01_2026-11-01.csv',
    );
  });
});

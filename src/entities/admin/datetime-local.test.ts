import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { datetimeLocalToIso, isoToDatetimeLocal } from './datetime-local';

function runAssertions() {
  it('reads a datetime-local value as WIB', () => {
    expect(datetimeLocalToIso('2026-10-25T07:00')).toBe('2026-10-25T00:00:00.000Z');
    expect(datetimeLocalToIso('2026-10-25T07:00:30')).toBe('2026-10-25T00:00:30.000Z');
    expect(datetimeLocalToIso('2026-10-25T03:00')).toBe('2026-10-24T20:00:00.000Z');
  });

  it('formats an API timestamp in WIB', () => {
    expect(isoToDatetimeLocal('2026-10-25T00:00:00.000Z')).toBe('2026-10-25T07:00');
    expect(isoToDatetimeLocal('2026-10-24T20:00:00Z')).toBe('2026-10-25T03:00');
    expect(isoToDatetimeLocal('2026-10-25T09:30:00+02:00')).toBe('2026-10-25T14:30');
  });

  it('round-trips stably', () => {
    const local = '2026-12-31T23:59';
    expect(isoToDatetimeLocal(datetimeLocalToIso(local))).toBe(local);
    const iso = '2026-10-25T00:00:00.000Z';
    expect(datetimeLocalToIso(isoToDatetimeLocal(iso))).toBe(iso);
  });

  it('returns an empty string for empty or invalid input', () => {
    expect(datetimeLocalToIso('')).toBe('');
    expect(datetimeLocalToIso('not a date')).toBe('');
    expect(datetimeLocalToIso('2026-13-01T07:00')).toBe('');
    expect(datetimeLocalToIso('2026-02-30T07:00')).toBe('');
    expect(isoToDatetimeLocal('')).toBe('');
    expect(isoToDatetimeLocal(null)).toBe('');
    expect(isoToDatetimeLocal(undefined)).toBe('');
    expect(isoToDatetimeLocal('not a date')).toBe('');
  });
}

describe('datetime-local helpers (host time zone)', () => {
  runAssertions();
});

describe('datetime-local helpers with TZ=America/New_York', () => {
  let previous: string | undefined;

  beforeAll(() => {
    previous = process.env.TZ;
    process.env.TZ = 'America/New_York';
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  });

  it('really runs in a non-WIB time zone', () => {
    // 2026-10-25 is in EDT (UTC-4).
    expect(new Date('2026-10-25T00:00:00.000Z').getTimezoneOffset()).toBe(240);
  });

  runAssertions();
});

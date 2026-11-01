import { describe, expect, it } from 'vitest';

import { PRICE_FILTER_MAX } from '../apiParams';
import {
  DEFAULT_PRICE_BUCKETS,
  isPriceBucketSelected,
  priceRangeDisplayBounds,
  priceRangeForBucket,
} from '../facets';

describe('price bucket helpers', () => {
  it('mirrors the API buckets: nine, contiguous, last one open-ended', () => {
    expect(DEFAULT_PRICE_BUCKETS).toHaveLength(9);
    expect(DEFAULT_PRICE_BUCKETS[0].min).toBe(0);
    for (let i = 1; i < DEFAULT_PRICE_BUCKETS.length; i++) {
      expect(DEFAULT_PRICE_BUCKETS[i].min).toBe(DEFAULT_PRICE_BUCKETS[i - 1].max);
    }
    expect(DEFAULT_PRICE_BUCKETS.at(-1)).toMatchObject({ min: 10_000_000, max: null });
  });

  it('round-trips every bucket through its filter range', () => {
    for (const bucket of DEFAULT_PRICE_BUCKETS) {
      expect(isPriceBucketSelected(bucket, priceRangeForBucket(bucket))).toBe(true);
    }
  });

  it('shows a bucket range with the exclusive upper edge', () => {
    expect(priceRangeDisplayBounds([50_000, 99_999])).toEqual({ min: 50_000, max: 100_000 });
    expect(priceRangeDisplayBounds([10_000_000, PRICE_FILTER_MAX])).toEqual({
      min: 10_000_000,
      max: null,
    });
  });

  it('shows any other range with its own inclusive bounds', () => {
    expect(priceRangeDisplayBounds([60_000, 90_000])).toEqual({ min: 60_000, max: 90_000 });
    expect(priceRangeDisplayBounds([500_000, PRICE_FILTER_MAX])).toEqual({
      min: 500_000,
      max: null,
    });
    // With no buckets to match, a bucket-shaped range keeps its inclusive bound.
    expect(priceRangeDisplayBounds([50_000, 99_999], [])).toEqual({ min: 50_000, max: 99_999 });
  });
});

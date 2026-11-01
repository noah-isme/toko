/**
 * Helpers for the facet counts returned by GET /products?include=facets.
 */
import type { SearchFilters } from '../types';

import { PRICE_FILTER_MAX } from './apiParams';

import type { ProductPriceBucket } from '@/lib/api/types';

/**
 * The price filter for a bucket. Buckets cover `min <= price < max` and the
 * filter's `maxPrice` is inclusive, so the upper bound is `max - 1`; the
 * open-ended last bucket ends at PRICE_FILTER_MAX (no upper bound).
 */
export function priceRangeForBucket(bucket: ProductPriceBucket): [number, number] {
  return [
    bucket.min,
    bucket.max === null ? Math.max(bucket.min, PRICE_FILTER_MAX) : bucket.max - 1,
  ];
}

export function isPriceBucketSelected(
  bucket: ProductPriceBucket,
  range: SearchFilters['priceRange'],
): boolean {
  if (!range) return false;
  const [min, max] = priceRangeForBucket(bucket);
  if (range[0] !== min) return false;
  return bucket.max === null ? range[1] >= PRICE_FILTER_MAX : range[1] === max;
}

/** True when the price filter restricts results (not the default `[0, PRICE_FILTER_MAX]`). */
export function hasPriceFilter(range: SearchFilters['priceRange']): range is [number, number] {
  return !!range && (range[0] > 0 || range[1] < PRICE_FILTER_MAX);
}

/** Upper edges (IDR) of the API's fixed price buckets; the last bucket is open-ended. */
export const PRICE_BUCKET_EDGES = [
  50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000,
] as const;

/** The API's price buckets without counts, for labelling a range before facets load. */
export const DEFAULT_PRICE_BUCKETS: ProductPriceBucket[] = [
  ...PRICE_BUCKET_EDGES.map(
    (max, i): ProductPriceBucket => ({
      min: i === 0 ? 0 : PRICE_BUCKET_EDGES[i - 1],
      max,
      count: 0,
    }),
  ),
  { min: PRICE_BUCKET_EDGES[PRICE_BUCKET_EDGES.length - 1], max: null, count: 0 },
];

/**
 * Bounds to display for a price filter. A range that came from a bucket shows
 * the bucket's own (exclusive) upper edge, so the chip and the sidebar agree
 * ("50.000 - 100.000", not "50.000 - 99.999"); any other range shows its
 * inclusive bounds. `max` is null when the range is open-ended.
 */
export function priceRangeDisplayBounds(
  range: [number, number],
  buckets: ProductPriceBucket[] = DEFAULT_PRICE_BUCKETS,
): { min: number; max: number | null } {
  const bucket = buckets.find((candidate) => isPriceBucketSelected(candidate, range));
  if (bucket) return { min: bucket.min, max: bucket.max };
  return { min: range[0], max: range[1] >= PRICE_FILTER_MAX ? null : range[1] };
}

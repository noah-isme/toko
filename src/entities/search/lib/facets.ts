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

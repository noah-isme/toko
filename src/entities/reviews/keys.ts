import type { ReviewListParams } from './types';

export function getReviewListKey(productId: string, params?: ReviewListParams) {
  return ['reviews', 'list', productId, params ?? {}] as const;
}

export function getReviewStatsKey(productId: string) {
  return ['reviews', 'stats', productId] as const;
}

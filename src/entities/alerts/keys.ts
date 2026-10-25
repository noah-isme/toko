import type { AlertListParams } from './types';

export const alertsKeys = {
  all: ['alerts'] as const,
  list: (params: AlertListParams = {}) => ['alerts', 'list', params] as const,
  product: (productId: string) => ['alerts', 'product', productId] as const,
  /** Every alert of the signed-in user, all pages merged (favorites page). */
  everything: () => ['alerts', 'everything'] as const,
};

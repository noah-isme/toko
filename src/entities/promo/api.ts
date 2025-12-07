import { promoApplyInputSchema, promoResultSchema } from './schemas';

import { apiClient } from '@/lib/api/apiClient';

function assertCartId(cartId: string | undefined): asserts cartId is string {
  if (!cartId) {
    throw new Error('cartId is required for promo operations');
  }
}

function buildPromoPath(cartId: string, action: 'validate' | 'apply' | 'remove') {
  const normalizedId = encodeURIComponent(cartId);
  return `/cart/${normalizedId}/promo/${action}` as const;
}

export async function validatePromo(cartId: string | undefined, code: string) {
  assertCartId(cartId);
  const payload = promoApplyInputSchema.parse({ code });
  return apiClient(buildPromoPath(cartId, 'validate'), {
    method: 'POST',
    body: JSON.stringify(payload),
    schema: promoResultSchema,
  });
}

export async function applyPromo(cartId: string | undefined, code: string) {
  assertCartId(cartId);
  const payload = promoApplyInputSchema.parse({ code });
  return apiClient(buildPromoPath(cartId, 'apply'), {
    method: 'POST',
    body: JSON.stringify(payload),
    schema: promoResultSchema,
  });
}

export async function removePromo(cartId: string | undefined) {
  assertCartId(cartId);
  return apiClient(buildPromoPath(cartId, 'remove'), {
    method: 'POST',
    schema: promoResultSchema,
  });
}

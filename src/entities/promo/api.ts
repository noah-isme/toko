import { promoApplyInputSchema, voucherPreviewResponseSchema } from './schemas';

import { apiClient } from '@/lib/api/apiClient';
import type { VoucherPreviewRequest, VoucherPreviewResponse } from '@/lib/api/types';

function assertCartId(cartId: string | undefined): asserts cartId is string {
  if (!cartId) {
    throw new Error('cartId is required for promo operations');
  }
}

function buildPromoPath(cartId: string, action: 'validate' | 'apply' | 'remove') {
  const normalizedId = encodeURIComponent(cartId);
  switch (action) {
    case 'validate':
      return `/carts/${normalizedId}/apply-voucher` as const;
    case 'apply':
      return `/carts/${normalizedId}/apply-voucher` as const;
    case 'remove':
      return `/carts/${normalizedId}/voucher` as const;
  }
}

function buildPreviewPayload(
  cartId: string,
  code: string,
  cartTotal: number,
  items: VoucherPreviewRequest['items'],
  userId?: string,
): VoucherPreviewRequest {
  return {
    code,
    cartTotal,
    userId,
    items,
  };
}

export async function validatePromo(
  cartId: string | undefined,
  code: string,
  cartTotal: number,
  items: VoucherPreviewRequest['items'],
  userId?: string,
) {
  assertCartId(cartId);
  const payload = buildPreviewPayload(cartId, code, cartTotal, items, userId);
  return apiClient('/vouchers/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
    schema: voucherPreviewResponseSchema,
  });
}

export async function applyPromo(
  cartId: string | undefined,
  code: string,
  cartTotal: number,
  items: VoucherPreviewRequest['items'],
  userId?: string,
) {
  assertCartId(cartId);
  const payload = buildPreviewPayload(cartId, code, cartTotal, items, userId);
  return apiClient('/vouchers/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
    schema: voucherPreviewResponseSchema,
  });
}

export async function removePromo(cartId: string | undefined) {
  assertCartId(cartId);
  return apiClient(buildPromoPath(cartId, 'remove'), {
    method: 'DELETE',
    schema: voucherPreviewResponseSchema,
  });
}

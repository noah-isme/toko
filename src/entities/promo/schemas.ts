import { z } from 'zod';

import type { Promo } from './types';

export const promoApplyInputSchema = z.object({
  code: z
    .string({
      message: 'Masukkan kode promo',
    })
    .trim()
    .min(1, 'Kode promo wajib diisi')
    .max(32, 'Kode promo terlalu panjang'),
});

export type PromoApplyInput = z.infer<typeof promoApplyInputSchema>;

export const voucherPreviewResponseSchema = z.object({
  eligible: z.boolean(),
  discount: z.number(),
  eligibleSubtotal: z.number(),
  finalTotal: z.number(),
  voucher: z.object({
    id: z.string(),
    code: z.string(),
    kind: z.union([z.literal('fixed_amount'), z.literal('percent')]),
    value: z.number(),
    percentBps: z.number().optional(),
    minSpend: z.number(),
    usageLimit: z.number().optional(),
    usedCount: z.number(),
    perUserLimit: z.number().optional(),
    validFrom: z.string(),
    validTo: z.string(),
    productIds: z.array(z.string()),
    categoryIds: z.array(z.string()),
    brandIds: z.array(z.string()),
    combinable: z.boolean(),
    priority: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    tenantId: z.string(),
  }),
  message: z.string().optional(),
});

export type VoucherPreviewResponse = z.infer<typeof voucherPreviewResponseSchema>;

/** @deprecated Use voucherPreviewResponseSchema instead. Kept for backward compatibility. */
export const promoResultSchema = z.object({
  valid: z.boolean(),
  promo: z
    .object({
      code: z.string(),
      discountType: z.union([z.literal('percent'), z.literal('amount')]),
      value: z.number(),
      label: z.string().optional(),
      expiresAt: z.string().optional(),
      minSubtotal: z.number().optional(),
    })
    .optional()
    .transform((value) => value as Promo | undefined),
  message: z.string().optional(),
  appliedSubtotal: z.number().optional(),
  finalTotal: z.number().optional(),
});

/** @deprecated Use VoucherPreviewResponse instead. */
export type PromoResult = z.infer<typeof promoResultSchema>;

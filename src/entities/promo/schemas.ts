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

export type PromoResult = z.infer<typeof promoResultSchema>;

import { z } from 'zod';

import type { Promo } from './types';

/**
 * Keys under `cart.promo.validation` in the message catalogs. The schema carries these keys
 * as its error messages; `PromoField` translates them for display.
 */
export const PROMO_VALIDATION_KEYS = [
  'codeRequired',
  'codeEmpty',
  'codeTooLong',
  'codeInvalid',
  'cartMissing',
  'notValidated',
] as const;

export type PromoValidationKey = (typeof PROMO_VALIDATION_KEYS)[number];

export function isPromoValidationKey(value: unknown): value is PromoValidationKey {
  return (PROMO_VALIDATION_KEYS as readonly unknown[]).includes(value);
}

const promoMessage = (key: PromoValidationKey) => key;

export const promoApplyInputSchema = z.object({
  code: z
    .string({
      message: promoMessage('codeRequired'),
    })
    .trim()
    .min(1, promoMessage('codeEmpty'))
    .max(32, promoMessage('codeTooLong')),
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

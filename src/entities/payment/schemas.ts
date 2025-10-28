import { z } from 'zod';

const paymentProviderSchema = z.union([
  z.literal('midtrans'),
  z.literal('xendit'),
  z.literal('manual'),
]);

export const PaymentIntentSchema = z.object({
  orderId: z.string(),
  provider: paymentProviderSchema,
  channel: z.string(),
  token: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  expiresAt: z.string().optional(),
});

export const PaymentStatusSchema = z.object({
  orderId: z.string(),
  status: z.union([
    z.literal('PENDING'),
    z.literal('PAID'),
    z.literal('FAILED'),
    z.literal('EXPIRED'),
    z.literal('CANCELED'),
  ]),
  provider: z.string(),
  raw: z.unknown().optional(),
});

export const PaymentCreateBodySchema = z.object({
  orderId: z.string(),
  provider: paymentProviderSchema,
  channel: z.string().optional(),
});

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentCreateBody = z.infer<typeof PaymentCreateBodySchema>;

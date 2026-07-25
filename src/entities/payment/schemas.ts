import { z } from 'zod';

const optionalString = z.string().min(1).nullish();

export const PaymentIntentSchema = z.object({
  provider: z.string(),
  token: optionalString,
  redirectUrl: z.string().url().nullish(),
  expiresAt: z.string().nullish(),
});

export const PaymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED']),
});

export const PaymentCreateBodySchema = z.object({
  orderId: z.string().min(1),
  channel: z.string().min(1).optional(),
});

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentCreateBody = z.infer<typeof PaymentCreateBodySchema>;

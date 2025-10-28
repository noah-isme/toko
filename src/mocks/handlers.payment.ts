import { HttpResponse, http } from 'msw';
import { z } from 'zod';

import {
  PaymentCreateBodySchema,
  PaymentIntentSchema,
  PaymentStatusSchema,
} from '@/entities/payment/schemas';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

const statusAttempts = new Map<
  string,
  { checks: number; status: z.infer<typeof PaymentStatusSchema>['status']; provider: string }
>();

const paymentStatusQuerySchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
});

function nextStatus(orderId: string) {
  const existing = statusAttempts.get(orderId);
  const state = existing ?? { checks: 0, status: 'PENDING' as const, provider: 'midtrans' };

  state.checks += 1;

  if (state.status === 'PENDING' && state.checks >= 2) {
    state.status = 'PAID';
  }

  statusAttempts.set(orderId, state);

  return state;
}

export const paymentHandlers = [
  http.post(`${API_URL}/payments/intent`, async ({ request }) => {
    const payload = await request.json();
    const parsed = PaymentCreateBodySchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_PAYMENT_INTENT',
            message: 'Payment intent payload is invalid',
          },
        },
        { status: 400 },
      );
    }

    const { orderId, provider, channel } = parsed.data;
    statusAttempts.set(orderId, { checks: 0, status: 'PENDING', provider });

    const response = PaymentIntentSchema.parse({
      orderId,
      provider,
      channel: channel ?? 'default',
      token: 'mock-token-123',
      redirectUrl: 'https://mock.pay/redirect/123',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    return HttpResponse.json(response);
  }),
  http.get(`${API_URL}/payments/status`, async ({ request }) => {
    const url = new URL(request.url);
    const parsed = paymentStatusQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_PAYMENT_STATUS',
            message: 'orderId query parameter is required',
          },
        },
        { status: 400 },
      );
    }

    const { orderId } = parsed.data;
    const state = nextStatus(orderId);

    const response = PaymentStatusSchema.parse({
      orderId,
      status: state.status,
      provider: state.provider,
      raw: { checks: state.checks },
    });

    return HttpResponse.json(response);
  }),
];

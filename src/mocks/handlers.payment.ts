import { HttpResponse, http } from 'msw';
import { z } from 'zod';

import { apiPath } from './utils';

import {
  PaymentCreateBodySchema,
  PaymentIntentSchema,
  PaymentStatusSchema,
} from '@/entities/payment/schemas';

const statusAttempts = new Map<
  string,
  { checks: number; status: z.infer<typeof PaymentStatusSchema>['status'] }
>();

function nextStatus(orderId: string) {
  const existing = statusAttempts.get(orderId);
  const state = existing ?? { checks: 0, status: 'PENDING' as const };

  state.checks += 1;

  if (state.status === 'PENDING' && state.checks >= 2) {
    state.status = 'PAID';
  }

  statusAttempts.set(orderId, state);

  return state;
}

export const paymentHandlers = [
  http.post(apiPath('/payments/intent'), async ({ request }) => {
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

    const scenario = request.headers.get('x-mock-scenario');

    if (scenario === 'intent-error' || parsed.data.channel === 'mock-error') {
      return HttpResponse.json(
        {
          error: {
            code: 'PAYMENT_INTENT_FAILED',
            message: 'Unable to create payment intent',
          },
        },
        { status: 500 },
      );
    }

    const { orderId } = parsed.data;
    statusAttempts.set(orderId, { checks: 0, status: 'PENDING' });

    const response = PaymentIntentSchema.parse({
      provider: 'midtrans',
      token: 'mock-token-123',
      redirectUrl: 'https://mock.pay/redirect/123',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    return HttpResponse.json({ data: response });
  }),
  http.get(apiPath('/payments/:orderId/status'), async ({ request, params }) => {
    const url = new URL(request.url);
    const orderId = String(params.orderId);
    const forcedStatus = url.searchParams.get('forceStatus');

    if (
      forcedStatus &&
      ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(forcedStatus)
    ) {
      const status = forcedStatus as z.infer<typeof PaymentStatusSchema>['status'];
      statusAttempts.set(orderId, { checks: 1, status });

      const response = PaymentStatusSchema.parse({ status });

      return HttpResponse.json({ data: response });
    }

    const state = nextStatus(orderId);

    const response = PaymentStatusSchema.parse({
      status: state.status,
    });

    return HttpResponse.json({ data: response });
  }),
];

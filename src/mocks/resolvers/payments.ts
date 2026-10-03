import { paidOrders } from './session';
import type { MockResolver } from './types';

/** `GET payments/:orderId/status`: PAID once this session created a payment intent. */
export const resolvePaymentStatus: MockResolver = ({ path, method, sessionId }) => {
  if (path.startsWith('payments/') && path.endsWith('/status') && method === 'GET') {
    const orderId = decodeURIComponent(path.slice('payments/'.length, -'/status'.length));
    return { data: { status: paidOrders(sessionId).has(orderId) ? 'PAID' : 'PENDING' } };
  }
  return undefined;
};

/** `POST payments/intent`: "Bayar Sekarang" settles immediately in the mock. */
export const resolvePaymentIntent: MockResolver = ({ path, method, body, sessionId }) => {
  if (path === 'payments/intent' && method === 'POST') {
    paidOrders(sessionId).add(String(body?.orderId ?? 'order-success-id'));
    return {
      data: {
        provider: body?.provider || 'midtrans',
        token: 'mock-token-12345',
        redirectUrl: 'https://payment.example.com/pay',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    };
  }
  return undefined;
};

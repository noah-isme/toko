import { paidOrders } from './session';
import type { MockResolver } from './types';

/** Manual bank-transfer instructions for an order (shared with `handlers.payment.ts`). */
export function paymentInstructions(orderId: string) {
  return {
    data: {
      orderId,
      provider: 'mock',
      channel: 'bank_transfer',
      steps: [
        'Transfer sesuai total pesanan.',
        'Simpan bukti pembayaran.',
        'Unggah bukti pembayaran.',
      ],
      bank: { name: 'Bank Mock', accountName: 'Toko Demo', accountNumber: '1234567890' },
      qrUrl: null,
    },
  };
}

/** `GET payments/:orderId/instructions`. */
export const resolvePaymentInstructions: MockResolver = ({ path, method }) => {
  if (path.startsWith('payments/') && path.endsWith('/instructions') && method === 'GET') {
    const orderId = path.slice('payments/'.length, -'/instructions'.length);
    if (orderId && !orderId.includes('/')) return paymentInstructions(decodeURIComponent(orderId));
  }
  return undefined;
};

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

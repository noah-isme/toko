import { shippingRates } from '../fixtures';

import { cartTotal } from './cart';
import { paidOrders } from './session';
import type { MockResolver } from './types';

const ORDER_ID = 'order-success-id';

/** Shipping quote, checkout and checkout draft. */
export const resolveCheckout: MockResolver = ({ path, method, body, sessionId }) => {
  if (path.includes('quote/shipping') && method === 'POST') {
    return { data: shippingRates };
  }
  if (path === 'checkout' && method === 'POST') {
    // A fresh order starts unpaid again.
    paidOrders(sessionId).delete(ORDER_ID);
    return {
      data: {
        orderId: ORDER_ID,
        orderNumber: 'ORD-SUCCESS-NUM',
        status: 'pending_payment',
        total: cartTotal(),
        currency: 'IDR',
        paymentMethod: body?.paymentMethod || 'bank_transfer',
      },
    };
  }
  if (path === 'checkout/draft' && method === 'POST') {
    return { data: { id: 'draft-123', status: 'draft' } };
  }
  return undefined;
};

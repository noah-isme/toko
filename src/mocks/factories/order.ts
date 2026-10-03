/** Order summary as listed by `GET orders`. */
export type MockOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
};

export function buildOrderSummary(overrides: Partial<MockOrderSummary> = {}): MockOrderSummary {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    status: 'pending_payment',
    total: 1250000,
    currency: 'IDR',
    itemCount: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * One order per storefront status. Timestamps other than the first are "now",
 * so the list is built per request.
 */
export function buildOrderList(): MockOrderSummary[] {
  const rows: Array<[string, number]> = [
    ['paid', 200000],
    ['packed', 300000],
    ['shipped', 400000],
    ['delivered', 500000],
    ['cancelled', 150000],
  ];
  return [
    buildOrderSummary({ itemCount: 5, createdAt: '2025-12-25T14:30:00.000Z' }),
    ...rows.map(([status, total], index) =>
      buildOrderSummary({
        id: `order-${index + 2}`,
        orderNumber: `ORD-00${index + 2}`,
        status,
        total,
      }),
    ),
  ];
}

/** Status encoded in the well-known E2E order ids. */
function statusForOrderId(orderId: string): string {
  if (orderId.startsWith('order-status-')) return orderId.replace('order-status-', '');
  if (orderId === 'order-expired-payment') return 'pending_payment';
  if (orderId.includes('pending')) return 'pending_payment';
  return 'paid';
}

/** Order detail for any id; built per request because payment expiry is relative to now. */
export function buildOrderDetail(orderId: string) {
  const status = statusForOrderId(orderId);
  const payment =
    status === 'pending_payment'
      ? {
          method: 'bank_transfer',
          status: 'pending',
          paymentUrl: 'https://payment.example.com/pay',
          paymentExpiry:
            orderId === 'order-expired-payment'
              ? new Date(Date.now() - 3600000).toISOString() // Expired 1 hour ago
              : new Date(Date.now() + 3600000).toISOString(), // Expires in 1 hour
        }
      : null;

  return {
    id: orderId,
    orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
    status,
    total: 100000,
    currency: 'IDR',
    itemCount: 1,
    createdAt: new Date().toISOString(),
    pricing: { subtotal: 100000, discount: 0, tax: 0, shipping: 0, total: 100000 },
    payment,
    user: { id: 'user-123', name: 'John Doe', email: 'john.doe@example.com' },
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productTitle: 'Mock Product',
        productSlug: 'mock-product',
        qty: 1,
        unitPrice: 100000,
        subtotal: 100000,
      },
    ],
    shippingAddress: {
      receiverName: 'John Doe',
      phone: '08123456789',
      addressLine1: 'Jl. Mock No. 123',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '12345',
      country: 'Indonesia',
    },
  };
}

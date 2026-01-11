import { HttpResponse, http } from 'msw';
import { z } from 'zod';

import { apiPath } from './utils';

import {
  AddressSchema,
  OrderDraftSchema,
  ShippingOptionSchema,
  TotalsSchema,
} from '@/entities/checkout/schemas';

const quoteRequestSchema = z.object({
  cartId: z.string().min(1),
  address: AddressSchema,
});

const draftRequestSchema = z.object({
  cartId: z.string().min(1),
  address: AddressSchema,
  shippingOptionId: z.string().min(1),
  notes: z.string().optional(),
});

const shippingQuoteRequestSchema = z.object({
  destination: z.string().min(1),
  courier: z.string().min(1),
  weightGram: z.number().positive(),
});

const checkoutRequestSchema = z.object({
  cartId: z.string().min(1),
  shippingAddressId: z.string().min(1),
  shippingService: z.string().min(1),
  shippingCost: z.number().nonnegative(),
  paymentMethod: z.string().min(1),
  notes: z.string().optional(),
});

const shippingOptions = [
  {
    id: 'reg',
    courier: 'JNE',
    service: 'REG',
    etd: '2-3 Hari',
    cost: 15000,
  },
  {
    id: 'yes',
    courier: 'JNE',
    service: 'YES',
    etd: '1 Hari',
    cost: 25000,
  },
  {
    id: 'oke',
    courier: 'JNE',
    service: 'OKE',
    etd: '4-5 Hari',
    cost: 10000,
  },
] satisfies z.infer<typeof ShippingOptionSchema>[];

const shippingOptionsSchema = z.array(ShippingOptionSchema);

const shippingRates = [
  {
    service: 'REG',
    description: 'Regular Service',
    cost: 15000,
    etd: '2-3 days',
    note: '',
  },
  {
    service: 'YES',
    description: 'Yakin Esok Sampai',
    cost: 35000,
    etd: '1 day',
    note: '',
  },
  {
    service: 'OKE',
    description: 'Ongkos Kirim Ekonomis',
    cost: 10000,
    etd: '4-5 days',
    note: '',
  },
];

function getCartTotals() {
  const globalScope = globalThis as {
    __tokoCartMock?: {
      subtotal?: { amount: number };
      discount?: { amount: number } | number;
    };
  };
  const cart = globalScope.__tokoCartMock;

  const subtotal =
    typeof cart?.subtotal === 'object' && typeof cart.subtotal.amount === 'number'
      ? cart.subtotal.amount
      : 200000;
  const discountValue =
    typeof cart?.discount === 'number'
      ? cart.discount
      : typeof (cart?.discount as { amount?: number } | undefined)?.amount === 'number'
        ? ((cart?.discount as { amount?: number }).amount ?? 0)
        : 0;

  return {
    subtotal,
    discount: discountValue,
  };
}

export const checkoutHandlers = [
  http.post(apiPath('/carts/:cartId/quote/shipping'), async ({ request }) => {
    const payload = await request.json();
    const parsed = shippingQuoteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_SHIPPING_QUOTE',
            message: 'Shipping quote payload is invalid',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ data: shippingRates });
  }),
  http.post(apiPath('/checkout'), async ({ request }) => {
    const payload = await request.json();
    const parsed = checkoutRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_CHECKOUT',
            message: 'Checkout payload is invalid',
          },
        },
        { status: 400 },
      );
    }

    const { subtotal, discount } = getCartTotals();
    const tax = Math.round((subtotal - discount) * 0.11);
    const total = subtotal - discount + tax + parsed.data.shippingCost;
    const orderId = `order-${Date.now()}`;
    const orderNumber = `ORD-${Date.now()}`;

    return HttpResponse.json({
      data: {
        orderId,
        orderNumber,
        status: 'pending_payment',
        total,
        currency: 'IDR',
        paymentMethod: parsed.data.paymentMethod,
      },
    });
  }),
  http.post(apiPath('/checkout/quote'), async ({ request }) => {
    const payload = await request.json();
    const parsed = quoteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_ADDRESS',
            message: 'Address information is incomplete',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json(shippingOptionsSchema.parse(shippingOptions));
  }),
  http.post(apiPath('/checkout/draft'), async ({ request }) => {
    const payload = await request.json();
    const parsed = draftRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_DRAFT',
            message: 'Draft request payload is invalid',
          },
        },
        { status: 400 },
      );
    }

    const scenario = request.headers.get('x-mock-scenario');

    if (scenario === 'draft-error' || parsed.data.notes === 'force-error') {
      return HttpResponse.json(
        {
          error: {
            code: 'DRAFT_CREATION_FAILED',
            message: 'Unable to create draft order at this time',
          },
        },
        { status: 500 },
      );
    }

    const shippingOption = shippingOptions.find(
      (option) => option.id === parsed.data.shippingOptionId,
    );

    if (!shippingOption) {
      return HttpResponse.json(
        {
          error: {
            code: 'SHIPPING_OPTION_NOT_FOUND',
            message: 'Shipping option is not available',
          },
        },
        { status: 404 },
      );
    }

    const { subtotal, discount } = getCartTotals();
    const tax = Math.round((subtotal - discount) * 0.11);
    const totals = TotalsSchema.parse({
      subtotal,
      discount,
      tax,
      shipping: shippingOption.cost,
      total: subtotal - discount + tax + shippingOption.cost,
    });

    const draft = OrderDraftSchema.parse({
      cartId: parsed.data.cartId,
      address: parsed.data.address,
      shippingOption,
      notes: parsed.data.notes,
      totals,
    });

    return HttpResponse.json(draft);
  }),
];

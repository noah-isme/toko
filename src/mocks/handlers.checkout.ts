import { HttpResponse, http } from 'msw';
import { z } from 'zod';

import {
  AddressSchema,
  OrderDraftSchema,
  ShippingOptionSchema,
  TotalsSchema,
} from '@/entities/checkout/schemas';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

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
  http.post(`${API_URL}/checkout/quote`, async ({ request }) => {
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
  http.post(`${API_URL}/checkout/draft`, async ({ request }) => {
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

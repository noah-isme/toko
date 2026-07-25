import { HttpResponse, http } from 'msw';

import { apiPath, type MockCart } from '../utils';

import type { Promo } from '@/entities/promo/types';

const promoCatalog: Record<string, Promo & { message: string; scenario?: 'expired' }> = {
  SAVE10: {
    code: 'SAVE10',
    discountType: 'percent',
    value: 10,
    label: 'Diskon 10% untuk pesananmu',
    minSubtotal: 100000,
    message: 'Diskon 10% berhasil diterapkan',
  },
  SHIPFREE: {
    code: 'SHIPFREE',
    discountType: 'amount',
    value: 15000,
    label: 'Gratis ongkir hingga Rp15.000',
    message: 'Gratis ongkir aktif',
  },
  EXPIRED: {
    code: 'EXPIRED',
    discountType: 'percent',
    value: 5,
    label: 'Kode kedaluwarsa',
    expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    message: 'Kode promo kedaluwarsa',
    scenario: 'expired',
  },
};

function getCartMock() {
  return (globalThis as { __tokoCartMock?: MockCart }).__tokoCartMock;
}

function getCartSubtotal() {
  const cart = getCartMock();
  return typeof cart?.subtotal?.amount === 'number' ? cart.subtotal.amount : 200000;
}

function evaluatePromo(
  code: string,
  cartTotal: number,
  items: { productId: string; subtotal: number }[],
) {
  const normalized = code.trim().toUpperCase();
  const promo = promoCatalog[normalized];
  if (!promo) {
    return {
      eligible: false as const,
      discount: 0,
      eligibleSubtotal: cartTotal,
      finalTotal: cartTotal,
      voucher: null,
      message: 'Kode promo tidak ditemukan',
    };
  }

  if (promo.scenario === 'expired') {
    return {
      eligible: false as const,
      discount: 0,
      eligibleSubtotal: cartTotal,
      finalTotal: cartTotal,
      voucher: null,
      message: 'Kode promo sudah kedaluwarsa',
    };
  }

  if (promo.minSubtotal && cartTotal < promo.minSubtotal) {
    return {
      eligible: false as const,
      discount: 0,
      eligibleSubtotal: cartTotal,
      finalTotal: cartTotal,
      voucher: null,
      message: `Minimal belanja ${formatCurrency(promo.minSubtotal)} untuk kode ini`,
    };
  }

  const rawDiscount =
    promo.discountType === 'percent' ? Math.round((promo.value / 100) * cartTotal) : promo.value;
  const discountValue = Math.min(cartTotal, Math.max(0, rawDiscount));
  const eligibleSubtotal = cartTotal - discountValue;

  const voucher = {
    id: `voucher-${promo.code.toLowerCase()}`,
    code: promo.code,
    kind: promo.discountType === 'percent' ? 'percent' : 'fixed_amount',
    value: promo.discountType === 'percent' ? 0 : promo.value,
    percentBps: promo.discountType === 'percent' ? promo.value * 100 : 0,
    minSpend: promo.minSubtotal,
    usageLimit: 100,
    usedCount: 0,
    perUserLimit: 1,
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 86400000 * 365).toISOString(),
    productIds: [],
    categoryIds: [],
    brandIds: [],
    combinable: false,
    priority: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant-1',
  };

  return {
    eligible: true as const,
    discount: discountValue,
    eligibleSubtotal,
    finalTotal: eligibleSubtotal,
    voucher,
    message: promo.message,
  };
}

function persistCartDiscount(discountValue: number | undefined, promo?: Promo) {
  const cart = getCartMock();
  if (cart) {
    cart.discount = discountValue ?? 0;
    cart.voucher = promo ? promo.code : null;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}

export const promoHandlers = [
  http.post(apiPath('/vouchers/preview'), async ({ request }) => {
    const body = (await request.json()) as {
      code?: string;
      cartTotal?: number;
      items?: { productId: string; subtotal: number }[];
    };
    const code = body?.code;
    const cartTotal = body?.cartTotal ?? getCartSubtotal();
    const items = body?.items ?? [];

    if (!code) {
      return HttpResponse.json(
        {
          eligible: false,
          discount: 0,
          eligibleSubtotal: cartTotal,
          finalTotal: cartTotal,
          voucher: null,
          message: 'Kode promo wajib diisi',
        },
        { status: 400 },
      );
    }

    const evaluation = evaluatePromo(code, cartTotal, items);
    if (!evaluation.eligible) {
      return HttpResponse.json({ ...evaluation, voucher: null }, { status: 200 });
    }

    return HttpResponse.json(evaluation);
  }),
  http.delete(apiPath('/carts/:cartId/voucher'), async () => {
    persistCartDiscount(undefined);
    return HttpResponse.json({
      eligible: false,
      discount: 0,
      eligibleSubtotal: getCartSubtotal(),
      finalTotal: getCartSubtotal(),
      voucher: null,
      message: 'Kode promo dihapus',
    });
  }),
];

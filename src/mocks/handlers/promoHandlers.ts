import { HttpResponse, http } from 'msw';

import { apiPath } from '../utils';

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
  return (globalThis as { __tokoCartMock?: { subtotal?: { amount: number }; discount?: number } })
    .__tokoCartMock;
}

function getCartSubtotal() {
  const cart = getCartMock();
  return typeof cart?.subtotal?.amount === 'number' ? cart.subtotal.amount : 200000;
}

function evaluatePromo(code: string) {
  const normalized = code.trim().toUpperCase();
  const promo = promoCatalog[normalized];
  if (!promo) {
    return { valid: false as const, message: 'Kode promo tidak ditemukan' };
  }

  if (promo.scenario === 'expired') {
    return { valid: false as const, message: 'Kode promo sudah kedaluwarsa' };
  }

  const subtotal = getCartSubtotal();
  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return {
      valid: false as const,
      message: `Minimal belanja ${formatCurrency(promo.minSubtotal)} untuk kode ini`,
    };
  }

  const rawDiscount =
    promo.discountType === 'percent' ? Math.round((promo.value / 100) * subtotal) : promo.value;
  const discountValue = Math.min(subtotal, Math.max(0, rawDiscount));
  const appliedSubtotal = subtotal - discountValue;

  return {
    valid: true as const,
    promo,
    appliedSubtotal,
    finalTotal: appliedSubtotal,
    message: promo.message,
    discountValue,
  };
}

function persistCartDiscount(discountValue: number | undefined) {
  const cart = getCartMock();
  if (cart) {
    cart.discount = discountValue ?? 0;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
}

export const promoHandlers = [
  http.post(apiPath('/cart/:cartId/promo/validate'), async ({ request }) => {
    const body = (await request.json()) as { code?: string };
    if (!body?.code) {
      return HttpResponse.json(
        { valid: false, message: 'Kode promo wajib diisi' },
        { status: 400 },
      );
    }

    const evaluation = evaluatePromo(body.code);
    if (!evaluation.valid) {
      return HttpResponse.json({ valid: false, message: evaluation.message }, { status: 422 });
    }

    const { promo, appliedSubtotal, finalTotal, message } = evaluation;
    return HttpResponse.json({
      valid: true,
      promo,
      appliedSubtotal,
      finalTotal,
      message,
    });
  }),
  http.post(apiPath('/cart/:cartId/promo/apply'), async ({ request }) => {
    const body = (await request.json()) as { code?: string };
    if (!body?.code) {
      return HttpResponse.json(
        { valid: false, message: 'Kode promo wajib diisi' },
        { status: 400 },
      );
    }

    const evaluation = evaluatePromo(body.code);
    if (!evaluation.valid) {
      return HttpResponse.json({ valid: false, message: evaluation.message }, { status: 422 });
    }

    persistCartDiscount(evaluation.discountValue);
    return HttpResponse.json({
      valid: true,
      promo: evaluation.promo,
      appliedSubtotal: evaluation.appliedSubtotal,
      finalTotal: evaluation.finalTotal,
      message: evaluation.message,
    });
  }),
  http.post(apiPath('/cart/:cartId/promo/remove'), async () => {
    persistCartDiscount(undefined);
    return HttpResponse.json({ valid: false, message: 'Kode promo dihapus' });
  }),
];

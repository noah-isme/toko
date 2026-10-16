import { sessionValue } from './session';
import type { MockResolver } from './types';

type Promo = { code: string; discountType: string; value: number; label: string; message: string };

const PROMOS: Record<string, Promo> = {
  SAVE10: {
    code: 'SAVE10',
    discountType: 'percent',
    value: 10,
    label: 'Diskon 10% untuk pesananmu',
    message: 'Diskon 10% berhasil diterapkan',
  },
  SHIPFREE: {
    code: 'SHIPFREE',
    discountType: 'amount',
    value: 15000,
    label: 'Gratis ongkir hingga Rp15.000',
    message: 'Gratis ongkir aktif',
  },
};

const NOT_FOUND_MESSAGE = 'Kode promo tidak ditemukan';

function lookup(code: unknown): Promo | undefined {
  return PROMOS[
    String(code || '')
      .trim()
      .toUpperCase()
  ];
}

/**
 * The voucher applied to this session's cart. Like the backend, applying a code
 * attaches it to the cart until it is removed, so a cart refetch after
 * apply-voucher still carries `voucher` and `pricing.discount`. (Without this
 * the post-apply refetch wiped the promo in the checkout.)
 */
function sessionVoucher(sessionId: string) {
  return sessionValue('cartVoucher', sessionId, () => ({ code: null as string | null }));
}

export function appliedVoucher(sessionId: string): string | null {
  return sessionVoucher(sessionId).code;
}

/** A newly created cart starts without a voucher. */
export function clearAppliedVoucher(sessionId: string): void {
  sessionVoucher(sessionId).code = null;
}

/** Discount a voucher gives on `subtotal` (percent codes are rounded, capped at the subtotal). */
export function voucherDiscount(code: string | null, subtotal: number): number {
  const promo = lookup(code);
  if (!promo) return 0;
  const raw =
    promo.discountType === 'percent' ? Math.round((promo.value / 100) * subtotal) : promo.value;
  return Math.min(subtotal, Math.max(0, raw));
}

/** `POST carts/:id/apply-voucher` and `DELETE carts/:id/voucher` (unwrapped bodies). */
export const resolveCartPromo: MockResolver = ({ path, method, body, sessionId }) => {
  if (path.includes('/apply-voucher') && method === 'POST') {
    const promo = lookup(body?.code);
    // An unknown code leaves any voucher already on the cart in place.
    if (!promo) return { valid: false, message: NOT_FOUND_MESSAGE };
    sessionVoucher(sessionId).code = promo.code;
    const { message, ...rest } = promo;
    return { valid: true, promo: rest, message };
  }
  if (path.includes('/voucher') && method === 'DELETE') {
    clearAppliedVoucher(sessionId);
    return { valid: false, promo: null };
  }
  return undefined;
};

/** `POST vouchers/validate` and `POST vouchers/apply`. */
export const resolveVoucher: MockResolver = ({ path, method, body }) => {
  if ((path === 'vouchers/validate' || path === 'vouchers/apply') && method === 'POST') {
    const promo = lookup(body?.code);
    if (!promo) return { status: 400, valid: false, message: NOT_FOUND_MESSAGE };
    return { data: { valid: true, ...promo } };
  }
  return undefined;
};

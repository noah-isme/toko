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

/** `POST carts/:id/apply-voucher` and `DELETE carts/:id/voucher` (unwrapped bodies). */
export const resolveCartPromo: MockResolver = ({ path, method, body }) => {
  if (path.includes('/apply-voucher') && method === 'POST') {
    const promo = lookup(body?.code);
    if (!promo) return { valid: false, message: NOT_FOUND_MESSAGE };
    const { message, ...rest } = promo;
    return { valid: true, promo: rest, message };
  }
  if (path.includes('/voucher') && method === 'DELETE') {
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

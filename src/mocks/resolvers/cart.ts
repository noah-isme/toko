import type { RouteCartItem } from '../factories/cart';
import { defaultCart } from '../fixtures';

import { appliedVoucher, clearAppliedVoucher, voucherDiscount } from './promo';
import type { MockResolver } from './types';

const EMPTY_PRICING = { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 };

function isCartPath(path: string) {
  return path === 'carts' || path === 'cart' || path.startsWith('carts/');
}

/** The cart response; `voucher` adds its discount to `pricing` like the backend does. */
export function cartView(
  items: RouteCartItem[],
  id: string = defaultCart.id,
  voucher: string | null = null,
) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discount = voucherDiscount(voucher, subtotal);
  const applied = discount > 0 ? voucher : null;
  return {
    id,
    anonId: null,
    voucher: applied,
    currency: 'IDR',
    pricing: { ...EMPTY_PRICING, subtotal, discount, total: subtotal - discount },
    items,
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
  };
}

export function cartTotal(): number {
  return defaultCart.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

/**
 * `GET carts[/:id]`: the fixed default cart, or an empty one when the path,
 * `empty=true` query or authorization header asks for it.
 */
export const resolveCartRead: MockResolver = ({
  path,
  method,
  searchParams,
  headers,
  sessionId,
}) => {
  if (!isCartPath(path) || method !== 'GET') return undefined;
  const authHeader = headers.get('authorization') || '';
  const isEmpty =
    authHeader.includes('empty') || path.includes('empty') || searchParams.get('empty') === 'true';
  if (isEmpty) return { data: cartView([], 'empty-cart') };
  return { data: cartView(defaultCart.items, defaultCart.id, appliedVoucher(sessionId)) };
};

/**
 * Cart writes. Items do not persist; PATCH on an item echoes the new quantity.
 * `POST carts` creates a fresh cart, which drops the session's voucher.
 */
export const resolveCartWrite: MockResolver = ({ path, method, body, sessionId }) => {
  if (!isCartPath(path) || !['POST', 'PATCH', 'DELETE'].includes(method)) return undefined;
  if (method === 'POST' && path === 'carts') clearAppliedVoucher(sessionId);
  let items = defaultCart.items;
  if (method === 'PATCH' && path.includes('/items/')) {
    const itemId = path.split('/items/')[1];
    const qty: number = body?.qty ?? body?.quantity ?? 1;
    items = defaultCart.items.map((item) => (item.id === itemId ? { ...item, qty } : item));
  }
  return { data: cartView(items, defaultCart.id, appliedVoucher(sessionId)) };
};

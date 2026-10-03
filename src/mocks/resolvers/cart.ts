import type { RouteCartItem } from '../factories/cart';
import { defaultCart } from '../fixtures';

import type { MockResolver } from './types';

const EMPTY_PRICING = { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 };

function isCartPath(path: string) {
  return path === 'carts' || path === 'cart' || path.startsWith('carts/');
}

export function cartView(items: RouteCartItem[], id: string = defaultCart.id) {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  return {
    id,
    anonId: null,
    voucher: null,
    currency: 'IDR',
    pricing: { ...EMPTY_PRICING, subtotal: total, total },
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
export const resolveCartRead: MockResolver = ({ path, method, searchParams, headers }) => {
  if (!isCartPath(path) || method !== 'GET') return undefined;
  const authHeader = headers.get('authorization') || '';
  const isEmpty =
    authHeader.includes('empty') || path.includes('empty') || searchParams.get('empty') === 'true';
  if (isEmpty) return { data: cartView([], 'empty-cart') };
  return { data: cartView(defaultCart.items) };
};

/** Cart writes. Nothing persists; PATCH on an item echoes the new quantity. */
export const resolveCartWrite: MockResolver = ({ path, method, body }) => {
  if (!isCartPath(path) || !['POST', 'PATCH', 'DELETE'].includes(method)) return undefined;
  let items = defaultCart.items;
  if (method === 'PATCH' && path.includes('/items/')) {
    const itemId = path.split('/items/')[1];
    const qty: number = body?.qty ?? body?.quantity ?? 1;
    items = defaultCart.items.map((item) => (item.id === itemId ? { ...item, qty } : item));
  }
  return { data: cartView(items) };
};

import type { AlertSubscription, AlertType } from './types';

/**
 * The backend's "sellable" rule, which is also the cart rule: a variant is
 * sellable when its stock is above zero (the product's `inStock` flag is not
 * consulted), a product-level target when `inStock` is true. BACK_IN_STOCK is
 * refused with 409 ALREADY_IN_STOCK for a sellable target, so "notify me" is
 * only offered when this returns false.
 */
export function isTargetSellable(
  product: { inStock: boolean },
  variant?: { stock: number } | null,
): boolean {
  if (variant) return variant.stock > 0;
  return product.inStock;
}

/** The subscription for exactly this (variant, type) target, if any. */
export function findAlert(
  alerts: readonly AlertSubscription[] | undefined,
  type: AlertType,
  variantId: string | null = null,
): AlertSubscription | undefined {
  return alerts?.find((alert) => alert.type === type && alert.variantId === (variantId ?? null));
}

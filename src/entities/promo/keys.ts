export function getPromoKey(cartId: string | null | undefined) {
  return ['promo', cartId ?? 'anonymous'] as const;
}

export function getPromoValidateKey(
  cartId: string | null | undefined,
  code: string | null | undefined,
) {
  return ['promo', 'validate', cartId ?? 'anonymous', code?.toLowerCase().trim() ?? ''] as const;
}

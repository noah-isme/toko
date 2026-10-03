import type { OrderDraft } from '@/entities/checkout/api/hooks';

/** Order totals derived from the cart subtotal when no order draft totals are stored (11% tax). */
export function getFallbackTotals(subtotalAmount: number | undefined): OrderDraft['totals'] {
  const subtotal = subtotalAmount ?? 0;
  const discount = 0;
  const shipping = 0;
  const tax = Math.round((subtotal - discount) * 0.11);
  const total = subtotal - discount + tax + shipping;

  return { subtotal, discount, shipping, tax, total };
}

/** Display lines for the shipping address stored in an order draft. */
export function formatDraftAddressLines(address: OrderDraft['address']): string[] {
  const { receiverName, phone, addressLine1, addressLine2, city, province, postalCode, country } =
    address;
  return [
    `${receiverName} • ${phone}`,
    addressLine1 + (addressLine2 ? `, ${addressLine2}` : ''),
    `${city}, ${province} ${postalCode}`,
    country,
  ].filter(Boolean);
}

import type { Address as SavedAddress } from '@/entities/address/types';
import type { Address as CheckoutAddress } from '@/entities/checkout/api/hooks';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';

export function mapAddressToCheckout(address: SavedAddress): CheckoutAddress {
  return {
    receiverName: address.receiverName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: address.country ?? 'Indonesia',
  };
}

export function formatAddressText(
  line1: string,
  line2: string | undefined,
  city: string,
  province: string,
  postalCode: string,
) {
  return [line1, line2, `${city}, ${province}`, postalCode].filter(Boolean).join(' • ');
}

export function trackCheckoutAddressSelect(address: SavedAddress) {
  capturePosthogEvent('checkout_address_select', {
    addressId: address.id,
    country: address.country,
    province: address.province,
  });
}

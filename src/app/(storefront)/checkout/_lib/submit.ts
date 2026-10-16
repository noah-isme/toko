import type { Route } from 'next';
import type { useRouter } from 'next/navigation';

import { mapAddressToCheckout } from './address';
import type { CheckoutTotals } from './checkout';
import { clearCheckoutStepDraft } from './session';

import type { Address as SavedAddress } from '@/entities/address/types';
import type {
  CheckoutPayload,
  CheckoutResponse,
  OrderDraft,
  ShippingOption,
} from '@/entities/checkout/api/hooks';
import { saveOrderDraft } from '@/entities/checkout/utils/draftStorage';
import type { PaymentMethod } from '@/lib/api/types';

type CheckoutRouter = Pick<ReturnType<typeof useRouter>, 'push' | 'replace'>;

export function getReviewRoute(orderId: string): Route {
  return `/checkout/review?orderId=${encodeURIComponent(orderId)}` as Route;
}

/**
 * Places the order, stores the order draft for the review page, clears the step draft and
 * redirects (payment gateway URL, or the review page). A 401 sends the user to `/login`; other
 * errors are surfaced through the mutation state.
 */
export async function submitCheckout({
  mutateAsync,
  router,
  cartId,
  address,
  shippingOption,
  paymentMethod,
  notes,
  totals,
  checkoutDraftKey,
}: {
  mutateAsync: (payload: CheckoutPayload) => Promise<CheckoutResponse>;
  router: CheckoutRouter;
  cartId: string;
  address: SavedAddress;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  notes: string;
  totals: CheckoutTotals;
  checkoutDraftKey: string | null;
}) {
  try {
    const result = await mutateAsync({
      cartId,
      shippingAddressId: address.id,
      shippingService: shippingOption.id,
      shippingCost: shippingOption.cost,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    const draft: OrderDraft = {
      cartId,
      address: mapAddressToCheckout(address),
      shippingOption,
      paymentMethod,
      totals,
    };
    saveOrderDraft(result.orderId, draft);
    clearCheckoutStepDraft(checkoutDraftKey);

    if (result.paymentUrl) {
      window.location.href = result.paymentUrl;
    } else {
      router.replace(getReviewRoute(result.orderId));
    }
  } catch (error: any) {
    // handled by mutation callbacks
    console.error('Checkout error', error);
    if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
      router.push('/login');
    }
  }
}

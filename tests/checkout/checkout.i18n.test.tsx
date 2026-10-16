import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { ShippingAddressSection } from '@/app/(storefront)/checkout/_components/AddressSelection';
import {
  CheckoutHeader,
  CheckoutProceedActions,
  OrderNotesSection,
  PaymentMethodSection,
  ShippingOptionsSection,
} from '@/app/(storefront)/checkout/_components/CheckoutSections';
import { MobileTotalBar } from '@/app/(storefront)/checkout/_components/MobileTotalBar';
import { OrderSummary } from '@/app/(storefront)/checkout/_components/OrderSummary';
import { PaymentMethodSelector } from '@/app/(storefront)/checkout/_components/PaymentMethodSelector';
import { ShippingOptions } from '@/app/(storefront)/checkout/_components/ShippingOptions';
import {
  getPayNowRuleMessageKey,
  getProceedRule,
  getProceedRuleMessageKey,
} from '@/app/(storefront)/checkout/_lib/checkout';
import CheckoutFailedPage from '@/app/(storefront)/checkout/failed/page';
import { PaymentInstructionsPanel } from '@/app/(storefront)/checkout/review/_components/PaymentInstructionsPanel';
import {
  PaymentMethodPanel,
  PaymentStatusErrorAlert,
  ReviewAddressSection,
  ReviewHeader,
} from '@/app/(storefront)/checkout/review/_components/ReviewSections';
import CheckoutSuccessPage from '@/app/(storefront)/checkout/success/page';
import { CheckoutStepper } from '@/components/checkout-stepper';
import type { Address } from '@/entities/address/types';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { saveOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { getPayNowRule } from '@/shared/lib/disabledRules';

const nav = vi.hoisted(() => ({ query: '' }));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(nav.query),
  };
});

const address: Address = {
  id: 'addr-1',
  receiverName: 'Jane Doe',
  phone: '08123456789',
  addressLine1: 'Jl. Senopati No. 12',
  city: 'Jakarta Selatan',
  province: 'DKI Jakarta',
  postalCode: '12120',
  country: 'ID',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const draft: OrderDraft = {
  cartId: 'cart-1',
  address: {
    receiverName: 'Jane Doe',
    phone: '08123456789',
    addressLine1: 'Jl. Senopati No. 12',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12120',
    country: 'Indonesia',
  },
  shippingOption: { id: 'jne-reg', courier: 'JNE', service: 'REG', cost: 15000 },
  paymentMethod: 'credit_card',
  totals: { subtotal: 200000, discount: 0, tax: 22000, shipping: 15000, total: 237000 },
} as OrderDraft;

beforeEach(() => {
  nav.query = '';
  window.sessionStorage.clear();
});

describe('checkout step in English', () => {
  it('renders the header, stepper and section headings', () => {
    renderWithIntl(
      <>
        <CheckoutHeader />
        <ShippingOptionsSection
          isPending={false}
          lastQuoteLabel="10.30"
          isUsingCachedQuote
          refreshDisabled={false}
          onRefresh={() => {}}
        >
          <span />
        </ShippingOptionsSection>
        <PaymentMethodSection>
          <span />
        </PaymentMethodSection>
        <OrderNotesSection value="Ring twice" onChange={() => {}} disabled={false} />
      </>,
      { locale: 'en' },
    );

    expect(screen.getByRole('navigation', { name: 'Checkout progress' })).toBeInTheDocument();
    expect(screen.getByText('Address & Shipping')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shipping Options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh shipping cost' })).toBeInTheDocument();
    expect(screen.getByText('Last shipping quote 10.30')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payment Method' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order Notes (Optional)' })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Write your notes here... (max 500 characters)'),
    ).toBeInTheDocument();
    expect(screen.getByText('10/500')).toBeInTheDocument();
  });

  it('renders the address selection, shipping options and payment methods', () => {
    renderWithIntl(
      <>
        <ShippingAddressSection
          addresses={[address]}
          selectedAddress={address}
          selectedAddressId={address.id}
          isAddressLoading={false}
          isQuotePending={false}
          announcement=""
          onManage={() => {}}
          onSelect={() => {}}
        />
        <ShippingOptions
          options={[
            {
              id: 'jne-reg',
              courier: 'JNE',
              service: 'REG',
              etd: 'next week',
              cost: 15000,
            },
          ]}
          selectedId="jne-reg"
          onChange={() => {}}
        />
        <PaymentMethodSelector selectedMethod="credit_card" onSelect={() => {}} />
      </>,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Shipping address' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage addresses' })).toBeInTheDocument();
    expect(screen.getByText('Primary address')).toBeInTheDocument();
    expect(screen.getByText('In use')).toBeInTheDocument();
    expect(screen.getByText('Estimated arrival next week')).toBeInTheDocument();
    const card = screen.getByRole('radio', { name: /Credit Card/ });
    expect(within(card).getByText('Pay with a credit card')).toBeInTheDocument();
    expect(within(card).getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
  });

  it('renders the proceed actions with a translated disabled hint', () => {
    const rule = getProceedRule({
      hasAddress: true,
      hasShippingOption: true,
      hasPaymentMethod: false,
      isProcessing: false,
    });
    expect(getProceedRuleMessageKey(rule.reasonCode)).toBe('missingPaymentMethod');

    renderWithIntl(
      <CheckoutProceedActions
        hasOutOfStockItem={false}
        proceedLabel="Pay Now"
        isProcessing={false}
        disabled
        hintId="hint"
        hintMessage="Choose a payment method first"
        onCheckout={() => {}}
        onPrefetch={() => {}}
      />,
      { locale: 'en' },
    );
    expect(screen.getByRole('button', { name: 'Pay Now' })).toHaveTextContent('Pay Now');
  });

  it('shows the out-of-stock notice', () => {
    renderWithIntl(
      <CheckoutProceedActions
        hasOutOfStockItem
        proceedLabel="Pay Now"
        isProcessing={false}
        disabled={false}
        onCheckout={() => {}}
        onPrefetch={() => {}}
      />,
      { locale: 'en' },
    );
    expect(
      screen.getByText('Some products in your cart are unavailable or out of stock.'),
    ).toBeInTheDocument();
  });

  it('renders the order summary and mobile total bar', () => {
    renderWithIntl(
      <>
        <OrderSummary
          totals={{ subtotal: 200000, discount: 0, tax: 25000, shipping: 0, total: 225000 }}
        />
        <MobileTotalBar total={225000} onShowDetails={() => {}} />
      </>,
      { locale: 'en' },
    );
    expect(screen.getByRole('heading', { name: 'Order Summary' })).toBeInTheDocument();
    expect(screen.getByText('Tax (12.5%)')).toBeInTheDocument();
    expect(screen.getByText('Payment total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View details' })).toBeInTheDocument();
  });
});

describe('checkout step in Indonesian (default)', () => {
  it('keeps the recorded Indonesian text', () => {
    render(
      <>
        <CheckoutStepper current="address" />
        <OrderSummary
          totals={{ subtotal: 200000, discount: 0, tax: 0, shipping: 0, total: 200000 }}
        />
        <PaymentMethodSelector selectedMethod="bank_transfer" onSelect={() => {}} />
      </>,
    );
    expect(screen.getByText('Langkah 1 dari 3:')).toBeInTheDocument();
    expect(screen.getByText('Pajak')).toBeInTheDocument();
    expect(screen.getByText('Transfer Bank')).toBeInTheDocument();
    expect(screen.getByText('Transfer manual ke rekening bank')).toBeInTheDocument();
  });
});

describe('review step in English', () => {
  it('renders the header, address and payment panel', () => {
    renderWithIntl(
      <>
        <ReviewHeader orderId="order-9" />
        <ReviewAddressSection lines={['Jane Doe • 0812']} />
        <PaymentMethodPanel
          isPending={false}
          payDisabled={false}
          onPayNow={() => {}}
          onPrefetch={() => {}}
          paymentIntent={
            {
              orderId: 'order-9',
              token: 'tok-1',
              redirectUrl: 'https://pay.example/1',
            } as never
          }
          onOpenGateway={() => {}}
          onStartWatcher={() => {}}
          watcherActive={false}
          countdownLabel="00:10:00"
          paymentExpired={false}
          pendingTooLong
          supportLink="mailto:support@toko.com"
          paymentError={null}
        />
        <PaymentStatusErrorAlert
          message="failed"
          orderId="order-9"
          failedStatus="FAILED"
          onRetry={() => {}}
        />
      </>,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Review Order' })).toBeInTheDocument();
    expect(screen.getByText('Order ID: order-9')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shipping Address' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay Now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue to Payment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Payment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I Have Paid' })).toBeInTheDocument();
    expect(screen.getByText(/Time left to pay:/)).toHaveTextContent('Time left to pay: 00:10:00');
    expect(screen.getByText('00:10:00')).toHaveClass('font-semibold');
    expect(screen.getByRole('link', { name: 'Contact support' })).toBeInTheDocument();
    expect(screen.getByText(/Payment token:/)).toHaveTextContent('Payment token: tok-1');
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Details' })).toBeInTheDocument();
  });

  it('renders the payment instructions panel', () => {
    renderWithIntl(
      <PaymentInstructionsPanel
        orderId="order-9"
        instructions={
          {
            provider: '',
            channel: '',
            steps: ['Step one'],
            bank: { name: '', accountName: '', accountNumber: '123' },
          } as never
        }
      />,
      { locale: 'en' },
    );
    expect(screen.getByRole('heading', { name: 'Payment instructions' })).toBeInTheDocument();
    expect(screen.getByText('Payment provider')).toBeInTheDocument();
    expect(screen.getByText('Bank transfer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByLabelText('Proof of payment (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload proof' })).toBeInTheDocument();
  });

  it('maps pay-now rules to catalog keys', () => {
    const rule = getPayNowRule({ hasOrderDraft: false, hasOrderId: true });
    expect(getPayNowRuleMessageKey(rule.reasonCode)).toBe('missingOrderDraft');
    expect(getPayNowRuleMessageKey('unknown')).toBe('fallback');
  });
});

describe('success and failed pages in English', () => {
  it('renders the success page with the order draft', async () => {
    nav.query = 'orderId=order-9';
    saveOrderDraft('order-9', draft);
    renderWithIntl(<CheckoutSuccessPage />, { locale: 'en' });

    expect(await screen.findByRole('heading', { name: 'Payment Successful!' })).toBeInTheDocument();
    expect(screen.getByText(/Thank you!/)).toHaveTextContent(
      'Thank you! Your order number order-9 has been created.',
    );
    expect(await screen.findByRole('heading', { name: 'Shipping Details' })).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View order details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shop Again' })).toBeInTheDocument();
  });

  it('renders the success empty state without an order id', () => {
    renderWithIntl(<CheckoutSuccessPage />, { locale: 'en' });
    expect(screen.getByText('Payment successful')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue shopping' })).toBeInTheDocument();
  });

  it('renders the failed page with a status and the support link', async () => {
    nav.query = 'orderId=order-9&status=EXPIRED&reason=Timeout';
    saveOrderDraft('order-9', draft);
    renderWithIntl(<CheckoutFailedPage />, { locale: 'en' });

    expect(
      await screen.findByRole('heading', { name: 'Payment Not Successful' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/The latest status/)).toHaveTextContent(
      'The latest status for order order-9 is EXPIRED.',
    );
    expect(screen.getByText('Failure Reason:')).toBeInTheDocument();
    expect(screen.getByText('• Try paying again using the button below')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Paying Again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support@toko.com' })).toHaveAttribute(
      'href',
      'mailto:support@toko.com',
    );
    expect(screen.getByText(/Need help\?/)).toHaveTextContent(
      'Need help? Contact our customer service at support@toko.com',
    );
  });

  it('keeps the Indonesian failed-page sentence without a status', () => {
    nav.query = 'orderId=order-9';
    render(<CheckoutFailedPage />);
    expect(screen.getByText(/Status terbaru/)).toHaveTextContent(
      'Status terbaru untuk pesanan order-9 belum kami terima.',
    );
  });
});

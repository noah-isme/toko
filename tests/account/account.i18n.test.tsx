import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TEST_MESSAGES } from '../utils/next-intl-mock';
import { renderWithIntl } from '../utils/renderWithIntl';

import PrivacyPage from '@/app/(storefront)/account/privacy/page';
import SearchHistoryPage from '@/app/(storefront)/account/searches/page';
import ComparePage from '@/app/(storefront)/compare/page';
import TermsPage from '@/app/(storefront)/terms/page';
import { CancelOrderModal } from '@/components/cancel-order-modal';
import { LandingHero } from '@/components/landing/landing-hero';
import { TierProgressCard } from '@/entities/loyalty/ui/TierProgressCard';
import { ApiClientError } from '@/lib/api/apiClient';
import { getErrorMessage } from '@/lib/api/utils';
import { humanizeStatus, orderStatusLabel, shipmentStatusLabel } from '@/shared/i18n/status';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { useCompareStore } from '@/stores/compare-store';
import { useSearchStore } from '@/stores/search-store';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/account',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
  };
});

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User', emailVerified: true },
  }),
}));

function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const PROFILE = {
  points: 500,
  tier: 'bronze' as const,
  tierProgress: 50,
  nextTierName: 'silver' as const,
  nextTierThreshold: 1000,
  lifetimePoints: 1200,
};

describe('account and storefront pages in English', () => {
  it('renders the privacy settings page in English', async () => {
    renderWithIntl(<PrivacyPage />, { locale: 'en', wrapper: Providers });

    expect(await screen.findByRole('heading', { name: 'Privacy Settings' })).toBeInTheDocument();
    expect(screen.getByText('Communication Preferences')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Marketing emails' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.queryByText('Pengaturan Privasi')).not.toBeInTheDocument();
  });

  it('renders the search history empty state and breadcrumbs in English', () => {
    useSearchStore.setState({ term: '', recentSearches: [] });
    renderWithIntl(<SearchHistoryPage />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Search History' })).toBeInTheDocument();
    expect(screen.getByText('No search history yet')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Home');
  });

  it('renders the compare empty state in English', () => {
    useCompareStore.setState({ productIds: [] });
    renderWithIntl(<ComparePage />, { locale: 'en', wrapper: Providers });

    expect(screen.getByText('No products to compare yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute(
      'href',
      '/products',
    );
  });

  it('renders the terms page with its rich-text link in English', () => {
    renderWithIntl(<TermsPage />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Terms and Conditions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Order Returns' })).toHaveAttribute('href', '/returns');
  });

  it('renders the cancel-order dialog reasons in English', () => {
    renderWithIntl(<CancelOrderModal open onOpenChange={vi.fn()} onConfirm={vi.fn()} />, {
      locale: 'en',
    });

    expect(screen.getByRole('heading', { name: 'Cancel order' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Changed my mind' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('renders the landing hero headline in English', () => {
    renderWithIntl(<LandingHero />, { locale: 'en' });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Choices for a more beautiful life.',
    );
    expect(screen.getByRole('link', { name: 'Create a Free Account' })).toBeInTheDocument();
  });

  it('renders loyalty tier progress and catalog-keyed benefits in English', () => {
    renderWithIntl(<TierProgressCard profile={PROFILE} />, { locale: 'en' });

    expect(screen.getByText('Your Tier')).toBeInTheDocument();
    expect(screen.getByText('1 point per Rp1,000 spent')).toBeInTheDocument();
    expect(screen.getByText(/Need 500 more points for Silver/)).toBeInTheDocument();
  });

  it('renders the error boundary fallback in English', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Boom(): never {
      throw new Error('kaboom');
    }
    renderWithIntl(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('id rendering stays identical', () => {
  it('renders the loyalty card and privacy texts in Indonesian without a provider', async () => {
    render(<TierProgressCard profile={PROFILE} />);
    expect(screen.getByText('Tier Anda')).toBeInTheDocument();
    expect(screen.getByText('1 poin per Rp1.000 belanja')).toBeInTheDocument();
    expect(screen.getByText(/Butuh 500 poin lagi untuk Silver/)).toBeInTheDocument();
  });

  it('keeps the legacy Indonesian landing headline', () => {
    render(<LandingHero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Pilihan untuk hidup yang lebih indah.',
    );
  });
});

describe('status and error helpers', () => {
  const tId = createTranslator({ locale: 'id', messages: TEST_MESSAGES.id, namespace: 'account' });
  const tEn = createTranslator({ locale: 'en', messages: TEST_MESSAGES.en, namespace: 'account' });

  it('labels known order and shipment statuses per locale', () => {
    expect(orderStatusLabel(tId, 'pending_payment')).toBe('Menunggu Pembayaran');
    expect(orderStatusLabel(tEn, 'PENDING_PAYMENT')).toBe('Awaiting Payment');
    expect(shipmentStatusLabel(tId, 'in_transit')).toBe('Dalam Perjalanan');
    expect(shipmentStatusLabel(tEn, 'in_transit')).toBe('In Transit');
  });

  it('returns undefined for unknown statuses so callers keep their fallback', () => {
    expect(orderStatusLabel(tEn, 'refunded')).toBeUndefined();
    expect(orderStatusLabel(tEn, 'all')).toBeUndefined();
    expect(humanizeStatus('partially_refunded')).toBe('Partially Refunded');
  });

  it('localizes API error codes when given the errors translator', () => {
    const tErrorsEn = createTranslator({
      locale: 'en',
      messages: TEST_MESSAGES.en,
      namespace: 'errors',
    });
    const error = new ApiClientError('raw', 'OUT_OF_STOCK', 409);

    expect(getErrorMessage(error)).toBe('Maaf, produk tidak tersedia atau stok tidak mencukupi.');
    expect(getErrorMessage(error, tErrorsEn)).toBe(
      'Sorry, the product is unavailable or out of stock.',
    );
    expect(getErrorMessage(null, tErrorsEn)).toBe('An unknown error occurred');
    expect(getErrorMessage(new ApiClientError('raw', 'TEAPOT', 418), tErrorsEn)).toBe('raw');
  });
});

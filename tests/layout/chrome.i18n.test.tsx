import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Navbar } from '@/components/layout/navbar';
import { NotFoundView } from '@/shared/ui/NotFoundView';
import { RouteErrorFallback } from '@/shared/ui/RouteErrorFallback';
import { SkipToContent } from '@/shared/ui/SkipToContent';

const auth = vi.hoisted(() => ({
  current: { isAuthenticated: false, user: null as { name: string } | null, logout: () => {} },
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth.current }));
vi.mock('@/components/lazy-components', () => ({
  LazyWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyCartDrawer: () => null,
  LazySearchAutocomplete: () => null,
  LazyNotificationBell: () => null,
}));
vi.mock('@/components/layout/language-switcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/components/ThemeProvider', () => ({ ThemeSelector: () => null }));
vi.mock('@/stores/cart-store', () => ({
  useCartStore: (selector: (state: { cartId: string | null }) => unknown) =>
    selector({ cartId: null }),
}));
vi.mock('@/entities/cart/hooks', () => ({ useCartQuery: () => ({ data: undefined }) }));
vi.mock('@/shared/telemetry/sentry', () => ({ captureSentryException: vi.fn() }));
vi.mock('@/lib/api/services', () => ({ newsletterApi: { subscribe: vi.fn() } }));

describe('storefront chrome in English', () => {
  beforeEach(() => {
    auth.current = { isAuthenticated: false, user: null, logout: () => {} };
  });

  it('navbar renders its links and sign-in from the en catalog', () => {
    renderWithIntl(<Navbar />, { locale: 'en' });

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Featured' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('mobile bottom nav translates the Indonesian labels', () => {
    auth.current = { isAuthenticated: true, user: { name: 'Ana' }, logout: () => {} };
    renderWithIntl(<MobileBottomNav />, { locale: 'en' });

    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('href', '/favorites');
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
    expect(screen.queryByText('Produk')).not.toBeInTheDocument();
  });

  it('footer renders headings, links and the copyright year from the en catalog', () => {
    renderWithIntl(<Footer />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Quick Links' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Subscribe to our newsletter' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shipping Policy' })).toHaveAttribute(
      'href',
      '/shipping',
    );
    expect(
      screen.getByText(`© ${new Date().getFullYear()} toko. All rights reserved.`),
    ).toBeInTheDocument();
  });

  it('not-found view and route error fallback render English', () => {
    renderWithIntl(
      <>
        <NotFoundView />
        <RouteErrorFallback error={new Error('x')} retry={() => {}} variant="storefront" />
      </>,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('skip link renders English, and Indonesian without a provider', () => {
    const { unmount } = renderWithIntl(<SkipToContent />, { locale: 'en' });
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument();
    unmount();

    render(<SkipToContent />);
    expect(screen.getByRole('link', { name: 'Lewati ke konten utama' })).toBeInTheDocument();
  });
});

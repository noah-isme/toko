import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

let currentPathname = '/';

vi.mock('next/navigation', () => {
  return {
    usePathname: () => currentPathname,
  };
});

vi.mock('@/stores/cart-store', () => {
  return {
    useCartStore: (selector: any) => selector({ cartId: 'mock-cart-id' }),
  };
});

vi.mock('@/lib/api/hooks', () => {
  return {
    useCartQuery: () => ({
      data: { itemCount: 5 },
    }),
  };
});

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('MobileBottomNav Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    currentPathname = '/';
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MobileBottomNav />
      </QueryClientProvider>
    );
  };

  it('renders all main navigation items', () => {
    renderComponent();

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Produk')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
    expect(screen.getByText('Favorit')).toBeInTheDocument();
    expect(screen.getByText('Akun')).toBeInTheDocument();
  });

  it('sets aria-current="page" on the active item', () => {
    currentPathname = '/products';
    renderComponent();

    const produkLink = screen.getByRole('link', { name: /produk/i });
    expect(produkLink).toHaveAttribute('aria-current', 'page');

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('renders cart badge when item count > 0', () => {
    renderComponent();

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('returns null on hidden pages like login or checkout', () => {
    currentPathname = '/login';
    const { container } = renderComponent();

    expect(container.firstChild).toBeNull();
  });
});

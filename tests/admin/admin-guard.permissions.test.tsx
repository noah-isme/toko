import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { useAdminErrorMessage } from '@/components/admin/admin-access-ui';
import { AdminGuard, AdminRouteGate } from '@/components/admin/admin-guard';
import { AdminNav } from '@/components/admin/admin-nav';
import { AdminPermissionSync } from '@/components/admin/admin-permission-sync';
import { AdminError } from '@/components/admin/admin-ui';
import { ApiClientError } from '@/lib/api/apiClient';
import type { User } from '@/lib/api/types';

const nav = vi.hoisted(() => ({ pathname: '/admin', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
}));

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth.current }));

function staffUser(role: string, permissions: string[], roles = ['customer']): User {
  return {
    id: 'user-1',
    name: 'Jane',
    email: 'jane@shop.id',
    createdAt: '2026-01-01',
    roles,
    role,
    permissions,
  };
}

const CATALOG = staffUser('catalog', [
  'catalog:read',
  'catalog:write',
  'inventory:read',
  'inventory:write',
  'promotions:read',
]);

function signIn(user: User | null, extra: Record<string, unknown> = {}) {
  auth.current = {
    isLoading: false,
    isAuthenticated: Boolean(user),
    user,
    refreshUser: vi.fn(),
    ...extra,
  };
}

const forbidden = (required?: string, code = 'FORBIDDEN') =>
  new ApiClientError('insufficient permissions', code, 403, required ? { required } : undefined);

beforeEach(() => {
  nav.pathname = '/admin';
  nav.replace.mockReset();
  signIn(CATALOG);
});

describe('AdminNav', () => {
  it('shows only the sections the role can open', () => {
    renderWithIntl(<AdminNav />, { locale: 'en' });
    const links = within(screen.getByRole('navigation', { name: 'Admin sections' }))
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toEqual([
      'Products',
      'Inventory',
      'Categories',
      'Brands',
      'Vouchers',
      'Flash Sales',
    ]);
  });

  it('shows Staff and platform sections only to those who hold them', () => {
    signIn(staffUser('owner', ['staff:read', 'analytics:read']));
    const { unmount } = renderWithIntl(<AdminNav />, { locale: 'en' });
    expect(screen.getByRole('link', { name: 'Staff' })).toHaveAttribute('href', '/admin/staff');
    expect(screen.queryByRole('link', { name: 'Audit Logs' })).not.toBeInTheDocument();
    unmount();

    signIn(staffUser('admin', ['analytics:read'], ['admin']));
    renderWithIntl(<AdminNav />, { locale: 'en' });
    expect(screen.getByRole('link', { name: 'Audit Logs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Webhooks' })).toBeInTheDocument();
  });
});

describe('AdminGuard', () => {
  it('blocks members without a staff role', () => {
    signIn(staffUser('customer', []));
    renderWithIntl(<AdminGuard>secret</AdminGuard>, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Admin access required' })).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('lets any staff role in and sends signed-out users to login', () => {
    renderWithIntl(<AdminGuard>secret</AdminGuard>, { locale: 'en' });
    expect(screen.getByText('secret')).toBeInTheDocument();

    signIn(null);
    renderWithIntl(<AdminGuard>other</AdminGuard>, { locale: 'en' });
    expect(nav.replace).toHaveBeenCalledWith('/login?redirect=/admin');
  });
});

describe('AdminRouteGate', () => {
  it('renders a page the role may open', () => {
    nav.pathname = '/admin/products/new';
    renderWithIntl(<AdminRouteGate>page</AdminRouteGate>, { locale: 'en' });
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('shows a friendly 403 naming the missing permission, with a way out', () => {
    nav.pathname = '/admin/orders';
    renderWithIntl(<AdminRouteGate>page</AdminRouteGate>, { locale: 'en' });
    expect(screen.queryByText('page')).not.toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(
      within(alert).getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent('View orders');
    expect(within(alert).getByRole('link', { name: 'Go to Products' })).toHaveAttribute(
      'href',
      '/admin/products',
    );
  });

  it('explains platform-only areas', () => {
    signIn(staffUser('owner', ['analytics:read', 'staff:read']));
    nav.pathname = '/admin/webhooks';
    renderWithIntl(<AdminRouteGate>page</AdminRouteGate>, { locale: 'en' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This area is only available to platform administrators.',
    );
  });

  it('sends a role without dashboard access to its first section', () => {
    renderWithIntl(<AdminRouteGate>dashboard</AdminRouteGate>, { locale: 'en' });
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith('/admin/products');
  });
});

describe('403 responses from admin APIs', () => {
  it('renders the no-access state instead of a retry for a 403', () => {
    const retry = vi.fn();
    renderWithIntl(<AdminError error={forbidden('settings:read')} onRetry={retry} />, {
      locale: 'en',
    });
    expect(screen.getByTestId('admin-forbidden')).toHaveTextContent('View settings');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('keeps the retry state for other errors', () => {
    renderWithIntl(<AdminError error={new Error('boom')} onRetry={vi.fn()} />, { locale: 'en' });
    expect(screen.getByTestId('admin-error')).toHaveTextContent('boom');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('localizes 403s in toast messages', () => {
    function Probe({ error }: { error: unknown }) {
      const message = useAdminErrorMessage();
      return <p>{message(error, 'fallback')}</p>;
    }
    const cases: Array<[unknown, string]> = [
      [
        forbidden('orders:write'),
        "You don't have permission to do this (Update orders and shipments).",
      ],
      [forbidden('platform-admin'), 'Only platform administrators can do this.'],
      [
        forbidden(undefined, 'TENANT_FORBIDDEN'),
        'You are no longer an active member of this store.',
      ],
      [forbidden('staff'), "You don't have permission to do this."],
      [new Error('server said no'), 'server said no'],
      ['weird', 'fallback'],
    ];
    for (const [error, text] of cases) {
      const { unmount } = renderWithIntl(<Probe error={error} />, { locale: 'en' });
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });
});

describe('AdminPermissionSync', () => {
  function setup() {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    signIn(CATALOG, { refreshUser });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <AdminPermissionSync />
        {children}
      </QueryClientProvider>
    );
    const { result } = renderHook(
      () => useMutation({ mutationFn: (error: unknown) => Promise.reject(error) }),
      { wrapper },
    );
    const fail = (error: unknown) => act(() => result.current.mutate(error));
    return { refreshUser, fail };
  }

  it('re-reads /auth/me once when an admin request is refused', async () => {
    const { refreshUser, fail } = setup();
    fail(new Error('boom'));
    fail(forbidden('orders:write'));
    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(1));
    fail(forbidden('orders:write'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });
});

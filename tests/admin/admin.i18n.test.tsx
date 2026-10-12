import { renderHook, screen, render, within } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_MESSAGES } from '../utils/next-intl-mock';
import { renderWithIntl } from '../utils/renderWithIntl';

import OrdersPage from '@/app/(admin)/admin/orders/page';
import AdminDashboard from '@/app/(admin)/admin/page';
import ProductsPage from '@/app/(admin)/admin/products/page';
import AdminNotFound from '@/app/(admin)/not-found';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminNav } from '@/components/admin/admin-nav';
import { orderStatusLabel, voucherValueLabel } from '@/entities/admin/format';
import type { AdminOrder, AdminProduct, AdminVoucher } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import type { Locale } from '@/i18n/config';
import { FORMATS, TIME_ZONE } from '@/i18n/formats';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const auth = vi.hoisted(() => ({
  current: { isLoading: false, isAuthenticated: true, isAdmin: true } as Record<string, unknown>,
}));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth.current }));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const ORDER: AdminOrder = {
  id: 'order-1',
  orderNumber: 'ORD-1001',
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  status: 'PAID',
  paymentStatus: 'PAID',
  currency: 'IDR',
  total: 1500000,
  subtotal: 1500000,
  discount: 0,
  tax: 0,
  shipping: 0,
  itemsCount: 1,
  createdAt: '2026-10-12T10:00:00Z',
  updatedAt: '2026-10-12T10:00:00Z',
};

const PRODUCT: AdminProduct = {
  id: 'product-1',
  title: 'Kemeja Linen',
  slug: 'kemeja-linen',
  price: 250000,
  inStock: true,
  stock: 5,
  badges: [],
  variantCount: 1,
  sku: 'KL-001',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const idle = { isPending: false, mutateAsync: vi.fn() };
const loaded = <T,>(data: T) => ({ isLoading: false, isError: false, data, refetch: vi.fn() });

vi.mock('@/entities/admin/hooks', () => ({
  useAdminAnalyticsOverview: () =>
    loaded({
      range: '30d',
      totalRevenue: 1500000,
      totalOrders: 1,
      totalCustomers: 1,
      totalProducts: 1,
      averageOrderValue: 1500000,
      pendingOrders: 0,
      paidOrders: 1,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      topProducts: [
        { productId: 'p1', title: 'Kemeja Linen', slug: 'kemeja', unitsSold: 3, revenue: 750000 },
      ],
    }),
  useAdminOrders: () =>
    loaded({ data: [ORDER], pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 } }),
  useAdminOrderStats: () => loaded(undefined),
  useAdminOrder: () => loaded(undefined),
  useCreateAdminShipment: () => idle,
  useUpdateAdminOrderStatus: () => idle,
  useAdminProducts: () =>
    loaded({ data: [PRODUCT], pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 } }),
  useDeleteAdminProduct: () => idle,
  useUpdateAdminProductStock: () => idle,
}));

/** `Intl` separates the currency code from the amount with a no-break space. */
const money = (text: string) => new RegExp(text.replace(/\s/g, '\\s').replace(/\./g, '\\.'));

describe('admin UI in English', () => {
  beforeEach(() => {
    auth.current = { isLoading: false, isAuthenticated: true, isAdmin: true };
  });

  it('renders the dashboard with English copy and IDR formatting', () => {
    renderWithIntl(<AdminDashboard />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Recent Orders')).toBeInTheDocument();
    expect(screen.getByText('3 sold')).toBeInTheDocument();
    expect(screen.getAllByText(money('IDR 1,500,000')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('order-status-badge')).toHaveTextContent('Paid');
    expect(screen.queryByText('Dasbor')).not.toBeInTheDocument();
  });

  it('renders the products table with English labels', () => {
    renderWithIntl(<ProductsPage />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByTestId('admin-product-new')).toHaveTextContent('Add Product');
    expect(screen.getByRole('columnheader', { name: 'Stock' })).toBeInTheDocument();
    const row = screen.getByTestId('admin-product-row');
    expect(within(row).getByText('5 units')).toBeInTheDocument();
    expect(within(row).getByText(money('IDR 250,000'))).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Delete Kemeja Linen' })).toBeInTheDocument();
  });

  it('renders the orders page with English status and payment labels', () => {
    renderWithIntl(<OrdersPage />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search orders' })).toBeInTheDocument();
    const row = screen.getByTestId('admin-order-row');
    expect(within(row).getByTestId('order-status-badge')).toHaveTextContent('Paid');
    expect(within(row).getByText('10/12/2026, 05:00 PM')).toBeInTheDocument();
    expect(
      within(row).getByRole('combobox', { name: 'Change status for order ORD-1001' }),
    ).toBeInTheDocument();
  });

  it('renders the sidebar navigation and the access-denied guard in English', () => {
    renderWithIntl(<AdminNav />, { locale: 'en' });
    const nav = screen.getByRole('navigation', { name: 'Admin sections' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Audit Logs' })).toBeInTheDocument();

    auth.current = { isLoading: false, isAuthenticated: true, isAdmin: false };
    renderWithIntl(<AdminGuard>secret</AdminGuard>, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Admin access required' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to store' })).toBeInTheDocument();
  });

  it('links the admin not-found page back to the dashboard in English', () => {
    renderWithIntl(<AdminNotFound />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the admin dashboard' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });
});

describe('admin UI in Indonesian (default)', () => {
  it('renders the dashboard in Indonesian with rupiah formatting', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('heading', { name: 'Dasbor' })).toBeInTheDocument();
    expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
    expect(screen.getByText('3 terjual')).toBeInTheDocument();
    expect(screen.getAllByText(money('Rp 1.500.000')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('order-status-badge')).toHaveTextContent('Dibayar');
  });

  it('renders the products and orders pages in Indonesian', () => {
    const { unmount } = render(<ProductsPage />);
    expect(screen.getByRole('heading', { name: 'Produk' })).toBeInTheDocument();
    expect(screen.getByTestId('admin-product-new')).toHaveTextContent('Tambah Produk');
    expect(screen.getByText('5 unit')).toBeInTheDocument();
    unmount();

    render(<OrdersPage />);
    expect(screen.getByRole('heading', { name: 'Pesanan' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Pembayaran' })).toBeInTheDocument();
    expect(screen.getByText('12/10/2026, 17.00')).toBeInTheDocument();
  });

  it('renders the sidebar navigation in Indonesian', () => {
    render(<AdminNav />);
    const nav = screen.getByRole('navigation', { name: 'Bagian admin' });
    expect(within(nav).getByRole('link', { name: 'Dasbor' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Log Audit' })).toBeInTheDocument();
  });
});

describe('admin formatting helpers', () => {
  const translator = (locale: Locale) =>
    createTranslator({ locale, messages: TEST_MESSAGES[locale], namespace: 'admin' });

  function formatHook(locale: Locale) {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NextIntlClientProvider
        locale={locale}
        messages={TEST_MESSAGES[locale]}
        timeZone={TIME_ZONE}
        formats={FORMATS}
      >
        {children}
      </NextIntlClientProvider>
    );
    return renderHook(() => useAdminFormat(), { wrapper }).result.current;
  }

  const percentVoucher = { kind: 'percent', percentBps: 1250, value: 0 } as AdminVoucher;
  const fixedVoucher = { kind: 'fixed_amount', percentBps: null, value: 50000 } as AdminVoucher;

  it('labels order statuses from admin.status and passes unknown values through', () => {
    expect(orderStatusLabel(translator('id'), 'OUT_FOR_DELIVERY')).toBe('Dalam Pengiriman');
    expect(orderStatusLabel(translator('en'), 'OUT_FOR_DELIVERY')).toBe('Out for Delivery');
    expect(orderStatusLabel(translator('en'), 'ON_HOLD' as never)).toBe('ON_HOLD');
  });

  it('formats voucher values and dates per locale', () => {
    const id = formatHook('id');
    const en = formatHook('en');

    expect(voucherValueLabel(translator('id'), id.format, percentVoucher)).toBe('12,5%');
    expect(voucherValueLabel(translator('en'), en.format, percentVoucher)).toBe('12.5%');
    expect(voucherValueLabel(translator('id'), id.format, fixedVoucher)).toMatch(
      money('Rp 50.000'),
    );
    expect(voucherValueLabel(translator('en'), en.format, fixedVoucher)).toMatch(
      money('IDR 50,000'),
    );

    expect(id.date('2026-10-12T10:00:00Z')).toBe('12/10/2026, 17.00');
    expect(en.day('2026-10-12T10:00:00Z')).toBe('10/12/2026');
  });

  it('formats relative times with a "just now" floor and a date fallback', () => {
    const now = new Date('2026-10-12T10:00:00Z');
    const id = formatHook('id');
    const en = formatHook('en');

    expect(id.relative('2026-10-12T09:59:30Z', now)).toBe('Baru saja');
    expect(en.relative('2026-10-12T09:59:30Z', now)).toBe('Just now');
    expect(id.relative('2026-10-12T07:00:00Z', now)).toBe('3 jam yang lalu');
    expect(en.relative('2026-10-12T07:00:00Z', now)).toBe('3 hours ago');
    expect(en.relative('2026-09-01T10:00:00Z', now)).toBe('09/01/2026, 05:00 PM');
  });
});

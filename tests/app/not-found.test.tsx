import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
const adminProductQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const flashSaleQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  useParams: () => ({ id: 'missing-id' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api/hooks.admin', () => ({
  useAdminProduct: () => adminProductQuery.current,
  useUpdateAdminProduct: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useAdminProducts: () => ({ isLoading: false, isError: false, data: { data: [] } }),
  useAdminFlashSale: () => flashSaleQuery.current,
  useCreateAdminFlashSale: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateAdminFlashSaleStatus: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import FlashSaleEditPage from '@/app/(admin)/admin/flash-sales/[id]/edit/page';
import EditProductPage from '@/app/(admin)/admin/products/[id]/edit/page';
import AdminNotFound from '@/app/(admin)/not-found';
import StorefrontNotFound from '@/app/(storefront)/not-found';
import RootNotFound from '@/app/not-found';
import { ApiClientError } from '@/lib/api/apiClient';

const notFoundError = () => new ApiClientError('Not Found', 'NOT_FOUND', 404);

describe('not-found files', () => {
  beforeEach(() => {
    notFoundMock.mockClear();
    adminProductQuery.current = { isLoading: false, isError: true, error: notFoundError() };
    flashSaleQuery.current = { isLoading: false, isError: true, error: notFoundError() };
  });

  it('root not-found shows the heading and a link home', () => {
    render(<RootNotFound />);
    expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/');
  });

  it('storefront not-found links to the catalogue', () => {
    render(<StorefrontNotFound />);
    expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat semua produk' })).toHaveAttribute(
      'href',
      '/products',
    );
  });

  it('admin not-found links back to /admin', () => {
    render(<AdminNotFound />);
    expect(screen.getByRole('link', { name: /dasbor admin/ })).toHaveAttribute('href', '/admin');
  });

  it('admin product edit calls notFound() when the API returns 404', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<EditProductPage />)).toThrow('NEXT_NOT_FOUND');
    spy.mockRestore();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('admin flash-sale edit calls notFound() when the API returns 404', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<FlashSaleEditPage />)).toThrow('NEXT_NOT_FOUND');
    spy.mockRestore();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('admin product edit does not call notFound() for other errors', () => {
    adminProductQuery.current = {
      isLoading: false,
      isError: true,
      error: new ApiClientError('Boom', 'SERVER', 500),
      refetch: vi.fn(),
    };
    render(<EditProductPage />);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

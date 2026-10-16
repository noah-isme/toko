import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiClient, push, toast } = vi.hoisted(() => ({
  apiClient: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/api/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/apiClient')>()),
  apiClient,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'fs-1' }),
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  notFound: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

import FlashSaleEditPage from '@/app/(admin)/admin/flash-sales/[id]/edit/page';
import type { AdminFlashSale, AdminProduct } from '@/entities/admin/types';

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

const FLASH_SALE: AdminFlashSale = {
  id: 'fs-1',
  name: 'Payday Sale',
  slug: 'payday-sale',
  status: 'SCHEDULED',
  startsAt: '2026-10-25T00:00:00.000Z',
  endsAt: '2026-10-27T00:00:00.000Z',
  items: [
    {
      id: 'fs-item-1',
      productId: 'product-1',
      title: 'Kemeja Linen',
      slug: 'kemeja-linen',
      originalPrice: 250000,
      salePrice: 199000,
      discountBps: 2040,
      stock: 5,
      stockLimit: 3,
      soldCount: 0,
    },
  ],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<FlashSaleEditPage />, { wrapper });
}

describe('admin flash-sale edit page', () => {
  const originalTz = process.env.TZ;
  // A non-UTC zone proves the datetime-local value round-trips through local time, not a UTC slice.
  beforeAll(() => {
    process.env.TZ = 'Asia/Jakarta';
  });
  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.mockImplementation(async (path: string, init: { method?: string } = {}) => {
      if (path === '/admin/flash-sales/fs-1' && !init.method) return { data: FLASH_SALE };
      if (path.startsWith('/admin/products')) {
        return { data: [PRODUCT], meta: { page: 1, limit: 1000, total: 1, totalPages: 1 } };
      }
      if (path === '/admin/flash-sales/fs-1' && init.method === 'PATCH') {
        return { data: { ...FLASH_SALE, name: 'Payday Sale Extended' } };
      }
      if (path === '/admin/flash-sales' && init.method === 'POST') return { data: { id: 'fs-2' } };
      throw new Error(`unexpected request ${init.method ?? 'GET'} ${path}`);
    });
  });

  it('pre-fills the date inputs in local time and sends the original instants back as ISO', async () => {
    const user = userEvent.setup();
    renderPage();

    // 2026-10-25T00:00Z is 07:00 in Asia/Jakarta (UTC+7).
    expect(await screen.findByLabelText('Tanggal & Waktu Mulai')).toHaveValue('2026-10-25T07:00');
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/flash-sales/fs-1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    const patchCall = apiClient.mock.calls.find(([, init]) => init?.method === 'PATCH');
    const body = JSON.parse(patchCall?.[1].body as string);
    expect(body.startsAt).toBe('2026-10-25T00:00:00.000Z');
    expect(body.endsAt).toBe('2026-10-27T00:00:00.000Z');
  });

  it('saves changes with PATCH /admin/flash-sales/{id} instead of creating a new sale', async () => {
    const user = userEvent.setup();
    renderPage();

    const name = await screen.findByLabelText('Nama');
    await user.clear(name);
    await user.type(name, 'Payday Sale Extended');
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/flash-sales/fs-1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    const patchCall = apiClient.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(patchCall?.[1].body as string)).toEqual({
      name: 'Payday Sale Extended',
      slug: 'payday-sale-extended',
      status: 'SCHEDULED',
      startsAt: '2026-10-25T00:00:00.000Z',
      endsAt: '2026-10-27T00:00:00.000Z',
      items: [{ id: 'fs-item-1', productId: 'product-1', salePrice: 199000, stockLimit: 3 }],
    });

    expect(apiClient).not.toHaveBeenCalledWith('/admin/flash-sales', expect.anything());
    expect(push).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Flash sale diperbarui', variant: 'success' }),
    );
  });

  function patchedItems() {
    const patchCall = apiClient.mock.calls.find(([, init]) => init?.method === 'PATCH');
    return JSON.parse(patchCall?.[1].body as string).items;
  }

  it('rejects a stock limit of 0 without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    const stockLimit = await screen.findByLabelText('Batas Stok (opsional)');
    fireEvent.change(stockLimit, { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    expect(
      await screen.findByText(
        'Batas stok harus bilangan bulat minimal 1, atau kosongkan jika tanpa batas',
      ),
    ).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalledWith(
      '/admin/flash-sales/fs-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('sends an entered stock limit as a number', async () => {
    const user = userEvent.setup();
    renderPage();

    const stockLimit = await screen.findByLabelText('Batas Stok (opsional)');
    fireEvent.change(stockLimit, { target: { value: '' } });
    fireEvent.change(stockLimit, { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/flash-sales/fs-1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    expect(patchedItems()).toEqual([
      { id: 'fs-item-1', productId: 'product-1', salePrice: 199000, stockLimit: 3 },
    ]);
  });

  it('sends a cleared stock limit as an explicit null', async () => {
    const user = userEvent.setup();
    renderPage();

    const stockLimit = await screen.findByLabelText('Batas Stok (opsional)');
    expect(stockLimit).toHaveValue(3);
    fireEvent.change(stockLimit, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/flash-sales/fs-1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    expect(patchedItems()).toEqual([
      { id: 'fs-item-1', productId: 'product-1', salePrice: 199000, stockLimit: null },
    ]);
  });
});

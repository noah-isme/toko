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
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  notFound: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

import FlashSaleNewPage from '@/app/(admin)/admin/flash-sales/new/page';
import type { AdminProduct } from '@/entities/admin/types';

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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<FlashSaleNewPage />, { wrapper });
}

describe('admin flash-sale create page', () => {
  const originalTz = process.env.TZ;
  // A non-UTC zone proves the typed wall-clock time is read as the admin's local time.
  beforeAll(() => {
    process.env.TZ = 'Asia/Jakarta';
    // Radix Select relies on pointer APIs jsdom does not implement.
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => undefined;
    Element.prototype.releasePointerCapture ??= () => undefined;
    Element.prototype.scrollIntoView ??= () => undefined;
  });
  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.mockImplementation(async (path: string, init: { method?: string } = {}) => {
      if (path.startsWith('/admin/products')) {
        return { data: [PRODUCT], meta: { page: 1, limit: 1000, total: 1, totalPages: 1 } };
      }
      if (path === '/admin/flash-sales' && init.method === 'POST') return { data: { id: 'fs-2' } };
      throw new Error(`unexpected request ${init.method ?? 'GET'} ${path}`);
    });
  });

  it('sends startsAt and endsAt as ISO timestamps with timezone', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nama'), 'Payday Sale');
    fireEvent.change(screen.getByLabelText('Tanggal & Waktu Mulai'), {
      target: { value: '2026-10-25T07:00' },
    });
    fireEvent.change(screen.getByLabelText('Tanggal & Waktu Selesai'), {
      target: { value: '2026-10-27T07:30' },
    });

    await user.click(screen.getByRole('button', { name: 'Tambah Produk' }));
    await user.click(screen.getByLabelText('Produk'));
    await user.click(await screen.findByRole('option', { name: /Kemeja Linen/ }));
    fireEvent.change(screen.getByLabelText('Harga Promo (Rp)'), { target: { value: '199000' } });

    await user.click(screen.getByRole('button', { name: 'Buat Flash Sale' }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/flash-sales',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const postCall = apiClient.mock.calls.find(([, init]) => init?.method === 'POST');
    const body = JSON.parse(postCall?.[1].body as string);

    // 07:00 in Asia/Jakarta (UTC+7) is 00:00Z.
    expect(body.startsAt).toBe('2026-10-25T00:00:00.000Z');
    expect(body.endsAt).toBe('2026-10-27T00:30:00.000Z');
    expect(body.startsAt).toBe(new Date('2026-10-25T07:00').toISOString());
    expect(body.startsAt).toMatch(/Z$|[+-]\d{2}:\d{2}$/);
    expect(push).toHaveBeenCalledWith('/admin/flash-sales/fs-2/edit');
  });
});

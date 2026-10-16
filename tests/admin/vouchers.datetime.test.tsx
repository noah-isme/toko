import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiClient, toast } = vi.hoisted(() => ({
  apiClient: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/api/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/apiClient')>()),
  apiClient,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/admin/vouchers',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

import VouchersPage from '@/app/(admin)/admin/vouchers/page';
import type { AdminVoucher } from '@/entities/admin/types';

const VOUCHER: AdminVoucher = {
  id: 'voucher-1',
  code: 'PAYDAY',
  kind: 'percent',
  value: 0,
  percentBps: 1000,
  minSpend: 0,
  usageLimit: null,
  usedCount: 0,
  perUserLimit: null,
  validFrom: '2026-10-25T00:00:00.000Z',
  validTo: null,
  combinable: false,
  priority: 0,
  productIds: [],
  categoryIds: [],
  brandIds: [],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<VouchersPage />, { wrapper });
}

function requestBody(method: string) {
  const call = apiClient.mock.calls.find(([, init]) => init?.method === method);
  return JSON.parse(call?.[1].body as string);
}

// The host time zone is deliberately not pinned: the conversion must be WIB under any `TZ`.
describe('admin vouchers datetime-local fields', () => {
  beforeAll(() => {
    // Radix Select relies on pointer APIs jsdom does not implement.
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => undefined;
    Element.prototype.releasePointerCapture ??= () => undefined;
    Element.prototype.scrollIntoView ??= () => undefined;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.mockImplementation(async (path: string, init: { method?: string } = {}) => {
      const method = init.method ?? 'GET';
      if (path === '/admin/vouchers/stats') {
        return { data: { totalVouchers: 1, activeVouchers: 1, totalUsage: 0 } };
      }
      if (path.startsWith('/admin/vouchers') && method === 'GET') {
        return { data: [VOUCHER], pagination: { page: 1, perPage: 20, totalItems: 1 } };
      }
      if (path === '/admin/vouchers' && method === 'POST') return {};
      if (path === '/admin/vouchers/PAYDAY' && method === 'PUT') return {};
      throw new Error(`unexpected request ${method} ${path}`);
    });
  });

  it('sends a typed validFrom as the WIB instant', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Buat Voucher' }));
    await user.type(screen.getByLabelText('Kode'), 'weekend');
    fireEvent.change(screen.getByLabelText('Berlaku Dari'), {
      target: { value: '2026-10-25T07:00' },
    });
    await user.click(screen.getByRole('button', { name: 'Buat' }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/vouchers',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const body = requestBody('POST');
    // 07:00 WIB (UTC+7) is 00:00Z.
    expect(body.validFrom).toBe('2026-10-25T00:00:00.000Z');
    expect(body.validTo).toBeNull();
  });

  it('prefills validFrom in WIB and keeps the instant on save', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Ubah PAYDAY' }));
    expect(screen.getByLabelText('Berlaku Dari')).toHaveValue('2026-10-25T07:00');
    expect(screen.getByLabelText('Berlaku Sampai')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Perbarui' }));
    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        '/admin/vouchers/PAYDAY',
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    const body = requestBody('PUT');
    expect(body.validFrom).toBe('2026-10-25T00:00:00.000Z');
    expect(body.validTo).toBeNull();
  });
});

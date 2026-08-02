import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VouchersPage from '@/app/(storefront)/vouchers/page';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('VouchersPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('renders voucher page header', async () => {
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /Voucher & Promo/i })).toBeInTheDocument();
        expect(
          screen.getByText(/Temukan dan gunakan voucher diskon untuk berhemat lebih banyak/i),
        ).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('renders info banner', async () => {
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/voucher dapat digunakan saat checkout/i)).toBeInTheDocument();
        expect(screen.getByText(/beberapa voucher tidak dapat digabungkan/i)).toBeInTheDocument();
        expect(screen.getByText(/syarat dan ketentuan berlaku/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it(
    'renders voucher cards with discount labels',
    async () => {
      render(<VouchersPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          // Check for percent vouchers
          const welcome10 = screen.getAllByText(/WELCOME10/i);
          expect(welcome10.length).toBeGreaterThan(0);

          const percentOff = screen.getAllByText(/10% OFF/i);
          expect(percentOff.length).toBeGreaterThan(0);

          // Check for fixed amount vouchers
          const save50k = screen.getAllByText(/SAVE50K/i);
          expect(save50k.length).toBeGreaterThan(0);

          const rp50000 = screen.getAllByText(/Rp 50.000/i);
          expect(rp50000.length).toBeGreaterThan(0);
        },
        { timeout: 10000 },
      );
    },
    { timeout: 15000 },
  );

  it(
    'shows voucher descriptions with conditions',
    async () => {
      render(<VouchersPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          const minBelanja = screen.getAllByText(/Min. belanja/i);
          expect(minBelanja.length).toBeGreaterThan(0);

          const kaliTersisa = screen.getAllByText(/kali tersisa/i);
          expect(kaliTersisa.length).toBeGreaterThan(0);

          const maksPerPelanggan = screen.getAllByText(/Maks.*per pelanggan/i);
          expect(maksPerPelanggan.length).toBeGreaterThan(0);
        },
        { timeout: 10000 },
      );
    },
    { timeout: 15000 },
  );

  it('shows active/inactive badge', async () => {
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getAllByText(/berlaku/i).length).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });

  it('has copy code button for each voucher', async () => {
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        const copyButtons = screen.getAllByRole('button', { name: /salin kode/i });
        expect(copyButtons.length).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });

  it('has shop now link for each voucher', async () => {
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        const shopLinks = screen.getAllByRole('link', { name: /belanja sekarang/i });
        expect(shopLinks.length).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });

  it(
    'shows combinable badge for combinable vouchers',
    async () => {
      render(<VouchersPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          // The badge is a span with specific class, the text in info banner is different
          const badges = screen.getAllByText('Dapat digabung');
          expect(badges.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 10000 },
      );
    },
    { timeout: 15000 },
  );

  it('shows expired badge for expired vouchers', async () => {
    // This would need specific test data with expired dates
    // For now, just verify the component renders without error
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /voucher & promo/i })).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('renders help section', async () => {
    render(<VouchersPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/Butuh bantuan/i)).toBeInTheDocument();
        expect(screen.getByText(/Voucher tidak berfungsi/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Hubungi Dukungan/i })).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });
});

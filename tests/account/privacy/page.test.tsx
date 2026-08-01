import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PrivacyPage from '@/app/(storefront)/account/privacy/page';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
    },
  }),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
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

describe('PrivacyPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('renders privacy page header', async () => {
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /pengaturan privasi/i })).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    expect(screen.getByText(/kelola data dan preferensi privasi/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /kembali ke akun/i })).toBeInTheDocument();
  });

  it('renders communication preferences section', async () => {
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/preferensi komunikasi/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    expect(screen.getByText(/Email Pemasaran & Promo/i)).toBeInTheDocument();
    expect(screen.getByText(/Dapatkan info diskon/i)).toBeInTheDocument();
    expect(screen.getByText(/Update Pesanan & Pengiriman/i)).toBeInTheDocument();
    expect(screen.getByText(/Notifikasi status pesanan/i)).toBeInTheDocument();
    expect(screen.getByText(/Peringatan Keamanan/i)).toBeInTheDocument();
    expect(screen.getByText(/Notifikasi login mencurigakan/i)).toBeInTheDocument();
  });

  it(
    'toggles marketing emails switch',
    async () => {
      render(<PrivacyPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          const marketingSwitch = screen.getByRole('switch', { name: /email pemasaran/i });
          expect(marketingSwitch).toBeChecked();

          fireEvent.click(marketingSwitch);
          expect(marketingSwitch).not.toBeChecked();

          fireEvent.click(marketingSwitch);
          expect(marketingSwitch).toBeChecked();
        },
        { timeout: 10000 },
      );
    },
    { timeout: 10000 },
  );

  it(
    'toggles order updates switch',
    async () => {
      render(<PrivacyPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          const orderSwitch = screen.getByRole('switch', { name: /update pesanan/i });
          expect(orderSwitch).toBeChecked();

          fireEvent.click(orderSwitch);
          expect(orderSwitch).not.toBeChecked();
        },
        { timeout: 10000 },
      );
    },
    { timeout: 10000 },
  );

  it(
    'toggles security alerts switch',
    async () => {
      render(<PrivacyPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          const securitySwitch = screen.getByRole('switch', { name: /peringatan keamanan/i });
          expect(securitySwitch).toBeChecked();

          fireEvent.click(securitySwitch);
          expect(securitySwitch).not.toBeChecked();
        },
        { timeout: 10000 },
      );
    },
    { timeout: 10000 },
  );

  it('renders profile visibility section with radio buttons', async () => {
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/visibilitas profil/i)).toBeInTheDocument();
        expect(screen.getByText(/siapa yang bisa melihat profil anda/i)).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /publik/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /hanya teman/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /pribadi/i })).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it(
    'selects profile visibility option',
    async () => {
      render(<PrivacyPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          const privateRadio = screen.getByRole('radio', { name: /pribadi/i });
          expect(privateRadio).toBeChecked();

          const publicRadio = screen.getByRole('radio', { name: /publik/i });
          fireEvent.click(publicRadio);
          expect(publicRadio).toBeChecked();

          const friendsRadio = screen.getByRole('radio', { name: /hanya teman/i });
          fireEvent.click(friendsRadio);
          expect(friendsRadio).toBeChecked();
        },
        { timeout: 10000 },
      );
    },
    { timeout: 10000 },
  );

  it('renders data processing section', async () => {
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/pengolahan data/i)).toBeInTheDocument();
        expect(screen.getByText(/Pemrosesan Data Esensial/i)).toBeInTheDocument();
        expect(screen.getByText(/Diperlukan untuk menyediakan layanan inti/i)).toBeInTheDocument();
        expect(screen.getByText(/Analitik & Peningkatan Layanan/i)).toBeInTheDocument();
        expect(screen.getByText(/Personalisasi & Rekomendasi/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it(
    'toggles analytics tracking switch',
    async () => {
      render(<PrivacyPage />, { wrapper: Wrapper });

      await waitFor(
        () => {
          const analyticsSwitch = screen.getByRole('switch', { name: /analitik/i });
          expect(analyticsSwitch).toBeChecked();

          fireEvent.click(analyticsSwitch);
          expect(analyticsSwitch).not.toBeChecked();
        },
        { timeout: 10000 },
      );
    },
    { timeout: 10000 },
  );

  it('renders data rights section', async () => {
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/Hak Data Anda/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Unduh Data Saya/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Hapus Akun/i })).toBeInTheDocument();
        expect(screen.getByText(/Akses data pribadi yang kami simpan/i)).toBeInTheDocument();
        expect(screen.getByText(/Minta koreksi data yang tidak akurat/i)).toBeInTheDocument();
        expect(screen.getByText(/Minta penghapusan data/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('renders cookie management section', async () => {
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByText(/Cookie & Pelacakan/i)).toBeInTheDocument();
        expect(screen.getByText(/Cookie Esensial/i)).toBeInTheDocument();
        expect(screen.getByText(/Cookie Fungsional/i)).toBeInTheDocument();
        expect(screen.getByText(/Cookie Analitik/i)).toBeInTheDocument();
        expect(screen.getByText(/Cookie Pemasaran/i)).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('shows delete account confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        const deleteBtn = screen.getByRole('button', { name: /Hapus Akun/i });
        user.click(deleteBtn);
      },
      { timeout: 10000 },
    );

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /Hapus Akun Permanen/i })).toBeInTheDocument();
        expect(screen.getByText(/tidak dapat dibatalkan/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Hapus Akun Saya/i })).toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });

  it('closes delete account dialog on cancel', async () => {
    const user = userEvent.setup();
    render(<PrivacyPage />, { wrapper: Wrapper });

    await waitFor(
      () => {
        const deleteBtn = screen.getByRole('button', { name: /Hapus Akun/i });
        user.click(deleteBtn);
      },
      { timeout: 10000 },
    );

    await waitFor(
      () => {
        const cancelBtn = screen.getByRole('button', { name: /Batal/i });
        user.click(cancelBtn);
      },
      { timeout: 10000 },
    );

    await waitFor(
      () => {
        expect(
          screen.queryByRole('heading', { name: /Hapus Akun Permanen/i }),
        ).not.toBeInTheDocument();
      },
      { timeout: 10000 },
    );
  });
});

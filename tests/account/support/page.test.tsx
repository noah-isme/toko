import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SupportPage from '@/app/(storefront)/account/support/page';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'mock-user-001', email: 'demo@toko.test', name: 'Toko Demo' },
  }),
}));

describe('SupportPage', () => {
  it('loads and renders the support conversation transcript', async () => {
    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pusat Bantuan' })).toBeInTheDocument();
      expect(screen.getByText('Contoh tiket dukungan')).toBeInTheDocument();
    });

    expect(screen.getByText('Tim dukungan')).toBeInTheDocument();
    expect(screen.getByText(/Pesanan sedang diproses/)).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listReturns: vi.fn(),
  updateReturn: vi.fn(),
  refundReturn: vi.fn(),
}));

vi.mock('@/lib/api/services/customerOperations', () => ({ adminOperationsApi: api }));

import AdminReturnsPage from '@/app/(admin)/admin/returns/page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<AdminReturnsPage />, { wrapper });
}

const sampleReturn = {
  id: 'ret-1',
  orderId: 'order-1',
  status: 'REQUESTED' as const,
  reason: 'Damaged',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('admin returns page states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state while returns are pending', () => {
    api.listReturns.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the error state and recovers when retry succeeds', async () => {
    api.listReturns.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([sampleReturn]);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-testid', 'admin-error');

    await userEvent.click(within(alert).getByTestId('admin-error-retry'));

    await waitFor(() => expect(screen.queryByTestId('admin-error')).not.toBeInTheDocument());
    expect(api.listReturns).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(sampleReturn.reason)).toBeInTheDocument();
  });

  it('shows the empty state when there are no returns', async () => {
    api.listReturns.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByTestId('admin-empty')).toBeInTheDocument();
  });

  it('updates a return status and refetches the list', async () => {
    api.listReturns.mockResolvedValue([sampleReturn]);
    api.updateReturn.mockResolvedValue({ ...sampleReturn, status: 'APPROVED' });
    renderPage();

    await screen.findByText(sampleReturn.reason);
    // Status buttons are labelled with the backend enum value, which is locale-independent.
    await userEvent.click(screen.getByRole('button', { name: 'APPROVED' }));

    await waitFor(() => expect(api.updateReturn).toHaveBeenCalledWith('ret-1', 'APPROVED'));
    await waitFor(() => expect(api.listReturns).toHaveBeenCalledTimes(2));
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listTickets: vi.fn(),
  listTicketMessages: vi.fn(),
  updateTicket: vi.fn(),
  sendTicketMessage: vi.fn(),
}));

vi.mock('@/lib/api/services/customerOperations', () => ({ adminOperationsApi: api }));

import AdminSupportPage from '@/app/(admin)/admin/support/page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<AdminSupportPage />, { wrapper });
}

const sampleTicket = {
  id: 'ticket-1',
  subject: 'Where is my parcel?',
  status: 'OPEN' as const,
  priority: 'NORMAL' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const sampleMessage = {
  id: 'msg-1',
  ticketId: 'ticket-1',
  authorId: 'user-1',
  authorType: 'customer' as const,
  message: 'Still waiting for delivery',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('admin support page states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listTicketMessages.mockResolvedValue([sampleMessage]);
  });

  it('shows the loading state while tickets are pending', () => {
    api.listTickets.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
  });

  it('shows the error state and recovers when retry succeeds', async () => {
    api.listTickets.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([sampleTicket]);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-testid', 'admin-error');

    await userEvent.click(within(alert).getByTestId('admin-error-retry'));

    await waitFor(() => expect(screen.queryByTestId('admin-error')).not.toBeInTheDocument());
    expect(api.listTickets).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(sampleTicket.subject)).toBeInTheDocument();
    expect(await screen.findByText(sampleMessage.message)).toBeInTheDocument();
    expect(api.listTicketMessages).toHaveBeenCalledWith('ticket-1');
  });

  it('shows the empty state when there are no tickets', async () => {
    api.listTickets.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByTestId('admin-empty')).toBeInTheDocument();
  });

  it('changes a ticket status and sends a reply', async () => {
    api.listTickets.mockResolvedValue([sampleTicket]);
    api.updateTicket.mockResolvedValue({ ...sampleTicket, status: 'RESOLVED' });
    api.sendTicketMessage.mockResolvedValue({});
    renderPage();

    await screen.findByText(sampleTicket.subject);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'RESOLVED');
    await waitFor(() => expect(api.updateTicket).toHaveBeenCalledWith('ticket-1', 'RESOLVED'));

    await userEvent.type(screen.getByRole('textbox'), 'On its way');
    // The send button is the only button rendered for a single ticket.
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(api.sendTicketMessage).toHaveBeenCalledWith('ticket-1', 'On its way'),
    );
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
  });
});

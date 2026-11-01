import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { createWebhook, toast } = vi.hoisted(() => ({
  createWebhook: vi.fn(async () => ({})),
  toast: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/entities/admin/hooks', () => {
  const query = (data: unknown) => ({
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  });
  const mutation = (mutateAsync: (...args: unknown[]) => Promise<unknown>) => ({
    mutateAsync,
    isPending: false,
  });
  return {
    useAdminWebhooks: () => query([]),
    useAdminWebhookDeliveries: () => query({ data: [] }),
    useCreateAdminWebhook: () => mutation(createWebhook),
    useUpdateAdminWebhook: () => mutation(vi.fn(async () => ({}))),
    useDeleteAdminWebhook: () => mutation(vi.fn(async () => undefined)),
    useReplayAdminWebhookDelivery: () => mutation(vi.fn(async () => ({}))),
  };
});

import WebhooksPage from '@/app/(admin)/admin/webhooks/page';

// Radix Switch measures itself with ResizeObserver, which jsdom lacks.
const ResizeObserverMock = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};

function fireBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** The page header's add button (the empty state repeats it). */
function openCreate(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getAllByRole('button', { name: 'Tambah Endpoint' })[0]);
}

describe('admin webhooks dialog guards unsaved changes', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });
  beforeEach(() => vi.clearAllMocks());

  it('closes a clean dialog straight away and asks before dropping edits', async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await openCreate(user);
    expect(fireBeforeUnload()).toBe(false);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openCreate(user);
    await user.type(screen.getByLabelText('Nama'), 'Gudang');
    expect(fireBeforeUnload()).toBe(true);

    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lanjut mengedit' }));
    expect(screen.getByLabelText('Nama')).toHaveValue('Gudang');

    await user.click(screen.getByRole('button', { name: 'Batal' }));
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fireBeforeUnload()).toBe(false);
    expect(createWebhook).not.toHaveBeenCalled();
  });

  it('stops warning after the endpoint is created', async () => {
    const user = userEvent.setup();
    render(<WebhooksPage />);

    await openCreate(user);
    await user.type(screen.getByLabelText('Nama'), 'Gudang');
    await user.type(screen.getByLabelText('URL'), 'https://gudang.test/hooks');
    await user.type(screen.getByLabelText('Secret penandatanganan'), 'rahasia');
    await user.click(screen.getByLabelText('order.paid'));
    expect(fireBeforeUnload()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Buat' }));
    await waitFor(() => expect(createWebhook).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fireBeforeUnload()).toBe(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

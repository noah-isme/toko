/**
 * Staff page against the shared staff mock (MSW handlers backed by the same
 * resolver as the `/api/v1` route), so requests, error codes and the store are
 * the ones the app uses without a backend.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import StaffPage from '@/app/(admin)/admin/staff/page';
import { setAccessToken } from '@/lib/api/apiClient';
import type { User } from '@/lib/api/types';
import { MOCK_USER } from '@/mocks/factories/user';
import { MOCK_ADMIN_TOKEN, MOCK_STAFF_TOKEN_PREFIX } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/resolvers/session';
import { permissionsFor, type MockTenantRole } from '@/mocks/resolvers/staff';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth.current }));

function signInAs(role: MockTenantRole) {
  const user: User = {
    ...MOCK_USER,
    createdAt: '2026-01-01',
    roles: role === 'owner' ? ['admin'] : [],
    role,
    permissions: permissionsFor(role),
  };
  setAccessToken(role === 'owner' ? MOCK_ADMIN_TOKEN : `${MOCK_STAFF_TOKEN_PREFIX}${role}`);
  auth.current = { user, isAuthenticated: true, isLoading: false, refreshUser: vi.fn() };
  return auth.current.refreshUser as ReturnType<typeof vi.fn>;
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderWithIntl(<StaffPage />, { locale: 'en', wrapper });
}

async function rowFor(email: string) {
  const cell = await screen.findByText(email);
  return cell.closest('tr') as HTMLElement;
}

beforeEach(() => {
  toast.mockReset();
  resetMockState();
});

afterEach(() => {
  setAccessToken(null);
  resetMockState();
});

describe('Staff page', () => {
  it('lists staff with their roles and marks the current user', async () => {
    signInAs('owner');
    renderPage();
    const table = await screen.findByRole('table', { name: 'Staff members' });
    expect(within(table).getAllByTestId('staff-row')).toHaveLength(5);
    const me = await rowFor('john.doe@example.com');
    expect(within(me).getByText('You')).toBeInTheDocument();
    expect(within(me).getByRole('combobox', { name: 'Role for John Doe' })).toHaveValue('owner');
    const budi = await rowFor('budi@example.com');
    expect(within(budi).getByRole('combobox')).toHaveValue('support');
    expect(within(budi).getByText('Active')).toBeInTheDocument();
  });

  it('adds a staff member by email and role', async () => {
    signInAs('owner');
    renderPage();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'andi@example.com' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'fulfillment' } });
    expect(screen.getByLabelText('Role')).toHaveAccessibleDescription(
      'Orders, shipments, returns and stock levels.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add staff' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Andi Pratama is now Fulfillment.', variant: 'success' }),
      ),
    );
    const row = await rowFor('andi@example.com');
    expect(within(row).getByRole('combobox')).toHaveValue('fulfillment');
  });

  it('validates the email and explains backend errors inline', async () => {
    signInAs('owner');
    renderPage();
    await screen.findByRole('table');
    const submit = screen.getByRole('button', { name: 'Add staff' });

    fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an email address.');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ghost@example.com' } });
    fireEvent.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No customer account on this store uses that email.',
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@example.com' } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('This person is already staff.'),
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks for confirmation before changing a role', async () => {
    signInAs('owner');
    renderPage();
    const budi = await rowFor('budi@example.com');
    fireEvent.change(within(budi).getByRole('combobox'), { target: { value: 'manager' } });

    const dialog = await screen.findByRole('dialog', { name: 'Change role?' });
    expect(dialog).toHaveTextContent("Change Budi Santoso's role from Support to Manager?");
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(await rowFor('budi@example.com')).getByRole('combobox')).toHaveValue('support');

    fireEvent.change(within(await rowFor('budi@example.com')).getByRole('combobox'), {
      target: { value: 'manager' },
    });
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Change role' }),
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Budi Santoso is now Manager.', variant: 'success' }),
      ),
    );
    await waitFor(async () =>
      expect(within(await rowFor('budi@example.com')).getByRole('combobox')).toHaveValue('manager'),
    );
  });

  it('confirms a revoke and explains the last-owner rule', async () => {
    const refreshUser = signInAs('owner');
    renderPage();
    const me = await rowFor('john.doe@example.com');
    fireEvent.click(within(me).getByRole('button', { name: 'Revoke staff access for John Doe' }));

    const dialog = await screen.findByRole('dialog', { name: 'Revoke staff access?' });
    expect(dialog).toHaveTextContent('You are revoking your own access.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke access' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could not revoke access',
          description:
            'The store must keep at least one active owner. Make someone else an owner first.',
          variant: 'destructive',
        }),
      ),
    );
    expect(refreshUser).not.toHaveBeenCalled();
    expect(await rowFor('john.doe@example.com')).toBeInTheDocument();
  });

  it('revokes another member after confirmation', async () => {
    signInAs('owner');
    renderPage();
    const siti = await rowFor('siti@example.com');
    fireEvent.click(
      within(siti).getByRole('button', { name: 'Revoke staff access for Siti Aminah' }),
    );
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke access' }),
    );
    await waitFor(() => expect(screen.queryByText('siti@example.com')).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Siti Aminah no longer has staff access.' }),
    );
  });

  it('locks owners and hides the owner role from non-owner admins', async () => {
    signInAs('admin');
    renderPage();
    // Signed in as an admin, the mock tenant's owner is admin@toko.com.
    const me = await rowFor('john.doe@example.com');
    expect(within(me).getByText('You')).toBeInTheDocument();
    const owner = await rowFor('admin@toko.com');
    expect(within(owner).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(owner).queryByRole('button')).not.toBeInTheDocument();
    expect(within(owner).getAllByText('Only an owner can change an owner.').length).toBeGreaterThan(
      0,
    );
    const budi = await rowFor('budi@example.com');
    const options = within(within(budi).getByRole('combobox')).getAllByRole('option');
    expect(options.map((option) => option.getAttribute('value'))).not.toContain('owner');
  });

  it('is read-only for roles without staff:manage', async () => {
    signInAs('manager');
    renderPage();
    await screen.findByRole('table');
    expect(screen.getByRole('note')).toHaveTextContent(
      'You can view staff, but only owners and admins can change roles.',
    );
    expect(screen.queryByRole('button', { name: 'Add staff' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke/ })).not.toBeInTheDocument();
  });

  it('shows the role permission matrix', async () => {
    signInAs('owner');
    renderPage();
    const details = screen.getByText('What each role can do').closest('details') as HTMLElement;
    details.setAttribute('open', '');
    fireEvent(details, new Event('toggle'));
    expect(
      await screen.findByText(
        'Read-only access to analytics, orders, catalog, promotions and customers.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Manage staff').length).toBe(2);
  });

  it('shows the no-access state when the API refuses the list', async () => {
    signInAs('catalog');
    renderPage();
    expect(await screen.findByTestId('admin-forbidden')).toHaveTextContent('View staff');
  });
});

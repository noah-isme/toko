/**
 * Staff page against the shared staff mock (MSW handlers backed by the same
 * resolver as the `/api/v1` route), so requests, error codes and the store are
 * the ones the app uses without a backend.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
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
import { server } from '@/mocks/server';

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

async function roleOf(email: string) {
  return within(await rowFor(email)).getByTestId('staff-role').textContent;
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
    expect(within(me).getByTestId('staff-role')).toHaveTextContent('Owner');
    expect(within(me).getByRole('button', { name: 'Change role for John Doe' })).toBeEnabled();
    const budi = await rowFor('budi@example.com');
    expect(within(budi).getByTestId('staff-role')).toHaveTextContent('Support');
    expect(within(budi).getByText('Active')).toBeInTheDocument();
    // Roles change through a dialog, never straight from a control in the row.
    expect(within(table).queryByRole('combobox')).not.toBeInTheDocument();
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
    await waitFor(async () => expect(await roleOf('andi@example.com')).toBe('Fulfillment'));
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

  it('picks the new role inside a confirmation dialog', async () => {
    signInAs('owner');
    renderPage();
    const openDialog = async () => {
      fireEvent.click(
        within(await rowFor('budi@example.com')).getByRole('button', {
          name: 'Change role for Budi Santoso',
        }),
      );
      return screen.findByRole('dialog', { name: 'Change role?' });
    };

    let dialog = await openDialog();
    expect(dialog).toHaveTextContent(
      'Choose a new role for Budi Santoso. Their current role is Support.',
    );
    const picker = within(dialog).getByRole('combobox', { name: 'New role' });
    expect(picker).toHaveValue('support');
    // Nothing to confirm until a different role is picked.
    expect(within(dialog).getByRole('button', { name: 'Change role' })).toBeDisabled();
    // Moving through the options (as arrow keys do) only changes the picker.
    fireEvent.change(picker, { target: { value: 'manager' } });
    expect(picker).toHaveAccessibleDescription(
      'Runs the store day to day; cannot change settings or staff.',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await roleOf('budi@example.com')).toBe('Support');

    dialog = await openDialog();
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'New role' }), {
      target: { value: 'manager' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change role' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Budi Santoso is now Manager.', variant: 'success' }),
      ),
    );
    await waitFor(async () => expect(await roleOf('budi@example.com')).toBe('Manager'));
  });

  it('refreshes /auth/me after changing your own role', async () => {
    const refreshUser = signInAs('admin');
    renderPage();
    fireEvent.click(
      within(await rowFor('john.doe@example.com')).getByRole('button', {
        name: 'Change role for John Doe',
      }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Change role?' });
    expect(dialog).toHaveTextContent('You are changing your own role.');
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'New role' }), {
      target: { value: 'support' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change role' }));
    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(1));
  });

  it('steps back a page when the last row of a later page is revoked', async () => {
    signInAs('owner');
    // 21 staff: the last one sits alone on page 2 until it is revoked.
    const roster = Array.from({ length: 21 }, (_, index) => ({
      userId: `staff-${index}`,
      name: `Staff ${index}`,
      email: `staff${index}@example.com`,
      role: 'analyst',
      status: 'ACTIVE',
      createdAt: '2026-01-05T08:00:00.000Z',
      updatedAt: '2026-01-05T08:00:00.000Z',
    }));
    server.use(
      http.get('*/admin/staff', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? '1');
        const limit = Number(url.searchParams.get('limit') ?? '20');
        return HttpResponse.json({
          data: roster.slice((page - 1) * limit, page * limit),
          pagination: { page, perPage: limit, totalItems: roster.length },
        });
      }),
      http.delete('*/admin/staff/:userId', ({ params }) => {
        roster.splice(
          roster.findIndex((member) => member.userId === params.userId),
          1,
        );
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage();
    await screen.findByText('staff0@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(
      within(await rowFor('staff20@example.com')).getByRole('button', {
        name: 'Revoke staff access for Staff 20',
      }),
    );
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke access' }),
    );

    expect(await screen.findByText('staff0@example.com')).toBeInTheDocument();
    expect(screen.queryByText('No staff yet.')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('staff-row')).toHaveLength(20);
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
    expect(within(owner).queryByRole('button')).not.toBeInTheDocument();
    expect(within(owner).getAllByText('Only an owner can change an owner.').length).toBeGreaterThan(
      0,
    );
    fireEvent.click(
      within(await rowFor('budi@example.com')).getByRole('button', {
        name: 'Change role for Budi Santoso',
      }),
    );
    const picker = within(await screen.findByRole('dialog')).getByRole('combobox', {
      name: 'New role',
    });
    const options = within(picker).getAllByRole('option');
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
    expect(screen.queryByRole('button', { name: /Change role/ })).not.toBeInTheDocument();
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

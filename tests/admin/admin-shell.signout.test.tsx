import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logout, replace } = vi.hoisted(() => ({
  logout: vi.fn(async () => {}),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/products/new',
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { name: 'Admin Toko', email: 'admin@toko.test' },
    logout,
  }),
}));

vi.mock('@/components/admin/admin-guard', () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdminRouteGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Refetches /auth/me through React Query; not under test here.
vi.mock('@/components/admin/admin-permission-sync', () => ({ AdminPermissionSync: () => null }));

import { AdminShell } from '@/components/admin/admin-shell';
import { UnsavedChangesDialog } from '@/components/admin/unsaved-changes-dialog';
import { isFormDirty, useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

/** A minimal guarded admin form, as the real create/edit pages render inside the shell. */
function GuardedForm() {
  const [value, setValue] = useState('');
  const guard = useUnsavedChangesGuard(isFormDirty(value, ''));
  return (
    <form>
      <label htmlFor="title">Judul</label>
      <input id="title" value={value} onChange={(event) => setValue(event.target.value)} />
      <UnsavedChangesDialog guard={guard} />
    </form>
  );
}

function renderShell() {
  render(
    <AdminShell>
      <GuardedForm />
    </AdminShell>,
  );
}

/** The desktop sidebar's sign-out button (the mobile sheet is closed). */
function desktopSignOut() {
  const sidebar = screen.getByRole('complementary');
  return within(sidebar).getByRole('button', { name: 'Keluar' });
}

describe('AdminShell sign-out with unsaved changes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('signs out straight away when no form is dirty', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(desktopSignOut());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('asks before signing out of a dirty form, and only signs out on Discard', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.type(screen.getByLabelText('Judul'), 'Kemeja');

    await user.click(desktopSignOut());
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Lanjut mengedit' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Judul')).toHaveValue('Kemeja');

    await user.click(desktopSignOut());
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('opens the confirm dialog on top of the mobile menu sheet', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.type(screen.getByLabelText('Judul'), 'Kemeja');

    await user.click(screen.getByRole('button', { name: 'Buka menu admin' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByText('Navigasi admin')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Keluar' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(logout).not.toHaveBeenCalled();
    // The confirm dialog is usable even though the modal sheet is open underneath.
    await user.click(within(confirm).getByRole('button', { name: 'Buang perubahan' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

import type { UseMutationResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tags } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toast, updateSettings } = vi.hoisted(() => ({
  toast: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/entities/admin/hooks', () => ({
  useStoreSettings: () => ({
    isLoading: false,
    error: null,
    data: { storeName: 'Toko Kedua', currency: 'IDR' },
    refetch: vi.fn(),
  }),
  useUpdateStoreSettings: () => ({ mutateAsync: updateSettings, isPending: false }),
}));

import SettingsPage from '@/app/(admin)/admin/settings/page';
import { TaxonomyManager } from '@/components/admin/taxonomy-manager';
import type { AdminTaxonomy } from '@/entities/admin/types';

function fireBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function mutation<TVars, TData = AdminTaxonomy | void>(
  mutateAsync: (vars: TVars) => Promise<TData>,
) {
  return { mutateAsync, isPending: false } as unknown as UseMutationResult<
    TData,
    unknown,
    TVars,
    unknown
  >;
}

const CATEGORY: AdminTaxonomy = {
  id: 'cat-1',
  name: 'Atasan',
  slug: 'atasan',
  productCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

function renderTaxonomy() {
  const create = vi.fn(async () => CATEGORY);
  render(
    <TaxonomyManager
      kind="categories"
      icon={Tags}
      query={{ data: [CATEGORY], isLoading: false, isError: false, error: null, refetch: vi.fn() }}
      createMutation={mutation(create)}
      updateMutation={mutation(vi.fn(async () => CATEGORY))}
      deleteMutation={mutation(vi.fn(async () => undefined))}
    />,
  );
  return { create };
}

describe('admin dialog forms guard unsaved changes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks before dismissing a dirty taxonomy dialog and stays quiet when clean', async () => {
    const user = userEvent.setup();
    renderTaxonomy();

    const openButton = screen.getByRole('button', { name: 'Tambah Kategori' });
    await user.click(openButton);
    // Untouched: closes straight away.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(openButton);
    await user.type(await screen.findByLabelText('Nama'), 'Bawahan');
    expect(fireBeforeUnload()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lanjut mengedit' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Batal' }));
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fireBeforeUnload()).toBe(false);
  });

  it('does not warn after a taxonomy item is saved', async () => {
    const user = userEvent.setup();
    const { create } = renderTaxonomy();
    await user.click(screen.getByRole('button', { name: 'Tambah Kategori' }));
    await user.type(await screen.findByLabelText('Nama'), 'Bawahan');
    await user.click(screen.getByRole('button', { name: 'Buat' }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fireBeforeUnload()).toBe(false);
  });

  it('settings: warns while edited, not after a successful save', async () => {
    const user = userEvent.setup();
    updateSettings.mockResolvedValue({});
    render(<SettingsPage />);

    expect(fireBeforeUnload()).toBe(false);
    const storeName = screen.getByLabelText('Nama toko');
    await user.clear(storeName);
    await user.type(storeName, 'Toko Ketiga');
    expect(fireBeforeUnload()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Simpan pengaturan' }));
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: 'Toko Ketiga' }),
    );
    expect(fireBeforeUnload()).toBe(false);
  });

  it('settings: keeps warning when the save fails', async () => {
    const user = userEvent.setup();
    updateSettings.mockRejectedValue(new Error('boom'));
    render(<SettingsPage />);

    await user.type(screen.getByLabelText('Nama toko'), '!');
    await user.click(screen.getByRole('button', { name: 'Simpan pengaturan' }));
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(fireBeforeUnload()).toBe(true);
  });
});

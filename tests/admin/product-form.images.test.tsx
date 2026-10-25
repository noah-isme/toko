import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/admin/hooks', () => ({
  useAdminCategories: () => ({ data: [] }),
  useAdminBrands: () => ({ data: [] }),
}));

import { ProductForm, type ProductFormValues } from '@/components/admin/product-form';
import { moveItem } from '@/components/admin/product-images-field';
import type { AdminProductInput } from '@/entities/admin/types';

// Radix Switch measures itself with ResizeObserver, which jsdom lacks.
const ResizeObserverMock = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const VALUES: ProductFormValues = {
  title: 'Kemeja Linen',
  slug: 'kemeja-linen',
  price: 250000,
  compareAt: '',
  inStock: true,
  thumbnail: '',
  badges: '',
  description: '',
  categoryId: '__none__',
  brandId: '__none__',
  images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg', 'https://cdn.test/c.jpg'],
  specs: [],
  variants: [],
};

function renderForm(onSubmit = vi.fn(async (_input: AdminProductInput) => true)) {
  const onCancel = vi.fn();
  render(
    <ProductForm
      initialValues={VALUES}
      submitLabel="Simpan"
      saving={false}
      onSubmit={onSubmit}
      onError={vi.fn()}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel };
}

function imageUrls() {
  return screen
    .getAllByRole('textbox', { name: /^URL gambar/ })
    .map((input) => (input as HTMLInputElement).value);
}

function dataTransfer() {
  return {
    setData: vi.fn(),
    getData: vi.fn(),
    setDragImage: vi.fn(),
    effectAllowed: 'all',
    dropEffect: 'none',
  };
}

describe('moveItem', () => {
  it('moves an item and clamps the target index', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('ProductForm images', () => {
  it('reorders with the move buttons and keeps focus on the moved image', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Pindahkan gambar 1 ke bawah' }));
    expect(imageUrls()).toEqual([
      'https://cdn.test/b.jpg',
      'https://cdn.test/a.jpg',
      'https://cdn.test/c.jpg',
    ]);
    // Image "a" is now second; focus follows it.
    expect(screen.getByRole('button', { name: 'Pindahkan gambar 2 ke bawah' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Gambar dipindahkan ke posisi 2 dari 3.');

    await user.keyboard('{Enter}');
    expect(imageUrls()[2]).toBe('https://cdn.test/a.jpg');
    // At the end, "down" is disabled, so focus falls back to "up".
    expect(screen.getByRole('button', { name: 'Pindahkan gambar 3 ke bawah' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pindahkan gambar 3 ke atas' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Pindahkan gambar 3 ke atas' }));
    expect(imageUrls()[1]).toBe('https://cdn.test/a.jpg');
    expect(screen.getByRole('button', { name: 'Pindahkan gambar 1 ke atas' })).toBeDisabled();
  });

  it('sets an image as primary by moving it first', async () => {
    const user = userEvent.setup();
    renderForm();

    const rows = screen.getAllByTestId('product-form-image-row');
    expect(within(rows[0]).getByTestId('product-form-image-primary')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Jadikan gambar 1 sebagai utama' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jadikan gambar 3 sebagai utama' }));
    expect(imageUrls()).toEqual([
      'https://cdn.test/c.jpg',
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
    ]);
    const reordered = screen.getAllByTestId('product-form-image-row');
    expect(within(reordered[0]).getByTestId('product-form-image-primary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Gambar dijadikan utama.');
  });

  it('reorders by drag and drop', () => {
    renderForm();
    const handles = screen.getAllByTestId('product-form-image-handle');
    const rows = screen.getAllByTestId('product-form-image-row');
    const transfer = dataTransfer();

    fireEvent.dragStart(handles[0], { dataTransfer: transfer });
    expect(transfer.setData).toHaveBeenCalledWith('text/plain', '0');
    fireEvent.dragOver(rows[2], { dataTransfer: transfer });
    fireEvent.drop(rows[2], { dataTransfer: transfer });
    fireEvent.dragEnd(handles[0], { dataTransfer: transfer });

    expect(imageUrls()).toEqual([
      'https://cdn.test/b.jpg',
      'https://cdn.test/c.jpg',
      'https://cdn.test/a.jpg',
    ]);
  });

  it('submits images in the arranged order', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Jadikan gambar 2 sebagai utama' }));
    await user.click(screen.getByTestId('product-form-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].images).toEqual([
      'https://cdn.test/b.jpg',
      'https://cdn.test/a.jpg',
      'https://cdn.test/c.jpg',
    ]);
  });

  it('keeps edited URLs attached to their row while reordering', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Tambah gambar' }));
    await user.type(screen.getByRole('textbox', { name: 'URL gambar 4' }), '/img/d.jpg');
    await user.click(screen.getByRole('button', { name: 'Jadikan gambar 4 sebagai utama' }));
    expect(imageUrls()[0]).toBe('/img/d.jpg');
    expect(screen.getByRole('img', { name: 'Pratinjau gambar 1' })).toHaveAttribute(
      'src',
      '/img/d.jpg',
    );
  });
});

describe('ProductForm unsaved-changes guard', () => {
  it('asks before cancelling with unsaved edits', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Pindahkan gambar 1 ke bawah' }));
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buang perubahan' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('stands down after a successful save but not after a failed one', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_input: AdminProductInput) => false);
    const { onCancel } = renderForm(onSubmit);

    await user.type(screen.getByTestId('product-form-title'), ' Premium');
    await user.click(screen.getByTestId('product-form-submit'));
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Lanjut mengedit' }));

    onSubmit.mockResolvedValueOnce(true);
    await user.click(screen.getByTestId('product-form-submit'));
    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

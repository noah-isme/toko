import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/entities/admin/hooks', () => ({
  useAdminCategories: () => ({ data: [] }),
  useAdminBrands: () => ({ data: [] }),
}));

import { ProductForm, type ProductFormValues } from '@/components/admin/product-form';
import {
  moveItem,
  nextThumbnail,
  primaryImageIndex,
} from '@/components/admin/product-images-field';
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
  status: 'published',
  lowStockThreshold: '',
  images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg', 'https://cdn.test/c.jpg'],
  specs: [],
  variants: [],
};

function renderForm(
  onSubmit = vi.fn(async (_input: AdminProductInput) => true),
  initialValues: ProductFormValues = VALUES,
) {
  const onCancel = vi.fn();
  render(
    <ProductForm
      initialValues={initialValues}
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

describe('nextThumbnail', () => {
  const before = ['a', 'b', 'c'];

  it('makes the chosen image the thumbnail when set as primary', () => {
    expect(nextThumbnail('x', before, ['c', 'a', 'b'], 'primary')).toBe('c');
    expect(nextThumbnail('', before, ['c', 'a', 'b'], 'primary')).toBe('c');
  });

  it('follows reorders only when the thumbnail was empty or the old first image', () => {
    expect(nextThumbnail('', before, ['b', 'a', 'c'], 'move')).toBe('b');
    expect(nextThumbnail(' a ', before, ['b', 'a', 'c'], 'move')).toBe('b');
    expect(nextThumbnail('x', before, ['b', 'a', 'c'], 'move')).toBe('x');
    expect(nextThumbnail('a', before, ['b', 'c'], 'remove')).toBe('b');
    // The first image did not change.
    expect(nextThumbnail('x', before, ['a', 'c', 'b'], 'move')).toBe('x');
  });

  it('follows a corrected first image only when the thumbnail matched it', () => {
    expect(nextThumbnail('a', before, ['a2', 'b', 'c'], 'edit')).toBe('a2');
    expect(nextThumbnail(' a ', ['', 'a', 'b'], ['', 'a2', 'b'], 'edit')).toBe('a2');
    // A hand-picked or empty thumbnail stays.
    expect(nextThumbnail('x', before, ['a2', 'b', 'c'], 'edit')).toBe('x');
    expect(nextThumbnail('', before, ['a2', 'b', 'c'], 'edit')).toBe('');
    // Another row was edited, or the first row was cleared.
    expect(nextThumbnail('a', before, ['a', 'b2', 'c'], 'edit')).toBe('a');
    expect(nextThumbnail('a', before, ['', 'b', 'c'], 'edit')).toBe('a');
  });

  it('ignores adding, empty rows and an empty list', () => {
    expect(nextThumbnail('a', before, [...before, ''], 'add')).toBe('a');
    expect(nextThumbnail('a', ['', 'a', 'b'], ['', 'b', 'a'], 'move')).toBe('b');
    expect(nextThumbnail('a', ['a'], [], 'remove')).toBe('a');
  });
});

describe('primaryImageIndex', () => {
  it('finds the row matching the thumbnail', () => {
    expect(primaryImageIndex(['a', 'b'], ' b ')).toBe(1);
    expect(primaryImageIndex(['a', ' b '], 'b')).toBe(1);
    expect(primaryImageIndex(['a', 'b'], 't')).toBe(-1);
  });

  it('falls back to the first saved row without a thumbnail', () => {
    expect(primaryImageIndex(['', 'a', 'b'], '')).toBe(1);
    expect(primaryImageIndex(['', ' '], '')).toBe(-1);
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
      screen.queryByRole('button', { name: 'Jadikan utama, gambar 1' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jadikan utama, gambar 3' }));
    expect(imageUrls()).toEqual([
      'https://cdn.test/c.jpg',
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
    ]);
    const reordered = screen.getAllByTestId('product-form-image-row');
    expect(within(reordered[0]).getByTestId('product-form-image-primary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Gambar dijadikan utama dan dipakai sebagai thumbnail.',
    );
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

    await user.click(screen.getByRole('button', { name: 'Jadikan utama, gambar 2' }));
    await user.click(screen.getByTestId('product-form-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].images).toEqual([
      'https://cdn.test/b.jpg',
      'https://cdn.test/a.jpg',
      'https://cdn.test/c.jpg',
    ]);
  });

  it('set as primary also makes the image the thumbnail, even when one was set', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(undefined, {
      ...VALUES,
      thumbnail: 'https://cdn.test/thumb.jpg',
    });

    await user.click(screen.getByRole('button', { name: 'Jadikan utama, gambar 3' }));
    expect(screen.getByTestId('product-form-thumbnail')).toHaveValue('https://cdn.test/c.jpg');
    await user.click(screen.getByTestId('product-form-submit'));

    const input = onSubmit.mock.calls[0][0];
    expect(input.thumbnail).toBe('https://cdn.test/c.jpg');
    expect(input.images).toEqual([
      'https://cdn.test/c.jpg',
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
    ]);
  });

  it('keeps a hand-picked thumbnail through ordinary reorders', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(undefined, {
      ...VALUES,
      thumbnail: 'https://cdn.test/thumb.jpg',
    });

    await user.click(screen.getByRole('button', { name: 'Pindahkan gambar 2 ke atas' }));
    // The thumbnail is none of the gallery images, so no row claims to be primary and
    // every row (the first included) offers "Set as primary".
    expect(screen.queryByTestId('product-form-image-primary')).not.toBeInTheDocument();
    for (const position of [1, 2, 3]) {
      expect(
        screen.getByRole('button', { name: `Jadikan utama, gambar ${position}` }),
      ).toBeEnabled();
    }
    await user.click(screen.getByTestId('product-form-submit'));

    const input = onSubmit.mock.calls[0][0];
    expect(input.thumbnail).toBe('https://cdn.test/thumb.jpg');
    expect(input.images?.[0]).toBe('https://cdn.test/b.jpg');
  });

  it('badges the image matching the thumbnail, wherever it is', () => {
    renderForm(undefined, { ...VALUES, thumbnail: 'https://cdn.test/b.jpg' });

    const rows = screen.getAllByTestId('product-form-image-row');
    expect(within(rows[1]).getByTestId('product-form-image-primary')).toBeInTheDocument();
    expect(screen.getAllByTestId('product-form-image-primary')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Jadikan utama, gambar 1' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Jadikan utama, gambar 2' }),
    ).not.toBeInTheDocument();
  });

  it('sets the first image as primary when the thumbnail is another image', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(undefined, {
      ...VALUES,
      thumbnail: 'https://cdn.test/thumb.jpg',
      images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
    });

    expect(screen.queryByTestId('product-form-image-primary')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Jadikan utama, gambar 1' }));

    expect(screen.getByTestId('product-form-thumbnail')).toHaveValue('https://cdn.test/a.jpg');
    const rows = screen.getAllByTestId('product-form-image-row');
    expect(within(rows[0]).getByTestId('product-form-image-primary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Gambar dijadikan utama dan dipakai sebagai thumbnail.',
    );
    // The pressed button became the badge; focus stays on the row.
    expect(screen.getByRole('button', { name: 'Pindahkan gambar 1 ke bawah' })).toHaveFocus();

    await user.click(screen.getByTestId('product-form-submit'));
    const input = onSubmit.mock.calls[0][0];
    expect(input.thumbnail).toBe('https://cdn.test/a.jpg');
    expect(input.images).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
  });

  it('does not badge a first image added to a product that only has a thumbnail', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(undefined, {
      ...VALUES,
      thumbnail: 'https://cdn.test/thumb.jpg',
      images: [],
    });

    await user.click(screen.getByRole('button', { name: 'Tambah gambar' }));
    await user.type(screen.getByRole('textbox', { name: 'URL gambar 1' }), '/img/a.jpg');

    expect(screen.queryByTestId('product-form-image-primary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jadikan utama, gambar 1' })).toBeEnabled();
    expect(screen.getByTestId('product-form-thumbnail')).toHaveValue('https://cdn.test/thumb.jpg');

    await user.click(screen.getByTestId('product-form-submit'));
    const input = onSubmit.mock.calls[0][0];
    expect(input.thumbnail).toBe('https://cdn.test/thumb.jpg');
    expect(input.images).toEqual(['/img/a.jpg']);
  });

  it('keeps the thumbnail on the first image while its URL is corrected', async () => {
    const user = userEvent.setup();
    renderForm(undefined, { ...VALUES, thumbnail: 'https://cdn.test/a.jpg' });

    await user.type(screen.getByRole('textbox', { name: 'URL gambar 1' }), '?v=2');
    expect(screen.getByTestId('product-form-thumbnail')).toHaveValue('https://cdn.test/a.jpg?v=2');
    const rows = screen.getAllByTestId('product-form-image-row');
    expect(within(rows[0]).getByTestId('product-form-image-primary')).toBeInTheDocument();

    // It keeps following later reorders.
    await user.click(screen.getByRole('button', { name: 'Pindahkan gambar 1 ke bawah' }));
    expect(screen.getByTestId('product-form-thumbnail')).toHaveValue('https://cdn.test/b.jpg');
  });

  it('moves a thumbnail that matched the first image along with reorders', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(undefined, {
      ...VALUES,
      thumbnail: 'https://cdn.test/a.jpg',
    });

    await user.click(screen.getByRole('button', { name: 'Pindahkan gambar 1 ke bawah' }));
    await user.click(screen.getByTestId('product-form-submit'));

    const input = onSubmit.mock.calls[0][0];
    expect(input.thumbnail).toBe('https://cdn.test/b.jpg');
    expect(input.images?.[0]).toBe('https://cdn.test/b.jpg');
  });

  it('badges the first image that will be saved, skipping empty rows', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm(undefined, {
      ...VALUES,
      images: ['', 'https://cdn.test/b.jpg'],
    });

    const rows = screen.getAllByTestId('product-form-image-row');
    expect(within(rows[0]).queryByTestId('product-form-image-primary')).not.toBeInTheDocument();
    expect(within(rows[1]).getByTestId('product-form-image-primary')).toBeInTheDocument();
    // An empty row cannot be made primary.
    expect(screen.getByRole('button', { name: 'Jadikan utama, gambar 1' })).toBeDisabled();

    await user.click(screen.getByTestId('product-form-submit'));
    expect(onSubmit.mock.calls[0][0].images).toEqual(['https://cdn.test/b.jpg']);
  });

  it('starts the set-primary name with its visible text (label in name)', () => {
    renderForm();
    const button = screen.getByRole('button', { name: 'Jadikan utama, gambar 2' });
    expect(button).toHaveTextContent('Jadikan utama');
  });

  it('keeps edited URLs attached to their row while reordering', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Tambah gambar' }));
    await user.type(screen.getByRole('textbox', { name: 'URL gambar 4' }), '/img/d.jpg');
    await user.click(screen.getByRole('button', { name: 'Jadikan utama, gambar 4' }));
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

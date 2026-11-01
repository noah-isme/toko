/**
 * CSV import flow: pick a file, dry-run preview with row errors, confirm, and
 * the committed result. The upload goes through the shared mock resolver
 * directly (jsdom's FormData cannot be sent by Node's fetch).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import ProductImportPage from '@/app/(admin)/admin/products/import/page';
import { adminApi } from '@/entities/admin/api';
import type { ImportResult, ImportType } from '@/entities/admin/types';
import { ApiClientError } from '@/lib/api/apiClient';
import { MOCK_ADMIN_TOKEN, adminProducts } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/resolvers/session';
import { handleMockRequest } from '@/mocks/route';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

const ADMIN = { headers: new Headers({ authorization: `Bearer ${MOCK_ADMIN_TOKEN}` }) };

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Same contract as the real client: 200 data, 422 details returned, other errors thrown. */
async function importViaResolver(file: File, type: ImportType, dryRun: boolean) {
  const text = await readFile(file);
  const result = handleMockRequest(
    'admin/products/import',
    'POST',
    { fields: {}, files: { file: { name: file.name, type: file.type, size: file.size, text } } },
    'import-test',
    new URLSearchParams({ type, dryRun: String(dryRun) }),
    ADMIN,
  ) as Record<string, any>;
  if (result.status === 422) return result.error.details as ImportResult;
  if (result.status) {
    throw new ApiClientError(
      result.error.message,
      result.error.code,
      result.status,
      result.error.details,
    );
  }
  return result.data as ImportResult;
}

const importSpy = vi.spyOn(adminApi, 'importProductsCsv');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderWithIntl(<ProductImportPage />, { locale: 'en', wrapper });
}

const product = adminProducts[0];
const sku = product.variants[0].sku as string;
const csv = (text: string, name = 'stock.csv') => new File([text], name, { type: 'text/csv' });

beforeEach(() => {
  resetMockState();
  toast.mockReset();
  importSpy.mockReset();
  importSpy.mockImplementation(importViaResolver);
});

afterEach(() => resetMockState());

describe('admin product CSV import', () => {
  it('previews a stock file, then confirms and shows the saved result', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Stock only' }));
    await userEvent.upload(
      screen.getByLabelText('CSV file'),
      csv(`sku;stock\r\n${sku};42\r\n${adminProducts[1].variants[0].sku};20\r\n`),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check file' }));

    const dryRun = await screen.findByTestId('import-dry-run');
    expect(
      within(dryRun).getByText('This is a preview. Nothing has been saved yet.'),
    ).toBeVisible();
    expect(within(dryRun).getByTestId('import-summary-update')).toHaveTextContent('1');
    expect(within(dryRun).getByTestId('import-summary-unchanged')).toHaveTextContent('1');
    // Unchanged rows are hidden until asked for.
    expect(within(dryRun).getAllByTestId('import-row')).toHaveLength(1);
    expect(within(dryRun).getByTestId('import-row')).toHaveTextContent('stock: 20 → 42');
    await userEvent.click(within(dryRun).getByRole('checkbox', { name: 'Show unchanged rows' }));
    expect(within(dryRun).getAllByTestId('import-row')).toHaveLength(2);
    expect(importSpy).toHaveBeenLastCalledWith(expect.any(File), 'stock', true);

    await userEvent.click(within(dryRun).getByRole('button', { name: 'Import 1 change' }));
    const committed = await screen.findByTestId('import-committed');
    expect(within(committed).getByText('These are the saved results.')).toBeVisible();
    expect(importSpy).toHaveBeenLastCalledWith(expect.any(File), 'stock', false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Import complete' }));
    expect(screen.getByRole('button', { name: 'Import another file' })).toBeInTheDocument();
  });

  it('shows row errors and blocks the import while any row is rejected', async () => {
    renderPage();
    await userEvent.upload(
      screen.getByLabelText('CSV file'),
      csv(
        `sku,variant_id,stock,stock_baseline\r\n${sku},${product.variants[0].id},30,99\r\nNEW-9,,,\r\n`,
        'products.csv',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Check file' }));

    const dryRun = await screen.findByTestId('import-dry-run');
    expect(within(dryRun).getByText(/2 rows have errors/)).toBeVisible();
    const [stale, missing] = within(dryRun).getAllByTestId('import-row');
    expect(stale).toHaveAttribute('data-action', 'reject');
    expect(within(stale).getByTestId('import-row-errors')).toHaveTextContent(
      'Stock changed since the export',
    );
    expect(within(missing).getAllByRole('cell')[0]).toHaveTextContent('3');
    expect(within(missing).getByTestId('import-row-errors')).toHaveTextContent(
      'title is required to create a product.',
    );
    expect(within(dryRun).getByTestId('import-confirm')).toBeDisabled();
  });

  it('explains header errors and rejects non-CSV files before uploading', async () => {
    renderPage();
    const input = screen.getByLabelText('CSV file');
    await userEvent.upload(input, csv('sku,colour\r\nA,red\r\n', 'bad.csv'));
    await userEvent.click(screen.getByRole('button', { name: 'Check file' }));
    expect(await screen.findByTestId('import-problem')).toHaveTextContent(
      'Unknown column "colour". Use the column names from an export.',
    );

    await userEvent.upload(input, new File(['x'], 'book.xlsx'), { applyAccept: false });
    expect(screen.getByTestId('import-problem')).toHaveTextContent('Choose a .csv file.');
    await userEvent.click(screen.getByRole('button', { name: 'Check file' }));
    expect(importSpy).toHaveBeenCalledTimes(1);
  });

  it('says to retry when the catalog is busy', async () => {
    importSpy.mockRejectedValueOnce(
      new ApiClientError('busy', 'CONFLICT', 409, { retryable: true }),
    );
    renderPage();
    await userEvent.upload(screen.getByLabelText('CSV file'), csv(`sku,stock\r\n${sku},1\r\n`));
    await userEvent.click(screen.getByRole('button', { name: 'Check file' }));
    await waitFor(() =>
      expect(screen.getByTestId('import-problem')).toHaveTextContent(
        'The catalog is busy with another change.',
      ),
    );
  });
});

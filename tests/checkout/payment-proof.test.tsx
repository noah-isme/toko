import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { PaymentInstructionsPanel } from '@/app/(storefront)/checkout/review/_components/PaymentInstructionsPanel';
import { ApiClientError, NetworkError } from '@/lib/api/apiClient';

const uploadProof = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/services/payment', () => ({
  paymentApi: { uploadProof },
}));

const instructions = {
  provider: 'manual',
  channel: 'bank',
  steps: ['Transfer the total'],
};

function renderPanel() {
  return renderWithIntl(
    <PaymentInstructionsPanel orderId="order-1" instructions={instructions} />,
    {
      locale: 'en',
    },
  );
}

function makeFile(name: string, type: string, size = 1024) {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function selectFile(file: File) {
  fireEvent.change(screen.getByLabelText('Proof of payment (optional)'), {
    target: { files: [file] },
  });
}

beforeEach(() => {
  uploadProof.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('payment proof upload', () => {
  it('describes the accepted formats and limits the picker to them', () => {
    renderPanel();
    const input = screen.getByLabelText('Proof of payment (optional)');
    expect(input).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp,image/gif,application/pdf',
    );
    expect(input).toHaveAccessibleDescription('JPG, PNG, WebP, GIF, or PDF, up to 5 MB.');
  });

  it('rejects unsupported types before uploading', () => {
    renderPanel();
    selectFile(makeFile('notes.txt', 'text/plain'));

    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file format');
    expect(screen.getByRole('button', { name: 'Upload proof' })).toBeDisabled();
    expect(screen.getByLabelText('Proof of payment (optional)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('rejects files over 5 MB', () => {
    renderPanel();
    selectFile(makeFile('big.png', 'image/png', 5 * 1024 * 1024 + 1));

    expect(screen.getByRole('alert')).toHaveTextContent('File size exceeds 5 MB.');
    expect(screen.getByRole('button', { name: 'Upload proof' })).toBeDisabled();
  });

  it('previews images and revokes the object URL when replaced', () => {
    renderPanel();
    selectFile(makeFile('receipt.png', 'image/png'));

    expect(screen.getByRole('img', { name: 'Payment proof preview' })).toHaveAttribute(
      'src',
      'blob:preview',
    );
    expect(screen.getByTestId('payment-proof-name')).toHaveTextContent(
      'Selected file: receipt.png',
    );

    selectFile(makeFile('receipt.pdf', 'application/pdf'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(screen.queryByRole('img', { name: 'Payment proof preview' })).not.toBeInTheDocument();
    expect(screen.getByTestId('payment-proof-name')).toHaveTextContent(
      'Selected file: receipt.pdf',
    );
  });

  it('uploads a valid file', async () => {
    const user = userEvent.setup();
    uploadProof.mockResolvedValue({ data: { id: 'p1', orderId: 'order-1', filename: 'a.pdf' } });
    renderPanel();
    const file = makeFile('a.pdf', 'application/pdf');
    selectFile(file);

    await user.click(screen.getByRole('button', { name: 'Upload proof' }));

    expect(uploadProof).toHaveBeenCalledWith('order-1', file);
    expect(await screen.findByRole('button', { name: 'Proof sent' })).toBeDisabled();
  });

  it("shows the server's error message", async () => {
    const user = userEvent.setup();
    uploadProof.mockRejectedValue(
      new ApiClientError('payment proof must be a file up to 5MB', 'BAD_REQUEST', 400),
    );
    renderPanel();
    selectFile(makeFile('a.pdf', 'application/pdf'));

    await user.click(screen.getByRole('button', { name: 'Upload proof' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('payment proof must be a file up to 5MB'),
    );
  });

  it('falls back to the generic message on network errors', async () => {
    const user = userEvent.setup();
    uploadProof.mockRejectedValue(new NetworkError());
    renderPanel();
    selectFile(makeFile('a.pdf', 'application/pdf'));

    await user.click(screen.getByRole('button', { name: 'Upload proof' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to upload the proof of payment.'),
    );
  });
});

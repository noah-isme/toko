'use client';

import { FileText } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api/apiClient';
import { paymentApi } from '@/lib/api/services/payment';
import type { PaymentInstructions } from '@/lib/api/services/payment';
import { ACCEPTED_IMAGE_TYPES, validateFile } from '@/shared/lib/fileValidation';

/** Mirrors the API limit for `POST /payments/{orderId}/proof` (5 MB; the API accepts any type). */
export const PAYMENT_PROOF_MAX_SIZE_MB = 5;
/** Common receipt formats: web images, phone camera photos (HEIC/HEIF) and PDF. */
export const PAYMENT_PROOF_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;
/** Accepted when the picker reports no MIME type (some Android / Windows pickers). */
export const PAYMENT_PROOF_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.pdf',
] as const;

/** Only formats every browser can render get an inline preview; others show the file name. */
const PREVIEWABLE_TYPES: readonly string[] = ACCEPTED_IMAGE_TYPES;

type ProofErrorKey =
  | 'proofTooLarge'
  | 'proofUnsupported'
  | 'proofErrorUnauthorized'
  | 'proofErrorNotFound'
  | 'proofErrorRejected'
  | 'uploadFailed';

/**
 * Maps an upload failure to a localized message key. The API's messages are English only
 * (`internal/payment/handlers.go`), so its text is shown only for codes not listed here (`null`).
 */
export function paymentProofErrorKey(error: unknown): ProofErrorKey | null {
  if (!(error instanceof ApiClientError)) return 'uploadFailed';
  if (error.status === 413 || /\b5\s?MB\b|too large/i.test(error.message)) return 'proofTooLarge';
  if (error.status === 415) return 'proofUnsupported';
  switch (error.code) {
    case 'UNAUTHORIZED':
      return 'proofErrorUnauthorized';
    case 'NOT_FOUND':
      return 'proofErrorNotFound';
    case 'BAD_REQUEST':
    case 'VALIDATION_ERROR':
      return 'proofErrorRejected';
    case 'UNKNOWN':
    case 'INTERNAL':
    case 'INTERNAL_ERROR':
    case 'PAYMENT_NOT_CONFIGURED':
      return 'uploadFailed';
    default:
      if (error.status === 401) return 'proofErrorUnauthorized';
      if (error.status === 404) return 'proofErrorNotFound';
      if (error.status >= 500) return 'uploadFailed';
      return error.message.trim() ? null : 'uploadFailed';
  }
}

export function PaymentInstructionsPanel({
  orderId,
  instructions,
}: {
  orderId: string;
  instructions: PaymentInstructions;
}) {
  const t = useTranslations('checkout.review.instructions');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hintId = useId();
  const errorId = useId();
  const bankNumber = instructions.bank?.accountNumber;
  const copyBank = async () => {
    if (bankNumber) await navigator.clipboard.writeText(bankNumber);
  };

  // Object URL for the image preview; revoked when the file changes or the panel unmounts.
  useEffect(() => {
    if (
      !file ||
      !PREVIEWABLE_TYPES.includes(file.type) ||
      typeof URL.createObjectURL !== 'function'
    ) {
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setUploaded(false);
    if (!selected) {
      setFile(null);
      setError(null);
      return;
    }
    const validation = validateFile(selected, {
      acceptedTypes: PAYMENT_PROOF_TYPES,
      acceptedExtensions: PAYMENT_PROOF_EXTENSIONS,
      maxSizeMB: PAYMENT_PROOF_MAX_SIZE_MB,
    });
    if (validation) {
      setFile(null);
      setError(
        validation === 'tooLarge'
          ? t('proofTooLarge', { max: PAYMENT_PROOF_MAX_SIZE_MB })
          : t('proofUnsupported'),
      );
      event.target.value = '';
      return;
    }
    setError(null);
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await paymentApi.uploadProof(orderId, file);
      setUploaded(true);
    } catch (uploadError) {
      // Known API failures get a localized reason; the server's own (English) text is the last
      // resort for codes we do not recognise.
      const key = paymentProofErrorKey(uploadError);
      if (key === 'proofTooLarge') setError(t(key, { max: PAYMENT_PROOF_MAX_SIZE_MB }));
      else if (key) setError(t(key));
      else setError((uploadError as ApiClientError).message.trim());
    } finally {
      setUploading(false);
    }
  };
  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">
          {instructions.provider || t('providerFallback')}
          {instructions.channel ? ` • ${instructions.channel}` : ''}
        </p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {instructions.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {bankNumber ? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{t('bankTransfer')}</p>
          <p>
            {instructions.bank?.name || t('bankFallback')} •{' '}
            {instructions.bank?.accountName || t('accountFallback')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono font-semibold">{bankNumber}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyBank()}>
              {t('copy')}
            </Button>
          </div>
        </div>
      ) : null}
      {instructions.qrUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('qrTitle')}</p>
          <Image
            src={instructions.qrUrl}
            alt={t('qrAlt')}
            width={160}
            height={160}
            className="rounded border object-contain"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="payment-proof">
          {t('proofLabel')}
        </label>
        <input
          id="payment-proof"
          type="file"
          accept={[...PAYMENT_PROOF_TYPES, ...PAYMENT_PROOF_EXTENSIONS].join(',')}
          onChange={handleFileChange}
          disabled={uploading}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={error ? true : undefined}
          className="block w-full text-sm"
        />
        <p id={hintId} className="text-xs text-muted-foreground">
          {t('proofHint', { max: PAYMENT_PROOF_MAX_SIZE_MB })}
        </p>
        {file ? (
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob: object URLs of local files cannot go through next/image
              <img
                src={previewUrl}
                alt={t('proofPreviewAlt')}
                className="h-16 w-16 rounded object-cover"
              />
            ) : (
              <FileText aria-hidden="true" className="h-8 w-8 shrink-0 text-muted-foreground" />
            )}
            <p className="min-w-0 truncate text-sm" data-testid="payment-proof-name">
              {t('proofSelected', { name: file.name })}
            </p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={!file || uploading || uploaded}
          onClick={() => void upload()}
        >
          {uploaded ? t('proofUploaded') : uploading ? t('uploading') : t('upload')}
        </Button>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

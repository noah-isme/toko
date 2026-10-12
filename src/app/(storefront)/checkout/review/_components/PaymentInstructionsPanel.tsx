'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { paymentApi } from '@/lib/api/services/payment';
import type { PaymentInstructions } from '@/lib/api/services/payment';

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
  const bankNumber = instructions.bank?.accountNumber;
  const copyBank = async () => {
    if (bankNumber) await navigator.clipboard.writeText(bankNumber);
  };
  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await paymentApi.uploadProof(orderId, file);
      setUploaded(true);
    } catch {
      setError(t('uploadFailed'));
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
          accept="image/*,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!file || uploading || uploaded}
          onClick={() => void upload()}
        >
          {uploaded ? t('proofUploaded') : uploading ? t('uploading') : t('upload')}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}

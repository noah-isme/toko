'use client';

import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { downloadOrderInvoice, invoiceErrorKind } from '../api/invoice';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

interface InvoiceDownloadButtonProps {
  orderId: string;
  orderNumber?: string | null;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

/** Downloads the order's PDF invoice; failures surface as a toast. */
export function InvoiceDownloadButton({
  orderId,
  orderNumber,
  variant = 'outline',
  size,
  className,
}: InvoiceDownloadButtonProps) {
  const t = useTranslations('account.invoice');
  const { toast } = useToast();
  const [isDownloading, setDownloading] = useState(false);

  const handleClick = async () => {
    if (isDownloading) return;
    setDownloading(true);
    try {
      await downloadOrderInvoice(orderId, orderNumber);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('errorTitle'),
        description: t(`errors.${invoiceErrorKind(error)}`),
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isDownloading}
      aria-busy={isDownloading || undefined}
      className={cn('gap-2', className)}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      {isDownloading ? t('downloading') : t('download')}
    </Button>
  );
}

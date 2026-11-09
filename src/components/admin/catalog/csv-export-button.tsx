'use client';

import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/shared/ui/toast';

/**
 * Downloads a CSV export (fetch + blob, so the bearer token is sent). The
 * export covers every row matching the current filters, not just this page.
 */
export function CsvExportButton({
  label,
  onExport,
  testId,
}: {
  /**
   * What is exported, announced as the button's description. The accessible
   * name stays the visible text so voice control ("click Export CSV") works.
   */
  label: string;
  /** Resolves with the saved filename. */
  onExport: () => Promise<string>;
  testId?: string;
}) {
  const t = useTranslations('admin.catalog.export');
  const tCommon = useTranslations('admin.common');
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const descriptionId = useId();

  const handleClick = async () => {
    setPending(true);
    try {
      const filename = await onExport();
      toast({ title: t('success', { filename }), variant: 'success' });
    } catch (error) {
      toast({
        title: t('failed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleClick()}
        disabled={pending}
        aria-describedby={descriptionId}
        aria-busy={pending || undefined}
        data-testid={testId}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {pending ? t('exporting') : t('button')}
      </Button>
      <span id={descriptionId} className="sr-only">
        {label}
      </span>
    </>
  );
}

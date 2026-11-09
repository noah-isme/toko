'use client';

import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useDownloadAdminReportCsv } from '@/entities/admin/hooks';
import type { AdminReportKind, AdminReportRangeParams } from '@/entities/admin/types';
import { useToast } from '@/shared/ui/toast';

/** Downloads one report as CSV for the current range (and category filter, if any). */
export function ReportExportButton({
  report,
  reportLabel,
  params,
  disabled,
}: {
  report: AdminReportKind;
  /** Visible report name, used in the accessible label. */
  reportLabel: string;
  /** null while the picker range is invalid. */
  params: (Required<AdminReportRangeParams> & { categoryId?: string }) | null;
  disabled?: boolean;
}) {
  const t = useTranslations('admin.reports.export');
  const tCommon = useTranslations('admin.common');
  const { toast } = useToast();
  const download = useDownloadAdminReportCsv();

  const handleClick = async () => {
    if (!params) return;
    try {
      const filename = await download.mutateAsync({ report, params });
      toast({ title: t('success', { filename }), variant: 'success' });
    } catch (error) {
      toast({
        title: t('failed'),
        description: error instanceof Error ? error.message : tCommon('unknownError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleClick()}
      disabled={disabled || !params || download.isPending}
      aria-label={t('label', { report: reportLabel })}
      aria-busy={download.isPending || undefined}
      data-testid={`report-export-${report}`}
    >
      {download.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {download.isPending ? t('exporting') : t('button')}
    </Button>
  );
}

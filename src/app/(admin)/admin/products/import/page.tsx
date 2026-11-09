'use client';

import { AlertCircle, ArrowLeft, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ImportPreview, importChangeCount } from '@/components/admin/catalog/import-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { IMPORT_MAX_BYTES } from '@/entities/admin/api/catalog-ops';
import { apiErrorInfo, isRetryableConflict } from '@/entities/admin/catalog-errors';
import { useImportProductsCsv } from '@/entities/admin/hooks';
import type { ImportResult, ImportType } from '@/entities/admin/types';
import { useToast } from '@/shared/ui/toast';

const KNOWN_ERRORS = new Set([
  'UNSUPPORTED_FILE',
  'INVALID_ENCODING',
  'EMPTY_FILE',
  'INVALID_CSV',
  'TOO_MANY_ROWS',
  'INVALID_HEADER',
  'DUPLICATE_HEADER',
  'MISSING_HEADER',
  'PAYLOAD_TOO_LARGE',
]);

/** Client-side checks before upload; the server re-validates everything. */
function checkFile(file: File): 'notCsv' | 'tooLarge' | null {
  if (!/\.csv$/i.test(file.name)) return 'notCsv';
  if (file.size > IMPORT_MAX_BYTES) return 'tooLarge';
  return null;
}

export default function ProductImportPage() {
  const t = useTranslations('admin.catalog.import');
  const tCommon = useTranslations('admin.common');
  const { toast } = useToast();
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const importCsv = useImportProductsCsv();

  const [type, setType] = useState<ImportType>('products');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const clearResult = () => {
    setResult(null);
    setProblem(null);
  };

  const describeError = (error: unknown): string => {
    if (isRetryableConflict(error)) return t('errors.CONFLICT');
    const info = apiErrorInfo(error);
    if (info && (KNOWN_ERRORS.has(info.code) || info.status === 413)) {
      const code = info.status === 413 ? 'PAYLOAD_TOO_LARGE' : info.code;
      // Dynamic key: the code comes from the server, so the typed overload cannot check it.
      const tLoose = t as unknown as (
        key: string,
        values: Record<string, string | number>,
      ) => string;
      return tLoose(`errors.${code}`, {
        header: String(info.details.header ?? ''),
        row: Number(info.details.row ?? 0),
        max: Number(info.details.max ?? 5000),
      });
    }
    return error instanceof Error ? `${t('errors.generic')} ${error.message}` : t('errors.generic');
  };

  const run = async (dryRun: boolean) => {
    if (!file) {
      setProblem(t('noFile'));
      return;
    }
    const local = checkFile(file);
    if (local) {
      setProblem(t(local));
      return;
    }
    setProblem(null);
    try {
      const next = await importCsv.mutateAsync({ file, type, dryRun });
      setResult(next);
      if (!next.dryRun && next.summary.rejected === 0) {
        toast({ title: t('confirmed'), variant: 'success' });
      }
    } catch (error) {
      setProblem(describeError(error));
    }
  };

  const reset = () => {
    setFile(null);
    clearResult();
    if (fileInput.current) fileInput.current.value = '';
  };

  const committed = result !== null && !result.dryRun && result.summary.rejected === 0;
  const changes = result ? importChangeCount(result) : 0;
  const canConfirm =
    result !== null && result.dryRun && result.summary.rejected === 0 && changes > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('back')}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="space-y-5 pt-6">
            <fieldset className="space-y-2" disabled={importCsv.isPending || committed}>
              <legend className="text-sm font-medium">{t('type')}</legend>
              {(['products', 'stock'] as const).map((value) => (
                <div key={value} className="flex items-start gap-2">
                  <input
                    type="radio"
                    id={`${ids}-type-${value}`}
                    name={`${ids}-type`}
                    value={value}
                    checked={type === value}
                    onChange={() => {
                      setType(value);
                      clearResult();
                    }}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <div>
                    <Label htmlFor={`${ids}-type-${value}`} className="font-normal">
                      {t(value === 'products' ? 'typeProducts' : 'typeStock')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(value === 'products' ? 'typeProductsHint' : 'typeStockHint')}
                    </p>
                  </div>
                </div>
              ))}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor={`${ids}-file`}>{t('file')}</Label>
              <input
                ref={fileInput}
                id={`${ids}-file`}
                type="file"
                accept=".csv,text/csv"
                disabled={importCsv.isPending || committed}
                aria-describedby={`${ids}-file-hint`}
                data-testid="import-file"
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  setFile(next);
                  clearResult();
                  if (next) {
                    const local = checkFile(next);
                    if (local) setProblem(t(local));
                  }
                }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
              />
              <p id={`${ids}-file-hint`} className="text-xs text-muted-foreground">
                {t('fileHint')}
              </p>
            </div>

            {problem ? (
              <div
                role="alert"
                className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
                data-testid="import-problem"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <p>{problem}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {committed ? (
                <Button type="button" onClick={reset}>
                  {t('reset')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void run(true)}
                  disabled={!file || importCsv.isPending}
                  aria-busy={(importCsv.isPending && importCsv.variables?.dryRun) || undefined}
                  data-testid="import-preview-button"
                >
                  {importCsv.isPending && importCsv.variables?.dryRun ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {importCsv.isPending && importCsv.variables?.dryRun
                    ? t('previewing')
                    : t('preview')}
                </Button>
              )}
              {result && !committed ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={reset}
                  disabled={importCsv.isPending}
                >
                  {tCommon('cancel')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('tips.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
              <li>{t('tips.dataImport')}</li>
              <li>{t('tips.baseline')}</li>
              <li>{t('tips.prices')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Card data-testid={committed ? 'import-committed' : 'import-dry-run'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {committed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
              ) : null}
              {committed ? t('committedTitle') : t('previewTitle')}
            </CardTitle>
            <CardDescription aria-live="polite">
              {result.summary.rejected > 0
                ? t('rejectedNote', { count: result.summary.rejected })
                : committed
                  ? t('committedNote')
                  : changes === 0
                    ? t('nothingToDo')
                    : t('previewNote')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportPreview result={result} />
            {result.dryRun ? (
              <Button
                type="button"
                onClick={() => void run(false)}
                disabled={!canConfirm || importCsv.isPending}
                aria-busy={(importCsv.isPending && !importCsv.variables?.dryRun) || undefined}
                data-testid="import-confirm"
              >
                {importCsv.isPending && !importCsv.variables?.dryRun ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {importCsv.isPending && !importCsv.variables?.dryRun
                  ? t('confirming')
                  : t('confirm', { count: changes })}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

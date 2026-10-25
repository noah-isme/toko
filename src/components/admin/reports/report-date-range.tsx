'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  REPORT_RANGE_PRESETS,
  presetRange,
  validateReportRange,
  type ReportDateRange,
  type ReportRangePreset,
} from '@/entities/admin/report-range';

export interface ReportRangeValue {
  preset: ReportRangePreset;
  range: ReportDateRange;
}

/**
 * Shared date-range picker for the admin reports: presets ending today plus
 * inclusive From/To day inputs. Editing a day switches to "Custom"; an invalid
 * range is announced and flagged on the inputs (callers hold the query back).
 */
export function ReportDateRangePicker({
  value,
  onChange,
}: {
  value: ReportRangeValue;
  onChange: (value: ReportRangeValue) => void;
}) {
  const t = useTranslations('admin.reports.range');
  const tRanges = useTranslations('admin.ranges');
  const id = useId();
  const error = validateReportRange(value.range);
  const errorId = `${id}-error`;

  const setDay = (key: keyof ReportDateRange, day: string) =>
    onChange({ preset: 'custom', range: { ...value.range, [key]: day } });

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{t('label')}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-preset`} className="text-xs text-muted-foreground">
            {t('label')}
          </Label>
          <Select
            value={value.preset}
            onValueChange={(preset) => {
              if (preset === 'custom') onChange({ ...value, preset: 'custom' });
              else
                onChange({
                  preset: preset as ReportRangePreset,
                  range: presetRange(preset as Exclude<ReportRangePreset, 'custom'>),
                });
            }}
          >
            <SelectTrigger id={`${id}-preset`} className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {tRanges(preset)}
                </SelectItem>
              ))}
              <SelectItem value="custom">{t('custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-from`} className="text-xs text-muted-foreground">
            {t('from')}
          </Label>
          <Input
            id={`${id}-from`}
            type="date"
            className="w-[160px]"
            value={value.range.from}
            max={value.range.to || undefined}
            onChange={(event) => setDay('from', event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-to`} className="text-xs text-muted-foreground">
            {t('to')}
          </Label>
          <Input
            id={`${id}-to`}
            type="date"
            className="w-[160px]"
            value={value.range.to}
            min={value.range.from || undefined}
            onChange={(event) => setDay('to', event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </fieldset>
  );
}

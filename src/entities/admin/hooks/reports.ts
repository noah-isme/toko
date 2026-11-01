import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { AdminReportKind, AdminReportProductParams, AdminReportRangeParams } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

/** Reports run only for a valid range; pass `enabled: false` while the picker is invalid. */
type ReportOptions = { enabled?: boolean };

export function useAdminSalesByCategoryReport(
  params: AdminReportRangeParams,
  { enabled = true }: ReportOptions = {},
) {
  return useQuery({
    queryKey: adminKeys.report('sales-by-category', params),
    queryFn: () => adminApi.getSalesByCategoryReport(params),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAdminSalesByProductReport(
  params: AdminReportProductParams,
  { enabled = true }: ReportOptions = {},
) {
  return useQuery({
    queryKey: adminKeys.report('sales-by-product', params),
    queryFn: () => adminApi.getSalesByProductReport(params),
    staleTime: STALE_TIME,
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAdminConversionReport(
  params: AdminReportRangeParams,
  { enabled = true }: ReportOptions = {},
) {
  return useQuery({
    queryKey: adminKeys.report('conversion', params),
    queryFn: () => adminApi.getConversionReport(params),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useAdminCustomersReport(
  params: AdminReportRangeParams,
  { enabled = true }: ReportOptions = {},
) {
  return useQuery({
    queryKey: adminKeys.report('customers', params),
    queryFn: () => adminApi.getCustomersReport(params),
    staleTime: STALE_TIME,
    enabled,
  });
}

/** Downloads a report CSV; resolves with the saved filename. */
export function useDownloadAdminReportCsv() {
  return useMutation({
    mutationFn: ({
      report,
      params,
    }: {
      report: AdminReportKind;
      params: Required<AdminReportRangeParams> & { categoryId?: string };
    }) => adminApi.downloadReportCsv(report, params),
  });
}

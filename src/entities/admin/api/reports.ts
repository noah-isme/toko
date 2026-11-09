import { reportCsvFilename } from '../report-range';
import type {
  AdminReportConversion,
  AdminReportCustomers,
  AdminReportKind,
  AdminReportProductParams,
  AdminReportRangeParams,
  AdminReportSalesByCategory,
  AdminReportSalesByProduct,
} from '../types';

import { buildQuery } from './query';

import { apiClient, apiDownload } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';
import { saveBlob } from '@/lib/download';

async function getReport<T>(report: AdminReportKind, params: object): Promise<T> {
  const response = await apiClient<ApiResponse<T>>(
    `/admin/reports/${report}${buildQuery(params)}`,
    { requiresAuth: true },
  );
  return response.data;
}

export const adminReportsApi = {
  getSalesByCategoryReport(params: AdminReportRangeParams = {}) {
    return getReport<AdminReportSalesByCategory>('sales-by-category', params);
  },

  /** Paginated: the whole envelope (data, pagination, range) is returned. */
  getSalesByProductReport(params: AdminReportProductParams = {}) {
    return apiClient<AdminReportSalesByProduct>(
      `/admin/reports/sales-by-product${buildQuery(params)}`,
      { requiresAuth: true },
    );
  },

  getConversionReport(params: AdminReportRangeParams = {}) {
    return getReport<AdminReportConversion>('conversion', params);
  },

  getCustomersReport(params: AdminReportRangeParams = {}) {
    return getReport<AdminReportCustomers>('customers', params);
  },

  /**
   * Downloads a report as CSV (`format=csv`) and saves it in the browser. The
   * file keeps the server bytes (UTF-8 BOM included); the filename comes from
   * Content-Disposition, falling back to the backend's naming scheme. Page and
   * limit are dropped: the export always covers the whole range.
   */
  async downloadReportCsv(
    report: AdminReportKind,
    params: Required<AdminReportRangeParams> & { categoryId?: string },
  ): Promise<string> {
    const { blob, filename: suggested } = await apiDownload(
      `/admin/reports/${report}${buildQuery({ ...params, format: 'csv' })}`,
      { requiresAuth: true, accept: 'text/csv' },
    );
    const filename = suggested ?? reportCsvFilename(report, params);
    saveBlob(blob, filename);
    return filename;
  },
};

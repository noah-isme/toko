import { z, type ZodType } from 'zod';

import { apiClient } from '../apiClient';
import type {
  Voucher,
  CreateVoucherRequest,
  UpdateVoucherRequest,
  VoucherPreviewRequest,
  VoucherPreviewResponse,
  OffsetLimitPagination,
  OffsetPaginatedResponse,
} from '../types';

const voucherSchema: ZodType<Voucher> = z.object({
  id: z.string(),
  code: z.string(),
  kind: z.union([z.literal('fixed_amount'), z.literal('percent')]),
  value: z.number(),
  percentBps: z.number().optional(),
  minSpend: z.number(),
  usageLimit: z.number().optional(),
  usedCount: z.number(),
  perUserLimit: z.number().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  productIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  brandIds: z.array(z.string()),
  combinable: z.boolean(),
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tenantId: z.string(),
});

const voucherListResponseSchema = z.object({
  data: z.array(voucherSchema),
  total: z.number().optional(),
});

const voucherPreviewResponseSchema: ZodType<VoucherPreviewResponse> = z.object({
  eligible: z.boolean(),
  discount: z.number(),
  eligibleSubtotal: z.number(),
  finalTotal: z.number(),
  voucher: voucherSchema,
  message: z.string().optional(),
});

export const vouchersApi = {
  /** List all vouchers (admin) — offset-based pagination, max limit 200 */
  async list(params?: OffsetLimitPagination): Promise<OffsetPaginatedResponse<Voucher>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient(`/vouchers${query}`, {
      method: 'GET',
      requiresAuth: true,
      schema: voucherListResponseSchema,
    });
  },

  /** Create a new voucher (admin) */
  async create(data: CreateVoucherRequest): Promise<Voucher> {
    return apiClient('/vouchers', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
      schema: z.object({ data: voucherSchema }),
    }).then((res) => res.data);
  },

  /** Get a voucher by code (admin) */
  async get(code: string): Promise<Voucher> {
    return apiClient(`/vouchers/${encodeURIComponent(code)}`, {
      method: 'GET',
      requiresAuth: true,
      schema: z.object({ data: voucherSchema }),
    }).then((res) => res.data);
  },

  /** Update a voucher by code (admin) */
  async update(code: string, data: UpdateVoucherRequest): Promise<Voucher> {
    return apiClient(`/vouchers/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
      schema: z.object({ data: voucherSchema }),
    }).then((res) => res.data);
  },

  /** Delete a voucher by code (admin) */
  async delete(code: string): Promise<void> {
    await apiClient(`/vouchers/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /** Preview voucher discount without applying (admin) */
  async preview(request: VoucherPreviewRequest): Promise<VoucherPreviewResponse> {
    return apiClient('/vouchers/preview', {
      method: 'POST',
      body: JSON.stringify(request),
      requiresAuth: true,
      schema: voucherPreviewResponseSchema,
    });
  },
};

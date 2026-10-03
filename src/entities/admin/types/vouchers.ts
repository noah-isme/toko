/** Admin voucher DTOs. */

export type AdminVoucherKind = 'percent' | 'fixed_amount';

export interface AdminVoucher {
  id: string;
  code: string;
  kind: AdminVoucherKind;
  /** Fixed discount amount; 0 for percent vouchers. */
  value: number;
  /** Percentage in basis points (1000 = 10%). */
  percentBps?: number | null;
  minSpend: number;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  combinable: boolean;
  priority: number;
  productIds: string[];
  categoryIds: string[];
  brandIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminVoucherInput {
  code: string;
  kind: AdminVoucherKind;
  value?: number;
  percentBps?: number | null;
  minSpend?: number;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  combinable?: boolean;
  priority?: number;
  productIds?: string[];
  categoryIds?: string[];
  brandIds?: string[];
}

export interface AdminVoucherListParams {
  page?: number;
  limit?: number;
  search?: string;
  kind?: AdminVoucherKind | 'all';
}

export interface AdminVoucherStats {
  totalVouchers: number;
  activeVouchers: number;
  totalUsage: number;
}

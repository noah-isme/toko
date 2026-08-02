import { apiClient } from '../apiClient';

export interface PublicVoucher {
  id: string;
  code: string;
  kind: 'percent' | 'fixed_amount';
  value: number;
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

export interface FlashSaleItem {
  id: string;
  productId: string;
  title: string;
  slug: string;
  originalPrice: number;
  salePrice: number;
  discountBps: number;
  stock: number;
  stockLimit?: number | null;
  soldCount: number;
  thumbnail?: string | null;
}

export interface FlashSaleCampaign {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  startsAt: string;
  endsAt: string;
  items: FlashSaleItem[];
}

export const promotionsApi = {
  async listVouchers(): Promise<PublicVoucher[]> {
    const response = await apiClient<{ data: PublicVoucher[] }>('/vouchers');
    return response.data ?? [];
  },

  async listFlashSales(): Promise<FlashSaleCampaign[]> {
    const response = await apiClient<{ data: FlashSaleCampaign[] }>('/flash-sales');
    return response.data ?? [];
  },
};

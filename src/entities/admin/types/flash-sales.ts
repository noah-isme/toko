/** Admin flash-sale DTOs. */

export type AdminFlashSaleStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED';

export interface AdminFlashSaleItem {
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

export interface AdminFlashSale {
  id: string;
  name: string;
  slug: string;
  status: AdminFlashSaleStatus;
  startsAt: string;
  endsAt: string;
  items: AdminFlashSaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminFlashSaleItemInput {
  productId: string;
  salePrice: number;
  stockLimit?: number | null;
}

export interface AdminFlashSaleInput {
  name: string;
  slug: string;
  status?: AdminFlashSaleStatus;
  startsAt: string;
  endsAt: string;
  items: AdminFlashSaleItemInput[];
}

export interface AdminFlashSaleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminFlashSaleStatus | 'all';
}

export interface AdminFlashSaleStatusUpdate {
  id: string;
  status: AdminFlashSaleStatus;
  updatedAt: string;
}

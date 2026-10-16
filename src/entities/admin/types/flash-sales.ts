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

/**
 * PATCH /admin/flash-sales/{id} body (docs/contracts/admin.md §6.4). Every field
 * is optional; `items` replaces the campaign's items, keeping those sent with `id`.
 */
export interface AdminFlashSaleUpdateInput {
  name?: string;
  slug?: string;
  status?: AdminFlashSaleStatus;
  startsAt?: string;
  endsAt?: string;
  items?: Array<AdminFlashSaleItemInput & { id?: string }>;
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

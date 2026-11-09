/** Admin product DTOs (`/api/v1/admin/products`). */

/** Only `published` products are visible and purchasable on the storefront. */
export type AdminProductStatus = 'draft' | 'published' | 'archived';

/**
 * Stock classification computed by the backend against the effective low-stock
 * threshold: `out` at 0, `low` at 1..threshold, `in` above.
 */
export type AdminStockStatus = 'in' | 'low' | 'out';

export type AdminProductSortField = 'name' | 'price' | 'stock' | 'created' | 'updated';
export type AdminProductSort = AdminProductSortField | `${AdminProductSortField}:${'asc' | 'desc'}`;

export interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compareAt?: number | null;
  inStock: boolean;
  /** Sum of variant stock. */
  stock: number;
  thumbnail?: string | null;
  badges: string[];
  description?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  variantCount: number;
  /** Primary (first) variant SKU, when the product has variants. */
  sku?: string | null;
  /** Absent on backends older than the catalog-ops release; treat as `published`. */
  status?: AdminProductStatus;
  stockStatus?: AdminStockStatus;
  /** Product override; null means the store default applies. */
  lowStockThreshold?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface AdminProductSpec {
  key: string;
  value: string;
}

export interface AdminProductVariant {
  id: string;
  sku?: string | null;
  price: number;
  stock: number;
  attributes: Record<string, unknown>;
}

export interface AdminProductDetail extends AdminProduct {
  images: AdminProductImage[];
  specs: AdminProductSpec[];
  variants: AdminProductVariant[];
}

export interface AdminProductVariantInput {
  /** Omit to insert a new variant; provide to update an existing one. */
  id?: string;
  sku?: string | null;
  price?: number;
  stock?: number;
  attributes?: Record<string, unknown>;
}

export interface AdminProductInput {
  title?: string;
  /** Derived from the title when omitted on create. */
  slug?: string;
  price?: number;
  compareAt?: number | null;
  inStock?: boolean;
  thumbnail?: string | null;
  badges?: string[];
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  status?: AdminProductStatus;
  /** 0..1000000; null clears the override (store default applies). */
  lowStockThreshold?: number | null;
  /** Replaces the whole image collection when present. */
  images?: string[];
  /** Replaces the whole spec collection when present. */
  specs?: AdminProductSpec[];
  variants?: AdminProductVariantInput[];
}

export interface AdminProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Category slug. */
  category?: string;
  /** Brand slug. */
  brand?: string;
  inStock?: boolean;
  sort?: AdminProductSort;
  status?: AdminProductStatus;
  stockStatus?: AdminStockStatus;
}

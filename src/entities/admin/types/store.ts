/** Inventory, customer and store-settings DTOs. */

import type { AdminStockStatus } from './products';

export interface AdminInventoryItem {
  variantId: string;
  productId: string;
  sku?: string | null;
  productTitle: string;
  price: number;
  stock: number;
  /** Per-variant classification against `lowStockThreshold`. */
  stockStatus?: AdminStockStatus;
  /** Effective threshold (product override, else store default, else 5). */
  lowStockThreshold?: number;
}

export interface AdminInventoryParams {
  stockStatus?: AdminStockStatus;
}

/** `settings.inventory` document; other keys are kept as sent. */
export interface InventorySettings {
  /** Store-wide default, 0..1000000 (0 never reports low). Absent means 5. */
  lowStockThreshold?: number;
  [key: string]: unknown;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StoreSettings {
  [key: string]: unknown;
}

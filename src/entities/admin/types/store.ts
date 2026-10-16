/** Inventory, customer and store-settings DTOs. */

export interface AdminInventoryItem {
  variantId: string;
  productId: string;
  sku?: string | null;
  productTitle: string;
  price: number;
  stock: number;
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

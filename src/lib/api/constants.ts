/**
 * Constants for UI components
 */
import type { OrderStatus, ShipmentStatus, PaymentMethod } from './types';

export interface StatusLabel {
  label: string;
  color: 'yellow' | 'blue' | 'purple' | 'green' | 'red' | 'gray';
  icon?: string;
}

/**
 * Order status labels in Indonesian
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, StatusLabel> = {
  pending_payment: {
    label: 'Menunggu Pembayaran',
    color: 'yellow',
    icon: 'clock',
  },
  paid: {
    label: 'Dibayar',
    color: 'blue',
    icon: 'check',
  },
  processing: {
    label: 'Diproses',
    color: 'blue',
    icon: 'box',
  },
  shipped: {
    label: 'Dikirim',
    color: 'purple',
    icon: 'truck',
  },
  delivered: {
    label: 'Selesai',
    color: 'green',
    icon: 'check-circle',
  },
  cancelled: {
    label: 'Dibatalkan',
    color: 'red',
    icon: 'x-circle',
  },
};

/**
 * Shipment status labels in Indonesian
 */
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, StatusLabel> = {
  pending: {
    label: 'Menunggu Pengiriman',
    color: 'yellow',
    icon: 'clock',
  },
  picked_up: {
    label: 'Diambil Kurir',
    color: 'blue',
    icon: 'box',
  },
  in_transit: {
    label: 'Dalam Perjalanan',
    color: 'blue',
    icon: 'truck',
  },
  on_delivery: {
    label: 'Sedang Diantar',
    color: 'purple',
    icon: 'map-pin',
  },
  delivered: {
    label: 'Terkirim',
    color: 'green',
    icon: 'check-circle',
  },
  failed: {
    label: 'Gagal Dikirim',
    color: 'red',
    icon: 'x-circle',
  },
};

/**
 * Payment method labels in Indonesian
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Transfer Bank',
  virtual_account: 'Virtual Account',
  credit_card: 'Kartu Kredit',
  ewallet_gopay: 'GoPay',
  ewallet_ovo: 'OVO',
  ewallet_dana: 'DANA',
};

/**
 * Courier names
 */
export const COURIER_NAMES: Record<string, string> = {
  jne: 'JNE',
  pos: 'Pos Indonesia',
  tiki: 'TIKI',
  sicepat: 'SiCepat',
  jnt: 'J&T Express',
};

/**
 * Product sort options
 */
export const PRODUCT_SORT_OPTIONS = [
  { value: 'price:asc', label: 'Harga Terendah' },
  { value: 'price:desc', label: 'Harga Tertinggi' },
  { value: 'title:asc', label: 'Nama A-Z' },
  { value: 'title:desc', label: 'Nama Z-A' },
] as const;

/**
 * Pagination defaults
 */
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Price ranges for filters
 */
export const PRICE_RANGES = [
  { label: 'Di bawah Rp 100.000', min: 0, max: 100000 },
  { label: 'Rp 100.000 - Rp 500.000', min: 100000, max: 500000 },
  { label: 'Rp 500.000 - Rp 1.000.000', min: 500000, max: 1000000 },
  { label: 'Rp 1.000.000 - Rp 5.000.000', min: 1000000, max: 5000000 },
  { label: 'Di atas Rp 5.000.000', min: 5000000, max: undefined },
] as const;

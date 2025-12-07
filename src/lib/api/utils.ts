/**
 * API Utility Functions
 */
import { ApiClientError } from './apiClient';
import type { ApiErrorCode } from './types';

/**
 * Format currency in Indonesian Rupiah
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Indonesian locale
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('id-ID', defaultOptions).format(new Date(date));
}

/**
 * Format date and time in Indonesian locale
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get user-friendly error message based on error code
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return getApiErrorMessage(error.code as ApiErrorCode) || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui';
}

/**
 * Get localized error messages for API error codes
 */
function getApiErrorMessage(code: ApiErrorCode): string | null {
  const errorMessages: Record<ApiErrorCode, string> = {
    UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.',
    FORBIDDEN: 'Anda tidak memiliki akses ke resource ini.',
    NOT_FOUND: 'Data yang Anda cari tidak ditemukan.',
    BAD_REQUEST: 'Permintaan tidak valid. Periksa kembali data Anda.',
    VALIDATION_ERROR: 'Data yang Anda masukkan tidak valid.',
    INTERNAL: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    UNAVAILABLE: 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.',
    CART_EXPIRED: 'Keranjang Anda telah kedaluwarsa. Silakan mulai belanja lagi.',
    OUT_OF_STOCK: 'Maaf, produk tidak tersedia atau stok tidak mencukupi.',
    VOUCHER_INVALID: 'Kode voucher tidak valid atau sudah kedaluwarsa.',
    VOUCHER_MIN_SPEND: 'Belum memenuhi minimum pembelian untuk menggunakan voucher ini.',
    VOUCHER_ALREADY_USED: 'Anda sudah menggunakan voucher ini sebelumnya.',
    RATE_LIMIT_EXCEEDED: 'Terlalu banyak percobaan. Silakan tunggu sebentar.',
  };

  return errorMessages[code] || null;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercent(originalPrice: number, price: number): number {
  if (originalPrice <= 0 || price >= originalPrice) {
    return 0;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Build query string from filters object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate UUID v4 for guest user ID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate Indonesian phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Indonesian phone numbers: +62 or 0, followed by 8-13 digits
  const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Format phone number to Indonesian format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Convert to +62 format
  if (cleaned.startsWith('0')) {
    return `+62${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('62')) {
    return `+${cleaned}`;
  }
  return `+62${cleaned}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

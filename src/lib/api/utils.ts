/**
 * API Utility Functions
 */
import { ApiClientError } from './apiClient';
import type { ApiErrorCode } from './types';

// Currency and date formatting moved to `@/shared/i18n/format` (plain code) and
// `@/shared/i18n/use-format` (components): both follow the active locale.

/**
 * `errors` catalog keys `getErrorMessage` resolves: `api.<ApiErrorCode>` for known API error
 * codes and `unknown` for values that are not errors.
 */
export type ErrorMessageKey = `api.${ApiErrorCode}` | 'unknown';

/** The `errors` translator (`useTranslations('errors')`), narrowed to the keys used here. */
export type ErrorMessageTranslator = (key: ErrorMessageKey) => string;

/**
 * `id` texts of the `errors.api.*`/`errors.unknown` catalog keys, used when no translator is
 * passed (non-React callers). Components pass their `errors` translator instead.
 */
const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
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

const UNKNOWN_ERROR_MESSAGE = 'Terjadi kesalahan yang tidak diketahui';

function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(API_ERROR_MESSAGES, code);
}

/**
 * Get a user-friendly error message based on the error code. Pass the `errors` translator to get
 * the message in the active locale; without it the `id` text is returned.
 */
export function getErrorMessage(error: unknown, t?: ErrorMessageTranslator): string {
  if (error instanceof ApiClientError) {
    if (isApiErrorCode(error.code)) {
      return t ? t(`api.${error.code}`) : API_ERROR_MESSAGES[error.code];
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t ? t('unknown') : UNKNOWN_ERROR_MESSAGE;
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

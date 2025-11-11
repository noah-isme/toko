import type { FavoriteItem } from './types';

const GUEST_ID_KEY = 'toko:guest-id';
const FAVORITES_KEY = 'toko:favorites:guest';

function canUseStorage(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function getGuestId(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    let guestId = window.sessionStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      window.sessionStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to get guest ID:', error);
    }
    return null;
  }
}

export function readGuestFavorites(): FavoriteItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is FavoriteItem =>
        item &&
        typeof item === 'object' &&
        typeof item.productId === 'string' &&
        typeof item.addedAt === 'string',
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to read guest favorites:', error);
    }
    return [];
  }
}

export function writeGuestFavorites(items: FavoriteItem[]): boolean {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to write guest favorites:', error);
    }
    return false;
  }
}

export function mergeGuestFavorites(serverItems: FavoriteItem[]): FavoriteItem[] {
  const guestItems = readGuestFavorites();
  if (guestItems.length === 0) {
    return serverItems;
  }

  const productIdSet = new Set(serverItems.map((item) => item.productId));
  const uniqueGuestItems = guestItems.filter((item) => !productIdSet.has(item.productId));

  return [...serverItems, ...uniqueGuestItems];
}

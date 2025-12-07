import { addressSchema } from './schemas';
import type { Address } from './types';

const STORAGE_KEY = 'toko:addresses:guest';
const DEFAULT_ADDRESS_ID_KEY = 'toko:addresses:guest:default';
const GUEST_ID_KEY = 'toko:guest-id';

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

export function getGuestAddressOwnerId(): string | null {
  if (typeof window === 'undefined') {
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
      console.warn('Failed to access guest session id', error);
    }
    return null;
  }
}

export function readGuestAddresses(): Address[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => {
        const result = addressSchema.safeParse(value);
        return result.success ? result.data : null;
      })
      .filter((item): item is Address => Boolean(item));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to read guest addresses', error);
    }
    return [];
  }
}

export function writeGuestAddresses(addresses: Address[]): boolean {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to write guest addresses', error);
    }
    return false;
  }
}

export function upsertGuestAddress(address: Address): Address[] {
  const items = readGuestAddresses();
  const index = items.findIndex((item) => item.id === address.id);
  if (index >= 0) {
    items[index] = address;
  } else {
    items.unshift(address);
  }

  writeGuestAddresses(items);
  return items;
}

export function removeGuestAddress(id: string): Address[] {
  const items = readGuestAddresses();
  const next = items.filter((item) => item.id !== id);
  writeGuestAddresses(next);

  const currentDefault = getGuestDefaultId();
  if (currentDefault === id) {
    setGuestDefaultId(next[0]?.id ?? null);
  }

  return next;
}

export function getGuestDefaultId(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(DEFAULT_ADDRESS_ID_KEY);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to read guest default address id', error);
    }
    return null;
  }
}

export function setGuestDefaultId(id: string | null): boolean {
  if (!canUseStorage()) {
    return false;
  }

  try {
    if (!id) {
      window.localStorage.removeItem(DEFAULT_ADDRESS_ID_KEY);
    } else {
      window.localStorage.setItem(DEFAULT_ADDRESS_ID_KEY, id);
    }
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to set guest default address id', error);
    }
    return false;
  }
}

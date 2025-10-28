import type { OrderDraft } from '@/entities/checkout/api/hooks';

const STORAGE_PREFIX = 'checkout:orderDraft';
const LATEST_KEY = `${STORAGE_PREFIX}:latest`;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window.sessionStorage;
    const probeKey = `${STORAGE_PREFIX}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch (error) {
    // ignore and try localStorage
  }

  try {
    const storage = window.localStorage;
    const probeKey = `${STORAGE_PREFIX}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch (error) {
    return null;
  }
}

function getStorageKey(orderId: string) {
  return `${STORAGE_PREFIX}:${orderId}`;
}

export function saveOrderDraft(orderId: string, draft: OrderDraft) {
  const storage = getStorage();
  if (!storage || !orderId) {
    return;
  }

  try {
    storage.setItem(getStorageKey(orderId), JSON.stringify(draft));
    storage.setItem(LATEST_KEY, orderId);
  } catch (error) {
    // If quota exceeded, attempt to clear existing entry and retry once
    try {
      storage.removeItem(getStorageKey(orderId));
      storage.setItem(getStorageKey(orderId), JSON.stringify(draft));
      storage.setItem(LATEST_KEY, orderId);
    } catch (innerError) {
      // ignore
    }
  }
}

export function loadOrderDraft(orderId: string | null): OrderDraft | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const resolvedOrderId = orderId && orderId !== '' ? orderId : storage.getItem(LATEST_KEY);
  if (!resolvedOrderId) {
    return null;
  }

  const raw = storage.getItem(getStorageKey(resolvedOrderId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OrderDraft;
  } catch (error) {
    return null;
  }
}

export function clearOrderDraft(orderId: string | null) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const resolvedOrderId = orderId && orderId !== '' ? orderId : storage.getItem(LATEST_KEY);
  if (!resolvedOrderId) {
    return;
  }

  storage.removeItem(getStorageKey(resolvedOrderId));

  const latestId = storage.getItem(LATEST_KEY);
  if (latestId === resolvedOrderId) {
    storage.removeItem(LATEST_KEY);
  }
}

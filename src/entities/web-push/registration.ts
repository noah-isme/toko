export const SERVICE_WORKER_TIMEOUT_MS = 10_000;

export const SERVICE_WORKER_UNAVAILABLE_MESSAGE =
  'Service worker is not active. Push notifications need the production service worker ' +
  '(in development, set NEXT_PUBLIC_SW_DEV=true).';

/**
 * Resolves the active service-worker registration used for push.
 *
 * Unlike `navigator.serviceWorker.ready`, which never settles when no worker
 * is registered (development, where the worker is opt-in), this rejects with a
 * clear error after `timeoutMs` so subscribe/unsubscribe cannot hang.
 */
export async function getServiceWorkerRegistration(
  timeoutMs: number = SERVICE_WORKER_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser');
  }

  const container = navigator.serviceWorker;
  const existing = await container.getRegistration();
  if (existing?.active) {
    return existing;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(SERVICE_WORKER_UNAVAILABLE_MESSAGE)), timeoutMs);
  });

  try {
    return await Promise.race([container.ready, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

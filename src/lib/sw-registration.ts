// Service Worker Registration Script
// This script registers the service worker for push notifications

export interface ServiceWorkerRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false, error: new Error('Service Worker not supported') };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    console.log('Service Worker registered successfully:', registration.scope);
    
    return { success: true, registration };
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return { success: false, error: error as Error };
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

export async function updateServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('Service Worker update check completed');
    }
  } catch (error) {
    console.error('Service Worker update failed:', error);
  }
}

export function onServiceWorkerUpdate(callback: (registration: ServiceWorkerRegistration) => void): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    navigator.serviceWorker.ready.then((reg) => {
      callback(reg);
    });
  });

  navigator.serviceWorker.ready.then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker installed, notify user
            callback(reg);
          }
        });
      }
    });
  });

  return () => {
    // Cleanup if needed
  };
}
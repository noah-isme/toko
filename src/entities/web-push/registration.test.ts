import { getServiceWorkerRegistration, SERVICE_WORKER_UNAVAILABLE_MESSAGE } from './registration';

type ContainerStub = {
  getRegistration: ReturnType<typeof vi.fn>;
  ready: Promise<ServiceWorkerRegistration>;
};

const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

function stubContainer(container: ContainerStub | undefined) {
  if (container === undefined) {
    // jsdom has no serviceWorker; make sure nothing leaks in from other tests.
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    return;
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
}

function registration(active: boolean): ServiceWorkerRegistration {
  return { active: active ? ({} as ServiceWorker) : null } as ServiceWorkerRegistration;
}

describe('getServiceWorkerRegistration', () => {
  afterEach(() => {
    vi.useRealTimers();
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalDescriptor);
    } else {
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    }
  });

  it('returns the existing active registration without waiting for ready', async () => {
    const active = registration(true);
    stubContainer({
      getRegistration: vi.fn().mockResolvedValue(active),
      ready: new Promise(() => {}),
    });

    await expect(getServiceWorkerRegistration()).resolves.toBe(active);
  });

  it('waits for ready when the registration is still installing', async () => {
    const ready = registration(true);
    stubContainer({
      getRegistration: vi.fn().mockResolvedValue(registration(false)),
      ready: Promise.resolve(ready),
    });

    await expect(getServiceWorkerRegistration(50)).resolves.toBe(ready);
  });

  it('rejects with a clear error when no worker becomes active before the timeout', async () => {
    vi.useFakeTimers();
    stubContainer({
      getRegistration: vi.fn().mockResolvedValue(undefined),
      ready: new Promise(() => {}),
    });

    const pending = getServiceWorkerRegistration(1_000);
    const assertion = expect(pending).rejects.toThrow(SERVICE_WORKER_UNAVAILABLE_MESSAGE);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it('rejects when service workers are unsupported', async () => {
    stubContainer(undefined);

    await expect(getServiceWorkerRegistration()).rejects.toThrow(/not supported/);
  });
});

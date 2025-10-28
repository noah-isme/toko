let workerPromise: Promise<void> | undefined;

export const initMocks = async () => {
  if (typeof window === "undefined") {
    return;
  }

  if (process.env.NODE_ENV !== "development") {
    return;
  }

  if (!workerPromise) {
    workerPromise = import("@/mocks/browser").then(async ({ worker }) => {
      await worker.start({ onUnhandledRequest: "bypass" });
    });
  }

  await workerPromise;
};

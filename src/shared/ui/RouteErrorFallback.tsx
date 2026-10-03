'use client';

import { useEffect } from 'react';

import { captureSentryException } from '@/shared/telemetry/sentry';

type RouteErrorFallbackProps = {
  error: Error & { digest?: string };
  retry: () => void;
  variant: 'storefront' | 'admin';
};

const reported = new WeakSet<object>();

/** Segment-level error fallback; reports each error to Sentry once. */
export function RouteErrorFallback({ error, retry, variant }: RouteErrorFallbackProps) {
  useEffect(() => {
    if (reported.has(error)) return;
    reported.add(error);
    captureSentryException(error, { tags: { boundary: variant } });
  }, [error, variant]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-foreground"
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-destructive">Terjadi kesalahan</h2>
        <p className="text-muted-foreground">
          {variant === 'admin'
            ? 'Halaman admin gagal dimuat. Coba lagi.'
            : 'Terjadi kesalahan. Coba lagi.'}
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Kode: {error.digest}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
      >
        Coba lagi
      </button>
    </div>
  );
}

export default RouteErrorFallback;

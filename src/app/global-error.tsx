'use client';

import { useEffect } from 'react';

import './globals.css';

import { captureSentryException } from '@/shared/telemetry/sentry';

// Renders outside every provider (no next-intl, no theme): text is hard-coded
// bilingual, Indonesian first.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    captureSentryException(error, { tags: { boundary: 'global' } });
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Terjadi kesalahan</h1>
          <p className="text-sm text-muted-foreground">
            Terjadi kesalahan tak terduga. Silakan coba lagi.
          </p>
          <p lang="en" className="text-sm text-muted-foreground">
            Something went wrong. Please try again.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">Kode / Code: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
          >
            Coba lagi / Try again
          </button>
        </main>
      </body>
    </html>
  );
}

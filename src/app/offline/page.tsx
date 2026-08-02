'use client';

import { RefreshCw, WifiOff, Package, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  useEffect(() => {
    // Attempt to reload when back online
    const handleOnline = () => {
      window.location.reload();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">You&apos;re offline</h1>
          <p className="text-lg text-muted-foreground">
            No internet connection detected. Some features may be unavailable.
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-border/50 bg-card p-6">
          <h2 className="font-semibold text-foreground">What you can do:</h2>
          <ul className="mt-3 space-y-2 text-left text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0" aria-hidden="true" />
              Browse previously loaded products
            </li>
            <li className="flex items-center gap-2">
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              View cached pages
            </li>
            <li className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
              Page will auto-refresh when back online
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={() => window.location.reload()} className="w-full" size="lg">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full" size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to homepage
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The service worker will cache pages for offline access.
        </p>
      </div>
    </div>
  );
}

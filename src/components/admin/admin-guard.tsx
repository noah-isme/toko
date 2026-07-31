/**
 * Client-side admin gate.
 *
 * This is a UX guard, not a security boundary: every `/admin/*` API call is
 * separately authorised by the backend (RequireAuth + admin role), so a user who
 * bypasses this component still cannot read or mutate admin data.
 */
'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/admin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground" role="status">
          Checking permissions...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Your account does not have the admin role. Ask a store owner to grant it, then reload
            this page.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to store</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

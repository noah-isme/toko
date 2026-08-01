'use client';

import { LockKeyhole } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useOptionalAuth } from '@/components/providers/AuthProvider';

export function CustomerGuard({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();

  // The root app always has AuthProvider. This fallback keeps isolated page
  // renders (for example unit tests of the order detail) usable.
  if (!auth) {
    return <>{children}</>;
  }

  return (
    <CustomerGuardWithAuth isAuthenticated={auth.isAuthenticated} isLoading={auth.isLoading}>
      {children}
    </CustomerGuardWithAuth>
  );
}

function CustomerGuardWithAuth({
  children,
  isAuthenticated,
  isLoading,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="premium-surface mx-auto flex min-h-[44vh] max-w-md flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-2xl">Menyiapkan akun Anda</p>
          <p className="mt-1 text-sm text-muted-foreground">Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

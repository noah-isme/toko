'use client';

import { RouteErrorFallback } from '@/shared/ui/RouteErrorFallback';

export default function StorefrontError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteErrorFallback error={error} retry={retry} variant="storefront" />;
}

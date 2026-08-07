import { CheckoutSkeleton } from '@/shared/ui/skeletons/CheckoutSkeleton';

export default function CheckoutLoading() {
  return (
    <div className="space-y-8 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>
      <CheckoutSkeleton />
    </div>
  );
}

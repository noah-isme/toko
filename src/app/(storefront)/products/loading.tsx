import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';

export default function ProductsLoading() {
  return (
    <div className="space-y-8 py-8">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-12 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full max-w-xl rounded bg-muted" />
        </div>
      </div>
      <ProductCardSkeleton count={8} />
    </div>
  );
}

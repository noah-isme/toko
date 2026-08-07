import { ProductDetailSkeleton } from '@/shared/ui/skeletons/ProductDetailSkeleton';

export default function ProductDetailLoading() {
  return (
    <div className="space-y-12 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
      <ProductDetailSkeleton />
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 rounded-lg border border-border/60 p-4">
              <div className="aspect-square w-full rounded-xl bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-[80%] rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

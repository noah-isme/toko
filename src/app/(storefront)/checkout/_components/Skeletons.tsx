export function ShippingOptionsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 rounded-lg border border-border/50 bg-muted" />
      ))}
    </div>
  );
}

export function PaymentMethodSelectorSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 rounded-lg border border-border/50 bg-muted" />
      ))}
    </div>
  );
}

export function OrderSummarySkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-lg border p-6">
      <div className="h-5 w-1/3 bg-muted" />
      <div className="h-4 w-full bg-muted" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-1/3 bg-muted" />
            <div className="h-4 w-1/4 bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <div className="h-5 w-1/4 bg-muted" />
        <div className="h-5 w-1/3 bg-muted" />
      </div>
    </div>
  );
}

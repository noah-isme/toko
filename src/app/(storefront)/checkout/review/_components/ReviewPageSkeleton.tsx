import { cn } from '@/lib/utils';

export function ReviewPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className={cn('h-6 w-40 rounded bg-muted animate-pulse', 'prm:no-anim')} />
        <div className={cn('h-4 w-64 rounded bg-muted animate-pulse', 'prm:no-anim')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className={cn('h-40 rounded-lg border bg-muted animate-pulse', 'prm:no-anim')} />
          <div className={cn('h-40 rounded-lg border bg-muted animate-pulse', 'prm:no-anim')} />
        </div>
        <div className={cn('h-40 rounded-lg border bg-muted animate-pulse', 'prm:no-anim')} />
      </div>
    </div>
  );
}

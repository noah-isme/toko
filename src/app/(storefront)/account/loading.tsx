import { AccountDashboardSkeleton } from '@/shared/ui/skeletons/AccountDashboardSkeleton';

export default function AccountLoading() {
  return (
    <div className="space-y-8 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
      <AccountDashboardSkeleton />
    </div>
  );
}

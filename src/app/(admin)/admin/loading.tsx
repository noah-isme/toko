import { AdminLoading } from '@/components/admin/admin-ui';

export default function AdminDashboardLoading() {
  return (
    <div className="py-8">
      <AdminLoading label="Loading dashboard..." />
    </div>
  );
}

'use client';

import { Bell, Clock, Heart, LogOut, MapPin, Package, UserCircle, Award } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LazyWrapper, LazyLoyaltyDashboard } from '@/components/lazy-components';
import { useAuth } from '@/components/providers/AuthProvider';
import { RecentOrders } from '@/components/recent-orders';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { AccountDashboardSkeleton } from '@/shared/ui/skeletons/AccountDashboardSkeleton';
import { useToast } from '@/shared/ui/toast';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to logout' });
    }
  };

  if (isLoading) {
    return <AccountDashboardSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-sm text-muted-foreground">Please sign in to access your account.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Beranda', href: '/' }, { label: 'Akun' }]} />
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {user.emailVerified === false ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Email Anda belum terverifikasi.{' '}
            <Link href="/verify-email" className="font-medium text-amber-700 underline">
              Verifikasi sekarang
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Button asChild size="lg" className="h-auto py-6">
          <Link href="/account/profile" className="flex flex-col items-center gap-2">
            <UserCircle className="h-6 w-6" aria-hidden="true" />
            <span>Profile</span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-auto py-6">
          <Link href="/account/orders" className="flex flex-col items-center gap-2">
            <Package className="h-6 w-6" aria-hidden="true" />
            <span>View Orders</span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-auto py-6">
          <Link href="/account/addresses" className="flex flex-col items-center gap-2">
            <MapPin className="h-6 w-6" aria-hidden="true" />
            <span>Manage Addresses</span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="h-auto py-6">
          <Link href="/favorites" className="flex flex-col items-center gap-2">
            <Heart className="h-6 w-6" aria-hidden="true" />
            <span>Favorites</span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="h-auto py-6">
          <Link href="/account/searches" className="flex flex-col items-center gap-2">
            <Clock className="h-6 w-6" aria-hidden="true" />
            <span>Riwayat Pencarian</span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="h-auto py-6">
          <Link href="/account/loyalty" className="flex flex-col items-center gap-2">
            <Award className="h-6 w-6" aria-hidden="true" />
            <span>Loyalitas</span>
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="h-auto py-6">
          <Link href="/account/push-settings" className="flex flex-col items-center gap-2">
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span>Notifikasi Push</span>
          </Link>
        </Button>
        <Button size="lg" variant="ghost" onClick={handleLogout} className="h-auto py-6">
          <span className="flex flex-col items-center gap-2">
            <LogOut className="h-6 w-6" aria-hidden="true" />
            <span>Logout</span>
          </span>
        </Button>
      </div>

      <RecentOrders limit={5} />

      <LazyWrapper>
        <LazyLoyaltyDashboard />
      </LazyWrapper>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/shared/ui/toast';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({ variant: 'success', description: 'Logged out successfully' });
      router.push('/');
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to logout' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/orders">View Orders</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/account/addresses">Manage Addresses</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/favorites">Favorites</Link>
        </Button>
        <Button size="lg" variant="ghost" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}

/**
 * Admin shell: fixed sidebar on desktop, slide-over sheet on mobile, wrapped in
 * the client-side admin role guard.
 */
'use client';

import { LogOut, Menu, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminNav } from '@/components/admin/admin-nav';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function SidebarBrand() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 border-b px-4 py-4 text-base font-semibold tracking-tight"
    >
      <Store className="h-5 w-5 text-primary" aria-hidden="true" />
      <span>toko admin</span>
    </Link>
  );
}

function SidebarFooter() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="mt-auto space-y-3 border-t p-4">
      {user ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/">View store</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-muted/20">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
          <SidebarBrand />
          <AdminNav />
          <SidebarFooter />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open admin menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <div className="flex h-full flex-col">
                  <SidebarBrand />
                  <AdminNav onNavigate={() => setMobileOpen(false)} />
                  <SidebarFooter />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold">toko admin</span>
          </header>

          <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}

'use client';

import { User, LogIn, LogOut, ShoppingCart } from 'lucide-react';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { Container } from '@/components/layout/container';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const CartDrawer = dynamic(() => import('@/components/cart-drawer').then((mod) => mod.CartDrawer), {
  ssr: false,
  loading: () => (
    <Button variant="ghost" className="relative gap-2">
      <ShoppingCart aria-hidden="true" className="h-5 w-5" />
      <span aria-hidden="true" className="sr-only sm:not-sr-only">
        Cart
      </span>
    </Button>
  ),
});

const SearchAutocomplete = dynamic(
  () => import('@/components/search-autocomplete').then((mod) => mod.SearchAutocomplete),
  {
    ssr: false,
    loading: () => <div className="h-10 w-full max-w-lg rounded-md border bg-muted/20" />,
  },
);

const NotificationBell = dynamic(
  () => import('@/components/notification-bell').then((mod) => mod.NotificationBell),
  { ssr: false },
);

const navLinks = [
  { href: '/' as Route, label: 'Home' },
  { href: '/products' as Route, label: 'Products' },
  { href: '/featured-products' as Route, label: 'Featured' },
  { href: '/cart' as Route, label: 'Cart', requiresAuth: true },
  { href: '/account/orders' as Route, label: 'Orders', requiresAuth: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <Container className="flex h-[4.5rem] items-center gap-6">
        <Link
          href="/"
          className={cn(
            'font-display rounded-md px-2 py-1 text-2xl font-semibold tracking-tight',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          toko
        </Link>
        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {navLinks
            .filter((link) => !link.requiresAuth || isAuthenticated)
            .map((link) => (
              <Link
                key={link.href}
                className={cn(
                  'rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
        </nav>
        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          <Suspense fallback={null}>
            <SearchAutocomplete className="hidden md:flex" />
          </Suspense>
          {isAuthenticated ? <CartDrawer /> : null}
          {isAuthenticated && user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={'/account/notifications' as Route}>Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/addresses">Addresses</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites">Favorites</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/login" className="flex items-center gap-2">
                <LogIn aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Sign in</span>
              </Link>
            </Button>
          )}
        </div>
      </Container>
      <div className="border-t bg-muted/30 py-3 md:hidden">
        <Container>
          <Suspense fallback={null}>
            <SearchAutocomplete />
          </Suspense>
        </Container>
      </div>
    </header>
  );
}

'use client';

import { User } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { CartDrawer } from '@/components/cart-drawer';
import { Container } from '@/components/layout/container';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/' as Route, label: 'Home' },
  { href: '/products' as Route, label: 'Products' },
  { href: '/cart' as Route, label: 'Cart' },
  { href: '/orders' as Route, label: 'Orders' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center gap-6">
        <Link
          href="/"
          className={cn(
            'rounded-md px-2 py-1 text-lg font-semibold tracking-tight',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          toko
        </Link>
        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {navLinks.map((link) => (
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
            <SearchBar className="hidden md:flex" />
          </Suspense>
          <CartDrawer />
          <Button asChild variant="ghost">
            <Link
              href="/account"
              aria-label="Account"
              className="flex items-center gap-2 focus-visible:outline-none"
            >
              <User aria-hidden="true" className="h-4 w-4" />
              <span aria-hidden="true" className="sr-only sm:not-sr-only">
                Account
              </span>
            </Link>
          </Button>
        </div>
      </Container>
      <div className="border-t bg-muted/30 py-3 md:hidden">
        <Container>
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </Container>
      </div>
    </header>
  );
}

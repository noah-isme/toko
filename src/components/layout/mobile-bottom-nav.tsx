'use client';

import { Heart, Home, ShoppingBag, ShoppingCart, User } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCartQuery } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';

const navItems = [
  { href: '/' as Route, label: 'Home', icon: Home },
  { href: '/products' as Route, label: 'Produk', icon: ShoppingBag },
  {
    href: '/cart' as Route,
    label: 'Cart',
    icon: ShoppingCart,
    showBadge: true,
    requiresAuth: true,
  },
  { href: '/favorites' as Route, label: 'Favorit', icon: Heart, requiresAuth: true },
  { href: '/account' as Route, label: 'Akun', icon: User, requiresAuth: true },
];

const hiddenPrefixes = [
  '/checkout',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/order',
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const cartId = useCartStore((state) => state.cartId);
  const { data } = useCartQuery(cartId || undefined);
  const itemCount = data?.itemCount ?? 0;

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <Container>
        <div className="flex items-center justify-between gap-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
          {navItems
            .filter((item) => !item.requiresAuth || isAuthenticated)
            .map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const Icon = item.icon;
              const badge = item.showBadge && itemCount > 0 ? itemCount : null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="relative flex h-9 w-9 items-center justify-center">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {badge ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </div>
      </Container>
    </nav>
  );
}

'use client';

import { User, LogIn, LogOut, ShoppingCart } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { Container } from '@/components/layout/container';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import {
  LazyWrapper,
  LazyCartDrawer,
  LazySearchAutocomplete,
  LazyNotificationBell,
} from '@/components/lazy-components';
import { useAuth } from '@/components/providers/AuthProvider';
import { ThemeSelector } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type NavLinkKey = 'home' | 'products' | 'featured' | 'cart' | 'orders';

const navLinks: { href: Route; labelKey: NavLinkKey; requiresAuth?: boolean }[] = [
  { href: '/' as Route, labelKey: 'home' },
  { href: '/products' as Route, labelKey: 'products' },
  { href: '/featured-products' as Route, labelKey: 'featured' },
  { href: '/cart' as Route, labelKey: 'cart', requiresAuth: true },
  { href: '/account/orders' as Route, labelKey: 'orders', requiresAuth: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const t = useTranslations('nav');

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
                {t(`links.${link.labelKey}`)}
              </Link>
            ))}
        </nav>
        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          <Suspense fallback={null}>
            <LanguageSwitcher />
            <ThemeSelector />
            <LazyWrapper>
              <LazySearchAutocomplete className="hidden md:flex" />
            </LazyWrapper>
          </Suspense>
          {isAuthenticated ? (
            <LazyWrapper>
              <LazyCartDrawer />
            </LazyWrapper>
          ) : null}
          {isAuthenticated && user ? (
            <>
              <LazyWrapper>
                <LazyNotificationBell />
              </LazyWrapper>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/account">{t('account.account')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile">{t('account.profile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">{t('account.orders')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={'/account/notifications' as Route}>
                      {t('account.notifications')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/addresses">{t('account.addresses')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites">{t('account.favorites')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('account.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="ghost">
              <Link href="/login" className="flex items-center gap-2">
                <LogIn aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">{t('account.signIn')}</span>
              </Link>
            </Button>
          )}
        </div>
      </Container>
      <div className="border-t bg-muted/30 py-3 md:hidden">
        <Container>
          <Suspense fallback={null}>
            <LazyWrapper>
              <LazySearchAutocomplete />
            </LazyWrapper>
          </Suspense>
        </Container>
      </div>
    </header>
  );
}

/**
 * Admin sidebar navigation.
 *
 * Route hrefs are plain strings cast through `Route` because Next's typed routes
 * only resolve after a build; the paths correspond to real pages under
 * `src/app/(admin)/admin`.
 */
'use client';

import {
  BarChart3,
  Boxes,
  ClipboardList,
  Contact,
  MessageCircle,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  RotateCcw,
  Tag,
  Ticket,
  Webhook,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';

type NavLabelKey =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'categories'
  | 'brands'
  | 'orders'
  | 'vouchers'
  | 'flashSales'
  | 'returns'
  | 'support'
  | 'analytics'
  | 'webhooks'
  | 'auditLogs'
  | 'settings';

interface NavItem {
  href: string;
  /** Key under `admin.nav.items`. */
  labelKey: NavLabelKey;
  icon: ComponentType<{ className?: string }>;
  /** When true the link is active only on an exact path match. */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', labelKey: 'products', icon: Package },
  { href: '/admin/inventory', labelKey: 'inventory', icon: Boxes },
  { href: '/admin/customers', labelKey: 'customers', icon: Contact },
  { href: '/admin/categories', labelKey: 'categories', icon: Boxes },
  { href: '/admin/brands', labelKey: 'brands', icon: Tag },
  { href: '/admin/orders', labelKey: 'orders', icon: ShoppingCart },
  { href: '/admin/vouchers', labelKey: 'vouchers', icon: Ticket },
  { href: '/admin/flash-sales', labelKey: 'flashSales', icon: Zap },
  { href: '/admin/returns', labelKey: 'returns', icon: RotateCcw },
  { href: '/admin/support', labelKey: 'support', icon: MessageCircle },
  { href: '/admin/analytics', labelKey: 'analytics', icon: BarChart3 },
  { href: '/admin/webhooks', labelKey: 'webhooks', icon: Webhook },
  { href: '/admin/audit-logs', labelKey: 'auditLogs', icon: ClipboardList },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')} className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href as Parameters<typeof Link>[0]['href']}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t(`items.${labelKey}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { NAV_ITEMS as ADMIN_NAV_ITEMS };

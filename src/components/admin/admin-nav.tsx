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
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** When true the link is active only on an exact path match. */
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/customers', label: 'Customers', icon: Contact },
  { href: '/admin/categories', label: 'Categories', icon: Boxes },
  { href: '/admin/brands', label: 'Brands', icon: Tag },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/vouchers', label: 'Vouchers', icon: Ticket },
  { href: '/admin/flash-sales', label: 'Flash Sales', icon: Zap },
  { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/support', label: 'Support', icon: MessageCircle },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
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
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { NAV_ITEMS as ADMIN_NAV_ITEMS };

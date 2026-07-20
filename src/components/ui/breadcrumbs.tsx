'use client';

import { ChevronRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';

import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  /** Omit href on the current (last) page so it renders as plain text. */
  href?: Route | string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Hierarchical navigation trail. The last item is treated as the current page:
 * it is rendered as static text with `aria-current="page"` even if an href is
 * provided, so the trail always communicates where the user is.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const key = `${item.label}-${index}`;

          return (
            <Fragment key={key}>
              <li className="flex items-center">
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn('truncate', isLast && 'font-medium text-foreground')}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href as Route}
                    className="truncate transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

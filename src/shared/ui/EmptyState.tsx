import Link from 'next/link';
import * as React from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: {
    label: string;
    href: ComponentProps<typeof Link>['href'];
  };
  className?: string;
}

export function EmptyState({ icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <React.Fragment>
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 px-6 py-16 text-center',
          className,
        )}
      >
        {icon ? (
          <div className="text-muted-foreground [&>svg]:h-12 [&>svg]:w-12">{icon}</div>
        ) : null}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {cta ? (
          <Button asChild>
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : null}
      </div>
    </React.Fragment>
  );
}

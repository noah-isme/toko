import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center',
        className,
      )}
    >
      {icon}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

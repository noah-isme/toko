import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

export interface GuardedButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingLabel?: string;
  onClick?: () => Promise<void> | void;
}

export const GuardedButton = React.forwardRef<HTMLButtonElement, GuardedButtonProps>(
  ({ isLoading: isLoadingProp, loadingLabel, disabled, children, onClick, ...props }, ref) => {
    const rest = { ...props } as GuardedButtonProps & { ['data-state']?: string };
    const dataState = rest['data-state'];
    delete rest['data-state'];
    const [internalLoading, setInternalLoading] = React.useState(false);

    const isLoading = isLoadingProp ?? internalLoading;
    const computedDisabled = disabled || isLoading;

    const handleClick = React.useCallback(async () => {
      if (!onClick) {
        return;
      }

      if (computedDisabled) {
        return;
      }

      if (isLoadingProp === undefined && internalLoading) {
        return;
      }

      const result = onClick();

      if (isLoadingProp !== undefined) {
        return;
      }

      if (result && typeof (result as Promise<unknown>).then === 'function') {
        try {
          setInternalLoading(true);
          await result;
        } finally {
          setInternalLoading(false);
        }
      }
    }, [onClick, isLoadingProp, internalLoading, computedDisabled]);

    return (
      <Button
        ref={ref}
        disabled={computedDisabled}
        data-state={isLoading ? 'loading' : dataState}
        aria-busy={isLoading ? 'true' : undefined}
        onClick={handleClick}
        {...rest}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{loadingLabel ?? children}</span>
          </span>
        ) : (
          children
        )}
      </Button>
    );
  },
);

GuardedButton.displayName = 'GuardedButton';

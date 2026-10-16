import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type CheckoutStep = 'address' | 'review' | 'success';

/** Step order; each id is also its label key under `checkout.stepper.steps`. */
const STEPS: readonly CheckoutStep[] = ['address', 'review', 'success'];

interface CheckoutStepperProps {
  current: CheckoutStep;
  className?: string;
}

/**
 * Horizontal progress indicator for the three-page checkout flow
 * (/checkout → /checkout/review → /checkout/success).
 */
export function CheckoutStepper({ current, className }: CheckoutStepperProps) {
  const t = useTranslations('checkout.stepper');
  const currentIndex = STEPS.indexOf(current);

  return (
    <nav aria-label={t('label')} className={cn('w-full', className)}>
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === STEPS.length - 1;

          return (
            <li
              key={step}
              className={cn('flex items-center', !isLast && 'flex-1')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                    isComplete && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary text-primary',
                    !isComplete && !isCurrent && 'border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {isComplete ? (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  <span className="sr-only">
                    {t('stepOf', { step: index + 1, total: STEPS.length })}
                  </span>
                </span>
                <span
                  className={cn(
                    'hidden text-sm font-medium sm:inline',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t(`steps.${step}`)}
                </span>
              </div>

              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-2 h-px flex-1 sm:mx-4',
                    isComplete ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

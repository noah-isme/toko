'use client';

import { useTranslations } from 'next-intl';

import { useFormat } from '@/shared/i18n/use-format';

/** Sticky mobile bar showing the payable total and a button that scrolls to the order summary. */
export function MobileTotalBar({
  total,
  onShowDetails,
}: {
  total: number;
  onShowDetails: () => void;
}) {
  const t = useTranslations('checkout.mobileBar');
  const fmt = useFormat();
  return (
    <div className="lg:hidden">
      <div className="sticky bottom-0 z-40 -mx-4 flex items-center justify-between gap-4 border-t border-border/70 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t('total')}</p>
          <p className="text-lg font-semibold">{fmt.currency(total)}</p>
        </div>
        <button
          type="button"
          onClick={onShowDetails}
          className="prm:no-anim inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors duration-150 ease-out hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('details')}
        </button>
      </div>
    </div>
  );
}

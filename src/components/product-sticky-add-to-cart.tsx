'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Price } from '@/components/price';
import { GuardedButton } from '@/shared/ui/GuardedButton';

interface ProductStickyAddToCartProps {
  title: string;
  price: number;
  currency: string;
  variantLabel?: string | null;
  isOutOfStock: boolean;
  isLoading: boolean;
  onAddToCart: () => void;
}

/**
 * Fixed mobile/tablet bar (below `lg`) with the price and an add-to-cart button, shown while the
 * main add-to-cart button is scrolled out of view. Below `md` it sits above the mobile bottom nav
 * (`MobileBottomNav`, `md:hidden`); from `md` it docks to the bottom with safe-area padding.
 * Mirrors the checkout `MobileTotalBar` styling. While mounted it sets `data-sticky-cta` on
 * `<body>` so other fixed elements can offset themselves.
 */
export function ProductStickyAddToCart({
  title,
  price,
  currency,
  variantLabel,
  isOutOfStock,
  isLoading,
  onAddToCart,
}: ProductStickyAddToCartProps) {
  const t = useTranslations('product.detail');

  // Lets other floating UI (back-to-top, compare bar) move above this bar while it is shown.
  useEffect(() => {
    document.body.dataset.stickyCta = '';
    return () => {
      delete document.body.dataset.stickyCta;
    };
  }, []);

  return (
    <div
      role="region"
      aria-label={t('stickyBar.label')}
      data-testid="sticky-add-to-cart-bar"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border/70 bg-background/95 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur md:bottom-0 md:pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-xs text-muted-foreground">
            {variantLabel ? `${title} · ${variantLabel}` : title}
          </p>
          <Price amount={price} currency={currency} className="text-lg font-extrabold" />
        </div>
        <GuardedButton
          data-testid="sticky-add-to-cart"
          onClick={onAddToCart}
          disabled={isOutOfStock}
          isLoading={isLoading}
          loadingLabel={t('adding')}
          className="min-h-[44px] shrink-0"
        >
          {isOutOfStock ? t('outOfStock') : t('addToCart')}
        </GuardedButton>
      </div>
    </div>
  );
}

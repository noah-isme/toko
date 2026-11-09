'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { useHasReviewedProduct } from '@/entities/reviews/hooks';

interface OrderItemReviewCtaProps {
  productId: string;
  productSlug: string;
  productTitle: string;
}

/**
 * "Rate this product" link to the product's review form for a delivered order item. Hidden once
 * the signed-in user's review is found; shown when that cannot be checked.
 */
export function OrderItemReviewCta({
  productId,
  productSlug,
  productTitle,
}: OrderItemReviewCtaProps) {
  const t = useTranslations('account.orderDetail');
  const { user } = useAuth();
  const { hasReviewed, isLoading } = useHasReviewedProduct(productId, user?.id);

  if (!productSlug || hasReviewed || isLoading) {
    return null;
  }

  return (
    <Button asChild variant="outline" size="sm" className="gap-1.5">
      <Link href={`/products/${productSlug}#reviews`} data-testid="order-item-review-cta">
        <Star className="h-4 w-4" aria-hidden="true" />
        {t('rateProduct')}
        {/* Keeps the visible text in the accessible name while telling items apart. */}
        <span className="sr-only">: {productTitle}</span>
      </Link>
    </Button>
  );
}

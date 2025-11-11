'use client';

import { Heart } from 'lucide-react';
import { useCallback } from 'react';

import { useAddFavoriteMutation, useIsFavorite, useRemoveFavoriteMutation } from '../hooks';
import { getGuestId } from '../storage';

import { cn } from '@/lib/utils';

interface FavToggleProps {
  productId: string;
  size?: 'sm' | 'md';
  className?: string;
  userIdOrGuestId?: string;
}

export function FavToggle({ productId, size = 'md', className, userIdOrGuestId }: FavToggleProps) {
  const userId = userIdOrGuestId ?? getGuestId() ?? undefined;
  const isFavorite = useIsFavorite(productId, userId);
  const { mutate: addFavorite, isProductInFlight: isAddInFlight } = useAddFavoriteMutation(userId);
  const { mutate: removeFavorite, isProductInFlight: isRemoveInFlight } =
    useRemoveFavoriteMutation(userId);

  const isInFlight = isAddInFlight(productId) || isRemoveInFlight(productId);

  const handleToggle = useCallback(() => {
    if (isInFlight) {
      return;
    }

    if (isFavorite) {
      removeFavorite(productId);
    } else {
      addFavorite(productId);
    }
  }, [addFavorite, isFavorite, isInFlight, productId, removeFavorite]);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isInFlight}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      title={isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      className={cn(
        'inline-flex items-center justify-center rounded-full border bg-background transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        className,
      )}
    >
      <Heart
        size={iconSizes[size]}
        className={cn('transition-colors', isFavorite && 'fill-red-500 stroke-red-500')}
      />
      <span className="sr-only">{isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}</span>
    </button>
  );
}

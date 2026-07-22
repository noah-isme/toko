'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// Minimum horizontal travel (in px) before a touch drag counts as a swipe.
const SWIPE_THRESHOLD = 50;

const blurPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
}

export function ProductImageGallery({ images, productName, className }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsZoomed(false);
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length <= 1) {
      touchStartX.current = null;
      return;
    }
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    // Swipe left (finger moves right-to-left) advances; swipe right goes back.
    if (deltaX < 0) {
      goToNext();
    } else {
      goToPrevious();
    }
  };

  if (!images || images.length === 0) {
    return (
      <div
        className={cn(
          'relative aspect-square overflow-hidden rounded-lg border bg-muted',
          className,
        )}
      >
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No image available
        </div>
      </div>
    );
  }

  const currentImage = images[selectedIndex] || images[0];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Image */}
      <div
        className={cn(
          'relative aspect-square overflow-hidden rounded-lg border bg-muted',
          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
        )}
        onClick={() => setIsZoomed(!isZoomed)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsZoomed(!isZoomed);
          }
        }}
        aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
      >
        <Image
          src={currentImage}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          fill
          className={cn('object-cover transition-transform duration-300', isZoomed && 'scale-150')}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority={selectedIndex === 0}
          placeholder="blur"
          blurDataURL={blurPlaceholder}
        />
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setSelectedIndex(index);
                setIsZoomed(false);
              }}
              className={cn(
                'relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all',
                selectedIndex === index
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-muted-foreground/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={selectedIndex === index}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                placeholder="blur"
                blurDataURL={blurPlaceholder}
              />
            </button>
          ))}
        </div>
      )}

      {/* Navigation Arrows for Desktop */}
      {images.length > 1 && (
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={images.length <= 1}
            className={cn(
              'flex-1 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            aria-label="Previous image"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={images.length <= 1}
            className={cn(
              'flex-1 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            aria-label="Next image"
          >
            Next →
          </button>
        </div>
      )}

      {/* Zoom Hint */}
      <p className="text-center text-xs text-muted-foreground">
        {isZoomed ? 'Click to zoom out' : 'Click image to zoom in'}
      </p>
    </div>
  );
}

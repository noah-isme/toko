/**
 * Ordered gallery-image editor for the admin product form.
 *
 * Order is meaningful: the backend stores `sort_order` from the array index. The
 * storefront's main image, however, comes from the product's separate `thumbnail`
 * field (product cards, cart, favorites, recommendations, admin list, and the first
 * gallery slide). So "Set as primary" moves the image first *and* reports reason
 * `'primary'`, which the form uses to copy it into `thumbnail` (see `nextThumbnail`).
 * Rows reorder by drag-and-drop (pointer) or the move buttons (keyboard).
 */
'use client';

import { ArrowDown, ArrowUp, GripVertical, ImageIcon, Plus, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Returns a copy of `list` with the item at `from` moved to `to` (indices are clamped). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/** First non-empty URL: the image that is saved first (empty rows are dropped on save). */
export function firstImageUrl(images: readonly string[]): string {
  return images.find((url) => url.trim() !== '')?.trim() ?? '';
}

/** Why the image list changed. */
export type ImagesChangeReason = 'add' | 'edit' | 'remove' | 'move' | 'primary';

/**
 * The thumbnail to keep after the image list changes.
 *
 * - `'primary'`: the chosen image becomes the thumbnail.
 * - `'move'` / `'remove'` that change the first saved image: the thumbnail follows only
 *   when it was empty or matched the previous first image, so a hand-picked thumbnail
 *   is never overwritten by an ordinary reorder.
 * - Typing in a row or adding one leaves the thumbnail alone.
 */
export function nextThumbnail(
  thumbnail: string,
  previous: readonly string[],
  next: readonly string[],
  reason: ImagesChangeReason,
): string {
  const nextFirst = firstImageUrl(next);
  if (!nextFirst) return thumbnail;
  if (reason === 'primary') return nextFirst;
  if (reason !== 'move' && reason !== 'remove') return thumbnail;
  const previousFirst = firstImageUrl(previous);
  if (nextFirst === previousFirst) return thumbnail;
  const current = thumbnail.trim();
  return current === '' || current === previousFirst ? nextFirst : thumbnail;
}

/** Only preview URLs the browser can load directly; anything else shows a placeholder. */
function previewable(url: string): boolean {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) || (trimmed.startsWith('/') && !trimmed.startsWith('//'));
}

type FocusTarget = 'up' | 'down' | 'primary';

interface RowKeys {
  keys: number[];
  next: number;
}

export interface ProductImagesFieldProps {
  images: string[];
  onChange: (images: string[], reason: ImagesChangeReason) => void;
}

export function ProductImagesField({ images, onChange }: ProductImagesFieldProps) {
  const t = useTranslations('admin.productForm');
  // Stable row identities so inputs and focus follow an image when it moves.
  const [rowKeys, setRowKeys] = useState<RowKeys>(() => ({
    keys: images.map((_, index) => index),
    next: images.length,
  }));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ key: number; target: FocusTarget } | null>(null);

  // Images replaced from outside (e.g. a form reset): start fresh row identities.
  if (rowKeys.keys.length !== images.length) {
    setRowKeys((current) => ({
      keys: images.map((_, index) => current.next + index),
      next: current.next + images.length,
    }));
  }
  const keys = rowKeys.keys;

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending || !listRef.current) return;
    pendingFocus.current = null;
    const row = listRef.current.querySelector<HTMLElement>(`[data-image-key="${pending.key}"]`);
    if (!row) return;
    // Prefer the control the user pressed; fall back when it became disabled at an edge.
    const order: FocusTarget[] =
      pending.target === 'up'
        ? ['up', 'down']
        : pending.target === 'down'
          ? ['down', 'up']
          : ['down', 'up'];
    for (const action of order) {
      const button = row.querySelector<HTMLButtonElement>(`[data-image-action="${action}"]`);
      if (button && !button.disabled) {
        button.focus();
        return;
      }
    }
    row.querySelector<HTMLInputElement>('input')?.focus();
  }, [keys]);

  const move = (from: number, to: number, focus?: FocusTarget) => {
    const target = Math.max(0, Math.min(images.length - 1, to));
    if (from === target) return;
    if (focus) pendingFocus.current = { key: keys[from], target: focus };
    setRowKeys((current) => ({ ...current, keys: moveItem(current.keys, from, target) }));
    const primary = focus === 'primary';
    onChange(moveItem(images, from, target), primary ? 'primary' : 'move');
    setAnnouncement(
      primary
        ? t('imagePrimarySet')
        : t('imageMoved', { position: target + 1, total: images.length }),
    );
  };

  const add = () => {
    setRowKeys((current) => ({ keys: [...current.keys, current.next], next: current.next + 1 }));
    onChange([...images, ''], 'add');
  };

  const remove = (index: number) => {
    setRowKeys((current) => ({ ...current, keys: current.keys.filter((_, i) => i !== index) }));
    onChange(
      images.filter((_, i) => i !== index),
      'remove',
    );
  };

  const change = (index: number, url: string) => {
    const next = [...images];
    next[index] = url;
    onChange(next, 'edit');
  };

  // Empty rows are dropped on save, so the badge marks the first image that will be saved.
  const primaryIndex = images.findIndex((url) => url.trim() !== '');

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('images')}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('addImage')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noImages')}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground" id="product-images-hint">
              {t('imagesHint')}
            </p>
            <div
              ref={listRef}
              className="space-y-2"
              role="list"
              aria-describedby="product-images-hint"
              data-testid="product-form-images"
            >
              {images.map((url, index) => {
                const key = keys[index] ?? index;
                const position = index + 1;
                const primary = index === primaryIndex;
                const empty = url.trim() === '';
                return (
                  <div
                    key={key}
                    role="listitem"
                    data-image-key={key}
                    data-testid="product-form-image-row"
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-lg border p-2 transition-colors',
                      primary && 'border-primary/40 bg-primary/5',
                      dragIndex === index && 'opacity-50',
                      overIndex === index &&
                        dragIndex !== index &&
                        'border-primary ring-1 ring-primary',
                    )}
                    onDragOver={(event) => {
                      if (dragIndex === null) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (overIndex !== index) setOverIndex(index);
                    }}
                    onDragLeave={() => {
                      if (overIndex === index) setOverIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragIndex !== null) move(dragIndex, index);
                      endDrag();
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(event) => {
                        setDragIndex(index);
                        event.dataTransfer.effectAllowed = 'move';
                        // Firefox only starts a drag when data is set.
                        event.dataTransfer.setData('text/plain', String(index));
                        const row = event.currentTarget.parentElement;
                        if (row) event.dataTransfer.setDragImage(row, 16, 16);
                      }}
                      onDragEnd={endDrag}
                      className="flex h-9 w-6 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                      title={t('dragImage', { index: position })}
                      aria-hidden="true"
                      data-testid="product-form-image-handle"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {previewable(url) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin-entered URLs may point at hosts outside images.remotePatterns
                        <img
                          src={url.trim()}
                          alt={t('imagePreview', { index: position })}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                    <Input
                      value={url}
                      onChange={(event) => change(index, event.target.value)}
                      placeholder="https://..."
                      aria-label={t('imageUrl', { index: position })}
                      className="min-w-0 flex-1 basis-48"
                    />
                    <div className="flex items-center gap-1">
                      {primary ? (
                        <Badge
                          variant="secondary"
                          className="gap-1"
                          data-testid="product-form-image-primary"
                        >
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          {t('primaryImage')}
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={t('setPrimary', { index: position })}
                          disabled={empty}
                          onClick={() => move(index, 0, 'primary')}
                          data-image-action="primary"
                        >
                          <Star className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                          <span className="hidden sm:inline">{t('setPrimaryShort')}</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('moveImageUp', { index: position })}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1, 'up')}
                        data-image-action="up"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('moveImageDown', { index: position })}
                        disabled={index === images.length - 1}
                        onClick={() => move(index, index + 1, 'down')}
                        data-image-action="down"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('removeImage', { index: position })}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <p className="sr-only" aria-live="polite" role="status">
          {announcement}
        </p>
      </CardContent>
    </Card>
  );
}

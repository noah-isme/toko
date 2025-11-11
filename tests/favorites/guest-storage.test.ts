import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getGuestId,
  readGuestFavorites,
  writeGuestFavorites,
  mergeGuestFavorites,
} from '@/entities/favorites/storage';
import type { FavoriteItem } from '@/entities/favorites/types';

describe('guest favorites storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('generates and persists guest ID', () => {
    const guestId1 = getGuestId();
    expect(guestId1).toBeTruthy();
    expect(guestId1).toMatch(/^guest-\d+-[a-z0-9]+$/);

    const guestId2 = getGuestId();
    expect(guestId2).toBe(guestId1);
  });

  it('writes and reads favorites from localStorage', () => {
    const favorites: FavoriteItem[] = [
      { productId: 'prod-1', addedAt: '2024-01-01T00:00:00Z' },
      { productId: 'prod-2', addedAt: '2024-01-02T00:00:00Z' },
    ];

    const success = writeGuestFavorites(favorites);
    expect(success).toBe(true);

    const retrieved = readGuestFavorites();
    expect(retrieved).toEqual(favorites);
  });

  it('returns empty array when no favorites stored', () => {
    const favorites = readGuestFavorites();
    expect(favorites).toEqual([]);
  });

  it('filters out invalid favorites when reading', () => {
    const invalidData = [
      { productId: 'valid-1', addedAt: '2024-01-01T00:00:00Z' },
      { productId: 123, addedAt: '2024-01-02T00:00:00Z' },
      { invalid: 'object' },
      null,
      'string',
    ];

    localStorage.setItem('toko:favorites:guest', JSON.stringify(invalidData));

    const retrieved = readGuestFavorites();
    expect(retrieved).toEqual([{ productId: 'valid-1', addedAt: '2024-01-01T00:00:00Z' }]);
  });

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem('toko:favorites:guest', '{invalid json');

    const favorites = readGuestFavorites();
    expect(favorites).toEqual([]);
  });

  it('merges guest favorites with server favorites', () => {
    const serverFavorites: FavoriteItem[] = [
      { productId: 'server-1', addedAt: '2024-01-01T00:00:00Z' },
      { productId: 'server-2', addedAt: '2024-01-02T00:00:00Z' },
    ];

    const guestFavorites: FavoriteItem[] = [
      { productId: 'guest-1', addedAt: '2024-01-03T00:00:00Z' },
      { productId: 'server-1', addedAt: '2024-01-04T00:00:00Z' },
    ];

    writeGuestFavorites(guestFavorites);

    const merged = mergeGuestFavorites(serverFavorites);

    expect(merged).toHaveLength(3);
    expect(merged.some((f) => f.productId === 'server-1')).toBe(true);
    expect(merged.some((f) => f.productId === 'server-2')).toBe(true);
    expect(merged.some((f) => f.productId === 'guest-1')).toBe(true);

    const serverOneEntry = merged.find((f) => f.productId === 'server-1');
    expect(serverOneEntry?.addedAt).toBe('2024-01-01T00:00:00Z');
  });

  it('returns server favorites when no guest favorites exist', () => {
    const serverFavorites: FavoriteItem[] = [
      { productId: 'server-1', addedAt: '2024-01-01T00:00:00Z' },
    ];

    const merged = mergeGuestFavorites(serverFavorites);
    expect(merged).toEqual(serverFavorites);
  });

  it('handles storage quota exceeded gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    const favorites: FavoriteItem[] = [{ productId: 'test', addedAt: '2024-01-01T00:00:00Z' }];
    const success = writeGuestFavorites(favorites);

    expect(success).toBe(false);

    consoleWarnSpy.mockRestore();
  });
});

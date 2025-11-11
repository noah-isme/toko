export function getFavoritesQueryKey(userIdOrGuestId?: string) {
  return ['favorites', userIdOrGuestId ?? 'guest'] as const;
}

export function getAddressListKey(userIdOrGuestId: string | null | undefined) {
  return ['addresses', 'list', userIdOrGuestId ?? 'guest'] as const;
}

export function getAddressKey(id: string | null | undefined) {
  return ['addresses', 'detail', id ?? 'unknown'] as const;
}

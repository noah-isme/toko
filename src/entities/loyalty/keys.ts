export function getLoyaltyProfileKey() {
  return ['loyalty', 'profile'] as const;
}

export function getLoyaltyTransactionsKey(params?: { page?: number; pageSize?: number; type?: string }) {
  return ['loyalty', 'transactions', params ?? {}] as const;
}
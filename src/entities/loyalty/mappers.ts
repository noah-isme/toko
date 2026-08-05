import type {
  ApiLoyaltyProfile,
  ApiLoyaltyTransaction,
  LoyaltyProfile,
  LoyaltyTransaction,
  LoyaltyTransactionListResponse,
  LoyaltyTransactionListMeta,
} from './types';

export function mapApiLoyaltyProfile(apiProfile: ApiLoyaltyProfile): LoyaltyProfile {
  return {
    userId: apiProfile.user_id,
    points: apiProfile.points,
    tier: apiProfile.tier,
    tierProgress: apiProfile.tier_progress,
    lifetimePoints: apiProfile.lifetime_points,
    joinedAt: apiProfile.joined_at,
    nextTierThreshold: apiProfile.next_tier_threshold,
    nextTierName: apiProfile.next_tier_name,
  };
}

export function mapApiLoyaltyTransactionListResponse(apiResponse: {
  data: ApiLoyaltyTransaction[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}): LoyaltyTransactionListResponse {
  return {
    data: apiResponse.data.map((t) => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      points: t.points,
      balance: t.balance,
      description: t.description,
      referenceId: t.reference_id ?? undefined,
      referenceType: t.reference_type ?? undefined,
      createdAt: t.created_at,
    })),
    meta: {
      page: apiResponse.meta.page,
      pageSize: apiResponse.meta.limit,
      total: apiResponse.meta.total,
      totalPages: apiResponse.meta.total_pages,
    },
  };
}
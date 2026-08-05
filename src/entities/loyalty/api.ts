import { z, type ZodType } from 'zod';

import { mapApiLoyaltyProfile, mapApiLoyaltyTransactionListResponse } from './mappers';
import {
  redeemRewardSchema,
  type LoyaltyProfile,
  type LoyaltyTransaction,
  type LoyaltyTransactionListParams,
  type LoyaltyTransactionListResponse,
  type RedeemRewardInput,
  type ApiLoyaltyProfile,
  type ApiLoyaltyTransaction,
} from './types';

import { apiClient } from '@/lib/api/apiClient';

const userIdSchema = z.string().min(1, 'userId is required');

const apiLoyaltyProfileSchema: ZodType<ApiLoyaltyProfile> = z.object({
  user_id: z.string(),
  points: z.number().int().nonnegative(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  tier_progress: z.number().int().min(0).max(100),
  lifetime_points: z.number().int().nonnegative(),
  joined_at: z.string(),
  next_tier_threshold: z.number().int().nonnegative().optional(),
  next_tier_name: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
});

const apiLoyaltyTransactionSchema: ZodType<ApiLoyaltyTransaction> = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(['earned', 'redeemed', 'expired', 'adjusted', 'bonus']),
  points: z.number().int(),
  balance: z.number().int().nonnegative(),
  description: z.string(),
  reference_id: z.string().nullable(),
  reference_type: z.enum(['order', 'review', 'referral', 'promo', 'manual']).nullable(),
  created_at: z.string(),
});

const apiLoyaltyTransactionListResponseSchema = z.object({
  data: z.array(apiLoyaltyTransactionSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
  }),
});

const redeemRewardResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  remaining_points: z.number().int().nonnegative(),
  transaction: apiLoyaltyTransactionSchema.optional(),
});

function buildTransactionListPath(params?: LoyaltyTransactionListParams) {
  const searchParams = new URLSearchParams();

  if (params?.page) {
    searchParams.set('page', String(params.page));
  }

  if (params?.pageSize) {
    searchParams.set('limit', String(params.pageSize));
  }

  if (params?.type) {
    searchParams.set('type', params.type);
  }

  const queryString = searchParams.toString();
  const basePath = `/loyalty/transactions`;
  return (queryString ? `${basePath}?${queryString}` : basePath) as string;
}

export async function getLoyaltyProfile(): Promise<LoyaltyProfile> {
  const apiProfile = await apiClient('/loyalty/profile', {
    method: 'GET',
    schema: apiLoyaltyProfileSchema,
    requiresAuth: true,
  });

  return mapApiLoyaltyProfile(apiProfile);
}

export async function getLoyaltyTransactions(
  params?: LoyaltyTransactionListParams,
): Promise<LoyaltyTransactionListResponse> {
  const path = buildTransactionListPath(params);

  const apiResponse = await apiClient(path, {
    method: 'GET',
    schema: apiLoyaltyTransactionListResponseSchema,
    requiresAuth: true,
  });

  return mapApiLoyaltyTransactionListResponse(apiResponse);
}

export async function redeemReward(input: RedeemRewardInput): Promise<{
  success: boolean;
  message: string;
  remainingPoints: number;
  transaction?: LoyaltyTransaction;
}> {
  const parsedInput = redeemRewardSchema.parse(input);

  const response = await apiClient('/loyalty/redeem', {
    method: 'POST',
    body: JSON.stringify({ reward_id: parsedInput.rewardId }),
    schema: redeemRewardResponseSchema,
    requiresAuth: true,
  });

  return {
    success: response.success,
    message: response.message,
    remainingPoints: response.remaining_points,
    transaction: response.transaction ? mapApiLoyaltyTransaction(response.transaction) : undefined,
  };
}

function mapApiLoyaltyTransaction(apiTransaction: ApiLoyaltyTransaction): LoyaltyTransaction {
  return {
    id: apiTransaction.id,
    userId: apiTransaction.user_id,
    type: apiTransaction.type,
    points: apiTransaction.points,
    balance: apiTransaction.balance,
    description: apiTransaction.description,
    referenceId: apiTransaction.reference_id ?? undefined,
    referenceType: apiTransaction.reference_type ?? undefined,
    createdAt: apiTransaction.created_at,
  };
}
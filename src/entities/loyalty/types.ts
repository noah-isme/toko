import { z } from 'zod';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyProfile {
  userId: string;
  points: number;
  tier: LoyaltyTier;
  tierProgress: number; // 0-100 percentage to next tier
  lifetimePoints: number;
  joinedAt: string;
  nextTierThreshold?: number;
  nextTierName?: LoyaltyTier;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus';
  points: number;
  balance: number;
  description: string;
  referenceId?: string;
  referenceType?: 'order' | 'review' | 'referral' | 'promo' | 'manual';
  createdAt: string;
}

export interface LoyaltyTransactionListParams {
  page?: number;
  pageSize?: number;
  type?: LoyaltyTransaction['type'];
}

export interface LoyaltyTransactionListMeta {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
}

export interface LoyaltyTransactionListResponse {
  data: LoyaltyTransaction[];
  meta: LoyaltyTransactionListMeta;
}

export interface TierBenefits {
  tier: LoyaltyTier;
  name: string;
  color: string;
  minPoints: number;
  multiplier: number; // Points multiplier for purchases
  /** Keys under `account.loyalty.benefits` in the message catalogs. */
  benefits: TierBenefitKey[];
  icon: string;
}

export type TierBenefitKey =
  | 'points1x'
  | 'points125x'
  | 'points15x'
  | 'points2x'
  | 'basicPromos'
  | 'freeShippingMin'
  | 'flashSaleAccess'
  | 'freeShippingNoMin'
  | 'earlyAccess'
  | 'prioritySupport'
  | 'expressShipping'
  | 'personalShopper'
  | 'birthdayGift'
  | 'exclusiveEvents';

export const TIER_BENEFITS: Record<LoyaltyTier, TierBenefits> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    color: 'amber',
    minPoints: 0,
    multiplier: 1,
    benefits: ['points1x', 'basicPromos'],
    icon: '🥉',
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    color: 'gray',
    minPoints: 1000,
    multiplier: 1.25,
    benefits: ['points125x', 'freeShippingMin', 'flashSaleAccess'],
    icon: '🥈',
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    color: 'yellow',
    minPoints: 5000,
    multiplier: 1.5,
    benefits: ['points15x', 'freeShippingNoMin', 'earlyAccess', 'prioritySupport'],
    icon: '🥇',
  },
  platinum: {
    tier: 'platinum',
    name: 'Platinum',
    color: 'purple',
    minPoints: 20000,
    multiplier: 2,
    benefits: ['points2x', 'expressShipping', 'personalShopper', 'birthdayGift', 'exclusiveEvents'],
    icon: '💎',
  },
};

export const REWARD_CATALOG = [
  {
    id: 'voucher-10k',
    key: 'voucher10k' as const,
    pointsCost: 500,
    type: 'voucher' as const,
    icon: '🎫',
  },
  {
    id: 'voucher-25k',
    key: 'voucher25k' as const,
    pointsCost: 1200,
    type: 'voucher' as const,
    icon: '🎫',
  },
  {
    id: 'voucher-50k',
    key: 'voucher50k' as const,
    pointsCost: 2400,
    type: 'voucher' as const,
    icon: '🎫',
  },
  {
    id: 'free-shipping',
    key: 'freeShipping' as const,
    pointsCost: 300,
    type: 'shipping' as const,
    icon: '🚚',
  },
  {
    id: 'birthday-gift',
    key: 'birthdayGift' as const,
    pointsCost: 0,
    type: 'special' as const,
    icon: '🎁',
  },
];

export interface RewardItem {
  id: string;
  /** Key under `account.loyalty.rewards.items` (name + description) in the message catalogs. */
  key: 'voucher10k' | 'voucher25k' | 'voucher50k' | 'freeShipping' | 'birthdayGift';
  pointsCost: number;
  type: 'voucher' | 'shipping' | 'special';
  icon: string;
}

export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;

export const redeemRewardSchema = z.object({
  rewardId: z.string().min(1, 'Pilih hadiah'),
});

export type TierNames = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export const TIER_ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];

export function getTierInfo(tier: LoyaltyTier): TierBenefits {
  return TIER_BENEFITS[tier];
}

export function getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
  const index = TIER_ORDER.indexOf(currentTier);
  if (index === -1 || index === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[index + 1];
}

export function calculateTierProgress(currentPoints: number, currentTier: LoyaltyTier): number {
  const currentTierInfo = TIER_BENEFITS[currentTier];
  const nextTier = getNextTier(currentTier);

  if (!nextTier) return 100;

  const nextTierInfo = TIER_BENEFITS[nextTier];
  const pointsNeeded = nextTierInfo.minPoints - currentTierInfo.minPoints;
  const pointsProgress = currentPoints - currentTierInfo.minPoints;

  return Math.min(100, Math.max(0, Math.round((pointsProgress / pointsNeeded) * 100)));
}

export function getPointsToNextTier(currentPoints: number, currentTier: LoyaltyTier): number {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 0;
  return Math.max(0, TIER_BENEFITS[nextTier].minPoints - currentPoints);
}

export interface ApiLoyaltyProfile {
  user_id: string;
  points: number;
  tier: LoyaltyTier;
  tier_progress: number;
  lifetime_points: number;
  joined_at: string;
  next_tier_threshold?: number;
  next_tier_name?: LoyaltyTier;
}

export interface ApiLoyaltyTransaction {
  id: string;
  user_id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted' | 'bonus';
  points: number;
  balance: number;
  description: string;
  reference_id: string | null;
  reference_type: 'order' | 'review' | 'referral' | 'promo' | 'manual' | null;
  created_at: string;
}

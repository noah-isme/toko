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
  benefits: string[];
  icon: string;
}

export const TIER_BENEFITS: Record<LoyaltyTier, TierBenefits> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze',
    color: 'amber',
    minPoints: 0,
    multiplier: 1,
    benefits: ['1 poin per Rp1.000 belanja', 'Akses promosi dasar'],
    icon: '🥉',
  },
  silver: {
    tier: 'silver',
    name: 'Silver',
    color: 'gray',
    minPoints: 1000,
    multiplier: 1.25,
    benefits: ['1.25 poin per Rp1.000 belanja', 'Gratis ongkir minimal belanja', 'Akses flash sale eksklusif'],
    icon: '🥈',
  },
  gold: {
    tier: 'gold',
    name: 'Gold',
    color: 'yellow',
    minPoints: 5000,
    multiplier: 1.5,
    benefits: ['1.5 poin per Rp1.000 belanja', 'Gratis ongkir tanpa minimum', 'Akses produk baru lebih awal', 'Support prioritas'],
    icon: '🥇',
  },
  platinum: {
    tier: 'platinum',
    name: 'Platinum',
    color: 'purple',
    minPoints: 20000,
    multiplier: 2,
    benefits: ['2 poin per Rp1.000 belanja', 'Gratis ongkir + pengiriman ekspres', 'Personal shopper', 'Hadiah ulang tahun', 'Undangan event eksklusif'],
    icon: '💎',
  },
};

export const REWARD_CATALOG = [
  {
    id: 'voucher-10k',
    name: 'Voucher Rp10.000',
    description: 'Potongan Rp10.000 untuk pembelian minimal Rp50.000',
    pointsCost: 500,
    type: 'voucher' as const,
    icon: '🎫',
  },
  {
    id: 'voucher-25k',
    name: 'Voucher Rp25.000',
    description: 'Potongan Rp25.000 untuk pembelian minimal Rp100.000',
    pointsCost: 1200,
    type: 'voucher' as const,
    icon: '🎫',
  },
  {
    id: 'voucher-50k',
    name: 'Voucher Rp50.000',
    description: 'Potongan Rp50.000 untuk pembelian minimal Rp200.000',
    pointsCost: 2400,
    type: 'voucher' as const,
    icon: '🎫',
  },
  {
    id: 'free-shipping',
    name: 'Gratis Ongkir',
    description: 'Gratis biaya pengiriman untuk 1 pesanan',
    pointsCost: 300,
    type: 'shipping' as const,
    icon: '🚚',
  },
  {
    id: 'birthday-gift',
    name: 'Hadiah Ulang Tahun',
    description: 'Voucher khusus ulang tahun (hanya untuk tier Gold+)',
    pointsCost: 0,
    type: 'special' as const,
    icon: '🎁',
  },
];

export interface RewardItem {
  id: string;
  name: string;
  description: string;
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
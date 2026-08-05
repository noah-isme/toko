'use client';

import { Loader2, Award, Star, Target, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { memo } from 'react';

import { useLoyaltyProfileQuery } from '../hooks';
import { getTierInfo, TIER_ORDER, type LoyaltyTier, type TierBenefits } from '../types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TierProgressCardProps {
  profile?: {
    points: number;
    tier: LoyaltyTier;
    tierProgress: number;
    nextTierName?: LoyaltyTier;
    nextTierThreshold?: number;
    lifetimePoints: number;
  };
  className?: string;
}

const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: 'amber',
  silver: 'slate',
  gold: 'yellow',
  platinum: 'purple',
};

const TIER_GRADIENTS: Record<LoyaltyTier, string> = {
  bronze: 'from-amber-500 to-amber-600',
  silver: 'from-slate-400 to-slate-500',
  gold: 'from-yellow-400 to-yellow-500',
  platinum: 'from-purple-500 to-purple-600',
};

export const TierProgressCard = memo(function TierProgressCard({ profile, className }: TierProgressCardProps) {
  if (!profile) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-4 h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { points, tier, tierProgress, nextTierName, nextTierThreshold, lifetimePoints } = profile;
  const currentTierInfo = getTierInfo(tier);
  const nextTierInfo = nextTierName ? getTierInfo(nextTierName) : null;
  const pointsToNext = nextTierThreshold ? Math.max(0, nextTierThreshold - points) : 0;
  const gradient = TIER_GRADIENTS[tier];

  return (
    <Card className={cn('overflow-hidden relative', className)}>
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-10`} />
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-5`} />
      
      <CardContent className="relative space-y-5 p-6">
        {/* Tier Badge & Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center rounded-full text-white font-bold text-2xl',
              'w-14 h-14',
              `bg-gradient-to-br ${gradient}`,
            )}>
              {currentTierInfo.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Tier Anda</p>
              <h2 className="text-2xl font-bold text-foreground">{currentTierInfo.name}</h2>
            </div>
          </div>
          {nextTierInfo && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tier Berikutnya</p>
              <p className="font-semibold text-primary">{nextTierInfo.name}</p>
            </div>
          )}
        </div>

        {/* Points Balance */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-foreground">{points.toLocaleString('id-ID')}</span>
          <span className="text-sm text-muted-foreground">Poin</span>
          <span className="ml-auto text-xs text-muted-foreground">Total seumur hidup: {lifetimePoints.toLocaleString('id-ID')}</span>
        </div>

        {/* Progress to Next Tier */}
        {nextTierInfo && nextTierThreshold && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kemajuan ke {nextTierInfo.name}</span>
              <span className="font-medium">{tierProgress}%</span>
            </div>
            <Progress value={tierProgress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Butuh {pointsToNext.toLocaleString('id-ID')} poin lagi untuk {nextTierInfo.name}
            </p>
          </div>
        )}

        {tier === 'platinum' && (
          <div className="pt-2 text-center text-sm text-muted-foreground">
            🎉 Anda sudah di tier tertinggi!
          </div>
        )}

        {/* Tier Benefits Preview */}
        <div className="border-t border-border/50 pt-2">
          <p className="mb-2 text-xs text-muted-foreground">Keuntungan tier ini:</p>
          <ul className="space-y-1 text-sm">
            {currentTierInfo.benefits.slice(0, 3).map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-foreground">
                <span className={cn('h-1.5 w-1.5 rounded-full', `bg-${TIER_COLORS[tier]}-500`)} />
                {benefit}
              </li>
            ))}
            {currentTierInfo.benefits.length > 3 && (
              <li className="text-xs text-muted-foreground">+{currentTierInfo.benefits.length - 3} keuntungan lainnya</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});

export function TierProgressCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-4 h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </CardContent>
    </Card>
  );
}
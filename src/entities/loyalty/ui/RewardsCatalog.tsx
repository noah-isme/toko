'use client';

import { Award, Gift, Truck, Sparkles, Loader2, Check } from 'lucide-react';
import { memo, useState } from 'react';

import { useRedeemRewardMutation } from '../hooks';
import { REWARD_CATALOG, type RewardItem } from '../types';

import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

interface RewardsCatalogProps {
  userPoints: number;
  className?: string;
}

const REWARD_TYPE_STYLES: Record<RewardItem['type'], string> = {
  voucher: 'bg-amber-100 text-amber-800 border-amber-200',
  shipping: 'bg-blue-100 text-blue-800 border-blue-200',
  special: 'bg-purple-100 text-purple-800 border-purple-200',
};

const REWARD_TYPE_ICONS: Record<RewardItem['type'], React.ReactNode> = {
  voucher: <Award className="h-4 w-4" />,
  shipping: <Truck className="h-4 w-4" />,
  special: <Gift className="h-4 w-4" />,
};

export const RewardsCatalog = memo(function RewardsCatalog({ userPoints, className }: RewardsCatalogProps) {
  const { isAuthenticated } = useAuth();
  const { redeem, isPending: isRedeeming } = useRedeemRewardMutation();
  const { toast } = useToast();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const handleRedeem = async (reward: RewardItem) => {
    if (userPoints < reward.pointsCost) {
      toast({
        variant: 'destructive',
        title: 'Poin tidak cukup',
        description: `Anda butuh ${reward.pointsCost - userPoints} poin lagi untuk hadiah ini.`,
      });
      return;
    }

    setRedeemingId(reward.id);
    try {
      await redeem({ rewardId: reward.id });
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Gift className="h-5 w-5 text-primary" />
          Katalog Hadiah
        </h3>
        {!isAuthenticated && (
          <span className="text-xs text-muted-foreground">
            <a href="/login" className="text-primary underline hover:no-underline">Masuk</a> untuk menukarkan hadiah
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REWARD_CATALOG.map((reward) => {
          const canAfford = userPoints >= reward.pointsCost;
          const isRedeemingThis = redeemingId === reward.id;

          return (
            <Card
              key={reward.id}
              className={cn(
                'relative overflow-hidden transition-all',
                !canAfford && 'opacity-60',
                isAuthenticated && canAfford && 'hover:shadow-lg hover:border-primary/50'
              )}
            >
              <div className="absolute right-3 top-3">
                <Badge variant="outline" className={cn('gap-1', REWARD_TYPE_STYLES[reward.type])}>
                  {REWARD_TYPE_ICONS[reward.type]}
                  {reward.type === 'voucher' && 'Voucher'}
                  {reward.type === 'shipping' && 'Ongkir'}
                  {reward.type === 'special' && 'Khusus'}
                </Badge>
              </div>

              <CardContent className="p-5">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    {reward.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-semibold text-foreground">{reward.name}</h4>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{reward.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="flex items-center gap-1.5 text-lg font-bold text-primary">
                    {reward.pointsCost.toLocaleString('id-ID')}
                    <Sparkles className="h-4 w-4" />
                  </div>
                  {reward.pointsCost === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Khusus {reward.id.includes('birthday') ? 'Gold+' : 'Member'}
                    </Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="px-5 pb-5">
                <Button
                  className="w-full"
                  size="sm"
                  variant={canAfford ? 'default' : 'outline'}
                  disabled={!canAfford || !isAuthenticated || isRedeemingThis}
                  onClick={() => handleRedeem(reward)}
                >
                  {isRedeemingThis ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menukarkan...
                    </>
                  ) : canAfford ? (
                    'Tukar'
                  ) : (
                    'Poin tidak cukup'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {REWARD_CATALOG.length === 0 && (
        <div className="py-12 text-center">
          <Gift className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Belum ada hadiah tersedia.</p>
        </div>
      )}
    </div>
  );
});

export function RewardsCatalogSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-1 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-1/2" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <Skeleton className="h-5 w-20" />
            </div>
          </CardContent>
          <CardFooter className="px-5 pb-5">
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
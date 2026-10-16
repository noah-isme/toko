'use client';

import { Award, Sparkles, History, Loader2, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

import { useLoyaltyProfileQuery } from '../hooks';

import { RewardsCatalog } from './RewardsCatalog';
import { TierProgressCard } from './TierProgressCard';
import { TransactionHistory } from './TransactionHistory';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface LoyaltyDashboardProps {
  className?: string;
}

export const LoyaltyDashboard = memo(function LoyaltyDashboard({
  className,
}: LoyaltyDashboardProps) {
  const t = useTranslations('account.loyalty');
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useLoyaltyProfileQuery();

  if (profileLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card>
          <CardContent className="p-6">
            <TierProgressCard profile={undefined} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-1 h-3 w-full" />
                    <Skeleton className="mt-1 h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t('table.date')}</TableHead>
                  <TableHead>{t('table.type')}</TableHead>
                  <TableHead>{t('table.description')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('table.points')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('table.balance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-[60px]" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-[60px]" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileError) {
    return (
      <div
        className={cn(
          'rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive',
          className,
        )}
      >
        {t('loadFailed')}{' '}
        <button
          onClick={() => refetchProfile()}
          className="text-primary underline hover:no-underline"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tier Progress Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <TierProgressCard profile={profile} />
        </CardContent>
      </Card>

      {/* Tabs for Rewards and History */}
      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="h-4 w-4" />
            {t('rewardsTab')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {t('historyTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="pt-4">
          <Card>
            <CardContent className="p-6">
              <RewardsCatalog userPoints={profile?.points ?? 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardContent className="p-6">
              <TransactionHistory />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

'use client';

import { ArrowUp, ArrowDown, Minus, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useState } from 'react';

import { useLoyaltyTransactionsQuery } from '../hooks';
import type { LoyaltyTransaction } from '../types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const TRANSACTION_TYPE_STYLES: Record<LoyaltyTransaction['type'], { color: string; icon: React.ReactNode; label: string }> = {
  earned: { color: 'text-green-600 bg-green-50 border-green-100', icon: <ArrowUp className="h-3 w-3" />, label: 'Diperoleh' },
  redeemed: { color: 'text-purple-600 bg-purple-50 border-purple-100', icon: <ArrowDown className="h-3 w-3" />, label: 'Ditukar' },
  expired: { color: 'text-red-600 bg-red-50 border-red-100', icon: <Minus className="h-3 w-3" />, label: 'Kedaluwarsa' },
  adjusted: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Plus className="h-3 w-3" />, label: 'Disesuaikan' },
  bonus: { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Plus className="h-3 w-3" />, label: 'Bonus' },
};

const TYPE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'earned', label: 'Diperoleh' },
  { value: 'redeemed', label: 'Ditukar' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'adjusted', label: 'Disesuaikan' },
  { value: 'bonus', label: 'Bonus' },
];

function formatTransactionDate(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

interface TransactionHistoryProps {
  className?: string;
}

export const TransactionHistory = memo(function TransactionHistory({ className }: TransactionHistoryProps) {
  const [params, setParams] = useState({ page: 1, pageSize: 10, type: '' as LoyaltyTransaction['type'] | '' });
  const queryParams = params.type === '' 
    ? { page: params.page, pageSize: params.pageSize } 
    : { page: params.page, pageSize: params.pageSize, type: params.type };
  const { data, isLoading, isFetching, error, refetch } = useLoyaltyTransactionsQuery(queryParams);
  const transactions = data?.data ?? [];
  const meta = data?.meta;

  const handleTypeChange = (type: LoyaltyTransaction['type'] | '') => {
    setParams((prev) => ({ ...prev, type, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Tanggal</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-[120px] text-right">Poin</TableHead>
              <TableHead className="w-[120px] text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-[60px]" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive', className)}>
        Gagal memuat riwayat.{' '}
        <Button variant="link" size="sm" onClick={handleRefresh} className="h-auto p-0">
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          Riwayat Poin
        </h3>
        <Select value={params.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Belum ada aktivitas poin.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-[120px] text-right">Poin</TableHead>
                <TableHead className="w-[120px] text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const style = TRANSACTION_TYPE_STYLES[transaction.type];
                const isPositive = transaction.points > 0;
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTransactionDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('gap-1', style.color)}>
                        {style.icon}
                        {style.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.referenceId && (
                        <p className="text-xs text-muted-foreground">
                          Ref: {transaction.referenceType?.toUpperCase()} #{transaction.referenceId.slice(0, 8)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className={cn('text-right text-sm font-medium tabular-nums', isPositive ? 'text-green-600' : 'text-red-600')}>
                      {isPositive ? '+' : ''}{transaction.points.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {transaction.balance.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {meta && meta.totalPages && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 p-4">
              <span className="text-sm text-muted-foreground">
                Menampilkan {((params.page - 1) * params.pageSize) + 1} - {Math.min(params.page * params.pageSize, meta.total ?? 0)} dari {meta.total ?? 0}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(params.page - 1)}
                  disabled={params.page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Halaman {params.page} dari {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(params.page + 1)}
                  disabled={params.page >= (meta.totalPages ?? 1) || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isFetching && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
});
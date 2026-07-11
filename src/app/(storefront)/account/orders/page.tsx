'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useOrdersQuery } from '@/entities/orders/api/hooks';
import type { OrderListItem } from '@/entities/orders/schemas';
import { EmptyState } from '@/shared/ui/EmptyState';
import { emptyOrders } from '@/shared/ui/empty-presets';
import { ShoppingBag } from 'lucide-react';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

export default function OrderHistoryPage() {
    const { data, isLoading, error } = useOrdersQuery({ page: 1, limit: 20 });
    const orders = data?.data ?? [];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Pesanan Saya</h1>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg border p-4">
                            <BaseSkeleton className="h-6 w-1/3 mb-2" />
                            <BaseSkeleton className="h-4 w-1/4" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-12 text-center text-destructive">
                <p>Gagal memuat riwayat pesanan.</p>
                <p className="text-sm">{error.message}</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <EmptyState icon={<ShoppingBag aria-hidden="true" />} {...emptyOrders()} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pesanan Saya</h1>
                <p className="text-muted-foreground">Riwayat transaksi belanja Anda.</p>
            </div>

            <div className="grid gap-4">
                {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                ))}
            </div>
        </div>
    );
}

function OrderCard({ order }: { order: OrderListItem }) {
    const dateParams = order.createdAt ? new Date(order.createdAt) : new Date();
    const isPending = order.status.toLowerCase().includes('pending');
    const statusLabel = getStatusLabel(order.status);

    return (
        <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/50 transition-colors">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{order.orderNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {statusLabel}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground">
                    {new Intl.DateTimeFormat('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }).format(dateParams)}
                </p>
                {order.itemCount ? (
                    <p className="text-sm text-muted-foreground">{order.itemCount} Barang</p>
                ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Belanja</p>
                    <p className="font-medium">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: order.currency || 'IDR' }).format(order.total)}
                    </p>
                </div>
                <div className="flex gap-2">
                    {isPending && (
                        <Button asChild size="sm">
                            <Link href={`/order/confirmation/${order.id}`}>Bayar</Link>
                        </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/account/orders/${order.id}`}>Detail</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending_payment: 'Menunggu Pembayaran',
        paid: 'Dibayar',
        processing: 'Diproses',
        shipped: 'Dikirim',
        delivered: 'Selesai',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        failed: 'Gagal',
    };
    const key = status.toLowerCase();
    return labels[key] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getStatusColor(status: string) {
    const s = status.toLowerCase();
    if (s.includes('paid') || s.includes('shipped') || s.includes('completed') || s.includes('success')) {
        return 'bg-emerald-100 text-emerald-700';
    }
    if (s.includes('pending') || s.includes('wait')) {
        return 'bg-amber-100 text-amber-700';
    }
    if (s.includes('cancel') || s.includes('fail')) {
        return 'bg-red-100 text-red-700';
    }
    return 'bg-slate-100 text-slate-700';
}

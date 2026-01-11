'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useOrderQuery } from '@/entities/orders/api/hooks';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string; message: string }> = {
    pending_payment: {
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        label: 'Menunggu Pembayaran',
        message: 'Silakan selesaikan pembayaran untuk memproses pesanan Anda.',
    },
    paid: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Pembayaran Berhasil',
        message: 'Pembayaran Anda telah diterima. Pesanan sedang diproses.',
    },
    processing: {
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Sedang Diproses',
        message: 'Pesanan Anda sedang diproses oleh tim kami.',
    },
    shipped: {
        icon: CheckCircle2,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        label: 'Dalam Pengiriman',
        message: 'Pesanan Anda sedang dalam perjalanan.',
    },
    completed: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Selesai',
        message: 'Pesanan Anda telah selesai. Terima kasih!',
    },
    cancelled: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Dibatalkan',
        message: 'Pesanan ini telah dibatalkan.',
    },
};

function getStatusConfig(status: string) {
    const s = status.toLowerCase().replace(/_/g, '_');
    return STATUS_CONFIG[s] || {
        icon: Clock,
        color: 'text-slate-600',
        bgColor: 'bg-slate-100',
        label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        message: 'Status pesanan Anda.',
    };
}

export default function OrderConfirmationPage() {
    const params = useParams();
    const orderId = typeof params?.orderId === 'string' ? params.orderId : null;
    const router = useRouter();

    const { data: order, isLoading, error } = useOrderQuery(orderId || '');

    useEffect(() => {
        if (!orderId) {
            router.replace('/404');
        }
    }, [orderId, router]);

    if (!orderId) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                    <XCircle className="h-12 w-12 text-slate-500" />
                </div>
                <h1 className="mb-2 text-3xl font-bold">Pesanan tidak ditemukan</h1>
                <p className="mb-8 text-muted-foreground">
                    Kami tidak menemukan ID pesanan. Anda akan diarahkan ke halaman 404.
                </p>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/account/orders">Lihat Pesanan Saya</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/">Lanjut Belanja</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Memuat detail pesanan...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
                    <Clock className="h-12 w-12 text-amber-600" />
                </div>
                <h1 className="mb-2 text-3xl font-bold">Pesanan Dibuat</h1>
                <p className="mb-6 text-xl text-muted-foreground">
                    Order ID: <span className="font-mono">{orderId}</span>
                </p>
                <p className="mb-8 text-muted-foreground">
                    Detail pesanan sedang diproses. Silakan cek riwayat pesanan Anda.
                </p>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/account/orders">Lihat Pesanan Saya</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/">Lanjut Belanja</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const config = getStatusConfig(order.status);
    const StatusIcon = config.icon;

    return (
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
            <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full ${config.bgColor}`}>
                <StatusIcon className={`h-12 w-12 ${config.color}`} />
            </div>

            <h1 className="mb-2 text-3xl font-bold">{config.label}</h1>
            <p className="mb-6 text-xl text-muted-foreground">
                {config.message}
            </p>

            <div className="mb-8 w-full max-w-md rounded-lg border bg-card p-6 shadow-sm space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Nomor Pesanan</p>
                    <p className="font-mono text-lg font-medium">{order.orderNumber}</p>
                </div>
                <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                    <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: order.currency || 'IDR' }).format(order.pricing?.total || 0)}
                    </p>
                </div>
                {order.payment?.paymentUrl && order.status.toLowerCase().includes('pending') && (
                    <div className="border-t pt-4">
                        <Button asChild className="w-full" size="lg">
                            <a href={order.payment.paymentUrl} target="_blank" rel="noopener noreferrer">
                                Bayar Sekarang
                            </a>
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex gap-4">
                <Button asChild variant="outline">
                    <Link href="/account/orders">Lihat Pesanan Saya</Link>
                </Button>
                <Button asChild>
                    <Link href="/">Lanjut Belanja</Link>
                </Button>
            </div>
        </div>
    );
}
